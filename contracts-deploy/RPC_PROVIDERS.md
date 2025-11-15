# Alternative RPC Providers for Base Network

## Why Use Alternative RPC Providers?

The public Base RPCs (`https://sepolia.base.org` and `https://mainnet.base.org`) are:
- ⚠️ Rate limited
- ⚠️ Not recommended for production
- ⚠️ May be slower or less reliable

For production applications, use a dedicated RPC provider for:
- ✅ Higher rate limits
- ✅ Better reliability
- ✅ Faster response times
- ✅ Advanced features (WebSocket, Archive nodes, etc.)

## Recommended RPC Providers

### 1. Alchemy (Recommended)

**Features:**
- Generous free tier
- Excellent reliability
- Advanced APIs
- WebSocket support
- Detailed analytics

**Setup:**
1. Sign up at https://www.alchemy.com/
2. Create a new app
3. Select "Base" as the network
4. Copy your API key

**RPC URLs:**
```env
# Base Sepolia
BASE_SEPOLIA_RPC_URL=https://base-sepolia.g.alchemy.com/v2/YOUR-API-KEY

# Base Mainnet
BASE_MAINNET_RPC_URL=https://base-mainnet.g.alchemy.com/v2/YOUR-API-KEY
```

**Free Tier Limits:**
- 300M compute units/month
- ~20M requests/month
- WebSocket support included

**Pricing:** Free tier available, paid plans start at $49/month

### 2. QuickNode

**Features:**
- Very fast response times
- Multiple regions
- Archive node access
- Excellent uptime
- 24/7 support

**Setup:**
1. Sign up at https://www.quicknode.com/
2. Create a new endpoint
3. Select "Base" and desired network
4. Copy your HTTP URL

**RPC URLs:**
```env
BASE_SEPOLIA_RPC_URL=https://your-endpoint.base-sepolia.quiknode.pro/YOUR-TOKEN/
BASE_MAINNET_RPC_URL=https://your-endpoint.base-mainnet.quiknode.pro/YOUR-TOKEN/
```

**Free Tier Limits:**
- 50M credits/month
- Archive data available
- WebSocket support

**Pricing:** Free tier available, paid plans start at $9/month

### 3. Infura

**Features:**
- Industry standard
- Reliable infrastructure
- Good documentation
- Part of ConsenSys

**Setup:**
1. Sign up at https://www.infura.io/
2. Create a new project
3. Select Base network
4. Copy your project ID

**Note:** Check current Base support on Infura, as it may be limited or in beta.

**RPC URLs:**
```env
# Check Infura docs for current Base support
BASE_MAINNET_RPC_URL=https://base-mainnet.infura.io/v3/YOUR-PROJECT-ID
```

**Free Tier Limits:**
- 100,000 requests/day
- Archive data on paid plans

**Pricing:** Free tier available, paid plans start at $50/month

### 4. Ankr

**Features:**
- Multiple free public endpoints
- Good for development
- No signup required for public endpoints

**RPC URLs:**
```env
# Public endpoints (rate limited)
BASE_SEPOLIA_RPC_URL=https://rpc.ankr.com/base_sepolia
BASE_MAINNET_RPC_URL=https://rpc.ankr.com/base
```

**Note:** Public endpoints are rate-limited. Sign up for premium for better limits.

**Pricing:** Free public endpoints, premium plans available

### 5. Base Official Provider Partners

Check Base's official documentation for current list:
https://docs.base.org/tools/node-providers

## Configuration in Hardhat

### Update hardhat.config.js

```javascript
require("dotenv").config();

module.exports = {
  networks: {
    baseSepolia: {
      // Replace with your chosen provider
      url: process.env.BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 84532,
    },
    baseMainnet: {
      url: process.env.BASE_MAINNET_RPC_URL || "https://mainnet.base.org",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 8453,
    },
  },
};
```

### Update .env

```env
# Alchemy example
BASE_SEPOLIA_RPC_URL=https://base-sepolia.g.alchemy.com/v2/YOUR-API-KEY
BASE_MAINNET_RPC_URL=https://base-mainnet.g.alchemy.com/v2/YOUR-API-KEY

# QuickNode example
# BASE_SEPOLIA_RPC_URL=https://your-endpoint.base-sepolia.quiknode.pro/YOUR-TOKEN/
# BASE_MAINNET_RPC_URL=https://your-endpoint.base-mainnet.quiknode.pro/YOUR-TOKEN/

# Ankr example
# BASE_SEPOLIA_RPC_URL=https://rpc.ankr.com/base_sepolia
# BASE_MAINNET_RPC_URL=https://rpc.ankr.com/base
```

## Choosing the Right Provider

### For Development/Testing
- **Public Base RPC**: Good enough for testing
- **Ankr Public**: Alternative free option
- **Alchemy Free Tier**: Best free option with good limits

### For Production
- **Alchemy**: Best overall, great support and features
- **QuickNode**: Best performance, fastest response times
- **Infura**: If already using for other chains

### For High-Traffic Apps
- **QuickNode Premium**: Best performance
- **Alchemy Growth**: Good balance of features and price
- Consider running your own Base node

## Features Comparison

| Provider | Free Tier | WebSocket | Archive | Analytics | Support |
|----------|-----------|-----------|---------|-----------|---------|
| Alchemy | ✅ Generous | ✅ Yes | ✅ Yes | ✅ Excellent | ✅ Good |
| QuickNode | ✅ Limited | ✅ Yes | ✅ Yes | ✅ Good | ✅ Excellent |
| Infura | ✅ Limited | ✅ Yes | 💰 Paid | ⚠️ Basic | ✅ Good |
| Ankr | ✅ Public | ⚠️ Limited | ❌ No | ❌ No | ⚠️ Limited |
| Base Public | ✅ Free | ❌ No | ❌ No | ❌ No | ❌ No |

## Testing Your RPC Connection

```bash
npm run check
```

Or manually test:

```javascript
const { ethers } = require("hardhat");

async function testRPC() {
  const provider = new ethers.JsonRpcProvider(process.env.BASE_SEPOLIA_RPC_URL);
  const blockNumber = await provider.getBlockNumber();
  console.log("Current block:", blockNumber);
  console.log("✅ RPC connection working!");
}

testRPC();
```

## Best Practices

1. **Use environment variables** for API keys (never commit them)
2. **Start with free tier** for development
3. **Upgrade before launch** to avoid rate limits
4. **Monitor usage** in provider dashboard
5. **Have a backup** provider configured
6. **Test thoroughly** with your chosen provider
7. **Set up alerts** for quota limits

## Cost Optimization

- Use **testnet for development** (free ETH)
- **Cache responses** when possible
- **Batch requests** to reduce API calls
- **Monitor usage** to avoid unexpected charges
- **Use WebSocket** instead of polling when possible
- Consider **running your own node** for very high traffic

## Troubleshooting

### Rate Limit Errors
- Upgrade your plan
- Implement request caching
- Use a different provider temporarily

### Slow Response Times
- Check provider status page
- Try a different region/endpoint
- Consider upgrading to premium tier

### Connection Errors
- Verify API key is correct
- Check if provider supports Base network
- Ensure network connection is stable

## Additional Resources

- [Alchemy Documentation](https://docs.alchemy.com/)
- [QuickNode Documentation](https://www.quicknode.com/docs/)
- [Infura Documentation](https://docs.infura.io/)
- [Base Network Documentation](https://docs.base.org/)
- [Running Your Own Base Node](https://docs.base.org/guides/run-a-base-node/)

## Recommended Setup

For most projects, we recommend:

**Development:**
```env
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org  # or Alchemy free tier
```

**Production:**
```env
BASE_MAINNET_RPC_URL=https://base-mainnet.g.alchemy.com/v2/YOUR-KEY
```

This provides a good balance of reliability, features, and cost.
