use crate::{errors::WagerError, state::*, TOKEN_ID};
use anchor_lang::prelude::*;
use anchor_spl::token::{CloseAccount, Token, TokenAccount, close_account};

/// Accounts required for refunding wagers.
/// - server: The server authority that created the session.
/// - global_config: Stores global configuration, including server pubkey.
/// - creator: Receives lamports when accounts are closed.
/// - game_session: PDA holding session state. Closed after refunds.
/// - vault: PDA authority for the token account, closed after refunds.
/// - vault_token_account: Associated token account holding wagers.
#[derive(Accounts)]
pub struct RefundWagerAccounts<'info> {
    pub server: Signer<'info>,

    pub global_config: Account<'info, GlobalConfig>,

    /// CHECK: Creator account, receives lamports on account closure
    /// It may already be passed along with remaining accounts but is stated
    /// explictly here
    #[account(
        mut
    )]
    pub creator: UncheckedAccount<'info>,
    
    #[account(
        mut,
        seeds = [b"game_session", game_session.session_id.as_bytes()],
        bump = game_session.bump,
        close = creator
    )]
    pub game_session: Account<'info, GameSession>,
    
    /// CHECK: Vault PDA authority
    #[account(
        seeds = [b"vault", game_session.session_id.as_bytes()],
        bump = game_session.vault_bump,
    )]
    pub vault: UncheckedAccount<'info>,

    #[account(
        mut,
        associated_token::mint = TOKEN_ID,
        associated_token::authority = vault,
    )]
    pub vault_token_account: Account<'info, TokenAccount>,
    
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}



#[inline(always)] // This function is only called once in the handler
/// Preliminary checks other checks may be performed in the handler
fn checks(ctx: &Context<RefundWagerAccounts>) -> Result<()> {

    // Validate the server
    require_keys_eq!(
        ctx.accounts.global_config.authority,
        ctx.accounts.server.key(),
        WagerError::InvalidAuthority
    );

    // Validate the creator account
    require_keys_eq!(
        ctx.accounts.creator.key(),
        *ctx.accounts.game_session.get_creator(),
        WagerError::InvalidCreatorAccount
    );

    // Other checks are performed implictly by anchor | token program

    Ok(())
}

/// Refunds wagers to all players in the session and closes accounts
pub fn refund_wager_handler<'info>(
    ctx: Context<'_, '_, 'info, 'info, RefundWagerAccounts<'info>>,
) -> Result<()> {
    // Perform preliminary checks
    checks(&ctx)?;

    let game_session = &ctx.accounts.game_session;

    msg!("Starting refund for session: {}", game_session.session_id);

    // Get all the keys for players that have joined the game, excluging Pubkey::default().
    let players = game_session.get_game_players();
    
    // Get the number of times each player(excluding Pubkey::default()) paid for a spawn.
    let players_total_spawns_additions = game_session.
        get_game_players_total_spawns_additions();
    
    // Check enough accounts were passed in
    require_eq!(
        ctx.remaining_accounts.len(),
        players.len(),
        WagerError::InvalidRemainingAccounts
    );

    // We avoid the n^2 overhead here by fetching the accounts from the chain from the 
    // offchain side and passing them in the order the program expects them so we don't
    // have to search for each account

    // We also avoid passing in the player accounts and use player keys instead
    // reducing the transaction size
    for (player_token_account_info, (player, total_spawn_additions)) in ctx
        .remaining_accounts
        .iter()
        .zip(players.iter().zip(players_total_spawns_additions.iter()))
    {

        // Deserialize token account
        let player_token_account =
            Account::<TokenAccount>::try_from(&player_token_account_info)?;

        // Check that the token account belongs to the expected owner
        require_keys_eq!(
            player_token_account.owner,
            *player,
            WagerError::InvalidPlayerTokenAccount
        );

        // Transfer refund, it is calculated by the total number of deposits made
        // which is the same as the total number of spawns, that is then multiplied by
        // the amount deposited which is the session wager
        let refund = game_session.session_wager.
            checked_mul(u64::from(*total_spawn_additions)).
            ok_or(ProgramError::ArithmeticOverflow)?;

        anchor_spl::token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                anchor_spl::token::Transfer {
                    from: ctx.accounts.vault_token_account.to_account_info(),
                    to: player_token_account.to_account_info(),
                    authority: ctx.accounts.vault.to_account_info(),
                },
                &[&[
                    b"vault",
                    game_session.session_id.as_bytes(),
                    &[ctx.accounts.game_session.vault_bump],
                ]],
            ),
            refund,
        )?;

        msg!("Refunded {} to player {}", refund, player);
    }

    // Close the vault token account (rent lamports also go to creator)
    close_account(CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        CloseAccount {
            account: ctx.accounts.vault_token_account.to_account_info(),
            destination: ctx.accounts.creator.to_account_info(),
            authority: ctx.accounts.vault.to_account_info(),
        },
        &[&[
            b"vault",
            game_session.session_id.as_bytes(),
            &[ctx.accounts.game_session.vault_bump],
        ]],
    ))?;

    Ok(())
}
