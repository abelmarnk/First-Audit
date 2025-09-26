use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

use crate::{
    TOKEN_ID, errors::WagerError, state::{
        GameSession, GameStatus, GlobalConfig, TeamType
    }
};

/// Arguments for joining a user to a game session.
/// - team: The team (0 for A, 1 for B) the user wishes to join.
#[derive(AnchorDeserialize, AnchorSerialize, Clone)]
pub struct JoinUserArgs {
    pub team: TeamType,
}

/// Accounts required for a player to join an existing game session.
/// - user: The player joining the session.
/// - game_session: The PDA account storing the session state.
/// - user_token_account: The player’s SPL token account used for deposit.
/// - vault_token_account: The vault’s associated token account.
/// - mint: The SPL token mint used for wagers.
/// - token_program: The SPL token program.
#[derive(Accounts)]
#[instruction(args: JoinUserArgs)]
pub struct JoinUserAccounts<'info> {
    #[account(
        mut
    )]
    pub user: Signer<'info>,

    pub server: Signer<'info>,

    pub global_config: Account<'info, GlobalConfig>,

    #[account(
        mut,
        seeds = [b"game_session", game_session.session_id.as_bytes()],
        bump = game_session.bump,
    )]
    pub game_session: Box<Account<'info, GameSession>>,

    #[account(
        mut
    )]
    pub user_token_account: Box<Account<'info, TokenAccount>>,

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
    pub vault_token_account: Box<Account<'info, TokenAccount>>,

    #[account(
        address = TOKEN_ID @ WagerError::InvalidMint
    )]
    pub mint: Box<Account<'info, anchor_spl::token::Mint>>,

    pub token_program: Program<'info, Token>,
}

#[inline(always)] // This function is only called once in the handler
/// Preliminary checks other checks may be performed in the handler
fn checks(ctx: &Context<JoinUserAccounts>) -> Result<()> {
    let game_session = &ctx.accounts.game_session;

    // Server signer must match the configured global state authority
    require_keys_eq!(
        ctx.accounts.global_config.authority,
        ctx.accounts.server.key(),
        WagerError::InvalidAuthority
    );

    // Game must be open for players
    require!(
        game_session.is_waiting_for_players(),
        WagerError::GameInProgress
    );

    // Other checks are performed implicitly by anchor | token program

    Ok(())
}

/// Adds a user to a pending game session.
pub fn join_user_handler(
    ctx: Context<JoinUserAccounts>,
    args: JoinUserArgs,
) -> Result<()> {
    // Perform preliminary checks
    checks(&ctx)?;

    let game_session = &mut ctx.accounts.game_session;

    // Ensure the user is not already in the opposite team

    let in_opposite_team = match args.team {
        TeamType::TeamA => game_session.team_b.has_player(ctx.accounts.user.key),
        TeamType::TeamB => game_session.team_a.has_player(ctx.accounts.user.key)
    };

    require!(
        !in_opposite_team,
        WagerError::PlayerAlreadyInGame
    );
    
    // Add player to the team
    game_session.try_add_player_to_team(args.team, ctx.accounts.user.key)?;

    // Transfer wager from user to vault
    token::transfer(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.user_token_account.to_account_info(),
                to: ctx.accounts.vault_token_account.to_account_info(),
                authority: ctx.accounts.user.to_account_info(),
            },
        ),
        game_session.session_wager,
    )?;

    // If all slots filled, set game status to InProgress
    if game_session.is_all_filled() {
        game_session.status = GameStatus::InProgress;
    }

    Ok(())
}