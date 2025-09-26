import * as anchor from "@coral-xyz/anchor";
import { Program, IdlTypes } from "@coral-xyz/anchor";
import { WagerProgram } from "../target/types/wager_program";
import { BN } from "@coral-xyz/anchor";

// -------------------------------
// Instruction argument types
// -------------------------------
export type CreateGameSessionArgs = IdlTypes<WagerProgram>["createGameSessionArgs"];
export type CreateGlobalConfigArgs = IdlTypes<WagerProgram>["createGlobalConfigArgs"];
export type DistributeWinningsArgs = IdlTypes<WagerProgram>["distributeWinningsArgs"];
export type JoinUserArgs = IdlTypes<WagerProgram>["joinUserArgs"];
export type PayToSpawnArgs = IdlTypes<WagerProgram>["payToSpawnArgs"];
export type RecordKillArgs = IdlTypes<WagerProgram>["recordKillArgs"];
export type UpdateGlobalConfigArgs = IdlTypes<WagerProgram>["updateGlobalConfigArgs"];

// -------------------------------
// Enum types
// -------------------------------
export type GameMode = IdlTypes<WagerProgram>["gameMode"];
export type GameStatus = IdlTypes<WagerProgram>["gameStatus"];
export type TeamType = IdlTypes<WagerProgram>["teamType"];

// -------------------------------
// Struct types
// -------------------------------
export type Team = IdlTypes<WagerProgram>["team"];
export type GameSession = IdlTypes<WagerProgram>["gameSession"];
export type GlobalConfig = IdlTypes<WagerProgram>["globalConfig"];
