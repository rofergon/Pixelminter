const hre = require("hardhat");
require("dotenv").config();

async function main() {
  console.log("🔍 Checking Hardhat Configuration...\n");
  
  // Check network configuration
  console.log("📡 Network Configuration:");
  console.log("   Current Network:", hre.network.name);
  console.log("   Chain ID:", hre.network.config.chainId);
  console.log("   RPC URL:", hre.network.config.url || "Not configured");
  
  // Check environment variables
  console.log("\n🔐 Environment Variables:");
  console.log("   PRIVATE_KEY:", process.env.PRIVATE_KEY ? "✅ Set" : "❌ Not set");
  console.log("   BASE_SEPOLIA_RPC_URL:", process.env.BASE_SEPOLIA_RPC_URL ? "✅ Set" : "⚠️  Using default");
  console.log("   BASE_MAINNET_RPC_URL:", process.env.BASE_MAINNET_RPC_URL ? "✅ Set" : "⚠️  Using default");
  console.log("   BASESCAN_API_KEY:", process.env.BASESCAN_API_KEY ? "✅ Set" : "⚠️  Not set (needed for verification)");
  console.log("   INITIAL_MINT_FEE:", process.env.INITIAL_MINT_FEE ? "✅ Set" : "⚠️  Using default (0.001 ETH)");
  
  // Check if private key is configured
  if (!process.env.PRIVATE_KEY) {
    console.log("\n❌ PRIVATE_KEY not found in .env file!");
    console.log("   Please create a .env file from .env.example and add your private key.");
    return;
  }
  
  // Try to connect to network and get account info
  try {
    const [deployer] = await hre.ethers.getSigners();
    console.log("\n👤 Deployer Account:");
    console.log("   Address:", deployer.address);
    
    const balance = await hre.ethers.provider.getBalance(deployer.address);
    const balanceInEth = hre.ethers.formatEther(balance);
    console.log("   Balance:", balanceInEth, "ETH");
    
    if (parseFloat(balanceInEth) === 0) {
      console.log("   ⚠️  WARNING: Account has zero balance!");
      if (hre.network.name === "baseSepolia") {
        console.log("   Get test ETH from: https://www.coinbase.com/faucets/base-ethereum-goerli-faucet");
      } else {
        console.log("   You need to add ETH to this account before deployment.");
      }
    } else if (parseFloat(balanceInEth) < 0.01) {
      console.log("   ⚠️  WARNING: Low balance. May not be enough for deployment.");
    } else {
      console.log("   ✅ Balance looks good!");
    }
    
    // Check network connection
    const blockNumber = await hre.ethers.provider.getBlockNumber();
    console.log("\n🌐 Network Connection:");
    console.log("   Status: ✅ Connected");
    console.log("   Current Block:", blockNumber);
    
    // Estimate deployment cost
    console.log("\n💰 Estimated Costs:");
    console.log("   Deployment: ~0.002-0.005 ETH (varies with gas price)");
    console.log("   Verification: Free");
    
    console.log("\n✅ Configuration looks good! Ready to deploy.");
    console.log("\n📝 Next steps:");
    console.log("   1. Run 'npm run compile' to compile contracts");
    console.log("   2. Run 'npm test' to run tests");
    console.log("   3. Run 'npm run deploy:base-sepolia' to deploy to testnet");
    
  } catch (error) {
    console.log("\n❌ Error connecting to network:");
    console.log("   ", error.message);
    console.log("\n   Please check:");
    console.log("   - RPC URL is correct in .env");
    console.log("   - Network is accessible");
    console.log("   - Private key is valid");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  });
