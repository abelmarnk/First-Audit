import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import * as types from "./types";
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
  getSortedAndCreatorIndex,
  numberToTeam,
} from "./utils";

const confirmOptions: ConfirmOptions = { commitment: "confirmed" };

describe("Join User", () => {
  // Set up the environment
  const provider = anchor.AnchorProvider.env();

  anchor.setProvider(provider);

  const program = anchor.workspace.WagerProgram as Program<WagerProgram>;

  // Get the mint and game server
  const mintKey = getMintKey();

  // Top-level describe blocks run first (synchronously), so if the server key is
  // updated in one test, later tests would otherwise see a stale key captured before
  // the update. Placing this inside an `it` block ensures the server key is refreshed
  // after the update and stays in sync for subsequent tests.  
  let gameServerKeypair:Keypair;

  const wagerAmount = new BN(100_000_000); // 0.1 tokens

  // Test users
  const user1 = Keypair.generate();
  const user2 = Keypair.generate();
  const user3 = Keypair.generate();
  const user4 = Keypair.generate();
  const user5 = Keypair.generate();
  const user6 = Keypair.generate();
  const user7 = Keypair.generate();

  let user1TokenAccount: PublicKey;
  let user2TokenAccount: PublicKey;
  let user3TokenAccount: PublicKey;
  let user4TokenAccount: PublicKey;
  let user5TokenAccount: PublicKey;
  let user6TokenAccount: PublicKey;
  let user7TokenAccount: PublicKey;

  const globalConfigKey =  getGlobalConfigKey(program.programId);

  before(async () => {

    // Set the server keypair
    gameServerKeypair = getGameServerKeypair();

    // Setup accounts
    await airdropToAccounts(provider.connection, [
      gameServerKeypair.publicKey,
      user1.publicKey,
      user2.publicKey,
      user3.publicKey,
      user4.publicKey,
      user5.publicKey,
      user6.publicKey,
      user7.publicKey
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

    user4TokenAccount = await setupTokenAccount(
      provider.connection, gameServerKeypair, mintKey, 
      user4.publicKey, initialMintAmount
    );

    user5TokenAccount = await setupTokenAccount(
      provider.connection, gameServerKeypair, mintKey, 
      user5.publicKey, initialMintAmount
    );

    user6TokenAccount = await setupTokenAccount(
      provider.connection, gameServerKeypair, mintKey, 
      user6.publicKey, initialMintAmount
    );

    user7TokenAccount = await setupTokenAccount(
      provider.connection, gameServerKeypair, mintKey, 
      user7.publicKey, wagerAmount.div(new BN(2)).toNumber()
    );

  });

it("Successfully allows players to join game", async () => {

    const sessionId = getSessionId(41);

    const gameSessionKey = getGameSessionKey(program.programId, sessionId);

    const vaultKey = getVaultKey(program.programId, sessionId);

    console.log("Initial balances:-\n\n");
    console.log("User 1:-", await getTokenBalance(provider.connection, user1TokenAccount));
    console.log("User 2:-", await getTokenBalance(provider.connection, user2TokenAccount));
    console.log("User 3:-", await getTokenBalance(provider.connection, user3TokenAccount));
    console.log("User 4:-", await getTokenBalance(provider.connection, user4TokenAccount));
    console.log("User 5:-", await getTokenBalance(provider.connection, user5TokenAccount));
    console.log("User 6:-", await getTokenBalance(provider.connection, user6TokenAccount));

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
          mint: mintKey,
          globalConfig:globalConfigKey,
          vault:vaultKey,
          server:gameServerKeypair.publicKey,
        })
        .signers([config.user, gameServerKeypair])
        .rpc(confirmOptions);
    }

    console.log("Balances after join:-\n\n");
    console.log("User 1:-", await getTokenBalance(provider.connection, user1TokenAccount));
    console.log("User 2:-", await getTokenBalance(provider.connection, user2TokenAccount));
    console.log("User 3:-", await getTokenBalance(provider.connection, user3TokenAccount));
    console.log("User 4:-", await getTokenBalance(provider.connection, user4TokenAccount));
    console.log("User 5:-", await getTokenBalance(provider.connection, user5TokenAccount));
    console.log("User 6:-", await getTokenBalance(provider.connection, user6TokenAccount));

    {
      const gameSession = await program.account.gameSession.fetch(gameSessionKey);

      console.log("Game session: \n\n",gameSession);

      const teamA = gameSession.teamA;
      const teamB = gameSession.teamB;

      const aPlayers = (teamA.players as PublicKey[]).map((p) => p.toBase58());
      const bPlayers = (teamB.players as PublicKey[]).map((p) => p.toBase58());

      // Ensure players are present in the expected teams
      assert.include(aPlayers, user1.publicKey.toBase58(), "user1 should be in teamA");
      assert.include(aPlayers, user3.publicKey.toBase58(), "user3 should be in teamA");
      assert.include(aPlayers, user5.publicKey.toBase58(), "user5 should be in teamA");

      assert.include(bPlayers, user2.publicKey.toBase58(), "user2 should be in teamB");
      assert.include(bPlayers, user4.publicKey.toBase58(), "user4 should be in teamB");
      assert.include(bPlayers, user6.publicKey.toBase58(), "user6 should be in teamB");

      // Based on the game mode the teams are filled, confirm the game is in progress
      assert.deepEqual(gameSession.status, {inProgress:{}}, "Game status should be in progress once filled");
    }
  });

  it("Fails to join when the target team is already full", async () => {

    const sessionId = getSessionId(42);

    const gameSessionKey = getGameSessionKey(program.programId, sessionId);

    const vaultKey = getVaultKey(program.programId, sessionId);

    console.log("Initial balances:-\n\n");
    console.log("User 1:-", await getTokenBalance(provider.connection, user1TokenAccount));
    console.log("User 3:-", await getTokenBalance(provider.connection, user3TokenAccount));
    console.log("User 5:-", await getTokenBalance(provider.connection, user5TokenAccount));

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

    // Join user3
    await program.methods
      .joinUser({team:{teamA:{}}})
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

    // Join user5
    await program.methods
      .joinUser({team:{teamA:{}}})
      .accountsPartial({
        user: user5.publicKey,
        userTokenAccount: user5TokenAccount,
        globalConfig:globalConfigKey,
        gameSession:gameSessionKey,
        vault: vaultKey,
        mint: mintKey,
        server:gameServerKeypair.publicKey,

      })
      .signers([user5, gameServerKeypair])
      .rpc(confirmOptions);

    console.log("Balances after join:-\n\n");
    console.log("User 1:-", await getTokenBalance(provider.connection, user1TokenAccount));
    console.log("User 3:-", await getTokenBalance(provider.connection, user3TokenAccount));
    console.log("User 5:-", await getTokenBalance(provider.connection, user5TokenAccount));

    try {
      // Try to join an extra user to teamA
      await program.methods
        .joinUser({team:{teamA:{}}})
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

      assert.fail("The transaction should have falied with TeamIsFull but it succeeded");
    } catch (err) {
      assert(err instanceof anchor.AnchorError, "Unknown error");

      const anchorError = err;
      
      assert.equal(anchorError.error.errorCode.code, "TeamIsFull");
    }
  });

  it("Fails when the same player attempts to join the same team twice", async () => {

    const sessionId = getSessionId(44);

    const gameSessionKey = getGameSessionKey(program.programId, sessionId);

    const vaultKey = getVaultKey(program.programId, sessionId);

    console.log("Initial balances:-\n\n");
    console.log("User 1:-", await getTokenBalance(provider.connection, user1TokenAccount));
    console.log("User 3:-", await getTokenBalance(provider.connection, user3TokenAccount));

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

    // Join user3
    await program.methods
      .joinUser({team:{teamA:{}}})
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

    console.log("Balances after join:-\n\n");
    console.log("User 1:-", await getTokenBalance(provider.connection, user1TokenAccount));
    console.log("User 3:-", await getTokenBalance(provider.connection, user3TokenAccount));

    try {
      // Try to join user3 to teamA again 
      await program.methods
        .joinUser({team:{teamA:{}}})
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

      assert.fail("The transaction should have falied with PlayerAlreadyInGame but it succeeded");
    } catch (err) {
      console.log(err);

      assert(err instanceof anchor.AnchorError, "Unknown error");

      const anchorError = err;

      assert.equal(anchorError.error.errorCode.code, "PlayerAlreadyInGame");
    }
  });

  it("Fails when a player who already joined team B attempts to join team A", async () => {

    const sessionId = getSessionId(45);

    const gameSessionKey = getGameSessionKey(program.programId, sessionId);

    const vaultKey = getVaultKey(program.programId, sessionId);

    console.log("Initial balances:-\n\n");
    console.log("User 1:-", await getTokenBalance(provider.connection, user1TokenAccount));
    console.log("User 2:-", await getTokenBalance(provider.connection, user2TokenAccount));

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

    console.log("Balances after join:-\n\n");
    console.log("User 1:-", await getTokenBalance(provider.connection, user1TokenAccount));
    console.log("User 2:-", await getTokenBalance(provider.connection, user2TokenAccount));

    try {
      // Try to join user to the other team
      await program.methods
        .joinUser({team:{teamA:{}}})
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

      assert.fail("The transaction should have falied with PlayerAlreadyInGame but it succeeded");
    } catch (err) {
      assert(err instanceof anchor.AnchorError, "Unknown error");

      const anchorError = err;

      assert.equal(anchorError.error.errorCode.code, "PlayerAlreadyInGame");
    }
  });

  it("Fails when attempting to join after the game is no longer waiting for players", async () => {

    const sessionId = getSessionId(46);

    const gameSessionKey = getGameSessionKey(program.programId, sessionId);

    const vaultKey = getVaultKey(program.programId, sessionId);

    console.log("Initial balances:-\n\n");
    console.log("User 1:-", await getTokenBalance(provider.connection, user1TokenAccount));
    console.log("User 2:-", await getTokenBalance(provider.connection, user2TokenAccount));
    console.log("User 3:-", await getTokenBalance(provider.connection, user3TokenAccount));

    // Arguments for the `create_game_session` instruction
    const createGameSessionArgs:types.CreateGameSessionArgs = {
      sessionId: sessionId,
      wagerAmount: wagerAmount,
      gameMode: { winnerTakesAllOneVsOne: {} },
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

    console.log("Balances after join:-\n\n");
    console.log("User 1:-", await getTokenBalance(provider.connection, user1TokenAccount));
    console.log("User 2:-", await getTokenBalance(provider.connection, user2TokenAccount));
    console.log("User 3:-", await getTokenBalance(provider.connection, user3TokenAccount));

    const gameSession = await program.account.gameSession.fetch(gameSessionKey);
    assert.deepEqual(gameSession.status, {inProgress:{}}, "Game status should be in progess'");

    try {
      // Try to join user to teamA
      await program.methods
        .joinUser({team:{teamA:{}}})
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

      assert.fail("The transaction should have falied with GameInProgress but it succeeded");
    } catch (err) {
      assert(err instanceof anchor.AnchorError, "Unknown error");
      const anchorError = err;
      assert.equal(anchorError.error.errorCode.code, "GameInProgress");
    }
  });

  it("User fails to join with insufficent funds ", async () => {

    const sessionId = getSessionId(47);

    const gameSessionKey = getGameSessionKey(program.programId, sessionId);

    const vaultKey = getVaultKey(program.programId, sessionId);

    console.log("Initial balances:-\n\n");
    console.log("User 1:-", await getTokenBalance(provider.connection, user1TokenAccount));
    console.log("User 7:-", await getTokenBalance(provider.connection, user7TokenAccount));

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

    console.log("Balances after join:-\n\n");
    console.log("User 1:-", await getTokenBalance(provider.connection, user1TokenAccount));
    console.log("User 7:-", await getTokenBalance(provider.connection, user7TokenAccount));

      
    try{
      // Try to join user with insufficient funds
      await program.methods
        .joinUser({team:{teamB:{}}})
        .accountsPartial({
          user: user7.publicKey,
          userTokenAccount: user7TokenAccount,
          globalConfig:globalConfigKey,
          gameSession:gameSessionKey,
          vault: vaultKey,
          mint: mintKey,
          server:gameServerKeypair.publicKey,
        })
        .signers([user7, gameServerKeypair])
        .rpc(confirmOptions);

      assert.fail("This transaction should have failed the user's funds were not sufficient")
    } catch(err){
      assert.include(err.message, "insufficient funds")
    }
  });
});
