use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

use crate::{
    TOKEN_ID, 
    errors::WagerError, 
    state::{
        GameSession, TeamType,
    }
};

/// Arguments for paying to respawn.
/// - team: The team (0 for A, 1 for B) the player belongs to.
/// - index: The index where the player is in the team
#[derive(AnchorDeserialize, AnchorSerialize, Clone)]
pub struct PayToSpawnArgs {
    pub team: TeamType,
    pub index:u8
}

/// Accounts required for a player to pay tokens in order to respawn.
/// - user: The player paying to respawn.
/// - game_session: The PDA account storing the session state.
/// - user_token_account: The player’s SPL token account used for payment.
/// - vault: PDA used as authority for the vault token account.
/// - vault_token_account: The vault’s associated token account that receives the payment.
#[derive(Accounts)]
#[instruction(args: PayToSpawnArgs)]
pub struct PayToSpawnAccounts<'info> {

    pub user: Signer<'info>,

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

    /// CHECK: PDA vault only used as authority
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
    pub vault_token_account: Box<Account<'info, TokenAccount>>,

    pub token_program: Program<'info, Token>,
}

#[inline(always)] // This function is only called once in the handler
/// Preliminary checks other checks may be performed in the handler
fn checks(ctx: &Context<PayToSpawnAccounts>) -> Result<()> {
    let game_session = &ctx.accounts.game_session;

    // Game must be in progress and must support pay-to-spawn
    require!(
        game_session.is_in_progress() && 
        game_session.is_pay_to_spawn(),
        WagerError::InvalidGameState
    );

    // Other checks are performed implictly by anchor | token program

    Ok(())
}

/// Collects deposits and adds respawns to player
pub fn pay_to_spawn_handler(
    ctx: Context<PayToSpawnAccounts>,
    args: PayToSpawnArgs,
) -> Result<()> {
    // Perform preliminary checks
    checks(&ctx)?;

    let game_session = &mut ctx.accounts.game_session;

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

    // Give the user their spawns
    game_session.add_spawns(
        args.team,
        ctx.accounts.user.key,
        usize::from(args.index)
    )?;

    Ok(())
}
