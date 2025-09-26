import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import * as types from "./types"
import { WagerProgram } from "../target/types/wager_program";
import { BN } from "@coral-xyz/anchor";
import { PublicKey, Keypair, ConfirmOptions } from "@solana/web3.js";
import { assert } from "chai";
import {
  getGameSessionKey,
  getVaultKey,
  setupTokenAccount,
  airdropToAccounts,
  getSessionId,
  getGlobalConfigKey,
  getGameServerKeypair,
  getMintKey,
} from "./utils";

const confirmOptions: ConfirmOptions = { commitment: "confirmed" };

describe("Record Kill", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.WagerProgram as Program<WagerProgram>;

  const mintKey = getMintKey();

  let gameServerKeypair:Keypair;

  const wagerAmount = new BN(100_000_000);

  const user1 = Keypair.generate();
  const user2 = Keypair.generate();
  const user3 = Keypair.generate();
  const user4 = Keypair.generate();
  const user5 = Keypair.generate();
  const user6 = Keypair.generate();

  let user1TokenAccount: PublicKey;
  let user2TokenAccount: PublicKey;
  let user3TokenAccount: PublicKey;
  let user4TokenAccount: PublicKey;
  let user5TokenAccount: PublicKey;
  let user6TokenAccount: PublicKey;

  const globalConfigKey = getGlobalConfigKey(program.programId);

  before(async () => {
    gameServerKeypair = getGameServerKeypair();

    await airdropToAccounts(provider.connection, [
      gameServerKeypair.publicKey,
      user1.publicKey,
      user2.publicKey,
      user3.publicKey,
      user4.publicKey,
      user5.publicKey,
      user6.publicKey
    ]);

    user1TokenAccount = await setupTokenAccount(provider.connection, gameServerKeypair, mintKey, user1.publicKey);
    user2TokenAccount = await setupTokenAccount(provider.connection, gameServerKeypair, mintKey, user2.publicKey);
    user3TokenAccount = await setupTokenAccount(provider.connection, gameServerKeypair, mintKey, user3.publicKey);
    user4TokenAccount = await setupTokenAccount(provider.connection, gameServerKeypair, mintKey, user4.publicKey);
    user5TokenAccount = await setupTokenAccount(provider.connection, gameServerKeypair, mintKey, user5.publicKey);
    user6TokenAccount = await setupTokenAccount(provider.connection, gameServerKeypair, mintKey, user6.publicKey);
  });

  it("Records kills successfully under 10", async () => {
    const sessionId = getSessionId(51);

    const gameSessionKey = getGameSessionKey(program.programId, sessionId);

    const vaultKey = getVaultKey(program.programId, sessionId);

    // Arguments for the `create_game_session` instruction
    const createGameSessionArgs:types.CreateGameSessionArgs = {
      sessionId: sessionId,
      wagerAmount: wagerAmount,
      gameMode: { winnerTakesAllThreeVsThree: {} },
      creatorTeam: {teamA:{}}
    };

    // Create the game session
    await program.methods
      .createGameSession(createGameSessionArgs)
      .accountsPartial({
        user: user1.publicKey,
        gameSession: gameSessionKey,
        vault: vaultKey,
        userTokenAccount: user1TokenAccount,
        mint: mintKey,
      })
      .signers([user1])
      .rpc(confirmOptions);    

    const joinConfigs:{user:Keypair, tokenAccount:PublicKey, team:types.TeamType}[] = [
            { user: user2, tokenAccount: user2TokenAccount, team: {teamB:{}} },
            { user: user3, tokenAccount: user3TokenAccount, team: {teamA:{}} },
            { user: user4, tokenAccount: user4TokenAccount, team: {teamB:{}} },
            { user: user5, tokenAccount: user5TokenAccount, team: {teamA:{}} },
            { user: user6, tokenAccount: user6TokenAccount, team: {teamB:{}} },
          ];
      
    // Join all the users into the team
    for (const config of joinConfigs) {
      await program.methods
        .joinUser({ team: config.team })
        .accountsPartial({
          user: config.user.publicKey,
          gameSession: gameSessionKey,
          userTokenAccount: config.tokenAccount,
          globalConfig:globalConfigKey,
          server:gameServerKeypair.publicKey,
          mint: mintKey,
          vault:vaultKey          
        })
        .signers([config.user, gameServerKeypair])
        .rpc(confirmOptions);
    }

    const recordKillArgs: types.RecordKillArgs = {
      killerTeam: {teamA:{}},
      killerIndex: 0,
      killer: user1.publicKey,
      victimTeam: {teamB:{}},
      victimIndex: 0,
      victim: user2.publicKey
    };

    await program.methods
      .recordKill(recordKillArgs)
      .accountsPartial({ 
        gameSession: gameSessionKey, 
        globalConfig: globalConfigKey, 
        server: gameServerKeypair.publicKey 
    })
      .signers([gameServerKeypair])
      .rpc(confirmOptions);

    const gameSessionAccount = await program.account.gameSession.fetch(gameSessionKey);

    console.log("After record kill:- ");
    console.log("User1 kills:-", gameSessionAccount.teamA.playerKills[0]);
    console.log("User2 spawns remaining:-", gameSessionAccount.teamB.playerSpawnsRemaining[0]);

    assert(gameSessionAccount.teamA.playerKills[0] == 1);
    assert(gameSessionAccount.teamB.playerSpawnsRemaining[0] == 9);
  });

  it("Fails to record kill when victim spawns are exhausted", async () => {
    const sessionId = getSessionId(52);

    const gameSessionKey = getGameSessionKey(program.programId, sessionId);

    const vaultKey = getVaultKey(program.programId, sessionId);

    // Arguments for the `create_game_session` instruction
    const createGameSessionArgs:types.CreateGameSessionArgs = {
      sessionId: sessionId,
      wagerAmount: wagerAmount,
      gameMode: { winnerTakesAllThreeVsThree: {} },
      creatorTeam: {teamA:{}}
    };

    // Create the game session
    await program.methods
      .createGameSession(createGameSessionArgs)
      .accountsPartial({
        user: user1.publicKey,
        gameSession: gameSessionKey,
        vault: vaultKey,
        userTokenAccount: user1TokenAccount,
        mint: mintKey,
      })
      .signers([user1])
      .rpc(confirmOptions);    

   const joinConfigs:{user:Keypair, tokenAccount:PublicKey, team:types.TeamType}[] = [
            { user: user2, tokenAccount: user2TokenAccount, team: {teamB:{}} },
            { user: user3, tokenAccount: user3TokenAccount, team: {teamA:{}} },
            { user: user4, tokenAccount: user4TokenAccount, team: {teamB:{}} },
            { user: user5, tokenAccount: user5TokenAccount, team: {teamA:{}} },
            { user: user6, tokenAccount: user6TokenAccount, team: {teamB:{}} },
          ];
      
    // Join all the users into the team
    for (const config of joinConfigs) {
      await program.methods
        .joinUser({ team: config.team })
        .accountsPartial({
          user: config.user.publicKey,
          gameSession: gameSessionKey,
          userTokenAccount: config.tokenAccount,
          globalConfig:globalConfigKey,
          server:gameServerKeypair.publicKey,
          mint: mintKey,
          vault:vaultKey          
        })
        .signers([config.user, gameServerKeypair])
        .rpc(confirmOptions);
    }

    const recordKillArgs: types.RecordKillArgs = {
      killerTeam: {teamA:{}},
      killerIndex: 0,
      killer: user1.publicKey,
      victimTeam: {teamB:{}},
      victimIndex: 0,
      victim: user2.publicKey
    };

    for (let i = 0; i < 10; i++) {
      // Kill player 2 ruthlessly
      await program.methods
        .recordKill(recordKillArgs)
        .accountsPartial({ 
            gameSession: gameSessionKey, 
            globalConfig: globalConfigKey, 
            server: gameServerKeypair.publicKey 
        })
        .signers([gameServerKeypair])
        .rpc(confirmOptions);
    }

    try {
      // Make it a genocide
      await program.methods
        .recordKill(recordKillArgs)
        .accountsPartial({ 
            gameSession: gameSessionKey, 
            globalConfig: globalConfigKey, 
            server: gameServerKeypair.publicKey 
        })
        .signers([gameServerKeypair])
        .rpc(confirmOptions);
      assert.fail("This transaction should have failed, victim has no spawns left");
    } catch (err) {
      assert(err instanceof anchor.AnchorError, "Unknown Error");

      const anchorError = err;
      
      assert(anchorError.error.errorCode.code == "PlayerHasNoSpawns");
    }
  });

  it("Fails to record kill before game starts", async () => {
    const sessionId = getSessionId(53);

    const gameSessionKey = getGameSessionKey(program.programId, sessionId);

    const vaultKey = getVaultKey(program.programId, sessionId);

    // Arguments for the `create_game_session` instruction
    const createGameSessionArgs:types.CreateGameSessionArgs = {
      sessionId: sessionId,
      wagerAmount: wagerAmount,
      gameMode: { winnerTakesAllThreeVsThree: {} },
      creatorTeam: {teamA:{}}
    };

    // Create the game session
    await program.methods
      .createGameSession(createGameSessionArgs)
      .accountsPartial({
        user: user1.publicKey,
        gameSession: gameSessionKey,
        vault: vaultKey,
        userTokenAccount: user1TokenAccount,
        mint: mintKey,
      })
      .signers([user1])
      .rpc(confirmOptions);    

    const joinConfigs:{user:Keypair, tokenAccount:PublicKey, team:types.TeamType}[] = [
            { user: user2, tokenAccount: user2TokenAccount, team: {teamB:{}} },
            { user: user3, tokenAccount: user3TokenAccount, team: {teamA:{}} },
            { user: user4, tokenAccount: user4TokenAccount, team: {teamB:{}} },
            { user: user5, tokenAccount: user5TokenAccount, team: {teamA:{}} },
            // { user: user6, tokenAccount: user6TokenAccount, team: {teamB:{}} },
          ];
      
    // Join all the users into the team
    for (const config of joinConfigs) {
      await program.methods
        .joinUser({ team: config.team })
        .accountsPartial({
          user: config.user.publicKey,
          gameSession: gameSessionKey,
          userTokenAccount: config.tokenAccount,
          globalConfig:globalConfigKey,
          server:gameServerKeypair.publicKey,          
          mint: mintKey,
          vault:vaultKey          
        })
        .signers([config.user, gameServerKeypair])
        .rpc(confirmOptions);

        // User 6 not joined
    }

    const recordKillArgs: types.RecordKillArgs = {
      killerTeam: {teamA:{}},
      killerIndex: 0,
      killer: user1.publicKey,
      victimTeam: {teamB:{}},
      victimIndex: 0,
      victim: user2.publicKey
    };

    try {
      // Try to kill when player 6 is yet to join
      await program.methods
        .recordKill(recordKillArgs)
        .accountsPartial({ 
            gameSession: gameSessionKey, 
            globalConfig: globalConfigKey, 
            server: gameServerKeypair.publicKey 
        })
        .signers([gameServerKeypair])
        .rpc(confirmOptions);
      assert.fail("This transaction should have failed, game not started");
    } catch (err) {
      assert(err instanceof anchor.AnchorError, "Unknown Error");
      const anchorError = err;
      assert(anchorError.error.errorCode.code == "GameNotInProgress");
    }
  });

  it("Self or team kill only subtracts spawns", async () => {
    const sessionId = getSessionId(54);

    const gameSessionKey = getGameSessionKey(program.programId, sessionId);

    const vaultKey = getVaultKey(program.programId, sessionId);

    // Arguments for the `create_game_session` instruction
    const createGameSessionArgs:types.CreateGameSessionArgs = {
      sessionId: sessionId,
      wagerAmount: wagerAmount,
      gameMode: { winnerTakesAllThreeVsThree: {} },
      creatorTeam: {teamA:{}}
    };

    // Create the game session
    await program.methods
      .createGameSession(createGameSessionArgs)
      .accountsPartial({
        user: user1.publicKey,
        gameSession: gameSessionKey,
        vault: vaultKey,
        userTokenAccount: user1TokenAccount,
        mint: mintKey,
      })
      .signers([user1])
      .rpc(confirmOptions);    

   const joinConfigs:{user:Keypair, tokenAccount:PublicKey, team:types.TeamType}[] = [
            { user: user2, tokenAccount: user2TokenAccount, team: {teamB:{}} },
            { user: user3, tokenAccount: user3TokenAccount, team: {teamA:{}} },
            { user: user4, tokenAccount: user4TokenAccount, team: {teamB:{}} },
            { user: user5, tokenAccount: user5TokenAccount, team: {teamA:{}} },
            { user: user6, tokenAccount: user6TokenAccount, team: {teamB:{}} },
          ];
      
    // Join all the users into the team
    for (const config of joinConfigs) {
      await program.methods
        .joinUser({ team: config.team })
        .accountsPartial({
          user: config.user.publicKey,
          gameSession: gameSessionKey,
          userTokenAccount: config.tokenAccount,
          globalConfig:globalConfigKey,
          server:gameServerKeypair.publicKey,
          mint: mintKey,
          vault:vaultKey          
        })
        .signers([config.user, gameServerKeypair])
        .rpc(confirmOptions);
    }

    const recordKillArgs: types.RecordKillArgs = {
      killerTeam: {teamA:{}},
      killerIndex: 0,
      killer: user1.publicKey,
      victimTeam: {teamA:{}},
      victimIndex: 1,
      victim: user3.publicKey
    };

    await program.methods
      .recordKill(recordKillArgs)
      .accountsPartial({ 
        gameSession: gameSessionKey, 
        globalConfig: globalConfigKey, 
        server: gameServerKeypair.publicKey 
    })
      .signers([gameServerKeypair])
      .rpc(confirmOptions);

    const gameSessionAccount = await program.account.gameSession.fetch(gameSessionKey);

    console.log("After team kill :-");
    console.log("User1 kills:-", gameSessionAccount.teamA.playerKills[0]);
    console.log("User3 spawns remaining:-", gameSessionAccount.teamA.playerSpawnsRemaining[1]);

    assert(gameSessionAccount.teamA.playerKills[0] == 0);
    assert(gameSessionAccount.teamA.playerSpawnsRemaining[1] == 9);
  });
});
