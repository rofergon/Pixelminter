const hre = require("hardhat");
require("dotenv").config();

async function main() {
  // Contract address from deployment
  const contractAddress = "0x9cc70242d30f1cfbA12F16d22fA4C4de8A2f4347";
  const initialMintFee = process.env.INITIAL_MINT_FEE || "0";
  const contractURI = process.env.CONTRACT_URI || "ipfs://QmPixelminterCollection";

  console.log("🔍 Verifying contract on Basescan...");
  console.log("   Contract Address:", contractAddress);
  console.log("   Network:", hre.network.name);
  console.log("   Initial Mint Fee:", initialMintFee);
  console.log("   Contract URI:", contractURI);

  const basescanUrl = hre.network.name === "baseMainnet" 
    ? "https://basescan.org" 
    : "https://sepolia.basescan.org";

  try {
    await hre.run("verify:verify", {
      address: contractAddress,
      constructorArguments: [initialMintFee, contractURI],
    });

    console.log("\n✅ Contract verified successfully!");
    console.log(`🔗 View on Basescan: ${basescanUrl}/address/${contractAddress}#code`);
  } catch (error) {
    if (error.message.includes("Already Verified")) {
      console.log("\n✅ Contract is already verified!");
      console.log(`🔗 View on Basescan: ${basescanUrl}/address/${contractAddress}#code`);
    } else {
      console.error("\n❌ Verification failed:");
      console.error(error.message);
      
      if (error.message.includes("does not have bytecode")) {
        console.log("\n💡 Tip: The contract was recently deployed. Wait 1-2 minutes and try again.");
      }
      
      process.exit(1);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Script failed:", error);
    process.exit(1);
  });
