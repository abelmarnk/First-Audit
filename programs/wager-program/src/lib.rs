use anchor_lang::prelude::*;

pub mod errors;
pub mod instructions;
pub mod state;
pub mod utils;

use instructions::*;

declare_id!("5Gm2UmBRA36mQrYcty2dopLL5rKzCHdgLMynXgiM7AbR");

pub const TOKEN_ID: Pubkey = pubkey!("6NSc7XKGkGUYczHqW3xa2Yftxr5n9iUtLwSQtvtGbxsX");

#[program]
pub mod wager_program {
    use super::*;

     pub fn create_global_state(
        ctx: Context<CreateGlobalConfigAccounts>,
        args: CreateGlobalConfigArgs
    ) -> Result<()> {
        create_global_config_handler(ctx, args)
    }

    pub fn update_global_state(
        ctx: Context<UpdateGlobalConfigAccounts>,
        args: UpdateGlobalConfigArgs
    ) -> Result<()> {
        update_global_config_handler(ctx, args)
    }

    pub fn create_game_session(
        ctx: Context<CreateGameSessionAccounts>,
        args: CreateGameSessionArgs,
    ) -> Result<()> {
        create_game_session_handler(ctx, args)
    }

    pub fn join_user(
        ctx: Context<JoinUserAccounts>, 
        args: JoinUserArgs
    ) -> Result<()> {
        join_user_handler(ctx, args)
    }

    pub fn distribute_winnings<'info>(
        ctx: Context<'_, '_, 'info, 'info, DistributeWinningsAccounts<'info>>,
        args: DistributeWinningsArgs,
    ) -> Result<()> {
        distribute_all_winnings_handler(ctx, args)
    }

    pub fn distribute_pay_to_spawn_winnings<'info>(
        ctx: Context<'_, '_, 'info, 'info, DistributeWinningsAccounts<'info>>,
    ) -> Result<()> {
        distribute_pay_spawn_earnings_handler(ctx)
    }

    pub fn pay_to_spawn(
        ctx: Context<PayToSpawnAccounts>, 
        args: PayToSpawnArgs
    ) -> Result<()> {
        pay_to_spawn_handler(ctx, args)
    }

    pub fn record_kill(
        ctx: Context<RecordKillAccounts>, 
        args: RecordKillArgs
    ) -> Result<()> {
        record_kill_handler(ctx, args)
    }

    pub fn refund_wager<'info>(
        ctx: Context<'_, '_, 'info, 'info, RefundWagerAccounts<'info>>,
    ) -> Result<()> {
        refund_wager_handler(ctx)
    }
}
