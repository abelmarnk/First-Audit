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
  getVaultTokenAccount,
  setupTokenAccount,
  airdropToAccounts,
  getTokenBalance,
  getSessionId,
  getGlobalConfigKey,
  getGameServerKeypair,
  getMintKey,
} from "./utils";

const confirmOptions: ConfirmOptions = { commitment: "confirmed" };

describe("Pay to spawn", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.WagerProgram as Program<WagerProgram>;

  const mintKey = getMintKey();

  let gameServerKeypair:Keypair;

  const wagerAmount = new BN(100000000); // 0.1 tokens

  const user1 = Keypair.generate();
  const user2 = Keypair.generate();
  const user3 = Keypair.generate();

  let user1TokenAccount: PublicKey;
  let user2TokenAccount: PublicKey;
  let user3TokenAccount: PublicKey;

  const globalConfigKey = getGlobalConfigKey(program.programId);

  before(async () => {

    gameServerKeypair = getGameServerKeypair();

    // Airdrop SOL for fees
    await airdropToAccounts(provider.connection, [
      gameServerKeypair.publicKey,
      user1.publicKey,
      user2.publicKey,
      user3.publicKey
    ]);

    // Setup token accounts
    user1TokenAccount = await setupTokenAccount(
      provider.connection,
      gameServerKeypair,
      mintKey,
      user1.publicKey
    );

    user2TokenAccount = await setupTokenAccount(
      provider.connection,
      gameServerKeypair,
      mintKey,
      user2.publicKey
    );

    user3TokenAccount = await setupTokenAccount(
      provider.connection,
      gameServerKeypair,
      mintKey,
      user3.publicKey,
      wagerAmount.add(wagerAmount.div(new BN(2))).toNumber()
    );

  });
  it("User successfully pays to spawn", async () => {
    const sessionId = getSessionId(61);

    const gameSessionKey = getGameSessionKey(program.programId, sessionId);

    const vaultKey = getVaultKey(program.programId, sessionId);

    // Arguments for the `create_game_session` instruction
    const createGameSessionArgs:types.CreateGameSessionArgs = {
      sessionId: sessionId,
      wagerAmount: wagerAmount,
      gameMode: { payToSpawnOneVsOne: {} },
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

    // Join user2   
    await program.methods
      .joinUser({team:{teamB:{}}})
      .accountsPartial({
        user: user2.publicKey,
        userTokenAccount: user2TokenAccount,
        globalConfig:globalConfigKey,
        gameSession:gameSessionKey,
        vault: vaultKey,
        mint: mintKey,
        server:gameServerKeypair.publicKey,
      })
      .signers([user2, gameServerKeypair])
      .rpc(confirmOptions);

    const gameSessionAccount = await program.account.gameSession.fetch(gameSessionKey);

    const currentSpawnCount = gameSessionAccount.teamB.playerSpawnsRemaining[0];

    console.log("Before pay to spawn:- ");

    console.log(`User2 account${user2.publicKey}:- \n\n`);

    console.log("Account key:- ", gameSessionAccount.teamB.players[0]);

    // The spawn count is the number of spawns the user has left
    // e.g if the use has 50 spawns, then they have to be killed 50
    // more times before they lose the game
    console.log("Account spawn count:- ", currentSpawnCount);

    // The no of spawns additions is the number of times the user has paid for a spawn
    // including the very initial state when the game has started, e.g if the user
    // pays for 20 spawns then they would have paid twice, and this value would be 2
    console.log("Account no of spawn additions:- ", 
      gameSessionAccount.teamB.playersTotalSpawnsAdditions[0]);

    // Let user 2 pay to spawn once
    await program.methods
      .payToSpawn({ team: {teamB:{}}, index: 0 })
      .accountsPartial({
        user: user2.publicKey,
        gameSession: gameSessionKey,
        vault: vaultKey,
        userTokenAccount: user2TokenAccount,
      })
      .signers([user2])
      .rpc(confirmOptions);

    const newGameSessionAccount = await program.account.gameSession.fetch(gameSessionKey);

    const newCurrentSpawnCount = newGameSessionAccount.teamB.playerSpawnsRemaining[0];

    console.log("After pay to spawn:- ");

    console.log(`User2 account${user2.publicKey}:- \n\n`);

    console.log("Account key:- ", gameSessionAccount.teamB.players[0]);

    // The spawn count is the number of spawns the user has left
    // e.g if the use has 50 spawns, then they have to be killed 50
    // more times before they lose the game
    console.log("Account spawn count:- ", newCurrentSpawnCount);

    // The no of spawns additions is the number of times the user has paid for a spawn
    // including the very initial state when the game has started, e.g if the user
    // pays for 20 spawns then they would have paid twice, and this value would be 2
    console.log("Account no of spawn additions:- ", 
      newGameSessionAccount.teamB.playersTotalSpawnsAdditions[0]);

    assert((currentSpawnCount + 10) == newCurrentSpawnCount, 
      "The spawn count was supposed to be increased by 10");

  });

  it("User fails to pay to spawn with wrong index", async () => {
    const sessionId = getSessionId(62);

    const gameSessionKey = getGameSessionKey(program.programId, sessionId);

    const vaultKey = getVaultKey(program.programId, sessionId);

    // Arguments for the `create_game_session` instruction
    const createGameSessionArgs:types.CreateGameSessionArgs = {
      sessionId: sessionId,
      wagerAmount: wagerAmount,
      gameMode: { payToSpawnOneVsOne: {} },
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

    // Join user2   
    await program.methods
      .joinUser({team:{teamB:{}}})
      .accountsPartial({
        user: user2.publicKey,
        userTokenAccount: user2TokenAccount,
        globalConfig:globalConfigKey,
        gameSession:gameSessionKey,
        vault: vaultKey,
        mint: mintKey,
        server:gameServerKeypair.publicKey,
      })
      .signers([user2, gameServerKeypair])
      .rpc(confirmOptions);

    const gameSessionAccount = await program.account.gameSession.fetch(gameSessionKey);

    const currentSpawnCount = gameSessionAccount.teamB.playerSpawnsRemaining[0];

    console.log("Before pay to spawn:- ");

    console.log(`User2 account${user2.publicKey}:- \n\n`);

    console.log("Account key:- ", gameSessionAccount.teamB.players[0]);

    // The spawn count is the number of spawns the user has left
    // e.g if the use has 50 spawns, then they have to be killed 50
    // more times before they lose the game
    console.log("Account spawn count:- ", currentSpawnCount);

    // The no of spawns additions is the number of times the user has paid for a spawn
    // including the very initial state when the game has started, e.g if the user
    // pays for 20 spawns then they would have paid twice, and this value would be 2
    console.log("Account no of spawn additions:- ", 
      gameSessionAccount.teamB.playersTotalSpawnsAdditions[0]);

    try{
      // Try to pay to spawn
      await program.methods
        .payToSpawn({ team: {teamB:{}}, index: 1 }) // Wrong index
        .accountsPartial({
          user: user2.publicKey,
          gameSession: gameSessionKey,
          vault: vaultKey,
          userTokenAccount: user2TokenAccount,
        })
        .signers([user2])
        .rpc(confirmOptions);

        assert.fail("This transaction should have failed the user's index was not correct")
    } catch(err){
      assert(err instanceof anchor.AnchorError, "Unknown Error");

      const anchorError = err;
      assert(anchorError.error.errorCode.code == "PlayerNotFound")
    }
  });

  it("User fails to pay to spawn with insufficent funds ", async () => {
    const sessionId = getSessionId(63);

    const gameSessionKey = getGameSessionKey(program.programId, sessionId);

    const vaultKey = getVaultKey(program.programId, sessionId);

    console.log("Initial balances:-\n\n");
    console.log("User 1:-", await getTokenBalance(provider.connection, user1TokenAccount));
    console.log("User 3:-", await getTokenBalance(provider.connection, user3TokenAccount));

    // Arguments for the `create_game_session` instruction
    const createGameSessionArgs:types.CreateGameSessionArgs = {
      sessionId: sessionId,
      wagerAmount: wagerAmount,
      gameMode: { payToSpawnOneVsOne: {} },
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

    // Join user3   
    await program.methods
      .joinUser({team:{teamB:{}}})
      .accountsPartial({
        user: user3.publicKey,
        userTokenAccount: user3TokenAccount,
        globalConfig:globalConfigKey,
        gameSession:gameSessionKey,
        vault: vaultKey,
        mint: mintKey,
        server:gameServerKeypair.publicKey,
      })
      .signers([user3, gameServerKeypair])
      .rpc(confirmOptions);

    const gameSessionAccount = await program.account.gameSession.fetch(gameSessionKey);

    const currentSpawnCount = gameSessionAccount.teamB.playerSpawnsRemaining[0];

    console.log("Before pay to spawn:- ");

    console.log(`User3 account${user3.publicKey}:- \n\n`);

    console.log("Account key:- ", gameSessionAccount.teamB.players[0]);

    // The spawn count is the number of spawns the user has left
    // e.g if the use has 50 spawns, then they have to be killed 50
    // more times before they lose the game
    console.log("Account spawn count:- ", currentSpawnCount);

    // The no of spawns additions is the number of times the user has paid for a spawn
    // including the very initial state when the game has started, e.g if the user
    // pays for 20 spawns then they would have paid twice, and this value would be 2
    console.log("Account no of spawn additions:- ", 
      gameSessionAccount.teamB.playersTotalSpawnsAdditions[0]);

    try{
      // Try to pay to spawn
      await program.methods
        .payToSpawn({ team: {teamB:{}}, index: 0 })
        .accountsPartial({
          user: user3.publicKey, 
          gameSession: gameSessionKey,
          vault: vaultKey,
          userTokenAccount: user3TokenAccount, // Not enough balance
        })
        .signers([user3])
        .rpc(confirmOptions);

        assert.fail("This transaction should have failed the user's funds were not sufficient")
    } catch(err){
      assert.include(err.message, "insufficient funds")
    }
  });

  it("User fails to pay to spawn due to different game type", async () => {
    const sessionId = getSessionId(64);

    const gameSessionKey = getGameSessionKey(program.programId, sessionId);

    const vaultKey = getVaultKey(program.programId, sessionId);

    // Arguments for the `create_game_session` instruction
    const createGameSessionArgs:types.CreateGameSessionArgs = {
      sessionId: sessionId,
      wagerAmount: wagerAmount,
      gameMode: { winnerTakesAllOneVsOne: {} }, // Not a pay to spawn type game
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

    // Join user2   
    await program.methods
      .joinUser({team:{teamB:{}}})
      .accountsPartial({
        user: user2.publicKey,
        userTokenAccount: user2TokenAccount,
        globalConfig:globalConfigKey,
        gameSession:gameSessionKey,
        vault: vaultKey,
        mint: mintKey,
        server:gameServerKeypair.publicKey,
      })
      .signers([user2, gameServerKeypair])
      .rpc(confirmOptions);

    const gameSessionAccount = await program.account.gameSession.fetch(gameSessionKey);

    const currentSpawnCount = gameSessionAccount.teamB.playerSpawnsRemaining[0];

    console.log("Before pay to spawn:- ");

    console.log(`User2 account${user2.publicKey}:- \n\n`);

    console.log("Account key:- ", gameSessionAccount.teamB.players[0]);

    // The spawn count is the number of spawns the user has left
    // e.g if the use has 50 spawns, then they have to be killed 50
    // more times before they lose the game
    console.log("Account spawn count:- ", currentSpawnCount);

    // The no of spawns additions is the number of times the user has paid for a spawn
    // including the very initial state when the game has started, e.g if the user
    // pays for 20 spawns then they would have paid twice, and this value would be 2
    console.log("Account no of spawn additions:- ", 
      gameSessionAccount.teamB.playersTotalSpawnsAdditions[0]);

    try{
      // Try to pay to spawn
      await program.methods
        .payToSpawn({ team: {teamB:{}}, index: 0 })
        .accountsPartial({
          user: user2.publicKey,
          gameSession: gameSessionKey,
          vault: vaultKey,
          userTokenAccount: user2TokenAccount,
        })
        .signers([user2])
        .rpc(confirmOptions);

        assert.fail("This transaction should have failed the game type does not support pay to spawn")
    } catch(err){
      assert(err instanceof anchor.AnchorError, "Unknown Error");

      const anchorError = err;
      assert(anchorError.error.errorCode.code == "InvalidGameState")
    }
  });
  
});