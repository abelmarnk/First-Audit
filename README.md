# PrimeSkill Game Studio — Audit & Improvements Report

**Version:** V1  
**Date:** September 14, 2025  
**PDF Report:** A more detailed PDF version of this report can be found [here](https://drive.google.com/file/d/1NCFJGLmIh8o3WjtZ74F13kfEYZD7nFt6/view?usp=sharing)

---

## Table of Contents
- [Scope](#scope)
- [Summary of Approach](#summary-of-approach)
- [Phase 1 — Audit and Fix Suggestions](#phase-1--audit-and-fix-suggestions)
  - [Findings](#findings)
  - [Vulnerability I](#vulnerability--i)
  - [Vulnerability II](#vulnerability--ii)
  - [Vulnerability III](#vulnerability--iii)
- [Phase 2 — Improvements](#phase-2--improvements)
  - [File-by-File Improvements](#file-by-file-improvements)
  - [General Improvements](#general-improvements)
- [Timeline](#timeline)
- [Additional Info](#additional-info)
- [Build Info](#build-info)
- [Author Info](#author-info)

---

## Scope
**Phase 1**  
- Full audit of the supplied Solana smart contract  

**Phase 2**  
- Full rewrite of the contract implementing the suggested fixes and improvements  

---

## Summary of Approach

### On-chain Audit
- Identify vulnerabilities that depend only on on-chain code.  
- Provide damage clarity.  
- Provide a flow that demonstrates how that vulnerability would be exploited.  
- Suggest fixes.  

### Code Rewrite
- Identify improvements.  
- Rewrite code.  
- Write tests to ensure the code works as expected.  

---

## Phase 1 — Audit and Fix Suggestions

### Findings

#### Vulnerability – I
**Category:** Logic Error / Privilege Escalation  

**Description:**  
Anyone can create a game session and put themselves as the server/signer. This allows malicious users to manipulate game outcomes by controlling state changes and falsely recording kills.  

**Attack Flow:**  
Malicious user → Creates session manually → Other users join → Capacity reached → Malicious user records kills → Wins game → Funds distributed unfairly.  

**Severity:** Very High  

**Fix:**  
- Initialize program with server/admin.  
- Store admin key in global config account.  
- Restrict privileged actions (e.g., recording kills) to admin only.  

---

#### Vulnerability – II
**Category:** Logic Error / Privilege Escalation  

**Description:**  
Any user can take multiple slots in a valid game, filling both teams with duplicate/dummy accounts. This allows malicious users to sabotage teams or guarantee victory.  

**Attack Flow:**
Valid game session created → A few users join normally → Malicious user repeatedly adds themselves (or dummy accounts) into remaining slots on both teams → 
Teams fill up with duplicates/dummies → Game starts → Dummy players do not participate, sabotaging one team while the malicious user ensures their team wins → 
Malicious user (and their duplicates) claim winnings → Honest players lose their funds.

**Severity:** Very High  

**Fix:**  
- Require server signature to authorize joins.  
- Ensure uniqueness of players.  
- Optionally, add reservation of slots by players for better team integrity.  

---

#### Vulnerability – III
**Category:** Economic Imbalance  

**Description:**  
This may be an intended mechanic but, in pay-to-spawn games, players with large funds can spawn endlessly, giving them a significant unfair advantage.  

**Severity:** Medium  

**Fix:**  
- Limit the number of spawns per user, by setting hard caps  
- Enforce a balanced gameplay mechanic.  

---

### Other Vulnerabilities
- Additional issues and safe guards identified such as overflow/underflow e.t.c. are documented in Phase 2 improvements.  

---

## ⚡ Phase 2 — Improvements

The program primarily acts as an escrow for funds transfer. Additional logic is necessary to prevent inconsistent states and exploitation. Improvements are organized file-by-file below.

---

### File-by-File Improvements

#### `create_game_session.rs`
- Bound string ID size.  
- Automatically add creator as player on creation.  
- Remove unused vault token bump.  
- Replace manual PDA space calc with `INIT_SPACE`.  
- Use `UncheckedAccount` instead of `AccountInfo`.  
- Remove unused rent sysvar.  
- Add session close flow.  

#### `distribute_winnings.rs`
- Remove unused programs from context.  
- Remove redundant session ID arg.  
- Remove duplicated authority check.  
- Close vault & token accounts post-game.  
- Handle leftover lamports (round session bet to nearest multiple of 10).  
- Optimize account lookup for O(n) instead of O(n²).  
- Use `UncheckedAccount`.  
- Reduce transaction overhead by using stored pubkeys.  

#### `join_user.rs`
- Remove redundant session ID arg.  
- Mark user account as `Signer` instead of `mut`.  
- Enforce server check if Vulnerability II fix is applied.  
- Prevent duplicate joins.  
- Use `UncheckedAccount`.  

#### `pay_to_spawn.rs`
- Limit spawn purchases per player.  
- Remove redundant session ID arg.  
- Use `UncheckedAccount`.  
- Remove unused programs from context.  

#### `record_kill.rs`
- Remove redundant session ID arg.  

#### `refund_wager.rs`
- Remove redundant session ID arg.  
- Close vault & token accounts after game session.  
- Handle leftover lamports on non-multiple-of-10 bets.  
- Reduce transaction overhead by using stored pubkeys.  

#### `game_session.rs` (previously `state.rs`)
- Remove unused variables.  
- Improve `get_all_players` efficiency.  
- Remove vault token bump.  
- Use `INIT_SPACE` instead of manual calc.  
- Use checked math (`checked_*`) for counters.  
- Optimize kill/spawn functions with indexed calls.  

#### `team.rs` (previously `state.rs`)
- Optimize `add_player` by leveraging stored player count.  

#### `create_global_config.rs`
- Add instruction for initial config with admin key.  

#### `update_global_config.rs`
- Add ability to update admin keys for key rotation or ownership transfer.  

---

### General Improvements
- Remove deducible logs to save compute units, e.g logging both the total pot and all the winnings(the sum can be calculated to get the total in this case).
- Remove unnecessary mint checks.  

---

## Timeline
Project completed between **14/09/25** and **26/09/25**.  

---

## Additional Info
- All changes implemented in the [**programs**](https://github.com/abelmarnk/First-Audit/tree/main/programs/wager-program) section of this repository.
- All tests for the program rewrite can be found in the [**tests**](https://github.com/abelmarnk/First-Audit/tree/main/tests) section of this repository.

## Build Info
- The program can be built and the tests run by simply running `anchor test`, though the program binary and interface types are already provided in the `/target` folder

---

## 👤 Author Info
**Name:** Banji-Idowu Orinayo / abelmarnk  
- GitHub: [https://github.com/abelmarnk](https://github.com/abelmarnk)  
- Solana Stack Exchange: [Profile](https://solana.stackexchange.com/users/30489/abelmarnk)  
- X: [https://x.com/abelmarnk](https://x.com/abelmarnk)  
