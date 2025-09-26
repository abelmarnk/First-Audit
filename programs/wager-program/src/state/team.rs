//! State accounts for the team
use std::ops::AddAssign;

use crate::{errors::WagerError, state::{MAX_PLAYERS_PER_TEAM, SPAWNS_PER_DEPOSIT}};
use anchor_lang::prelude::*;

/// Represents a team in the game
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Default, InitSpace)]
pub struct Team {
    pub players:[Pubkey; MAX_PLAYERS_PER_TEAM],
    pub player_spawns_remaining:[u16; MAX_PLAYERS_PER_TEAM],
    pub player_kills:[u16; MAX_PLAYERS_PER_TEAM], 
    // Number of times the user has paid for spawns
    pub players_total_spawns_additions:[u16;MAX_PLAYERS_PER_TEAM], 
    // Number of players who have joined the game
    // We store this so we don't have to search for empty spaces
    pub player_count:u8 
}

impl Team {

    pub fn default() -> Self {

        Team {
            players: [Pubkey::default(); MAX_PLAYERS_PER_TEAM],
            player_spawns_remaining: [0; MAX_PLAYERS_PER_TEAM],
            player_kills: [0; MAX_PLAYERS_PER_TEAM],
            players_total_spawns_additions:[0;MAX_PLAYERS_PER_TEAM],
            player_count:0
        }
    }

    /// This does not perform explicit bounds checking and it assumes
    /// `players_per_team` is less than or equal to MAX_PLAYERS_PER_TEAM
    /// It also does not check that the player already exists
    pub fn try_add_new_player(&mut self, new_player:&Pubkey, players_per_team:usize)->Result<()> {
        
        if self.has_player(new_player){
            return Err(WagerError::PlayerAlreadyInGame.into());
        }
        
        let player_count = usize::from(self.player_count);

        if player_count.ge(&players_per_team){
            return Err(WagerError::TeamIsFull.into());
        }
        
        self.players[player_count] = *new_player;
        self.players_total_spawns_additions[player_count] = 1;
        self.player_spawns_remaining[player_count] = 10;

        self.player_count.add_assign(1);

        Ok(())
    }

    /// Checks if a player is a member of the team
    #[inline(always)]
    pub fn has_player(&self, player: &Pubkey) -> bool {
        self.players[..usize::from(self.player_count)].iter().
            any(|p| p == player)
    }

    /// Get all the players that have joined the game
    #[inline(always)]
    pub fn get_game_players(&self) -> &[Pubkey] {
        &self.players[..usize::from(self.player_count)]
    }

    /// Get all the kills for players that have joined the game
    #[inline(always)]
    pub fn get_game_kills(&self) -> &[u16] {
        &self.player_kills[..usize::from(self.player_count)]
    }

    /// Get all the spawns for players that have joined the game
    #[inline(always)]
    pub fn get_game_spawns_remaining(&self) -> &[u16] {
        &self.player_spawns_remaining[..usize::from(self.player_count)]
    }

    /// Get all the total deposits for players that have joined the game
    #[inline(always)]
    pub fn get_game_total_spawns_additions(&self) -> &[u16] {
        &self.players_total_spawns_additions[..usize::from(self.player_count)]
    }

    /// Adds spawns for an existing player by index.
    /// This function does NOT perform any bounds checking on the index.
    #[inline(always)]
    pub fn add_spawns_for_player_at(&mut self, player_index: usize) -> Result<()> {
        self.player_spawns_remaining[player_index] = self.player_spawns_remaining[player_index]
            .checked_add(SPAWNS_PER_DEPOSIT)
            .ok_or(ProgramError::ArithmeticOverflow)?;

        self.players_total_spawns_additions[player_index] = self.players_total_spawns_additions[player_index].
            checked_add(1).
            ok_or(ProgramError::ArithmeticOverflow)?;

        Ok(())
    }

    /// Adds a kill for an existing player by index.
    /// This function does NOT perform any bounds checking on the index.
    #[inline(always)]
    pub fn add_kill_for_player_at(&mut self, player_index: usize) -> Result<()> {
        self.player_kills[player_index] = self.player_kills[player_index]
            .checked_add(1)
            .ok_or(ProgramError::ArithmeticOverflow)?;
        Ok(())
    }

    /// Subtracts a spawn (kills) for an existing player by index.
    /// This function does NOT perform any bounds checking on the index.
    #[inline(always)]
    pub fn kill_player_at(&mut self, player_index: usize) -> Result<()> {
        self.player_spawns_remaining[player_index] = self.player_spawns_remaining[player_index]
            .checked_sub(1)
            .ok_or(WagerError::PlayerHasNoSpawns)?;
        Ok(())
    }

}

#[derive(AnchorDeserialize, AnchorSerialize, Copy, Clone, InitSpace, PartialEq)]
pub enum TeamType {
    TeamA,
    TeamB,
}

impl TryFrom<u8> for TeamType {
    type Error = Error;

    fn try_from(value: u8) -> Result<Self> {
        match value {
            0 => Ok(TeamType::TeamA),
            1 => Ok(TeamType::TeamB),
            _ => Err(WagerError::InvalidTeamSelection.into()),
        }
    }
}

impl From<TeamType> for u8 {
    fn from(team: TeamType) -> Self {
        match team {
            TeamType::TeamA => 0,
            TeamType::TeamB => 1,
        }
    }
}
