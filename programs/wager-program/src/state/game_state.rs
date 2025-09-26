//! State accounts for the game mode
use anchor_lang::prelude::*;

/// Max length for session id
pub const MAX_SESSION_ID_LENGTH: usize = 32; 
/// Max players for each team
pub const MAX_PLAYERS_PER_TEAM: usize = 5; 
/// Number of spawns a player gets for each deposit
pub const SPAWNS_PER_DEPOSIT:u16 = 10; 
/// Number of teams
pub const TEAM_COUNT:u64 = 2;

/// Account for storing the global state of the program
#[account]
#[derive(InitSpace)]
pub struct GlobalConfig{
    pub authority:Pubkey
}

/// Game mode defining the team sizes
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, InitSpace)]
pub enum GameMode {
    WinnerTakesAllOneVsOne,     // 1v1 game mode
    WinnerTakesAllThreeVsThree, // 3v3 game mode
    WinnerTakesAllFiveVsFive,   // 5v5 game mode
    PayToSpawnOneVsOne,         // 1v1 game mode
    PayToSpawnThreeVsThree,     // 3v3 game mode
    PayToSpawnFiveVsFive,       // 5v5 game mode
}

impl GameMode {
    /// Returns the required number of players per team
    pub fn players_per_team(&self) -> usize {
        match self {
            Self::WinnerTakesAllOneVsOne => 1,
            Self::WinnerTakesAllThreeVsThree => 3,
            Self::WinnerTakesAllFiveVsFive => 5,
            Self::PayToSpawnOneVsOne => 1,
            Self::PayToSpawnThreeVsThree => 3,
            Self::PayToSpawnFiveVsFive => 5,
        }
    }
}

/// Status of a game session
#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, InitSpace)]
pub enum GameStatus {
    WaitingForPlayers, // Waiting for players to join
    InProgress,        // Game is active with all players joined
    Completed,         // Game has finished and rewards distributed
}

impl Default for GameStatus {
    fn default() -> Self {
        Self::WaitingForPlayers
    }
}
