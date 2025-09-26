import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { WagerProgram } from "../target/types/wager_program";
import *  as types from "./types";
import {assert} from "chai";
import {
  getGameServerKeypair,
  getIniitializerKeypair,
  getGlobalConfigKey
} from "./utils";
import { 
  ConfirmOptions, 
  Keypair, 
  PublicKey,
  LAMPORTS_PER_SOL 
} from "@solana/web3.js";

const confirmOptions: ConfirmOptions = { commitment: "confirmed" };

describe("Create Global Config", ()=>{

  // Setup the environment
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.WagerProgram as Program<WagerProgram>;

  let gameServerKeypair:Keypair;
  
  const initializerKeypair = getIniitializerKeypair();

  const globalConfigKey = getGlobalConfigKey(program.programId);

  // Arguments for the `create_global_config` instruction
  let args:types.CreateGlobalConfigArgs;

  before("", async ()=>{
    
    gameServerKeypair = getGameServerKeypair();

    args = {
      server:gameServerKeypair.publicKey
    };
  })


  it("Fails to create with an invalid initializer", async()=>{

    try {
      // Generate invalid initializer key
      const newInitializerKeypair = Keypair.generate();
      
      // Execute transaction    
      await program.methods.
      createGlobalState(args).
      accountsPartial({
        initializer:newInitializerKeypair.publicKey,
        payer:gameServerKeypair.publicKey
      }).
      signers([newInitializerKeypair, gameServerKeypair]).
      rpc(confirmOptions);

      assert.fail("This transaction should have failed because the initializer key is fixed")
    }catch(err){
        console.log("Error: ", err);
      assert.ok("This transaction failed successfully, hurray!!!")
    }
  })

  it("Successfuly creates the config", async ()=>{

    // Execute transaction
    await program.methods.
    createGlobalState(args).
    accountsPartial({
      payer:gameServerKeypair.publicKey
    }).
    signers([gameServerKeypair, initializerKeypair]).
    rpc(confirmOptions);

    // Get the game session account and confirm it is the way we created it.
    let globalConfigAccount = await program.account.globalConfig.fetch(globalConfigKey);

    assert(globalConfigAccount.authority.equals(gameServerKeypair.publicKey))
  })

  it("Fails to create a same config again", async ()=>{

    // Execute transaction
    try{
      await program.methods.
      createGlobalState(args).
      accountsPartial({
        payer:gameServerKeypair.publicKey
      }).
      signers([gameServerKeypair, initializerKeypair]).
      rpc(confirmOptions);

      assert.fail("This transaction should have failed because the global config address is fixed and it has been initialized");
    } catch(err){
      console.log("Error: ", err);
      assert.ok("This transaction failed successfully, hurray!!!")
    }
  })

  it("Fails to create with a different config", async()=>{

    try {
      // Generate a differenct config key
      const newGlobalConfigKey = PublicKey.unique();
      
      // Execute transaction    
      await program.methods.
      createGlobalState(args).
      accountsPartial({
        globalConfig:newGlobalConfigKey,
        payer:gameServerKeypair.publicKey
      }).
      signers([initializerKeypair, gameServerKeypair]).
      rpc(confirmOptions);

      assert.fail("This transaction should have failed because the global config key is fixed")
    }catch(err){
        console.log("Error: ", err);
      assert.ok("This transaction failed successfully, hurray!!!")
    }
  })

})