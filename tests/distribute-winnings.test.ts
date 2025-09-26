import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { WagerProgram } from "../target/types/wager_program";
import * as types from "./types";
import { BN } from "@coral-xyz/anchor";
import { assert } from "chai";
import {
  getSessionId,
  getGameSessionKey,
  getVaultKey,
  airdropToAccount,
  airdropToAccounts,
  getTokenBalance,
  getGlobalConfigKey,
  getMintKey,
  getGameServerKeypair,
  getVaultTokenAccount,
  SPAWNS_PER_DEPOSIT,
  extractPlayerStats,
  calculateExpectedEarnings,
  generateRandomKillTuple,
  getSortedAndCreatorIndex,
  setupTokenAccount,
  BASE_TOKEN_AMOUNT,
  getTokenAccounts
} from "./utils";
import { 
  ConfirmOptions, 
  Keypair, 
  PublicKey,
} from "@solana/web3.js";

const confirmOptions: ConfirmOptions = { commitment: "confirmed" };

describe("Distribute Winnings", () => {
  // Set up environment
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.WagerProgram as Program<WagerProgram>;

  const mintKey = getMintKey();
  let gameServerKeypair:Keypair;

  const wagerAmount = new BN(BASE_TOKEN_AMOUNT/10); // 0.1 tokens

  const user1 = Keypair.generate();
  const user2 = Keypair.generate();
  const user3 = Keypair.generate();
  const user4 = Keypair.generate();
  const user5 = Keypair.generate();
  const user6 = Keypair.generate();
  const user7 = Keypair.generate();
  const user8 = Keypair.generate();
  const user9 = Keypair.generate();
  const user10 = Keypair.generate();

  let user1TokenAccount: PublicKey;
  let user2TokenAccount: PublicKey;
  let user3TokenAccount: PublicKey;
  let user4TokenAccount: PublicKey;
  let user5TokenAccount: PublicKey;
  let user6TokenAccount: PublicKey;
  let user7TokenAccount: PublicKey;
  let user8TokenAccount: PublicKey;
  let user9TokenAccount: PublicKey;
  let user10TokenAccount: PublicKey;


  let globalConfigKey = getGlobalConfigKey(
      program.programId
    );

  before(async () => {   
    
    gameServerKeypair = getGameServerKeypair();

    // Setup accounts
    await airdropToAccount(provider.connection, gameServerKeypair.publicKey);

    await airdropToAccounts(provider.connection, [
      user1.publicKey, user2.publicKey, user3.publicKey, 
      user4.publicKey, user5.publicKey, user6.publicKey
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

    console.log("Accounts completely setup!!!");

  });

  it("Successfully distributes winnings to winning team in 1v1 winner-takes-all", async () => {
    const sessionId = getSessionId(31);

    const gameSessionKey = getGameSessionKey(program.programId, sessionId);

    const vaultKey = getVaultKey(program.programId, sessionId);

    console.log("Initial balances:-\n\n");
    const user1InitialBalance = await getTokenBalance(provider.connection, user1TokenAccount);
    const user2InitialBalance = await getTokenBalance(provider.connection, user2TokenAccount);
    console.log("User 1:-", user1InitialBalance);
    console.log("User 2:-", user2InitialBalance);

    // Arguments for the `create_game_session` instruction
    const createGameSessionArgs: types.CreateGameSessionArgs = {
      sessionId: sessionId,
      wagerAmount: wagerAmount,
      gameMode: {winnerTakesAllOneVsOne: {}},
      creatorTeam: {teamA:{}}
    };

    // Create the game session
    await program.methods
      .createGameSession(createGameSessionArgs)
      .accountsPartial({
        user: user1.publicKey,
        gameSession: gameSessionKey,
        userTokenAccount: user1TokenAccount,
        mint: mintKey,
      })
      .signers([user1])
      .rpc(confirmOptions);

    // Arguments for the `join_user` instruction
    const joinArgs: types.JoinUserArgs = {
      team: {teamB:{}}
    };

    // Join user2
    await program.methods
      .joinUser(joinArgs)
      .accountsPartial({
        user: user2.publicKey,
        gameSession: gameSessionKey,
        userTokenAccount: user2TokenAccount,
        mint: mintKey,
        vault:vaultKey,
        globalConfig: globalConfigKey,
        server: gameServerKeypair.publicKey,        
      })
      .signers([user2, gameServerKeypair])
      .rpc(confirmOptions);

    // Arguments for the `distribute_winnings` instruction
    const distributeArgs: types.DistributeWinningsArgs = {
      winningTeam: {teamA:{}}
    };

    // Kills are ignored for the purpose of simulation, since the server controls the kills
    // It can be assumed that they are enforced as they should.

    // Distibute the winnings
    await program.methods
      .distributeWinnings(distributeArgs)
      .accountsPartial({
        globalConfig: globalConfigKey,
        server: gameServerKeypair.publicKey,
        creator: user1.publicKey,
        creatorTokenAccount: user1TokenAccount,
        gameSession: gameSessionKey,
        vault:vaultKey
      })
      .remainingAccounts([
        {
          pubkey: user1TokenAccount,
          isSigner: false,
          isWritable: true,
        }
      ])
      .signers([gameServerKeypair])
      .rpc(confirmOptions);

    console.log("Final balances:- \n\n");

    const user1FinalBalance = await getTokenBalance(provider.connection, user1TokenAccount);

    const user2FinalBalance = await getTokenBalance(provider.connection, user2TokenAccount);

    console.log("User 1:-", user1FinalBalance);

    console.log("User 2:-", user2FinalBalance);

    const difference = wagerAmount.toNumber();

    // User1 should have won the other wager and got 0.1 extra tokens

    console.log("User 1 difference: ", user1FinalBalance - user1InitialBalance)
    console.log("User 2 difference: ", user2FinalBalance - user2InitialBalance)

    assert.equal(user1FinalBalance - user1InitialBalance, difference); // + 0.1 tokens
    assert.equal(user2FinalBalance - user2InitialBalance, -difference);  // - 0.1 tokens

  });

  it("Successfully distributes winnings to winning team in 3v3 winner-takes-all", async () => {
    const sessionId = getSessionId(32);

    const gameSessionKey = getGameSessionKey(program.programId, sessionId);

    const vaultKey = getVaultKey(program.programId, sessionId);

    let initialBalances: number[] = []

    console.log("Initial balances:- \n\n");
    for (let i = 1; i <= 6; i++) {
      const tokenAccount = eval(`user${i}TokenAccount`) as PublicKey;
      initialBalances.push(await getTokenBalance(provider.connection, tokenAccount));
      console.log(`User ${i}:`, initialBalances[i - 1]);
    }

    // Arguments for the `create_game_session` instruction
    const createGameSessionArgs: types.CreateGameSessionArgs = {
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

    // Argument for the `distribute_winnings` instruction
    const distributeArgs: types.DistributeWinningsArgs = {
      winningTeam: {teamA:{}}
    };

    // Kills are ignored for the purpose of simulation, since the server controls the kills
    // it can be assumed that they are enforced as they should

    // Distibute the winnings
    await program.methods
      .distributeWinnings(distributeArgs)
      .accountsPartial({
        globalConfig: globalConfigKey,
        server: gameServerKeypair.publicKey,
        creator: user1.publicKey,
        creatorTokenAccount: user1TokenAccount,
        gameSession: gameSessionKey,
        vault:vaultKey
      })
      .remainingAccounts([
        // Team A winners in order: user1, user3, user5
        { pubkey: user1TokenAccount, isSigner: false, isWritable: true },
        { pubkey: user3TokenAccount, isSigner: false, isWritable: true },
        { pubkey: user5TokenAccount, isSigner: false, isWritable: true }
      ])
      .signers([gameServerKeypair])
      .rpc(confirmOptions);

    console.log("Final balances:- \n\n");
    const finalBalances: number[] = [];
    for (let i = 1; i <= 6; i++) {
      const tokenAccount = eval(`user${i}TokenAccount`) as PublicKey;
      const balance = await getTokenBalance(provider.connection, tokenAccount);
      finalBalances.push(balance);
      console.log(`User${i}:`, balance);
    }

    // Team A (users 1, 3, 5) should each get 0.1 tokens
    // Team B (users 2, 4, 6) should each lose 0.1 tokens
    assert.equal(finalBalances[0] - initialBalances[0], 100000000); // user1: + 0.1
    assert.equal(finalBalances[1] - initialBalances[1], -100000000); // user2: - 0.1
    assert.equal(finalBalances[2] - initialBalances[2], 100000000); // user3: + 0.1
    assert.equal(finalBalances[3] - initialBalances[3], -100000000); // user4: - 0.1
    assert.equal(finalBalances[4] - initialBalances[4], 100000000); // user5: + 0.1
    assert.equal(finalBalances[5] - initialBalances[5], -100000000); // user6: - 0.1
  });

  it("Successfully distributes pay-to-spawn earnings in 1v1", async () => {
    const sessionId = getSessionId(33);

    const gameSessionKey = getGameSessionKey(program.programId, sessionId);

    const vaultKey = getVaultKey(program.programId, sessionId);

    console.log("Initial balances:-\n\n");
    const user1InitialBalance = await getTokenBalance(provider.connection, user1TokenAccount);
    const user2InitialBalance = await getTokenBalance(provider.connection, user2TokenAccount);

    console.log("User 1:-", user1InitialBalance);
    console.log("User 2:-", user2InitialBalance);

    // Arguments for the `create_game_session` instruction
    const createGameSessionArgs: types.CreateGameSessionArgs = {
      sessionId: sessionId,
      wagerAmount: wagerAmount,
      gameMode: { payToSpawnOneVsOne: {} },
      creatorTeam: {teamA:{}}
    };

    // Create the game session and join user1
    await program.methods
      .createGameSession(createGameSessionArgs)
      .accountsPartial({
        user: user1.publicKey,
        gameSession: gameSessionKey,
        userTokenAccount: user1TokenAccount,
        mint: mintKey
      })
      .signers([user1])
      .rpc(confirmOptions);

    // Arguments for the `join_user` instruction
    const joinArgs: types.JoinUserArgs = {
      team: {teamB:{}}
    };

    // Join user2
    await program.methods
      .joinUser(joinArgs)
      .accountsPartial({
        user: user2.publicKey,
        gameSession: gameSessionKey,
        userTokenAccount: user2TokenAccount,
        mint: mintKey,
        vault:vaultKey,
        globalConfig:globalConfigKey,
        server:gameServerKeypair.publicKey
      })
      .signers([user2, gameServerKeypair])
      .rpc(confirmOptions);

    // Arguments for the `record_kill` instruction
    const recordKillArgs:types.RecordKillArgs = {
      killerTeam:{teamA:{}},
      killerIndex:0,
      killer:user1.publicKey,
      victimTeam:{teamB:{}},
      victimIndex:0,
      victim:user2.publicKey,      
    }

    // Simulate kills to adjust user1's and user2's earnings
    for (let i = 0; i < 10; i++) {
      await program.methods
        .recordKill(recordKillArgs)
        .accountsPartial({
          globalConfig: globalConfigKey,
          gameSession: gameSessionKey,
          server:gameServerKeypair.publicKey
        })
        .signers([gameServerKeypair])
        .rpc(confirmOptions);
    }

    // After user2 has been killed that many times all of their earnings should go
    // to user1
    try{
      // Distribute the winnings
      await program.methods
        .distributePayToSpawnWinnings()
        .accountsPartial({
          globalConfig: globalConfigKey,
          server: gameServerKeypair.publicKey,
          creator: user1.publicKey,
          creatorTokenAccount: user1TokenAccount,
          gameSession: gameSessionKey,
          vault:vaultKey
        })
        .remainingAccounts([
          { pubkey: user1TokenAccount, isSigner: false, isWritable: true },
          { pubkey: user2TokenAccount, isSigner: false, isWritable: true }
        ])
        .signers([gameServerKeypair])
        .rpc(confirmOptions);
      } catch (err){
        console.log("Error: ", err);
      }
    console.log("Final balances:- \n\n");
    const user1FinalBalance = await getTokenBalance(provider.connection, user1TokenAccount);

    const user2FinalBalance = await getTokenBalance(provider.connection, user2TokenAccount);

    console.log("User 1:-", user1FinalBalance);

    console.log("User 2:-", user2FinalBalance);

    // User1 should have won the other wager and got 0.1 tokens
    assert.equal(user1FinalBalance - user1InitialBalance, 100000000); // + 0.1 tokens
    assert.equal(user2FinalBalance - user2InitialBalance, -100000000); // - 0.1 tokens
  });

  it("Successfully distributes pay-to-spawn earnings in 3v3", async () => {
    const sessionId = getSessionId(34);

    const gameSessionKey = getGameSessionKey(program.programId, sessionId);

    const vaultKey = getVaultKey(program.programId, sessionId);

    // Arguments for the `create_game_session` instruction
    const createGameSessionArgs: types.CreateGameSessionArgs = {
      sessionId,
      wagerAmount,
      gameMode: { payToSpawnThreeVsThree: {} },
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

    // Save initial balances
    const initialBalances: Record<string, number> = {};
    for (let i = 1; i <= 6; i++) {
      const tokenAccount = eval(`user${i}TokenAccount`) as PublicKey;
      initialBalances[`user${i}`] = await getTokenBalance(provider.connection, tokenAccount);
    }

    // Save creator balance
    // In this test, we make the case more messy so the creator may end up with something
    // extra(cases where there are leftovers due to rounding errors)
    const initialCreatorBalance = await getTokenBalance(provider.connection, user1TokenAccount);

    // Record kills helper
    async function doKills(
      killerTeam: types.TeamType,
      killerIndex: number,
      victimTeam: types.TeamType,
      victimIndex: number,
      times: number,
      killerPubkey: PublicKey,
      victimPubkey: PublicKey
    ) {
      const args: types.RecordKillArgs = {
        killerTeam,
        killerIndex,
        killer: killerPubkey,
        victimTeam,
        victimIndex,
        victim: victimPubkey,
      };

      for (let i = 0; i < times; i++) {
        await program.methods
          .recordKill(args)
          .accountsPartial({
            globalConfig: globalConfigKey,
            gameSession: gameSessionKey,
            server: gameServerKeypair.publicKey,
          })
          .signers([gameServerKeypair])
          .rpc(confirmOptions);
      }
    }

    // Run 6 random kill configurations
    for (let i = 0; i < 6; i++) {
      const [killerTeam, killerIndex, victimIndex, killsCount] = generateRandomKillTuple(2, 3); 
      // playerUpperBound = 2 → because each team has 3 players (indices 0..2)
      // killsUpperBound = 3 → max kills per event

      const killer = killerTeam.teamA
        ? [user1.publicKey, user3.publicKey, user5.publicKey][killerIndex]
        : [user2.publicKey, user4.publicKey, user6.publicKey][killerIndex];

      const victim = killerTeam.teamA
        ? [user2.publicKey, user4.publicKey, user6.publicKey][victimIndex]
        : [user1.publicKey, user3.publicKey, user5.publicKey][victimIndex];

      const victimTeam:types.TeamType = killerTeam.teamA ? {teamB:{}} : {teamA:{}};

      console.log(
        `Random kill ${i + 1}: Team ${killerTeam.teamA ? 0 : 1} player[${killerIndex}] (${killer.toBase58()}) → ` +
        `Team ${victimTeam.teamA ? 0 : 1} player[${victimIndex}] (${victim.toBase58()}) x${killsCount}`
      );

      // Though it is very unlikely, there is a chance that an unlucky player gets killed enough times that they
      // run out of spawns,in this case we catch the error and continue
      try {
        await doKills(killerTeam, killerIndex, victimTeam, victimIndex, killsCount, killer, victim);
      } catch(err){
        assert(err instanceof anchor.AnchorError, "Unknown error");

        let error = err;

        assert.equal(error.error.errorCode.code, "PlayerHasNoSpawns", "The player was expected to be out of spawns, another error occured")
      }
    }

    // Fetch game session before distribution
    const gameSessionBefore = await program.account.gameSession.fetch(gameSessionKey);

    // Get the player stats for that session(keys and kills & spawns sum)
    const players = extractPlayerStats(gameSessionBefore);

    // Get the earnings for each player, as well as the left over that should go to the
    // creator
    const { earnings, leftover } = calculateExpectedEarnings(gameSessionBefore, players);    

    let pairs = [
      { player: user1.publicKey, tokenAccount: user1TokenAccount },
      { player: user3.publicKey, tokenAccount: user3TokenAccount },
      { player: user5.publicKey, tokenAccount: user5TokenAccount },
      { player: user2.publicKey, tokenAccount: user2TokenAccount },
      { player: user4.publicKey, tokenAccount: user4TokenAccount },
      { player: user6.publicKey, tokenAccount: user6TokenAccount }
    ];

    // We use the players that still have kills and spawns left to filter out the remaining accounts
    let remainingAccounts = getTokenAccounts(players.map( pair => pair.pubkey), pairs);

    // Distribute winnings
    await program.methods
      .distributePayToSpawnWinnings()
      .accountsPartial({
        globalConfig: globalConfigKey,
        server: gameServerKeypair.publicKey,
        creator: user1.publicKey,
        creatorTokenAccount: user1TokenAccount,
        gameSession: gameSessionKey,
        vault:vaultKey
      })
      .remainingAccounts(remainingAccounts)
      .signers([gameServerKeypair])
      .rpc(confirmOptions);


    // Save final balances
    const finalBalances: Record<string, number> = {};
    for (let i = 1; i <= 6; i++) {
      const tokenAccount = eval(`user${i}TokenAccount`) as PublicKey;
      finalBalances[`user${i}`] = await getTokenBalance(provider.connection, tokenAccount);
    }
    const finalCreatorBalance = await getTokenBalance(provider.connection, user1TokenAccount);

    for (let i = 1; i <= 6; i++) {
      const pubkey = eval(`user${i}.publicKey`) as PublicKey;
      const pkStr = pubkey.toBase58();
      const expected = earnings[pkStr] ?? 0;
      const delta = finalBalances[`user${i}`] - initialBalances[`user${i}`];
      console.log(`User${i} should have earned ${expected}, got ${delta}`);
      assert.equal(expected, delta, "The expected earnings are not the same as the calculated");
    }

    // Creator = earnings + leftover
    const creatorPk = user1.publicKey.toBase58();
    const expectedCreator = (earnings[creatorPk] ?? 0) + leftover;
    const deltaCreator = finalCreatorBalance - initialCreatorBalance;
    assert.equal(deltaCreator, expectedCreator, `Creator should have earned ${expectedCreator}, got ${deltaCreator}`);
  });

  it("Fails to distribute winnings when game not in progress", async () => {
    const sessionId = getSessionId(5);

    const gameSessionKey = getGameSessionKey(program.programId, sessionId);

    const vaultKey = getVaultKey(program.programId, sessionId);

    const vaultTokenAccountKey = getVaultTokenAccount(mintKey, vaultKey);

    console.log("Initial balances:-\n\n");
    console.log("User 1:-", await getTokenBalance(provider.connection, user1TokenAccount));

    // Arguments for the `create_game_session` instruction
    const createGameSessionArgs: types.CreateGameSessionArgs = {
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
        userTokenAccount: user1TokenAccount,
        mint: mintKey
      })
      .signers([user1])
      .rpc(confirmOptions);

    console.log("After create - Vault balance:- ", 
      await getTokenBalance(provider.connection, vaultTokenAccountKey));

    // Arguments for the `distribute_winnings` instruction
    const distributeArgs: types.DistributeWinningsArgs = {
      winningTeam: {teamA:{}}
    };

    try {
      // Try to distibute winnings
      await program.methods
        .distributeWinnings(distributeArgs)
        .accountsPartial({
          globalConfig: globalConfigKey,
          server: gameServerKeypair.publicKey,
          creator: user1.publicKey,
          creatorTokenAccount: user1TokenAccount,
          gameSession: gameSessionKey,
          vault:vaultKey          
        })
        .remainingAccounts([
          {
            pubkey: user1TokenAccount,
            isSigner: false,
            isWritable: true,
          }
        ])
        .signers([gameServerKeypair])
        .rpc(confirmOptions);

      assert.fail("The transaction should have failed the game is not in progress");
    } catch (err) {
        assert(err instanceof anchor.AnchorError, "Unknown error");
      
        const anchorError = err;
      
        assert.equal(anchorError.error.errorCode.code, "GameNotInProgress");
    }
  });

  it("Fails to distribute winnings with wrong remaining accounts count", async () => {
    const sessionId = getSessionId(6);

    const gameSessionKey = getGameSessionKey(program.programId, sessionId);

    const vaultKey = getVaultKey(program.programId, sessionId);

    const vaultTokenAccountKey = getVaultTokenAccount(mintKey, vaultKey);

    console.log("Initial balances:-\n\n");
    console.log("User 1:-", await getTokenBalance(provider.connection, user1TokenAccount));
    console.log("User 2:-", await getTokenBalance(provider.connection, user2TokenAccount));

    // Arguments for the `create_game_session` instruction
    const createGameSessionArgs: types.CreateGameSessionArgs = {
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
        userTokenAccount: user1TokenAccount,
        mint: mintKey
      })
      .signers([user1])
      .rpc(confirmOptions);

    // Arguments for the `join_user` instruction
    const joinArgs: types.JoinUserArgs = {
      team: {teamB:{}}
    };

    // Join user2
    await program.methods
      .joinUser(joinArgs)
      .accountsPartial({
        user: user2.publicKey,
        gameSession: gameSessionKey,
        userTokenAccount: user2TokenAccount,
        mint: mintKey,
        vault:vaultKey,
        globalConfig:globalConfigKey,
        server:gameServerKeypair.publicKey    
      })
      .signers([user2, gameServerKeypair])
      .rpc(confirmOptions);

    console.log("After joins - Vault balance:- ", 
      await getTokenBalance(provider.connection, vaultTokenAccountKey));

    // Arguments for the `distribute_winnings` instruction
    const distributeArgs: types.DistributeWinningsArgs = {
      winningTeam: {teamA:{}}
    };

    try {
      // Try to distribute winnings
      await program.methods
        .distributeWinnings(distributeArgs)
        .accountsPartial({
          globalConfig: globalConfigKey,
          server: gameServerKeypair.publicKey,
          creator: user1.publicKey,
          creatorTokenAccount: user1TokenAccount,
          gameSession: gameSessionKey,
          vault:vaultKey          
        })
        .remainingAccounts([
          // No accounts provided
          
        ])
        .signers([gameServerKeypair])
        .rpc(confirmOptions);

      assert.fail("The transaction should have failed, the remaining accounts are not complete.");
    } catch (err) {
       assert(err instanceof anchor.AnchorError, "Unknown error");
      
        const anchorError = err;
      
        assert.equal(anchorError.error.errorCode.code, "InvalidRemainingAccounts");
    }
  });
});