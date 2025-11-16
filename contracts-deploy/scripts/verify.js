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

  // Contract details - Get from command line args or use default
  const contractAddress = process.argv[2];
  if (!contractAddress) {
    console.error("❌ Error: Contract address is required");
    console.log("\nUsage: npx hardhat run scripts/verify.js --network <network> <contract_address>");
    console.log("Example: npx hardhat run scripts/verify.js --network baseMainnet 0x1234...");
    process.exit(1);
  }

  const initialMintFee = process.env.INITIAL_MINT_FEE || "0";
  const contractURI = process.env.CONTRACT_URI || "ipfs://QmDefaultContractMetadata";

  // Determine Basescan URL based on network
  const basescanUrl = hre.network.name === "baseMainnet" 
    ? "https://basescan.org" 
    : "https://sepolia.basescan.org";

  console.log("\n📋 Verification Details:");
  console.log("   Contract Address:", contractAddress);
  console.log("   Constructor Args:", [initialMintFee, contractURI]);
  console.log("   Network:", hre.network.name);
  console.log("   Basescan URL:", basescanUrl);

  try {
    console.log("\n⏳ Starting verification on Basescan...");
    
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
