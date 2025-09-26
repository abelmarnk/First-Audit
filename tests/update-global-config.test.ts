import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { WagerProgram } from "../target/types/wager_program";
import *  as types from "./types";
import { assert} from "chai";
import {
  getGameServerKeypair,
  getGlobalConfigKey,
  getMintKey,
  writeGameServerKey,
  airdropToAccount
} from "./utils";
import { 
  ConfirmOptions, 
  Keypair
} from "@solana/web3.js";
import { AuthorityType, getMint, setAuthority } from "@solana/spl-token";

const confirmOptions: ConfirmOptions = { commitment: "confirmed" };

describe("Update Global Config", ()=>{

  // Setup the environment
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.WagerProgram as Program<WagerProgram>;

  let gameServerKeypair:Keypair;

  const newGameServerKeypair = Keypair.generate();
  
  const mintKey = getMintKey();

  const globalConfigKey = getGlobalConfigKey(program.programId);

  before("", async ()=>{
    gameServerKeypair = getGameServerKeypair();
  })
  
  // Arguments for the `update_global_config` instruction  
  const args:types.UpdateGlobalConfigArgs = {
      authority:newGameServerKeypair.publicKey
  }

  it("Successfuly updates the config", async ()=>{

    // Execute the transaction    
    await program.methods.
    updateGlobalState(args).
    accountsPartial({
      admin:gameServerKeypair.publicKey
    }).
    signers([gameServerKeypair]).
    rpc(confirmOptions);

    // Get the global config account and confirm it is what we have updated it to be
    let globalConfigAccount = await program.account.globalConfig.fetch(globalConfigKey);

    assert(globalConfigAccount.authority.equals(newGameServerKeypair.publicKey))
  })

  it("Fails to update the config because of outdated admin(now invalid)", async ()=>{
    try{
      // Execute the transaction
      await program.methods.
      updateGlobalState(args).
      accountsPartial({
        admin:gameServerKeypair.publicKey
      }).
      signers([gameServerKeypair]).
      rpc(confirmOptions);

      assert.fail("This transaction should have failed because the admin provided is not valid");
    } catch(err){
      console.log("Error: ", err);
      assert.ok("This transaction failed successfully, hurray!!!")
    }
  })

  it("Replace the old game server key with the new one, so other tests pass", async ()=>{
    // Set the mint authority of the mint to the new mint
    await setAuthority(
        provider.connection, gameServerKeypair, 
        mintKey, gameServerKeypair, AuthorityType.MintTokens, 
        newGameServerKeypair.publicKey
    );

    // Write the new game server key to the file, all tests read from there
    writeGameServerKey(newGameServerKeypair);

    console.log("New server: ", newGameServerKeypair.publicKey);

    const mint = getMint(provider.connection, mintKey);

    console.log("Mint authority", (await mint).mintAuthority);

    // Send some lamports to the new game server key
    await airdropToAccount(provider.connection, newGameServerKeypair.publicKey);
  })    
})