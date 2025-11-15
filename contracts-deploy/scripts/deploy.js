const hre = require("hardhat");
require("dotenv").config();

async function main() {
  console.log("🚀 Starting Pixelminter NFT deployment...");
  console.log("📡 Network:", hre.network.name);
  console.log("⛓️  Chain ID:", hre.network.config.chainId);
  
  // Get the deployer account
  const [deployer] = await hre.ethers.getSigners();
  console.log("👤 Deploying with account:", deployer.address);
  
  // Check deployer balance
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("💰 Account balance:", hre.ethers.formatEther(balance), "ETH");
  
  // Get initial mint fee from environment or use default (0.001 ETH)
  const initialMintFee = process.env.INITIAL_MINT_FEE || hre.ethers.parseEther("0.001");
  console.log("💵 Initial mint fee:", hre.ethers.formatEther(initialMintFee), "ETH");
  
  // Get contract URI from environment or use default
  const contractURI = process.env.CONTRACT_URI || "ipfs://QmDefaultContractMetadata";
  console.log("📄 Contract URI:", contractURI);
  
  // Deploy the contract
  console.log("\n📝 Deploying PixelminterNFT contract...");
  const PixelminterNFT = await hre.ethers.getContractFactory("PixelminterNFT");
  const pixelminterNFT = await PixelminterNFT.deploy(initialMintFee, contractURI);
  
  await pixelminterNFT.waitForDeployment();
  const contractAddress = await pixelminterNFT.getAddress();
  
  console.log("✅ PixelminterNFT deployed to:", contractAddress);
  
  // Verify contract information
  console.log("\n📊 Contract Information:");
  console.log("   Name:", await pixelminterNFT.name());
  console.log("   Symbol:", await pixelminterNFT.symbol());
  console.log("   Owner:", await pixelminterNFT.owner());
  console.log("   Mint Fee:", hre.ethers.formatEther(await pixelminterNFT.getMintFee()), "ETH");
  console.log("   Contract URI:", await pixelminterNFT.contractURI());
  console.log("   Total Supply:", (await pixelminterNFT.totalSupply()).toString());
  
  // Save deployment info
  console.log("\n📄 Deployment Summary:");
  console.log("   Network:", hre.network.name);
  console.log("   Contract Address:", contractAddress);
  console.log("   Deployer:", deployer.address);
  console.log("   Transaction Hash:", pixelminterNFT.deploymentTransaction()?.hash);
  
  // Wait for block confirmations before verification
  if (hre.network.name !== "localhost" && hre.network.name !== "hardhat") {
    console.log("\n⏳ Waiting for block confirmations...");
    await pixelminterNFT.deploymentTransaction()?.wait(5);
    
    console.log("\n🔍 Verifying contract on Basescan...");
    console.log("   Run the following command to verify:");
    console.log(`   npx hardhat verify --network ${hre.network.name} ${contractAddress} ${initialMintFee} "${contractURI}"`);
    
    try {
      await hre.run("verify:verify", {
        address: contractAddress,
        constructorArguments: [initialMintFee, contractURI],
      });
      console.log("✅ Contract verified successfully!");
    } catch (error) {
      console.log("⚠️  Verification failed:", error.message);
      console.log("   You can verify manually later using the command above.");
    }
  }
  
  console.log("\n✨ Deployment completed successfully!");
  console.log("\n📋 Next steps:");
  console.log("   1. Update the contract address in your frontend configuration");
  console.log("   2. Update the ABI in src/abi/pixelminterAbi.ts if needed");
  console.log("   3. Test minting an NFT on the testnet");
  
  // Save deployment info to file
  const fs = require("fs");
  const deploymentInfo = {
    network: hre.network.name,
    chainId: hre.network.config.chainId,
    contractAddress: contractAddress,
    deployer: deployer.address,
    initialMintFee: initialMintFee.toString(),
    contractURI: contractURI,
    timestamp: new Date().toISOString(),
    transactionHash: pixelminterNFT.deploymentTransaction()?.hash,
  };
  
  const deploymentDir = "./deployments";
  if (!fs.existsSync(deploymentDir)) {
    fs.mkdirSync(deploymentDir);
  }
  
  const filename = `${deploymentDir}/${hre.network.name}-${Date.now()}.json`;
  fs.writeFileSync(filename, JSON.stringify(deploymentInfo, null, 2));
  console.log("\n💾 Deployment info saved to:", filename);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
