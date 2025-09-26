import * as anchor from "@coral-xyz/anchor";
import { describe } from "mocha";
import { loadKeypair, setupMintAndServer } from "./utils";

describe("wager-program", () => {
  // Configure the client to use the local cluster
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  // Create the global config
  require("./create-global-config.test")
  
  // Create a game session
  //require("./create-game-session.test");
  
  // Create the global config
  //require("./update-global-config.test")
  
  // Join a user to the game session
  //require("./join-user.test");

  // Distribute winnings
  require("./distribute-winnings.test");

  // Pay-to-spawn 1v1 mode
  //require("./pay-to-spawn.test");
  
  // Refund wager
  //require("./refund.test");
  
  // Kill players!!!
  //require("./kill-record.test");
  /*
  


*/

  before(async () => {
    console.log("Setting up tests...\n\n");
  
    const gameServer = loadKeypair("tests/kps/gameserver.json");

    const mint = loadKeypair("tests/kps/mint.json");

    // The game server is set to be the mint authority
    await setupMintAndServer(provider.connection, gameServer, mint);

    console.log("Setup complete")
  });


});
