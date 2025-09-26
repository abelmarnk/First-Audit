use anchor_lang::prelude::*;

use crate::{
    errors::WagerError,
    state::{GameSession, GameStatus, GlobalConfig, TeamType},
};

/// Arguments for recording a kill event.
/// - killer_team: Team ID of the killer (0 = A, 1 = B).
/// - killer: Pubkey of the killer.
/// - victim_team: Team ID of the victim (0 = A, 1 = B).
/// - victim: Pubkey of the victim.
#[derive(AnchorDeserialize, AnchorSerialize, Clone)]
pub struct RecordKillArgs {
    pub killer_team: TeamType,
    pub killer_index:u8,
    pub killer: Pubkey,
    pub victim_team: TeamType,
    pub victim_index:u8,    
    pub victim: Pubkey,
}

/// Accounts required for recording a kill event.
/// - game_session: The session state PDA.
/// - global_config: Stores global configuration (contains server authority).
/// - server: The server authority signing this instruction.
#[derive(Accounts)]
#[instruction(args: RecordKillArgs)]
pub struct RecordKillAccounts<'info> {
    #[account(
        mut,
        seeds = [b"game_session", game_session.session_id.as_bytes()],
        bump = game_session.bump,
    )]
    pub game_session: Box<Account<'info, GameSession>>,

    pub global_config: Box<Account<'info, GlobalConfig>>,

    pub server: Signer<'info>,
}

#[inline(always)] // This function is only called once in the handler
/// Preliminary checks other checks may be performed in the handler
fn checks(ctx: &Context<RecordKillAccounts>) -> Result<()> {

    // Server signer must match the configured global state authority
    require_keys_eq!(
        ctx.accounts.global_config.authority,
        ctx.accounts.server.key(),
        WagerError::InvalidAuthority
    );

    // Check that the game is in progress
    require!(
        ctx.accounts.game_session.status.eq(&GameStatus::InProgress),
        WagerError::GameNotInProgress
    );

    // Other checks are performed implicitly by anchor

    Ok(())
}

/// Records a kill for a game session.
pub fn record_kill_handler(
    ctx: Context<RecordKillAccounts>,
    args: RecordKillArgs,
) -> Result<()> {
    // Perform preliminary checks
    checks(&ctx)?;

    let game_session = &mut ctx.accounts.game_session;

    // Record the kill into session state
    // The killer and victim are delibrately allowed to be on the same team
    // this is for situations where the player kills themselves or kills their teammates
    // inadvertently, the player could also have an edge by killing themselves and killing
    // an opposing team member, but not get penalized for it
    // This allows for the game to be fair, e.g so the player doesn't just kill themselves
    // when they are going to be killed.
    // In this case, spawns are deducted but no kills are added
    game_session.add_kill(
        args.killer_team,
        usize::from(args.killer_index),
        &args.killer,
        args.victim_team,
        usize::from(args.victim_index),
        &args.victim,
    )?;

    Ok(())
}
