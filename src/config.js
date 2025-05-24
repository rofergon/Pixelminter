import ABI from './PixelArtNFT_ABI.json';

export { ABI };  

export const CONTRACT_ADDRESS = "0x48Ba158789e168423cAD47C86ecC5A8348864521";
export const BASE_CHAIN_ID = 8453;
export const MINT_PRICE = "0.0001"; // on ETH

export const CONTRACT_ABI = ABI;  

export const BASE_NETWORK_PARAMS = {
  chainId: `0x${BASE_CHAIN_ID.toString(16)}`,
  chainName: "Base",
  nativeCurrency: {
    name: "Ether",
    symbol: "ETH",
    decimals: 18
  },
  rpcUrls: ["https://mainnet.base.org"],
  blockExplorerUrls: ["https://basescan.org/"]
};