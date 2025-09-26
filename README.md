# Prime Skill Game Studio - Audit Report

## Project Information

**Project:** PrimeSkill Studio  
**Version:** V1  
**Date:** September 14, 2025

**PDF Report:** A PDF version of this report can be found [here](https://drive.google.com/file/d/1NCFJGLmIh8o3WjtZ74F13kfEYZD7nFt6/view?usp=sharing)

---

## Table of Contents

- [Scope](#scope)
- [Summary of Approach](#summary-of-approach)
- [Phase 1 - Audit and Fix Suggestions](#phase-1---audit-and-fix-suggestions)
- [Phase 2 - Identify Improvements & Implementation](#phase-2---identify-improvements--implementation)
- [Timeline](#timeline)
- [Additional Info](#additional-info)
- [Author Info](#author-info)

---

## Scope

### Phase 1
Full audit of the supplied Solana smart contract

### Phase 2
Full rewrite of the contract implementing the suggested fixes and improvements

---

## Summary of Approach

### On-chain audit
- Identify vulnerabilities that depend only on on-chain code.
- Provide damage clarity.
- Provide a flow that demonstrates how that vulnerability would be exploited.
- Suggest fixes.

### Code rewrite
- Identify the improvements
- Rewrite code.
- Write tests to ensure the code works as expected

---

## Phase 1 - Audit and Fix Suggestions

### Findings - First Audit

### Vulnerabilities

#### Vulnerability – I

**Category:** Logic Error/Privilege escalation

**Description:**
A vulnerability with the way game sessions are handled is that anyone can create a game session put themselves as the server/signer, what comes next would then be having other join the game through invites or some other means.
After the game has begun the user can then record for kills they did not make and then position themselves to win the game, since they are the only ones that can change the game state due to having the server key

**Attack Flow:**
Malicious user → Creates session manually → Other users join → Capacity reached & Game starts → Malicious user records kills themselves alone → Wins game → Funds are distributed to the malicious user alone or their team depending on the type of game.  


**Severity:** Very high, if successfully executed it could lead to loss of funds for other players.

**Fix:**
The vulnerability could be fixed by initializing the program with the server/admin, this is the standard approach used in onchain programs to gate administrative functions to certain users, in this case the admin key could be stored in a global config account and then this would be used to check against anyone who wants to perform any privileged action such as recording kills, players can create games as they will but privileged actions are restricted to the server

#### Vulnerability – II

**Category:** Logic error/Privilege escalation

**Description:**
Another vulnerability that could be taken advantage of is the fact that even for valid games (created by the server), any user can take any number of slots, they do this by adding themselves repeatedly, this is made possible by the fact that the join user action is not authorized by the server, if it was the server would be able to check that there are no duplicates and that each user is unique, e.g. has some identification either by email address or any other means.
For a game that already exists, with members on one team and waiting for members on the other (e.g. team A has no members yet, but Team B has 2 members and is waiting for 3 more), the user can fill in themselves or some other dummy account for the remaining slots in Team B, and take up all the 5 spots on team A. This would put Team B at a disadvantage, since they would have dummy and unresponsive players.
The malicious user would be driven by the fact that they would receive their deposits back and also the deposits of other players as well.

**Attack Flow:**
Valid game session created → A few users join normally → Malicious user repeatedly adds themselves (or dummy accounts/collaborators) into remaining slots on both teams → Other Team fill up with duplicates/dummies → Game starts → Dummy players do not participate, sabotaging one team while the malicious user ensures their team wins → Malicious user (and their duplicates) claim winnings → Honest players lose their funds.

**Severity:** Very high, it is similar to the above vulnerability, if it is successfully executed it would lead to loss of funds for other players

**Fix:**
Make the server required to sign and enforce from the server end that all players are distinct.
Another fix/feature could be implemented, which would make the gameplay better is to allow each set of users to reserve the slots on their team from the point the game is created, this approach would prevents attacks of this sort where dummy users join one side of the team to make that side lose while they get real players to play for the other side, reserving the slots avoids this problem entirely and it is more reasonable since gamers would want to know who their fellow players are so they can plan ahead, this reservation feature is best implemented on the server so that all kinds of custom checks could be freely used(e.g check using information that is not present onchain e.g gmails).

#### Vulnerability - III

This is less of a vulnerability and may be an intended mechanic, but there is a problem with users who have a large allocation of funds in a pay-to-spawn style game.
A player with large amount of funds can simply pay their large allocation repeatedly, effectively putting themselves in a position to win by holding the majority share.
It would be more reasonable to set a limit on how many times a user can spawn, either by the creator of the game session or hard coded rules. Once their allotted spawns are exhausted, they should no longer be able to spawn again. This would be a more balanced gameplay compared to allowing unlimited spawning.

#### Other Vulnerabilities
There are other potential vulnerabilites found in the program, such as overflow/underflow they are listed as improvements in phase 2

---

## Phase 2 - Identify Improvements & Implementation

### Improvements

The core purpose of the program is to act as an escrow, facilitating the transfer of funds between users. That is essentially all the program is required to do.
However, the program includes additional logic, primarily checks, to ensure it never enters an inconsistent state that could be exploited (e.g., duplicate users). While these checks could instead be handled by the server—where every instruction would be validated before execution—that approach would make the game fully centralized. To avoid this, some aspects remain server-controlled while others are left open.
From an optimization perspective, if the program relied entirely on the server, it could be simplified to a minimal escrow implementation. But since certain parts are intentionally left open, these checks are necessary to maintain consistency and prevent issues. 
These are improvements that could be made to the current implementation, they are specified on a file by file basis, some improvements are repeated so they it could be known for each specific file it applies to.

### create_game_session.rs

**Problem:** The size of the string ID is not bounded when it is created  
**Improvement:** Bounding the size of the string, would allow for the struct to be well defined and prevent writing into other parts of it, it can be resolved by adding in a bound check and returning and error is that bound is surpassed.

**Problem:** After creating a game session the creator still has to explicitly join using more lamports(gas) in the process.  
**Improvement:** Add the creator in when they create the game so that they don't need to call a separate instruction to join the game, saving gas.

**Problem:** Vault token bump not set and not used  
**Improvement:** Remove the vault token bump since Anchor derives ATA automatically and bump is not needed to be stored, it would reduce the space to be allocated.

**Problem:** Manual space calculation used for game session PDA  
**Improvement:** Use INIT_SPACE instead of manual space calculation for game session PDA to reduce chance of miscalculation errors.

**Problem:** Vault account is using Account Info  
**Improvement:** Using the `UncheckedAccount` type for accounts whose types are not validated is a more standard approach because it states more clearly that the account is not checked.

**Problem:** Rent sysvar account is included but unused  
**Improvement:** Remove rent sysvar from the accounts context since it's not being used, it would reduce the transaction size.

**Problem:** Missing session close flow  
**Improvement:** Add session close flow so the server can eventually close the session to reclaim lamports after completion.

### distribute_winnings.rs

**Problem:** The system program and associated token program are unused  
**Improvement:** Remove unused system program and associated token program from context, it would reduce the transaction size.

**Problem:** Session id argument redundant  
**Improvement:** Remove session id since it's stored in game session, and use it directly from the game session, it would reduce transaction size.

**Problem:** Authority check duplicated in the distribute all winnings handler function  
**Improvement:** Remove duplicated authority check since it's already enforced in the accounts context.

**Problem:** Game session account and the vault token account not closed after the game session  
**Improvement:** Close the vault account and it's token account and return the lamports back to the server/creator(If we want to store it to the creator then the creator would have to be stored in the session struct and be passed when we call the instruction, which is what is implemented in the improvements), closing would allow for users to be refunded for the fees they pay for creating games, preventing build ups

**Problem:** Not all the tokens may be transferred out of the vault account, this is due to the fact that the the session bet may not be a multiple of 10, if this is case, then based on the current implementation some tokens would still be left over due to truncation.  
**Improvement:** This problem in some sense cannot be avoided there would always be some truncation if the session bet is not a multiple, one approach we can take is to transfer the remainder of the funds to the highest scorer, but the cleanest approach in my opinion, would be forcing the amount for the session bet when the game session is created to the nearest multiple of 10, preferably it would be the lower multiple so the transaction would not fail due to an insufficient balance(it is possible the transaction fails do to a minor 10 lamports difference), e.g of the creator wanted to make the session bet 575,895 lamports, they would use 575,890 and be debited exactly that amount instead.

**Problem:** In both functions the players which would have their accounts credited are used to transfer out the tokens, in this case we iterate over those accounts and look for their accounts and token accounts in the remaining accounts passed, this check is inefficient and not the best that can be done.  
**Improvement:** We can improve this by having the server read of the accounts from the chain and pass the account in that order, and we can make a double forward pass verifying and transferring, which would take O(n) time instead of O(n^2).

**Problem:** Vault account using Account Info  
**Improvement:** Using the `UncheckedAccount` type for accounts whose types are not validated is a more standard approach because it states more clearly that the account is not checked.

**Problem:** The user accounts are passed into the instruction are not necessary  
**Improvement:** The user accounts passed into the instruction can be replaced by the public keys stored in the game session thereby reducing transaction overhead, we can further reduce it by only passing in token accounts that we know are going to be given some winnings

### join_user.rs

**Problem:** Session id argument redundant.  
**Improvement:** Remove session id since it's stored in game session, and use it directly from the game session, it would reduce transaction size.

**Problem:** User account incorrectly marked mut.  
**Improvement:** Change user account to only need Signer instead of mut, it only needs to sign the transaction to transfer out its tokens.

**Problem:** Game server account unused.  
**Improvement:** If vulnerability - II is fixed then the game server would need to be checked and it would also need to sign.

**Problem:** Duplicate joins not prevented.  
**Improvement:** If the vulnerability – I is fixed then the server could check that a user joining is not already present, and is a distinct player, using some sort of identification, as stated there it may also be better to allow players to reserve positions on their team.

**Problem:** Vault account using Account Info  
**Improvement:** Using the `UncheckedAccount` type for accounts whose types are not validated is a more standard approach because it states more clearly that the account is not checked.

### pay_to_spawn.rs

**Problem:** Economic imbalance vulnerability where players with deep pockets can dominate  
**Improvement:** Put a limit on player spawn purchases per player to prevent a game imbalance, this would be fixed if vulnerability – III is fixed, they are the same problem just repeated here for context.

**Problem:** Session id argument redundant  
**Improvement:** Remove session id since it's stored in game session, and use it directly from the game session, it would reduce transaction size.

**Problem:** Vault account using Account Info  
**Improvement:** Using the `UncheckedAccount` type for accounts whose types are not validated is a more standard approach because it states more clearly that the account is not checked.

**Problem:** The system program and associated token program are unused  
**Improvement:** Remove unused system program and associated token program from context, it would reduce the transaction size.

### record_kill.rs

**Problem:** Session id argument redundant  
**Improvement:** Remove session id since it's stored in game session, and use it directly from the game session, it would reduce transaction size.

### refund_wager.rs

**Problem:** Session id argument redundant  
**Improvement:** Remove session id since it's stored in game session, and use it directly from the game session, it would reduce transaction size.

**Problem:** Vault account and it's token account not closed after the game session  
**Improvement:** Close the vault account and it's token account and return the lamports back to the server/creator(If we want to store it to the creator then the creator would have to be stored in the session struct and be passed when we call the instruction)

**Problem:** Not all the tokens may be transferred out of the vault account, this is due to the fact that the the session bet may not be a multiple of 10, if this is case, then based on the current implementation some tokens would still be left over due to truncation.  
**Improvement:** This problem in some sense cannot be avoided there would always be some truncation if the session bet is not a multiple, one approach we can take is to transfer the remainder of the funds to the highest scorer, but the cleanest approach in my opinion, would be forcing the amount for the session bet when the game session is created to the nearest multiple of 10, preferably it would be the lower multiple so the transaction would not fail due to an insufficient balance(it is possible the transaction fails do to a minor 10 lamports difference)

**Problem:** The user accounts are passed into the instruction are not necessary  
**Improvement:** The user accounts passed into the instruction can be replaced by the public keys stored in the game session thereby reducing transaction overhead, we can further reduce it by only passing in token accounts that we know are going to be given some winnings

### game_session.rs (previously in state.rs)

**Problem:** The Team total bet variable is unused  
**Improvement:** Remove the variable to save space, which would save lamports since it serves no purpose.

**Problem:** The get all players function could be improved  
**Improvement:** Allocate vector with the `with_capacity` function to reduce reallocations, or change implementation to iterate over both teams to avoid allocation all together, this would save gas which would save lamports.

**Problem:** Vault token bump unnecessary.  
**Improvement:** Remove vault token bump since it's not needed, it would save space, which would save lamports.

**Problem:** Manual space calculation for Game Session.  
**Improvement:** Replace manual space calculation with `INIT_SPACE` macro to avoid mistake, this change can be made after the string size has been fixed.

**Problem:** Possible(though unlikely – but still possible) risk of overflow/underflow with the spawn count, the same goes for the kill count it could overflow after enough kills  
**Improvement:** If at all an overflow/underflow happens it would be better if it gave a clear error and prevent any kind of unexpected behaviour, this can be solved by using the `checked_*` functions.

**Problem:** The `add_kill` and `add_spawn` functions currently use the old team functions to first find the user by performing a lookup and then adding if the key is found  
**Improvement:** We can use the `add_kill_at` and `add_kill_at` functions instead this expects the caller of the program to look up the index where the player is stored and then pass the index and the key to the program, which the program would use to confirm the key is correct, it would then add the spawns, avoiding any lookups

### team.rs (previously in state.rs)

**Problem:** The add player function currently performs a search to find an empty spot  
**Improvement:** we can avoid the overhead of the lookup by using the fact that the team struct now stores the player count as a u8 which brings no disadvantage(looking at it over a large scale repeated as many times as the game is played) since the funds for the rent would be returned back to the creator, this allows for us to avoid lookup and just have a simple check for whether or not there was still space in the team

### create_global_config.rs

**Improvement:** This is an improvement that goes with the suggestion of the fix in the vulnerabilities listed above, it adds an instruction for setting the initial configuration of the program, can be later updated and as of now just contains the admin key

### update_global_config.rs

This is an improvement that is a continuation of the above, it allows for the admin keys to be updated, which a reason could be brought about for several cases like leaked keys, scheduled key rotation or transfer of ownership

### General

These improvements are applicable to most files:
- Remove deducible logs, e.g remove logs that the information from the logs is deducible from the transaction data or other logs to save CU
- Remove unncessary mint checks, there are several places in the code e.g in the distribution of winnings, where the mint is explictly checked, this explcit check is not needed, as an attempt to transfer tokens with two token accounts with different mints would always fail

---

## Additional Info
- All changes implemented in the [**programs**](https://github.com/abelmarnk/First-Audit/tree/main/programs/wager-program) section of this repository.
- All tests for the program rewrite can be found in the [**tests**](https://github.com/abelmarnk/First-Audit/tree/main/tests) section of this repository.

---

## Build Info
- The program can be built and the tests run by simply running `anchor test`, though the program binary and interface types are already provided in the `/target` folder
  
---

## Timeline
This project was completed between 14/09/25 to 26/09/25

---

## Author Info

**Name:** Banji-Idowu Orinayo /abelmarnk  
**Github:** https://github.com/abelmarnk  
**Solana Stack Exchange:** https://solana.stackexchange.com/users/30489/abelmarnk  
**X:** https://x.com/abelmarnk
