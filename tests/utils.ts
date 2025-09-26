import * as anchor from "@coral-xyz/anchor";
import * as types from "./types"
import { Keypair, LAMPORTS_PER_SOL, PublicKey, Connection } from "@solana/web3.js";
import { readFileSync, writeFileSync } from "fs";
import { 
  getOrCreateAssociatedTokenAccount,
  createMint,
  mintTo,
  getAssociatedTokenAddressSync,
  TokenAccountNotFoundError
} from "@solana/spl-token";

export const SPAWNS_PER_DEPOSIT = 10;
export const BASE_TOKEN_AMOUNT = 1_000_000_000;

export function numberToTeam(team:0|1):{teamA:{}}|{teamB:{}}{
  return team == 0 ? {teamA:{}} : {teamB:{}}
}

// Finds the index where a player is stored in a list of players,
// It assumes that the team index passed in is correct
export function findPlayerInGameSession(gameSession: types.GameSession, team:0|1, key:PublicKey):number{
  return team == 0 ? gameSession.teamA.players.findIndex((maybeKey:PublicKey) => maybeKey.equals(key)) :
          gameSession.teamB.players.findIndex((maybeKey:PublicKey) => maybeKey.equals(key))
}

// In order to save gas the program requires that the list of users be sorted when it is presented
// so we can efficiently check for duplicates.
export function getSortedAndCreatorIndex(keys: PublicKey[]): [number, PublicKey[]] {
  const creatorKey = keys[0];

  // Sort by raw 32-byte value
  keys.sort((a, b) => Buffer.compare(a.toBuffer(), b.toBuffer()));

  // Find index of the creator key in the sorted array
  const index = keys.findIndex((key) => key.equals(creatorKey));

  return [index, keys];
}

export function getIniitializerKeypair():Keypair{
  return loadKeypair("./tests/kps/initializer.json");
}

// This is defined because of the fact that the mint 
// could be possibly changed.
export function getMintKeypair(): Keypair {
  return loadKeypair("./tests/kps/mint.json");
}

export function getMintKey(): PublicKey {
  return loadKeypair("./tests/kps/mint.json").publicKey;
}

// This is defined because of the fact that the gameServer 
// could be possibly changed.
export function getGameServerKeypair():Keypair{
  return loadKeypair('./tests/kps/gameserver.json')
}

export function getGameServerKey():PublicKey{
  return loadKeypair('./tests/kps/gameserver.json').publicKey
}

export function writeGameServerKey(keypair:Keypair){
  // Convert secret key (Uint8Array) into regular number array
  const secretKey = Array.from(keypair.secretKey);

  // Write JSON to file
  writeFileSync("./tests/kps/gameserver.json", JSON.stringify(secretKey));
}

export function generateRandomKillTuple(playerUpperBound: number, killsUpperBound: number): [types.TeamType, number, number, number] {
  if (playerUpperBound < 1) {
    throw new Error("Need at least 2 players to generate a valid kill tuple.");
  }
  if (killsUpperBound < 1) {
    throw new Error("killsUpperBound must be >= 1");
  }

  let killTeam:0|1 = Math.floor(Math.random() * (2)) as 0|1; // Guaranteed to be either 0 | 1

  let killerIndex = Math.floor(Math.random() * (playerUpperBound + 1)); // 0..playerUpperBound
  let victimIndex = Math.floor(Math.random() * (playerUpperBound + 1));

  const killsCount = Math.floor(Math.random() * killsUpperBound) + 1; // 1..killsUpperBound

  let killTeamAsTeamType:types.TeamType = killTeam == 0 ? {teamA:{}} : {teamB:{}};

  return [killTeamAsTeamType, killerIndex, victimIndex, killsCount];
}

export function extractPlayerStats(gameSession: types.GameSession): Array<{ pubkey: PublicKey, killsAndSpawns: number }> {
      const players: Array<{ pubkey: PublicKey, killsAndSpawns: number }> = [];

      const teams = [gameSession.teamA, gameSession.teamB];

      for (const team of teams) {
        team.players.forEach((p: PublicKey, idx: number) => {
          if (!p.equals(PublicKey.default)) {
            const kills = team.playerKills[idx];
            const spawns = team.playerSpawnsRemaining[idx];
            const total = kills + spawns;
            if (total > 0) {
              players.push({ pubkey: p, killsAndSpawns: total });
            }
          }
        });
      }
      return players;
}

// Helper function to get all token accounts with kills and spawns greater than 0,
// it assumes that all players that are in the first array have their kills and spawns greater
// than 0.
export function getTokenAccounts(
  elitePlayers: PublicKey[],
  playersAndTokenAccounts: { player: PublicKey; tokenAccount: PublicKey }[]
){
  const set = new Set(elitePlayers.map(k => k.toBase58()));

  return playersAndTokenAccounts
    .filter(p => set.has(p.player.toBase58()))
    .map(p => ({
      pubkey: p.tokenAccount,
      isSigner: false,
      isWritable: true
    }));
}

export function calculateExpectedEarnings(gameSession: types.GameSession, players: Array<{ pubkey: PublicKey, killsAndSpawns: number }>) {
  const killsAndSpawnsSum = players.reduce((acc, p) => acc + p.killsAndSpawns, 0);

  const totalWager = Math.floor(killsAndSpawnsSum / SPAWNS_PER_DEPOSIT) * Number(gameSession.sessionWager);

  const earnings: Record<string, number> = {};

  let distributed = 0;

  for (const p of players) {
    const val = Math.floor((p.killsAndSpawns * totalWager) / killsAndSpawnsSum);
    earnings[p.pubkey.toBase58()] = val;
    distributed += val;
  }

  console.log("Players: ",  players)

  const leftover = totalWager - distributed;
  
  return { earnings, leftover };
}

export function getSessionId(
  number:number
): string {
  return "game-session-" + String(number);
}

export function getGlobalConfigKey(
    programId: PublicKey
):PublicKey{
  return PublicKey.findProgramAddressSync(
      [Buffer.from("global-config")],
      programId
    )[0];
}

export async function getBalance(
  connection: anchor.web3.Connection, 
  publicKey: PublicKey
): Promise<number> {
  return connection.getBalance(publicKey);
}

export async function airdropToAccount(
  connection: anchor.web3.Connection,
  publicKey: PublicKey,
  amount: number = LAMPORTS_PER_SOL
): Promise<void> {
  const signature = await connection.requestAirdrop(publicKey, amount);
  await connection.confirmTransaction(signature);
}

export function getGameSessionKey(
  programId: PublicKey, 
  sessionId: string
): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("game_session"), Buffer.from(sessionId)],
    programId
  )[0];
}

export function getVaultKey(
  programId: PublicKey, 
  sessionId: String
): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("vault"), Buffer.from(sessionId)],
    programId
  )[0];
}

export function loadKeypair(
  path: string
): Keypair {
  const data = JSON.parse(readFileSync(path, 'utf-8'));
  return anchor.web3.Keypair.fromSecretKey(new Uint8Array(data));
}

export async function setupTokenAccount(
  connection: Connection,
  payer: Keypair,
  tokenMint: PublicKey,
  owner: PublicKey,
  amount: number = 100_000_000_000_000 // 100_000 tokens - our mint uses 9 decimals
): Promise<PublicKey> {
  
  const tokenAccountInfo = await getOrCreateAssociatedTokenAccount(
    connection,
    payer,
    tokenMint,
    owner
  );

  await mintTo(
    connection,
    payer,
    tokenMint,
    tokenAccountInfo.address,
    payer,
    amount
  );

  return tokenAccountInfo.address;
}


export function getVaultTokenAccount(
  tokenMint: PublicKey,
  vaultPda: PublicKey,
): PublicKey {

  return getAssociatedTokenAddressSync(
    tokenMint,
    vaultPda,
    true
  );
}

export async function airdropToAccounts(
  connection: Connection,
  publicKeys: Array<PublicKey>,
  amount: number = LAMPORTS_PER_SOL
  ): Promise<void> {
    for (const publicKey of publicKeys) {
      const signature = await connection.requestAirdrop(publicKey, amount);
      await connection.confirmTransaction(signature);
    }
}

export async function setupMintAndServer(
  connection: Connection,
  gameServer: Keypair,
  mint: Keypair,
): Promise<void> {

    const signature = await connection.requestAirdrop(
      gameServer.publicKey,
      2 * LAMPORTS_PER_SOL
    );

    await connection.confirmTransaction(signature);

    await createMint(
      connection,
      gameServer,
      gameServer.publicKey,
      null, 
      9, // 9 decimals 
      mint 
    );

  }


export async function getTokenBalance(
  connection: Connection, 
  tokenAccount: PublicKey
): Promise<number> {
  const info = await connection.getTokenAccountBalance(tokenAccount);

  if (info.value.amount == null) 
    throw new TokenAccountNotFoundError("Token balance not found");

  return  Number(info.value.amount);
} 

export const printGameState = async (
    gameState: any,
    message: string,
    vaultTokenAccount?: string,
    connection?: Connection
) => {
    console.log(`\n${message}:`);

    console.log("\nTeam A:\n\n");

    gameState.teamA.players.forEach((player: PublicKey, index: number) => {
        if (player.toString() !== PublicKey.default.toString()) {
            console.log(`Player ${player.toString()}:`);
            console.log(`Kills: ${gameState.teamA.playerKills[index]}`);
            console.log(`Spawns remaining: ${gameState.teamA.playerSpawns[index]}\n`);
        }
    });
    
    console.log("\nTeam B:\n\n");

    gameState.teamB.players.forEach((player: PublicKey, index: number) => {
        if (player.toString() !== PublicKey.default.toString()) {
            console.log(`Player ${player.toString()}:`);
            console.log(`  Kills: ${gameState.teamB.playerKills[index]}`);
            console.log(`  Spawns remaining: ${gameState.teamB.playerSpawns[index]}\n`);
        }
    });
    
    console.log("\nGame status:", gameState.status);
    
    if (vaultTokenAccount && connection) {

        try{
          const vaultBalance = await getTokenBalance(connection, new PublicKey(vaultTokenAccount));
          console.log("Vault balance:", vaultBalance);
        } catch(err){
          if (err instanceof TokenAccountNotFoundError){
            console.log("Token account no longer exists");
          }
        }
    }
}; 