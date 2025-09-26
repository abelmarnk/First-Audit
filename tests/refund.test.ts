import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { WagerProgram } from "../target/types/wager_program";
import { BN } from "@coral-xyz/anchor";
import * as types from "./types";
import {
  getSessionId,
  getGameSessionKey,
  getVaultKey,
  setupTokenAccount,
  getVaultTokenAccount,
  getTokenBalance,
  airdropToAccounts,
  getGlobalConfigKey,
  getGameServerKeypair,
  getMintKey
} from "./utils";
import { PublicKey, Keypair } from "@solana/web3.js";
import { ConfirmOptions } from "@solana/web3.js";
import { assert } from "chai";

const confirmOptions: ConfirmOptions = { commitment: "confirmed" };

describe("Refund wager", () => {
  // Setup environment
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.WagerProgram as Program<WagerProgram>;

  // Set mint and server
  const mintKey = getMintKey();

  // Top-level describe blocks run first (synchronously), so if the server key is
  // updated in one test, later tests would otherwise see a stale key captured before
  // the update. Placing this inside an `it` block ensures the server key is refreshed
  // after the update and stays in sync for subsequent tests.  
  let gameServerKeypair:Keypair;

  const user1 = Keypair.generate();
  const user2 = Keypair.generate();
  const user3 = Keypair.generate();
  const user4 = Keypair.generate();
  const user5 = Keypair.generate();
  const user6 = Keypair.generate();
  
  let user1TokenAccount: PublicKey;
  let user2TokenAccount: PublicKey;
  let user3TokenAccount: PublicKey;

  const globalConfigKey =  getGlobalConfigKey(program.programId);

  const wagerAmount = new BN(100_000_000); // 0.1 tokens(9 decimals)

  const initialAmount = new BN(1_000_000_000) // 1 tokens(9 decimals)
  
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
      ]
    );
      
    user1TokenAccount = await setupTokenAccount(
      provider.connection,
      gameServerKeypair,
      mintKey,
      user1.publicKey,
      initialAmount.toNumber()
    );

    user2TokenAccount = await setupTokenAccount(
      provider.connection,
      gameServerKeypair,
      mintKey,
      user2.publicKey,
      initialAmount.toNumber()
    );

    user3TokenAccount = await setupTokenAccount(
      provider.connection,
      gameServerKeypair,
      mintKey,
      user3.publicKey,
      initialAmount.toNumber()
    );
  });

  it("Successfully refunds wager", async () => {

    const sessionId = getSessionId(71);

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

    // Join user2
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
      console.log("User 2:-", await getTokenBalance(provider.connection, user2TokenAccount));
      console.log("User 3:-", await getTokenBalance(provider.connection, user3TokenAccount));

    let remainingAccounts = [
      {
        pubkey: user1TokenAccount,
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: user3TokenAccount,
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: user2TokenAccount,
        isSigner: false,
        isWritable: true,
      },
    ]

    // Refund user's their wagers
    await program.methods
      .refundWager()
      .accountsPartial({
        globalConfig:globalConfigKey,
        server: gameServerKeypair.publicKey,
        gameSession:gameSessionKey,
        creator:user1.publicKey
      })
      .remainingAccounts(remainingAccounts)
      .signers([gameServerKeypair])
      .rpc(confirmOptions);

    console.log("After refund:-\n\n");

    const user1FinalBalance = await getTokenBalance(provider.connection, user1TokenAccount);

    const user2FinalBalance = await getTokenBalance(provider.connection, user2TokenAccount);

    const user3FinalBalance = await getTokenBalance(provider.connection, user3TokenAccount);

    console.log("User 1:-", user1FinalBalance);

    console.log("User 2:-", user2FinalBalance);

    console.log("User 3:-", user3FinalBalance);

    // After refund, balances should be back to initial
    assert.equal(user1FinalBalance, initialAmount.toNumber());
    assert.equal(user2FinalBalance, initialAmount.toNumber());
    assert.equal(user3FinalBalance, initialAmount.toNumber());
  });

  it("Fails to refund wager, not enough accounts", async () => {

    const sessionId = getSessionId(72);

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

    // Join user2   
    await program.methods
      .joinUser({team:{teamB:{}}})
      .accountsPartial({
        user: user2.publicKey,
        userTokenAccount: user2TokenAccount,
        globalConfig:globalConfigKey,
        gameSession:gameSessionKey,
        server:gameServerKeypair.publicKey,
        vault: vaultKey,
        mint: mintKey,
      })
      .signers([user2, gameServerKeypair])
      .rpc(confirmOptions);

    // Join user3
    await program.methods
      .joinUser({team:{teamA:{}}})
      .accountsPartial({
        user: user3.publicKey,
        userTokenAccount: user3TokenAccount,
        globalConfig:globalConfigKey,
        gameSession:gameSessionKey,
        server:gameServerKeypair.publicKey,
        vault: vaultKey,
        mint: mintKey,
      })
      .signers([user3, gameServerKeypair])
      .rpc(confirmOptions);

    // Invalid remaining accounts, it is not complete.
    let remainingAccounts = [
      {
        pubkey: user1TokenAccount,
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: user3TokenAccount,
        isSigner: false,
        isWritable: true,
      }
    ]

    try{
      // Try to refund user's their wagers    
      await program.methods
        .refundWager()
        .accountsPartial({
          vault:vaultKey,
          globalConfig:globalConfigKey,
          server: gameServerKeypair.publicKey,
          gameSession:gameSessionKey,
          creator:user1.publicKey
        })
        .remainingAccounts(remainingAccounts)
        .signers([gameServerKeypair])
        .rpc(confirmOptions);

      assert.fail("This transaction should have failed the remaining accounts are not complete.");
    } catch(err){
      assert(err instanceof anchor.AnchorError, "Unknown error");

      const anchorError = err;

      assert.equal(anchorError.error.errorCode.code, "InvalidRemainingAccounts");      
    }
  });

  it("Fails to refund wager, the accounts are not in order", async () => {

    const sessionId = getSessionId(73);

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

    // Join user3
    await program.methods
      .joinUser({team:{teamA:{}}})
      .accountsPartial({
        user: user3.publicKey,
        userTokenAccount: user3TokenAccount,
        globalConfig:globalConfigKey,
        gameSession:gameSessionKey,
        server:gameServerKeypair.publicKey,
        vault: vaultKey,
        mint: mintKey,
      })
      .signers([user3, gameServerKeypair])
      .rpc(confirmOptions);

    // Invalid remaining accounts, it is not in order.
    let remainingAccounts = [
      {
        pubkey: user1TokenAccount,
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: user2TokenAccount,
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: user3TokenAccount,
        isSigner: false,
        isWritable: true,
      }
    ]

    try{
      // Try to refund user's their wagers    
      await program.methods
        .refundWager()
        .accountsPartial({
          vault:vaultKey,
          globalConfig:globalConfigKey,
          server: gameServerKeypair.publicKey,
          gameSession:gameSessionKey,
          creator:user1.publicKey
        })
        .remainingAccounts(remainingAccounts)
        .signers([gameServerKeypair])
        .rpc(confirmOptions);

      assert.fail("This transaction should have failed the remaining accounts are not in order.");
    } catch(err){
      assert(err instanceof anchor.AnchorError, "Unknown error");

      const anchorError = err;

      assert.equal(anchorError.error.errorCode.code, "InvalidPlayerTokenAccount");      
    }
  });

  it("Fails to refund wager, the creator account is not valid", async () => {

    const sessionId = getSessionId(74);

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

    // Join user2   
    await program.methods
      .joinUser({team:{teamB:{}}})
      .accountsPartial({
        user: user2.publicKey,
        userTokenAccount: user2TokenAccount,
        globalConfig:globalConfigKey,
        gameSession:gameSessionKey,
        server:gameServerKeypair.publicKey,
        vault: vaultKey,
        mint: mintKey,
      })
      .signers([user2, gameServerKeypair])
      .rpc(confirmOptions);

    // Join user3
    await program.methods
      .joinUser({team:{teamA:{}}})
      .accountsPartial({
        user: user3.publicKey,
        userTokenAccount: user3TokenAccount,
        globalConfig:globalConfigKey,
        gameSession:gameSessionKey,
        server:gameServerKeypair.publicKey,
        vault: vaultKey,
        mint: mintKey,
      })
      .signers([user3, gameServerKeypair])
      .rpc(confirmOptions);

    let remainingAccounts = [
      {
        pubkey: user1TokenAccount,
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: user3TokenAccount,
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: user2TokenAccount,
        isSigner: false,
        isWritable: true,
      }
    ]

    try{
      // Try to refund user's their wagers    
      await program.methods
        .refundWager()
        .accountsPartial({
          vault:vaultKey,
          globalConfig:globalConfigKey,
          server: gameServerKeypair.publicKey,
          gameSession:gameSessionKey,
          creator:user2.publicKey // Invalid creator
        })
        .remainingAccounts(remainingAccounts)
        .signers([gameServerKeypair])
        .rpc(confirmOptions);

      assert.fail("This transaction should have failed the creator account is invalid.");
    } catch(err){
      assert(err instanceof anchor.AnchorError, "Unknown error");

      const anchorError = err;

      assert.equal(anchorError.error.errorCode.code, "InvalidCreatorAccount");      
    }
  });

  it("Fails to refund wager, the server is not valid", async () => {

    const sessionId = getSessionId(75);

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

    // Join user2   
    await program.methods
      .joinUser({team:{teamB:{}}})
      .accountsPartial({
        user: user2.publicKey,
        userTokenAccount: user2TokenAccount,
        globalConfig:globalConfigKey,
        gameSession:gameSessionKey,
        vault: vaultKey,
        server:gameServerKeypair.publicKey,
        mint: mintKey,
      })
      .signers([user2, gameServerKeypair])
      .rpc(confirmOptions);

    // Join user3
    await program.methods
      .joinUser({team:{teamA:{}}})
      .accountsPartial({
        user: user3.publicKey,
        userTokenAccount: user3TokenAccount,
        globalConfig:globalConfigKey,
        server:gameServerKeypair.publicKey,
        gameSession:gameSessionKey,
        vault: vaultKey,
        mint: mintKey,
      })
      .signers([user3, gameServerKeypair])
      .rpc(confirmOptions);

    let remainingAccounts = [
      {
        pubkey: user1TokenAccount,
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: user3TokenAccount,
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: user2TokenAccount,
        isSigner: false,
        isWritable: true,
      }
    ]

    const invalidGameServerKeypair = Keypair.generate();

    try{
      // Try to refund user's their wagers    
      await program.methods
        .refundWager()
        .accountsPartial({
          vault:vaultKey,
          globalConfig:globalConfigKey,
          server: invalidGameServerKeypair.publicKey,
          gameSession:gameSessionKey,
          creator:user1.publicKey,
        })
        .remainingAccounts(remainingAccounts)
        .signers([invalidGameServerKeypair])
        .rpc(confirmOptions);

      assert.fail("This transaction should have failed the server is not valid.");
    }catch(err){
      console.log("Error: ", err);
      
      assert(err instanceof anchor.AnchorError, "Unknown error");

      const anchorError = err;

      assert.equal(anchorError.error.errorCode.code, "InvalidAuthority");      
    }
  });


}); 