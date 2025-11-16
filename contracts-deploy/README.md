# Pixelminter Smart Contract Deployment

This directory contains the Hardhat setup for deploying the PixelminterNFT smart contract to Base network (testnet and mainnet).

## ✅ Contract Status

**Version:** 2.0 (November 2025)  
**Status:** ✅ Marketplace Compatible  
**OpenSea:** ✅ Fully Compatible  
**Tests:** ✅ 24/24 Passing

See [AUDIT_SUMMARY.md](./AUDIT_SUMMARY.md) for full compatibility report.

## 📋 Prerequisites

- Node.js v16 or higher
- npm or yarn
- MetaMask wallet with:
  - Private key for deployment
  - ETH on Base Sepolia testnet (for testing) - Get from [Base Sepolia Faucet](https://www.coinbase.com/faucets/base-ethereum-goerli-faucet)
  - ETH on Base Mainnet (for production)

## 🚀 Setup

### 1. Install Dependencies

```bash
cd contracts-deploy
npm install
```

### 2. Configure Environment Variables

Copy the example environment file and fill in your values:

```bash
cp .env.example .env
```

Edit `.env` and add your configuration:

```env
# Your MetaMask private key (KEEP THIS SECRET!)
PRIVATE_KEY=your_private_key_here

# RPC URLs (public endpoints - consider using Alchemy/Infura for production)
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
BASE_MAINNET_RPC_URL=https://mainnet.base.org

# Basescan API Key for contract verification
# IMPORTANT: Get from https://etherscan.io/apidashboard (NOT basescan.org)
# This single API key works for all chains including Base
BASESCAN_API_KEY=your_basescan_api_key_here

# Initial mint fee in wei (default: 0.001 ETH = 1000000000000000)
INITIAL_MINT_FEE=1000000000000000

# Contract URI for collection metadata (REQUIRED)
# Upload collection-metadata.json to IPFS first, then paste the IPFS URI here
# See collection-metadata.example.json for format
CONTRACT_URI=ipfs://QmYourCollectionMetadataCID
```

**⚠️ IMPORTANT:** Never commit your `.env` file to git! It's already in `.gitignore`.

### 3. Get Your Private Key from MetaMask

1. Open MetaMask
2. Click on the three dots menu
3. Go to Account Details
4. Click on "Export Private Key"
5. Enter your password
6. Copy the private key and paste it in `.env`

### 4. Prepare Collection Metadata

Before deployment, create your collection metadata:

1. Copy the example file:
```bash
cp collection-metadata.example.json collection-metadata.json
```

2. Edit `collection-metadata.json` with your collection details:
```json
{
  "name": "Pixelminter",
  "description": "Your collection description",
  "image": "ipfs://QmYourCollectionBanner",
  "external_link": "https://pixelminter.xyz",
  "seller_fee_basis_points": 250,
  "fee_recipient": "0xYourAddress"
}
```

3. Upload to IPFS and get the CID:
```bash
# Using Lighthouse or your preferred IPFS provider
# You'll get a CID like: QmXXXXXXXXXXXXXXX
```

4. Add the IPFS URI to your `.env`:
```env
CONTRACT_URI=ipfs://QmXXXXXXXXXXXXXXX
```

**📚 For detailed guidance, see [CONTRACT_URI_GUIDE.md](./CONTRACT_URI_GUIDE.md)**

### 5. Get Test ETH

For Base Sepolia testnet:
1. Visit [Base Sepolia Faucet](https://www.coinbase.com/faucets/base-ethereum-goerli-faucet)
2. Connect your wallet
3. Request test ETH

## 🔧 Network Configuration

### Base Sepolia Testnet
- **Network Name:** Base Sepolia
- **RPC URL:** https://sepolia.base.org
- **Chain ID:** 84532
- **Currency:** ETH
- **Block Explorer:** https://sepolia.basescan.org

### Base Mainnet
- **Network Name:** Base Mainnet
- **RPC URL:** https://mainnet.base.org
- **Chain ID:** 8453
- **Currency:** ETH
- **Block Explorer:** https://basescan.org

### Alternative RPC Providers (Recommended for Production)

**Alchemy:**
- Base Sepolia: `https://base-sepolia.g.alchemy.com/v2/YOUR-API-KEY`
- Base Mainnet: `https://base-mainnet.g.alchemy.com/v2/YOUR-API-KEY`

**QuickNode:**
- Sign up at https://www.quicknode.com/
- Create a Base endpoint
- Use the provided HTTP URL

**Infura:**
- Currently limited Base support, check https://docs.infura.io/

## 📝 Commands

### Compile Contracts
```bash
npm run compile
```

### Run Tests
```bash
npm test
```

### Deploy to Base Sepolia Testnet
```bash
npm run deploy:base-sepolia
```

### Deploy to Base Mainnet
```bash
npm run deploy:base-mainnet
```

### Verify Contract on Basescan
After deployment, verify your contract:

```bash
npx hardhat verify --network baseSepolia <CONTRACT_ADDRESS> <INITIAL_MINT_FEE>
```

Example:
```bash
npx hardhat verify --network baseSepolia 0x1234567890123456789012345678901234567890 1000000000000000
```

### Run Local Hardhat Node (for testing)
```bash
npm run node
```

## 📁 Project Structure

```
contracts-deploy/
├── contracts/              # Solidity smart contracts
│   └── PixelminterNFT.sol # Main NFT contract
├── scripts/               # Deployment scripts
│   └── deploy.js         # Main deployment script
├── test/                 # Contract tests
│   └── PixelminterNFT.test.js
├── deployments/          # Deployment records (auto-generated)
├── hardhat.config.js     # Hardhat configuration
├── package.json          # Node dependencies
├── .env                  # Environment variables (DO NOT COMMIT!)
└── .env.example         # Example environment file
```

## 🎯 Deployment Process

### Testnet Deployment (Recommended First)

1. **Setup environment:**
   ```bash
   cd contracts-deploy
   npm install
   cp .env.example .env
   # Edit .env with your configuration
   ```

2. **Get test ETH:**
   - Visit Base Sepolia faucet
   - Request test ETH to your wallet

3. **Compile contracts:**
   ```bash
   npm run compile
   ```

4. **Run tests:**
   ```bash
   npm test
   ```

5. **Deploy to testnet:**
   ```bash
   npm run deploy:base-sepolia
   ```

6. **Verify contract:**
   ```bash
   npx hardhat verify --network baseSepolia <CONTRACT_ADDRESS> <INITIAL_MINT_FEE>
   ```

7. **Test minting:**
   - Use the deployed contract address
   - Try minting an NFT through your frontend or Basescan

### Mainnet Deployment

⚠️ **Only deploy to mainnet after thorough testing on testnet!**

1. **Ensure you have real ETH** on Base Mainnet

2. **Double-check configuration:**
   - Contract code is correct
   - Initial mint fee is correct
   - `.env` has correct mainnet RPC URL

3. **Deploy:**
   ```bash
   npm run deploy:base-mainnet
   ```

4. **Verify:**
   ```bash
   npx hardhat verify --network baseMainnet <CONTRACT_ADDRESS> <INITIAL_MINT_FEE>
   ```

## 📊 Deployment Output

After successful deployment, you'll see:

```
🚀 Starting Pixelminter NFT deployment...
📡 Network: baseSepolia
⛓️  Chain ID: 84532
👤 Deploying with account: 0x...
💰 Account balance: 0.5 ETH
💵 Initial mint fee: 0.001 ETH

📝 Deploying PixelminterNFT contract...
✅ PixelminterNFT deployed to: 0x...

📊 Contract Information:
   Name: Pixelminter
   Symbol: PXMT
   Owner: 0x...
   Mint Fee: 0.001 ETH
   Total Supply: 0

🔍 Verifying contract on Basescan...
✅ Contract verified successfully!

✨ Deployment completed successfully!

💾 Deployment info saved to: deployments/baseSepolia-1234567890.json
```

## 🔄 After Deployment

### Update Frontend Configuration

1. **Copy the deployed contract address**

2. **Update your frontend config:**
   ```typescript
   // src/config.js or similar
   export const PIXELMINTER_CONTRACT_ADDRESS = '0x...'; // Your deployed address
   ```

3. **Update the ABI if needed:**
   - The ABI should be in `src/abi/pixelminterAbi.ts`
   - If you made contract changes, copy from `artifacts/contracts/PixelminterNFT.sol/PixelminterNFT.json`

4. **Update network configuration:**
   ```typescript
   // src/wagmi.ts
   import { baseSepolia } from 'wagmi/chains';
   
   export const config = createConfig({
     chains: [baseSepolia], // or base for mainnet
     // ...
   });
   ```

## 🧪 Testing Your Deployment

### Using Basescan

1. Go to your contract on Basescan (URL printed after deployment)
2. Navigate to "Write Contract"
3. Connect your wallet
4. Try calling functions like `getMintFee()`, `totalSupply()`

### Using Frontend

1. Update contract address in your app
2. Connect wallet to correct network
3. Try minting an NFT with test data

### Using Hardhat Console

```bash
npx hardhat console --network baseSepolia
```

```javascript
const contract = await ethers.getContractAt("PixelminterNFT", "YOUR_CONTRACT_ADDRESS");
await contract.getMintFee();
await contract.totalSupply();
```

## 💰 Gas Costs (Approximate)

On Base Sepolia:
- **Deployment:** ~0.002-0.005 ETH (varies with network congestion)
- **Minting NFT:** ~0.0005-0.001 ETH + mint fee
- **Setting mint fee:** ~0.0001 ETH
- **Withdrawal:** ~0.0001 ETH

Base has lower gas fees than Ethereum mainnet!

## 🛡️ Security Checklist

- [ ] `.env` file is in `.gitignore`
- [ ] Private key is never committed to git
- [ ] Contract tested thoroughly on testnet
- [ ] Initial mint fee is correct
- [ ] Owner address is correct
- [ ] Contract verified on Basescan
- [ ] Frontend points to correct contract address
- [ ] All environment variables are set correctly

## 🐛 Troubleshooting

### "Insufficient funds" Error
- Check your wallet has enough ETH for gas
- On testnet: Get more from the faucet
- On mainnet: Add more ETH to your wallet

### "Invalid nonce" Error
- Reset your account in MetaMask: Settings > Advanced > Reset Account

### "Contract verification failed"
- Wait a few minutes and try again
- Ensure you're using the exact same constructor arguments
- Check that Basescan API key is correct

### "RPC URL not responding"
- Check your internet connection
- Try using Alchemy or QuickNode RPC instead of public RPC
- Check if Base network is experiencing issues: https://status.base.org/

### "Transaction underpriced"
- Increase gas price in `hardhat.config.js`
- Or use `gasPrice: "auto"` (already configured)

## 📚 Additional Resources

- [Hardhat Documentation](https://hardhat.org/docs)
- [Base Documentation](https://docs.base.org/)
- [OpenZeppelin Contracts](https://docs.openzeppelin.com/contracts/)
- [Basescan](https://basescan.org/)
- [Base Sepolia Explorer](https://sepolia.basescan.org/)
- [Base Faucet](https://www.coinbase.com/faucets/base-ethereum-goerli-faucet)

## 🆘 Support

If you encounter issues:
1. Check this README carefully
2. Review Hardhat documentation
3. Check Base network status
4. Review transaction on Basescan for error details

## 📝 License

MIT
