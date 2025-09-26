use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{Token, TokenAccount, Transfer},
};

use crate::{
    TOKEN_ID, 
    errors::WagerError, 
    state::{
        GameMode, GameSession, MAX_SESSION_ID_LENGTH, TeamType
    }
};

/// Arguments for creating a new game session.
/// - session_id: A unique identifier string for the game session.
/// - wager_amount: The initial wager placed by each player.
/// - game_mode: The selected mode of the game.
/// - team: The team (0 for A, 1 for B) where the creator will be placed.
/// - team_a: Initial players for Team A.
/// - team_b: Initial players for Team B.
#[derive(AnchorDeserialize, AnchorSerialize, Clone)]
pub struct CreateGameSessionArgs {
    pub session_id: String,
    pub wager_amount: u64,
    pub game_mode: GameMode,
    pub creator_team: TeamType,
}

/// Accounts required for creating a game session and joining as the first player.
/// - user: The player creating and joining the session.
/// - game_server: The server authority.
/// - game_session: The PDA account storing the session state.
/// - vault: PDA to hold SOL/tokens for the session.
/// - user_token_account: The player’s SPL token account used for deposit.
/// - vault_token_account: The vault’s associated token account.
/// - mint: The SPL token mint used for wagers.
/// - token_program: The SPL token program.
/// - associated_token_program: The SPL associated token program.
/// - system_program: The system program.
#[derive(Accounts)]
#[instruction(args: CreateGameSessionArgs)]
pub struct CreateGameSessionAccounts<'info> {
    #[account(
        mut
    )]
    pub user: Signer<'info>,

    #[account(
        init,
        payer = user,
        space = 8 + GameSession::INIT_SPACE,
        seeds = [b"game_session", args.session_id.as_bytes()],
        bump
    )]
    pub game_session: Box<Account<'info, GameSession>>,

    /// CHECK: PDA vault only used as authority
    #[account(
        seeds = [b"vault", args.session_id.as_bytes()],
        bump
    )]
    pub vault: UncheckedAccount<'info>,

    #[account(
        mut
    )]
    pub user_token_account: Box<Account<'info, TokenAccount>>,

    #[account(
        init,
        payer = user,
        associated_token::mint = mint,
        associated_token::authority = vault,
    )]
    pub vault_token_account: Box<Account<'info, TokenAccount>>,

    #[account(
        address = TOKEN_ID @ WagerError::InvalidMint
    )]
    pub mint: Box<Account<'info, anchor_spl::token::Mint>>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

#[inline(always)] // This function is only called once, inside the handler
/// Preliminary checks other checks may be performed in the handler
fn checks(
    args: &mut CreateGameSessionArgs,
) -> Result<()> {
    // Validate session id length
    require_gte!(
        MAX_SESSION_ID_LENGTH,
        args.session_id.len(),
        WagerError::InvalidSessionIdLength
    );

    // Round bet amount to nearest lowest multiple of 10
    // We round it to reduce the chances of leftovers in the vault
    // after winnings distribution
    args.wager_amount = (args.wager_amount / 10) * 10;

    require_gt!(
        args.wager_amount,
        0,
        WagerError::InvalidWagerAmount
    );

    // Other checks are performed implictly by anchor | token program

    Ok(())
}


/// Creates a new game session and adds the first player.
pub fn create_game_session_handler(
    ctx: Context<CreateGameSessionAccounts>,
    mut args: CreateGameSessionArgs,
) -> Result<()> {
    // Perform preliminary checks
    checks(&mut args)?;

    let clock = Clock::get()?;

    let game_session = &mut ctx.accounts.game_session;

    // Initialize session state
    game_session.set_inner(
                GameSession::new(
            args.session_id,
            args.wager_amount,
            args.game_mode,
            clock.unix_timestamp,
            args.creator_team,
            ctx.bumps.game_session,
            ctx.bumps.vault
        )
    );

    // Transfer SPL tokens from user to vault
    anchor_spl::token::transfer(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.user_token_account.to_account_info(),
                to: ctx.accounts.vault_token_account.to_account_info(),
                authority: ctx.accounts.user.to_account_info(),
            },
        ),
        args.wager_amount,
    )?;

    // Add player to the team
    game_session.try_add_player_to_team(args.creator_team, ctx.accounts.user.key)?;


    Ok(())
}
