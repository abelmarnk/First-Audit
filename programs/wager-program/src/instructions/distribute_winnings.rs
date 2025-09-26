use std::ops::Div;
use crate::{
    errors::WagerError, 
    state::*,
    utils::{
        close_token_account, 
        transfer_tokens
    }, 
    TOKEN_ID
};
use anchor_lang::prelude::*;
use anchor_spl::token::{
    Token, 
    TokenAccount
};

/// Arguments for distributing winnings after a game sesson
#[derive(AnchorDeserialize, AnchorSerialize, Clone)]
pub struct DistributeWinningsArgs{
    pub winning_team:TeamType
}


/// Accounts required for distributing winnings after a game session.
/// - global_config: Stores global configuration (contains server authority).
/// - server: The server authority that signs this instruction.
/// - creator: The game creator account, receives lamports on vault closure. 
/// - creator_token_account: The creator’s token account, explicitly passed even if also present in remaining accounts.
/// - game_session: The PDA storing the session state; closed to the creator when complete.
/// - vault: PDA that controls the vault token account.
/// - vault_token_account: The vault’s SPL token account holding wagers.
/// - token_program: The SPL token program.
#[derive(Accounts)]
pub struct DistributeWinningsAccounts<'info> {

    pub global_config: Account<'info, GlobalConfig>,

    #[account(
        mut
    )]
    pub server: Signer<'info>,

    /// CHECK: Creator account, receives lamports on account closure
    /// It may already be passed along with remaining accounts but is restated
    /// explictly here
    #[account(
        mut
    )]
    pub creator: UncheckedAccount<'info>,

    /// The creator's token account
    /// It may already be passed along with remaining accounts but is restated
    /// explictly here
    #[account(
        mut
    )]
    pub creator_token_account: Option<Account<'info, TokenAccount>>,

    #[account(
        mut,
        seeds = [b"game_session", game_session.session_id.as_bytes()],
        bump = game_session.bump,
        close = creator
    )]
    pub game_session: Account<'info, GameSession>,

    /// CHECK: Vault PDA that controls the token account
    #[account(
        seeds = [b"vault", game_session.session_id.as_bytes()],
        bump = game_session.vault_bump
    )]
    pub vault: UncheckedAccount<'info>,

    #[account(
        mut,
        associated_token::mint = TOKEN_ID,
        associated_token::authority = vault,
    )]
    pub vault_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

#[inline(always)] // This function is only called once, inside the handler.
/// Preliminary checks other checks may be performed in the handler
fn checks(ctx: &Context<DistributeWinningsAccounts>) -> Result<()> {
    let game_session = &ctx.accounts.game_session;

    // Check if the game had started before this call
    require!(
        game_session.is_in_progress(),
        WagerError::GameNotInProgress
    );

    // Check that the server is valid
    require_keys_eq!(
        ctx.accounts.global_config.authority,
        ctx.accounts.server.key(),
        WagerError::UnauthorizedDistribution
    );

    // Check that the creator account matches what the game session expects
    require_keys_eq!(
        *ctx.accounts.creator.key,
        *game_session.get_creator(),
        WagerError::InvalidCreatorAccount
    );

    // Must have at least one winner
    require!(
        !ctx.remaining_accounts.is_empty(),
        WagerError::InvalidRemainingAccounts
    );

    // Other checks are performed implictly by anchor | token program

    Ok(())
}

/// Distibutes rewards for users with kills and remaning spawns by the end of the game
pub fn distribute_pay_spawn_earnings_handler<'info>(
    ctx: Context<'_, '_, 'info, 'info, DistributeWinningsAccounts<'info>>,
) -> Result<()> {

    // Preliminary checks
    checks(&ctx)?;

    let game_session = &ctx.accounts.game_session;
    msg!("Starting pay-spawn distribution for session: {}", game_session.session_id);

    // Get all the keys for players that have joined the game, excluging Pubkey::default().
    let players = game_session.get_game_players();

    // Get all the kills and spawns(the sum for each player) for players that have 
    // joined the game, excluging Pubkey::default().    
    let players_kills_and_spawns = game_session.
        get_game_players_kills_and_spawns();

    msg!("Players count: {}", players.len());

    // Validate remaining accounts length
    require_eq!(
        ctx.remaining_accounts.len(),
        players.len(),
        WagerError::InvalidRemainingAccounts
    );
    
    // Get the sum of all the kills and spawns
    let kills_and_spawns_sum = 
    players_kills_and_spawns.iter().
    map(|kills_and_spawns| u64::from(*kills_and_spawns)).sum::<u64>();

    
    // Get the total amount deposited            
    let total_wager = kills_and_spawns_sum.div(u64::from(SPAWNS_PER_DEPOSIT)).
    checked_mul(game_session.session_wager).
    ok_or(ProgramError::ArithmeticOverflow)?;
    

    // Get players and kills and spawns
    let player_stats = 
        players.iter().zip(players_kills_and_spawns.iter())
        .filter(|(_, kills_and_spawns)| (*kills_and_spawns).gt(&0));

    // We avoid the n^2 overhead here by fetching the accounts from the chain from the 
    // offchain side and passing them in the order the program expects them so we don't
    // have to search for each account

    // We also avoid passing in the player accounts and use player keys instead
    // reducing the transaction size
    for (player_token_account_info, (player, kills_and_spawns)) in 
            ctx.remaining_accounts.iter().zip(player_stats) {

        // Get token account
        let player_token_account: Account<TokenAccount> =
            Account::try_from(player_token_account_info)?;

        // Verify token account owner matches player account
        require_keys_eq!(
            player_token_account.owner,
            *player,
            WagerError::InvalidWinnerTokenAccount
        );

        // Get earnings 
        // (earnings = (players-kills-and-spawns/total-kills-and-spawns)*total-wager)
        let earnings: u64 = (u64::from(*kills_and_spawns))
            .checked_mul(total_wager)
            .and_then(|product| Some(product.div(kills_and_spawns_sum)))
            .ok_or(ProgramError::ArithmeticOverflow)?;

        msg!("Player: {}, Kills & Spawns: {}, Earnings:{}", player, kills_and_spawns, earnings);
        
        // Transfer from vault token account to player's token account
        transfer_tokens(
            ctx.accounts.vault_token_account.to_account_info(), 
            player_token_account.to_account_info(), 
            ctx.accounts.vault.to_account_info(), 
            ctx.accounts.token_program.to_account_info(), 
            &[&[
            b"vault",
            game_session.session_id.as_bytes(),
            &[game_session.vault_bump],
        ]], 
            earnings
        )?;
    };

    // We reload the token account because it's been updated through CPI
    ctx.accounts.vault_token_account.reload()?;

    if ctx.accounts.vault_token_account.amount.gt(&0){
        // Transfer the leftover tokens from the vault token account to player's token account

        let creator_token_account = ctx.accounts.creator_token_account.
            as_ref().ok_or(WagerError::CreatorTokenAccountNotProvided)?;

        msg!("Transferring {} to Creator {}", ctx.accounts.vault_token_account.amount, ctx.accounts.creator.key);

        // Check that the token account provided is owned by the creator account
        require_keys_eq!(
            creator_token_account.owner,
            *ctx.accounts.creator.key,
            WagerError::InvalidCreatorTokenAccount
        );

        // Transfer from vault token account to creator's token account
        transfer_tokens(
            ctx.accounts.vault_token_account.to_account_info(), 
            creator_token_account.to_account_info(),
            ctx.accounts.vault.to_account_info(), 
            ctx.accounts.token_program.to_account_info(), 
            &[&[
            b"vault",
            game_session.session_id.as_bytes(),
            &[game_session.vault_bump],
        ]], 
            ctx.accounts.vault_token_account.amount
        )?;
    }

    // Close the vault token account and transfer the lamports to the creator
    close_token_account(
        ctx.accounts.vault_token_account.to_account_info(), 
            ctx.accounts.creator.to_account_info(), 
            ctx.accounts.vault.to_account_info(), 
            ctx.accounts.token_program.to_account_info(),
            &[&[
            b"vault",
            game_session.session_id.as_bytes(),
            &[game_session.vault_bump],
        ]] 
    )?;

    Ok(())
}

/// Distribute all winnings to the winning team.
pub fn distribute_all_winnings_handler<'info>(
    ctx: Context<'_, '_, 'info, 'info, DistributeWinningsAccounts<'info>>,
    args: DistributeWinningsArgs,
) -> Result<()> {
    
    // Preliminary checks
    checks(&ctx)?;

    let game_session = &ctx.accounts.game_session;
    msg!("Starting full winnings distribution for session: {}", game_session.session_id);

    let players_per_team = game_session.game_mode.players_per_team();

    // Validate remaining accounts length
    require_eq!(
        ctx.remaining_accounts.len(),
        players_per_team,
        WagerError::InvalidRemainingAccounts
    );

    // Select slice of winning players
    let winning_players_slice: &[Pubkey] = match args.winning_team{
        TeamType::TeamA => &game_session.team_a.get_game_players()[0..players_per_team],

        TeamType::TeamB => &game_session.team_b.get_game_players()[0..players_per_team]
    };

    // Calculate winnings per player
    let winning_amount_per_player: u64 = game_session
        .session_wager
        .checked_mul(TEAM_COUNT)
        .ok_or(ProgramError::ArithmeticOverflow)?;

    // We avoid the n^2 overhead here by fetching the accounts from the chain from the 
    // offchain side and passing them in the order the program expects them so we don't
    // have to search for each account

    // We also avoid passing in the player accounts and use player keys instead
    // reducing the transaction size
    for (winner_token_account_info, expected_winner) in ctx.remaining_accounts.
        iter().zip(winning_players_slice.iter()) {

        let winner_token_account: Account<TokenAccount> =
            Account::try_from(winner_token_account_info)?;

        // Verify token account owner matches player account
        require_keys_eq!(
            winner_token_account.owner,
            *expected_winner,
            WagerError::InvalidWinnerTokenAccount
        );

        // Transfer winnings to winner
        transfer_tokens(
            ctx.accounts.vault_token_account.to_account_info(),
            winner_token_account_info.clone(),
            ctx.accounts.vault.to_account_info(),
            ctx.accounts.token_program.to_account_info(),
            &[&[
                b"vault",
                game_session.session_id.as_bytes(),
                &[game_session.vault_bump],
            ]],
            winning_amount_per_player,
        )?;
    }

    // The distibute all winnings has no leftover tokens, because the number of deposits is
    // always twice the number of players per team since spawns cannnot be paid for here.

    // Close vault token account and transfer lamports to creator
    close_token_account(
        ctx.accounts.vault_token_account.to_account_info(),
        ctx.accounts.creator.to_account_info(),
        ctx.accounts.vault.to_account_info(),
        ctx.accounts.token_program.to_account_info(),
        &[&[
            b"vault",
            game_session.session_id.as_bytes(),
            &[game_session.vault_bump],
        ]],
    )?;

    Ok(())
}
