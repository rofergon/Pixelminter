const hre = require("hardhat");
require("dotenv").config();

async function main() {
  // Validate API Key
  const apiKey = process.env.BASESCAN_API_KEY;
  if (!apiKey) {
    console.error("❌ Error: BASESCAN_API_KEY not found in .env file");
    process.exit(1);
  }

  console.log("🔍 Basescan API Key loaded:", apiKey.substring(0, 6) + "..." + apiKey.substring(apiKey.length - 4));

  // Contract details - UPDATE THIS AFTER DEPLOYMENT
  const contractAddress = "0x162ee7D340439C181394E1A7B4fdD922B20115D5";
  const initialMintFee = process.env.INITIAL_MINT_FEE || "1000000000000000";
  const contractURI = process.env.CONTRACT_URI || "ipfs://QmDefaultContractMetadata";

  console.log("\n📋 Verification Details:");
  console.log("   Contract Address:", contractAddress);
  console.log("   Constructor Args:", [initialMintFee, contractURI]);
  console.log("   Network:", hre.network.name);

  try {
    console.log("\n⏳ Starting verification on Basescan...");
    
    await hre.run("verify:verify", {
      address: contractAddress,
      constructorArguments: [initialMintFee, contractURI],
    });

    console.log("\n✅ Contract verified successfully!");
    console.log(`🔗 View on Basescan: https://sepolia.basescan.org/address/${contractAddress}#code`);
  } catch (error) {
    if (error.message.includes("Already Verified")) {
      console.log("\n✅ Contract is already verified!");
      console.log(`🔗 View on Basescan: https://sepolia.basescan.org/address/${contractAddress}#code`);
    } else {
      console.error("\n❌ Verification failed:");
      console.error(error.message);
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
