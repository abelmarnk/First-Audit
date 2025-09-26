//! State for the game session
use std::ops::AddAssign;
use anchor_lang::prelude::*;
use crate::{
    errors::WagerError,
    state::{
        GameMode, GameStatus, game_state::MAX_SESSION_ID_LENGTH, team::{
            Team, 
            TeamType
        }
    }
};

/// Represents a game session between teams with its own pool
#[derive(InitSpace)]
#[account]
pub struct GameSession {
    #[max_len(MAX_SESSION_ID_LENGTH)]
    pub session_id: String,  
    pub session_wager: u64,  
    pub game_mode: GameMode, // Game configuration (1v1, 3v3, 5v5)
    pub team_a: Team,        // First team
    pub team_b: Team,        // Second team
    pub status: GameStatus,  
    pub created_at: i64,     
    pub creator_team: TeamType,
    pub bump: u8,            
    pub vault_bump: u8,      
}

impl GameSession {
    /// Create a new GameSession
    #[inline(always)]
    pub fn new(
        session_id: String,
        session_wager: u64,
        game_mode: GameMode,
        created_at: i64,
        creator_team: TeamType,
        bump: u8,
        vault_bump: u8,
    ) -> Self {

        Self {
            session_id,
            session_wager,
            game_mode,
            team_a:Team::default(),
            team_b:Team::default(),
            status:GameStatus::WaitingForPlayers,
            created_at,
            creator_team,
            bump,
            vault_bump,
        }
    }

    #[inline(always)]
    pub fn is_in_progress(&self) -> bool{
        self.status.eq(&GameStatus::InProgress)
    }

    #[inline(always)]
    pub fn is_waiting_for_players(&self) -> bool{
        self.status.eq(&GameStatus::WaitingForPlayers)
    }

    #[inline(always)]
    pub fn is_completed(&self) -> bool{
        self.status.eq(&GameStatus::Completed)
    }

    #[inline(always)]
    /// Get's the creator's key, it is always the first on their team
    pub fn get_creator(&self)->&Pubkey{
        match self.creator_team  {
            TeamType::TeamA =>{
                &self.team_a.players[0]
            },
            TeamType::TeamB =>{
                &self.team_b.players[0]
            }
        }
    }

    /// Tries to add a player to the specified team
    pub fn try_add_player_to_team(
        &mut self,
        team: TeamType,
        player_key: &Pubkey,
    ) -> Result<()> {
        match team {
            TeamType::TeamA => self.team_a.
                try_add_new_player(player_key, self.game_mode.players_per_team()),
            TeamType::TeamB => self.team_b.
                try_add_new_player(player_key, self.game_mode.players_per_team())
        }
    }

    /// Checks if a player is a member of any team
    pub fn has_player(
        &self, 
        player: &Pubkey
    ) -> bool {
        self.team_a.has_player(player) || self.team_b.has_player(player)
    }

    /// Checks if both teams are completely filled
    /// It asserts that a player is in the game if they have made
    /// their original deposit, so basically it gets all the players
    /// that have made their deposits and compares them to the amount 
    /// of players that should be on the game based on the game mode
    #[inline(always)]    
    pub fn is_all_filled(&self) -> bool{
        let player_count = self.game_mode.players_per_team();

        player_count.eq(&usize::from(self.team_a.player_count)) &&
            player_count.eq(&usize::from(self.team_b.player_count))
    }

    /// Checks if a game is a pay to spawn game
    #[inline(always)]    
    pub fn is_pay_to_spawn(&self) -> bool {
        matches!(
            self.game_mode,
            GameMode::PayToSpawnOneVsOne
                | GameMode::PayToSpawnThreeVsThree
                | GameMode::PayToSpawnFiveVsFive
        )
    }

    /// Get all players that have joined the game, this is different from the above counterpart
    /// in that it does not get based on the player count for the game but rather based on 
    /// the count of players that have actually joined the game and made deposits
    pub fn get_game_players(&self) -> Vec<Pubkey> {

        let team_a_game_players = self.team_a.get_game_players();

        let team_b_game_players = self.team_b.get_game_players();

        let mut players = 
            Vec::with_capacity(
                team_a_game_players.len() + 
                team_b_game_players.len()
            );

        players.extend_from_slice(team_a_game_players);

        players.extend_from_slice(team_b_game_players);

        players
    }

    /// Get the total number of times each player that has joined 
    /// the game has paid for spawns
    pub fn get_game_players_total_spawns_additions(&self) -> Vec<u16> {
        let team_a_game_total_spawns_additions = 
            self.team_a.get_game_total_spawns_additions();

        let team_b_game_total_spawns_additions = 
            self.team_b.get_game_total_spawns_additions();

        let mut game_players_total_spawns_additions = 
            Vec::with_capacity(
                team_a_game_total_spawns_additions.len() + 
                team_b_game_total_spawns_additions.len()
            );

        game_players_total_spawns_additions.
            extend_from_slice(team_a_game_total_spawns_additions);

        game_players_total_spawns_additions.
            extend_from_slice(team_b_game_total_spawns_additions);

        game_players_total_spawns_additions
    }

    /// Get the total number of kills and spawns(the sum of both) for each 
    /// player that has joined the game
    pub fn get_game_players_kills_and_spawns(&self) -> Vec<u32> {
        let team_a_game_kills_and_spawns = 
            self.team_a.get_game_kills();

        let team_b_game_kills_and_spawns = 
            self.team_b.get_game_kills();

        let mut game_players_kills_and_spawns = 
            Vec::with_capacity(
                team_a_game_kills_and_spawns.len() + 
                team_b_game_kills_and_spawns.len()
            );
            
        game_players_kills_and_spawns.
            extend(team_a_game_kills_and_spawns.
                iter().map(|value| u32::from(*value))
            );

        game_players_kills_and_spawns.
            extend(team_b_game_kills_and_spawns.
                iter().map(|vaule| u32::from(*vaule))
            );

        for (kills_and_spawns, spawns) in game_players_kills_and_spawns.
            iter_mut().zip(self.team_a.get_game_spawns_remaining().
            iter().chain(self.team_b.get_game_spawns_remaining().iter())){
            // Overflow is not possible here
            kills_and_spawns.add_assign(u32::from(*spawns));
        }

        game_players_kills_and_spawns
    }

    


    /// Adds a kill for the killer and subtracts a spawn for the victim, it does not perform
    /// bounds checking or that the keys or teams are distinct.
    pub fn add_kill(
        &mut self,
        killer_team: TeamType,
        killer_index: usize,
        killer_key: &Pubkey,
        victim_team: TeamType,
        victim_index: usize,
        victim_key: &Pubkey,
        ) -> Result<()> {
        
        // If the killer and victim are on the same team then add no kills for them
        // and just deduct their spawns
        if killer_team.ne(&victim_team){
            // Add kill to killer
            match killer_team {
                TeamType::TeamA => {
                    if self.team_a.players[killer_index].ne(killer_key){
                        return Err(WagerError::PlayerNotFound.into());
                    }
                    self.team_a.add_kill_for_player_at(killer_index)?;
                }
                TeamType::TeamB => {
                    if self.team_b.players[killer_index].ne(killer_key){
                        return Err(WagerError::PlayerNotFound.into());
                    }
                    self.team_b.add_kill_for_player_at(killer_index)?;
                }
            }
        }

        // Subtract spawn from victim
        match victim_team {
            TeamType::TeamA => {
                if self.team_a.players[victim_index].ne(victim_key){
                    return Err(WagerError::PlayerNotFound.into());
                }
                self.team_a.kill_player_at(victim_index)?;
            }
            TeamType::TeamB => {
                if self.team_b.players[victim_index].ne(victim_key){
                    return Err(WagerError::PlayerNotFound.into());
                }
                self.team_b.kill_player_at(victim_index)?;
            }
        }

        Ok(())
    }

    /// Adds a spawn to a player at a specific team
    pub fn add_spawns(
        &mut self, 
        team: TeamType, 
        player_key: &Pubkey, 
        player_index: usize
    ) -> Result<()> {
        match team {
            TeamType::TeamA => {
                if self.team_a.players[player_index].ne(player_key){
                    return Err(WagerError::PlayerNotFound.into());
                }
                self.team_a.add_spawns_for_player_at(player_index)
            }
            TeamType::TeamB => {
                if self.team_b.players[player_index].ne(player_key){
                    return Err(WagerError::PlayerNotFound.into());
                }
                self.team_b.add_spawns_for_player_at(player_index)
            }
        }
    }
}

