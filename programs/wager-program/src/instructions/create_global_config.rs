use anchor_lang::{
    prelude::*
};
use crate::{errors::WagerError, state::GlobalConfig};

// Should be changed later to a key we control.
const INITIALIZER:Pubkey = pubkey!("Ebyfu4HZyNm1zkfirVMHuD4r29bSmgofmy8uExwaLbgG");

/// Arguments for creating the global state.
/// - server: Pubkey of the admin/server authority.
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct CreateGlobalConfigArgs {
    pub server: Pubkey,
}

/// Accounts required for creating the global state.
/// - global_config: PDA account for global configuration.
/// - payer: Funds account creation.
/// - system_program: Needed to create accounts.
#[derive(Accounts)]
#[instruction(args: CreateGlobalConfigArgs)]
pub struct CreateGlobalConfigAccounts<'info> {
    #[account(
        init,
        payer = payer,
        space = 8 + GlobalConfig::INIT_SPACE,
        seeds = [b"global-config"],
        bump
    )]
    pub global_config: Account<'info, GlobalConfig>,

    #[account(
        mut
    )]
    pub payer: Signer<'info>,

    #[account(
        address = INITIALIZER @ WagerError::InvalidInitializer
    )]
    pub initializer:Signer<'info>,

    pub system_program: Program<'info, System>,
}



/// Creates the global state with the given server/admin authority.
pub fn create_global_config_handler(
    ctx: Context<CreateGlobalConfigAccounts>,
    args: CreateGlobalConfigArgs,
) -> Result<()> {

    let global_config = &mut ctx.accounts.global_config;
    global_config.authority = args.server;

    Ok(())
}
