import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { WagerProgram } from "../target/types/wager_program";
import *  as types from "./types";
import { BN } from "@coral-xyz/anchor";
import { assert } from "chai";
import {
  getSessionId,
  getGameSessionKey,
  getVaultKey,
  getMintKey,
  getGameServerKeypair,
  getSortedAndCreatorIndex,
  airdropToAccounts,
  setupTokenAccount,
} from "./utils";
import { 
  ConfirmOptions, 
  Keypair, 
  PublicKey
} from "@solana/web3.js";
import {
  createMint
} from "@solana/spl-token";

const confirmOptions: ConfirmOptions = { commitment: "confirmed" };


describe("Game Session Creation", () => {
  // Setup the environment
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.WagerProgram as Program<WagerProgram>;

  // Get the mint and server
  let mintKey = getMintKey();

  // Top-level describe blocks run first (synchronously), so if the server key is
  // updated in one test, later tests would otherwise see a stale key captured before
  // the update. Placing this inside an `it` block ensures the server key is refreshed
  // after the update and stays in sync for subsequent tests.
  let gameServerKeypair:Keypair;
  
  // Test users
  let user1 = Keypair.generate();
  let user2 = Keypair.generate();
  let user3 = Keypair.generate();

  let user1TokenAccount: PublicKey;
  let user2TokenAccount: PublicKey;
  let user3TokenAccount: PublicKey;

  // The amount being bet
  const sessionWager = new BN(100_000_000); // 0.1 tokens(9 decimals)

  before(async () => {

    // Set the server keypair
    gameServerKeypair = getGameServerKeypair();

    // Set up the other accounts that would be used in the test
    await airdropToAccounts(provider.connection, [
         gameServerKeypair.publicKey,
         user1.publicKey,
         user2.publicKey,
         user3.publicKey
    ]);
   
    // Amount given to users so the tests can pass
    const initialMintAmount = 1_000_000_000; // 1 token(9 decimals)

    user1TokenAccount = await setupTokenAccount(
      provider.connection, gameServerKeypair, mintKey, 
      user1.publicKey, initialMintAmount
    );

    user2TokenAccount = await setupTokenAccount(
      provider.connection, gameServerKeypair, mintKey, 
      user2.publicKey, initialMintAmount
    );

    user3TokenAccount = await setupTokenAccount(
      provider.connection, gameServerKeypair, mintKey, 
      user3.publicKey, initialMintAmount
    );
  });

  it("Successfully creates a game session with winner-takes-all 1v1 mode", async () => {
    const sessionId = getSessionId(1);

    const gameSessionKey = getGameSessionKey(program.programId, sessionId);

    const vaultKey = getVaultKey(program.programId, sessionId);

    // Arguments for the `create_game_session` instruction
    const createGameSessionArgs:types.CreateGameSessionArgs = {
      sessionId: sessionId,
      wagerAmount:sessionWager,
      gameMode: { winnerTakesAllOneVsOne: {} },
      creatorTeam: {teamA:{}}
    };

    // Create the game session
    await program.methods.
      createGameSession(createGameSessionArgs).
      accountsPartial({
        gameSession: gameSessionKey,
        vault: vaultKey,
        user: user1.publicKey,
        userTokenAccount: user1TokenAccount,
        mint: mintKey
      }).
      signers([user1]).
      rpc(confirmOptions);

    // Get the game session account, and confirm it is the way we created it
    const account = await program.account.gameSession.fetch(gameSessionKey);

    assert.equal(account.sessionId, sessionId);

    assert.equal(account.sessionWager.toString(), sessionWager.toString());

    assert.deepEqual(account.gameMode, { winnerTakesAllOneVsOne: {} });

    assert.deepEqual(account.status, {waitingForPlayers:{}});

    console.log("Game session: ", account);
  });

  it("Successfully creates a game session with winner-takes-all 3v3 mode", async () => {
    const sessionId = getSessionId(2);

    const gameSessionKey = getGameSessionKey(program.programId, sessionId);

    const vaultKey = getVaultKey(program.programId, sessionId);
    
    // Arguments for the `create_game_session` instruction
    const createGameSessionArgs:types.CreateGameSessionArgs = {
      sessionId: sessionId,
      wagerAmount: sessionWager,
      gameMode: { winnerTakesAllThreeVsThree: {} },
      creatorTeam: {teamB:{}}
    };

    // Create the game session
    await program.methods
      .createGameSession(createGameSessionArgs)
      .accountsPartial({
        user: user2.publicKey,
        gameSession: gameSessionKey,
        vault: vaultKey,
        userTokenAccount: user2TokenAccount,
        mint: mintKey
      })
      .signers([user2])
      .rpc(confirmOptions);

    // Get the game session account and confirm it is the way we created it
    const account = await program.account.gameSession.fetch(gameSessionKey);

    assert.equal(account.sessionId, sessionId);

    assert.equal(account.sessionWager.toString(), sessionWager.toString());

    assert.deepEqual(account.gameMode, { winnerTakesAllThreeVsThree: {} });

    console.log("Game session: ", account);
  });

  it("Successfully creates a game session with winner-takes-all 5v5 mode", async () => {
    const sessionId = getSessionId(3);

    const gameSessionKey = getGameSessionKey(program.programId, sessionId);

    const vaultKey = getVaultKey(program.programId, sessionId);

    // Arguments for the `create_game_session` instruction
    const createGameSessionArgs:types.CreateGameSessionArgs = {
      sessionId: sessionId,
      wagerAmount: sessionWager,
      gameMode: { winnerTakesAllFiveVsFive: {} },
      creatorTeam: {teamB:{}}
    };

    // Create the game session
    await program.methods
      .createGameSession(createGameSessionArgs)
      .accountsPartial({
        user: user1.publicKey,
        gameSession: gameSessionKey,
        vault: vaultKey,
        userTokenAccount: user1TokenAccount,
        mint: mintKey
      })
      .signers([user1])
      .rpc(confirmOptions);

    // Get the game session account and confirm it is the way we created it
    const account = await program.account.gameSession.fetch(gameSessionKey);

    assert.equal(account.sessionId, sessionId);

    assert.equal(account.sessionWager.toString(), sessionWager.toString());

    assert.deepEqual(account.gameMode, { winnerTakesAllFiveVsFive: {} });

    console.log("Game session: ", account);
  });

  it("Successfully creates a game session with pay-to-spawn 1v1 mode", async () => {
    const sessionId = getSessionId(4);

    const gameSessionKey = getGameSessionKey(program.programId, sessionId);

    const vaultKey = getVaultKey(program.programId, sessionId);


    // Arguments for the `create_game_session` instruction
    const createGameSessionArgs:types.CreateGameSessionArgs = {
      sessionId: sessionId,
      wagerAmount: sessionWager,
      gameMode: { payToSpawnOneVsOne: {} },
      creatorTeam: {teamA:{}}
    };

    // Create the game session
    await program.methods
      .createGameSession(createGameSessionArgs)
      .accountsPartial({
        user: user2.publicKey,
        gameSession: gameSessionKey,
        vault: vaultKey,
        userTokenAccount: user2TokenAccount,
        mint: mintKey
      })
      .signers([user2])
      .rpc(confirmOptions);

    // Get the game session account and confirm it is the way we created it
    const account = await program.account.gameSession.fetch(gameSessionKey);

    assert.equal(account.sessionId, sessionId);

    assert.equal(account.sessionWager.toString(), sessionWager.toString());

    assert.deepEqual(account.gameMode, { payToSpawnOneVsOne: {} });

    console.log("Game session: ", account);
  });

  it("Successfully creates a game session with pay-to-spawn 3v3 mode", async () => {
    const sessionId = getSessionId(5);

    const gameSessionKey = getGameSessionKey(program.programId, sessionId);

    const vaultKey = getVaultKey(program.programId, sessionId);


    // Arguments for the `create_game_session` instruction
    const createGameSessionArgs:types.CreateGameSessionArgs = {
      sessionId: sessionId,
      wagerAmount: sessionWager,
      gameMode: { payToSpawnThreeVsThree: {} },
      creatorTeam: {teamA:{}}
    };

    // Create the game session
    await program.methods
      .createGameSession(createGameSessionArgs)
      .accountsPartial({
        user: user3.publicKey,
        gameSession: gameSessionKey,
        vault: vaultKey,
        userTokenAccount: user3TokenAccount,
        mint: mintKey
      })
      .signers([user3])
      .rpc(confirmOptions);

    // Get the game session account and confirm it is the way we created it
    const account = await program.account.gameSession.fetch(gameSessionKey);

    assert.equal(account.sessionId, sessionId);

    assert.equal(account.sessionWager.toString(), sessionWager.toString());

    assert.deepEqual(account.gameMode, { payToSpawnThreeVsThree: {} });

    console.log("Game session: ", account);
  });

  it("Successfully creates a game session with pay-to-spawn 5v5 mode", async () => {
    const sessionId = getSessionId(6);

    const gameSessionKey = getGameSessionKey(program.programId, sessionId);

    const vaultKey = getVaultKey(program.programId, sessionId);

    // Arguments for the `create_game_session` instruction
    const createGameSessionArgs:types.CreateGameSessionArgs = {
      sessionId: sessionId,
      wagerAmount: sessionWager,
      gameMode: { payToSpawnFiveVsFive: {} },
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
        mint: mintKey
      })
      .signers([user1])
      .rpc(confirmOptions);

    // Get the game session account and confirm it is the way we created it
    const account = await program.account.gameSession.fetch(gameSessionKey);
    
    assert.equal(account.sessionId, sessionId);

    assert.equal(account.sessionWager.toString(), sessionWager.toString());

    assert.deepEqual(account.gameMode, { payToSpawnFiveVsFive: {} });

    console.log("Game session: ", account);
  });

  it("Rounds wager amount to nearest multiple of 10", async () => {
    const sessionId = getSessionId(7);

    const sessionWager = new BN(123456789); // Should be rounded to 123456780

    const gameSessionKey = getGameSessionKey(program.programId, sessionId);

    const vaultKey = getVaultKey(program.programId, sessionId);

    // Arguments for the `create_game_session` instruction 
    const createGameSessionArgs:types.CreateGameSessionArgs = {
      sessionId: sessionId,
      wagerAmount: sessionWager, // Wager amount is not a multiple of 10
      gameMode: { winnerTakesAllOneVsOne: {} },
      creatorTeam: {teamA:{}}
    };

    // Create the game session
    await program.methods
      .createGameSession(createGameSessionArgs)
      .accountsPartial({
        user: user2.publicKey,
        gameSession: gameSessionKey,
        vault: vaultKey,
        userTokenAccount: user2TokenAccount,
        mint: mintKey
      })
      .signers([user2])
      .rpc(confirmOptions);

    // Verify wager was rounded
    const gameSession = await program.account.gameSession.fetch(gameSessionKey);

    assert.equal(gameSession.sessionWager.toString(), "123456780");
  });

  it("Fails to create duplicate game session", async () => {
    const sessionId = getSessionId(8);

    const gameSessionKey = getGameSessionKey(program.programId, sessionId);

    const vaultKey = getVaultKey(program.programId, sessionId);

    // Create the game session
    const createGameSessionArgs:types.CreateGameSessionArgs = {
      sessionId: sessionId,
      wagerAmount: sessionWager,
      gameMode: { winnerTakesAllOneVsOne: {} },
      creatorTeam: {teamA:{}}
    };

    // First attempt should succeed
    await program.methods
      .createGameSession(createGameSessionArgs)
      .accountsPartial({
        user: user1.publicKey,
        gameSession: gameSessionKey,
        vault: vaultKey,
        userTokenAccount: user1TokenAccount,
        mint: mintKey
      })
      .signers([user1])
      .rpc(confirmOptions);

    // Second attempt with same sessionId should fail
    try {
      await program.methods
        .createGameSession(createGameSessionArgs)
        .accountsPartial({
          user: user1.publicKey,
          gameSession: gameSessionKey,
          vault: vaultKey,
          userTokenAccount: user1TokenAccount,
          mint: mintKey
        })
        .signers([user1])
        .rpc(confirmOptions);
      assert.fail("This transaction should have failed with duplicate session");
    } catch (e) {
      assert.include(e.message, "in use");
    }
  });

  it("Fails to create game session with wrong token mint", async () => {
    const sessionId = getSessionId(10);

    const gameSessionKey = getGameSessionKey(program.programId, sessionId);

    const vaultKey = getVaultKey(program.programId, sessionId);
    
    // Create a new mint (not the expected one)
    const wrongMint = Keypair.generate();

    await createMint(
      provider.connection,
      user1,
      gameServerKeypair.publicKey,
      null,
      9,
      wrongMint
    );

    // Arguments for the `create_game_session` instruction 
    const createGameSessionArgs:types.CreateGameSessionArgs = {
      sessionId: sessionId,
      wagerAmount: sessionWager,
      gameMode: { winnerTakesAllOneVsOne: {} },
      creatorTeam:{teamA:{}}
    };

    try {
      // Try to create the game session
      await program.methods
        .createGameSession(createGameSessionArgs)
        .accountsPartial({
          user: user1.publicKey,
          gameSession: gameSessionKey,
          vault: vaultKey,
          userTokenAccount: user1TokenAccount,
          mint: wrongMint.publicKey, // Invalid mint here
        })
        .signers([user1])
        .rpc(confirmOptions);
      assert.fail("This transaction should have failed with invalid mint");
    } catch (err) {
      assert.include(err.toString(), "InvalidMint");
    }
  });

  it("Fails to create game session with invalid amount", async () => {
    const sessionId = getSessionId(13);

    const gameSessionKey = getGameSessionKey(program.programId, sessionId);

    const vaultKey = getVaultKey(program.programId, sessionId);

    // Attempt to create session with wrong mint
    const createGameSessionArgs:types.CreateGameSessionArgs = {
      sessionId: sessionId,
      wagerAmount: new BN(0), // A zero amount is not allowed
      gameMode: { winnerTakesAllOneVsOne: {} },
      creatorTeam: {teamA:{}}
    };

    try {
      // Try to create the game session
      await program.methods
        .createGameSession(createGameSessionArgs)
        .accountsPartial({
          user: user1.publicKey,
          gameSession: gameSessionKey,
          vault: vaultKey,
          userTokenAccount: user1TokenAccount,
          mint: mintKey
        })
        .signers([user1])
        .rpc(confirmOptions);
      assert.fail("This transaction should have failed with invalid amount");
    } catch (err) {
       assert(err instanceof anchor.AnchorError, "Unknown error");

      let anchorError = err;

      assert(anchorError.error.errorCode.code == "InvalidWagerAmount");
    }
  });

});