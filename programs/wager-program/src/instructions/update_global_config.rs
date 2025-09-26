use anchor_lang::prelude::*;
use crate::{errors::WagerError, state::GlobalConfig};

/// Arguments for updating the global state.
/// - new_server: New admin/server authority pubkey.
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct UpdateGlobalConfigArgs {
    pub authority: Pubkey,
}

/// Accounts required for updating the global state.
/// - global_config: PDA account for global configuration.
/// - admin: Current admin/server authority (must sign).
#[derive(Accounts)]
pub struct UpdateGlobalConfigAccounts<'info> {
    #[account(
        mut,
        seeds = [b"global-config"],
        bump,
    )]
    pub global_config: Box<Account<'info, GlobalConfig>>,

    pub admin: Signer<'info>,
}

#[inline(always)]
fn checks(ctx: &Context<UpdateGlobalConfigAccounts>) -> Result<()> {
    // Require that the signer matches the current global_config authority
    require_keys_eq!(
        ctx.accounts.global_config.authority,
        ctx.accounts.admin.key(),
        WagerError::InvalidAuthority
    );

    // Other checks are performed implictly by anchor
    
    Ok(())
}

/// Updates the global state with a new authority.
pub fn update_global_config_handler(
    ctx: Context<UpdateGlobalConfigAccounts>,
    args: UpdateGlobalConfigArgs,
) -> Result<()> {
    // Preliminary checks
    checks(&ctx)?;

    let global_config = &mut ctx.accounts.global_config;
    global_config.authority = args.authority;

    Ok(())
}
