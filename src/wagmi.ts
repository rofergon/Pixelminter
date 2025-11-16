import { cookieStorage, createStorage, http, fallback } from 'wagmi'
import { baseSepolia } from 'wagmi/chains'
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'

// Project ID de Reown (anteriormente WalletConnect)
// Get your free Project ID at https://dashboard.reown.com
const projectIdEnv = process.env.NEXT_PUBLIC_REOWN_PROJECT_ID

if (!projectIdEnv) {
  throw new Error('NEXT_PUBLIC_REOWN_PROJECT_ID is not defined. Get one at https://dashboard.reown.com')
}

export const projectId: string = projectIdEnv

export const networks = [baseSepolia]

// Metadata para Reown AppKit
export const metadata = {
  name: 'PixelMinter',
  description: 'Create and mint pixel art on Base Sepolia',
  url: 'https://pixelminter.xyz',
  icons: ['/logo192.png']
}

// Set up the Wagmi Adapter (Config)
export const wagmiAdapter = new WagmiAdapter({
  storage: createStorage({
    storage: cookieStorage
  }),
  ssr: true,
  projectId,
  networks,
  transports: {
    [baseSepolia.id]: fallback([
      http('https://sepolia.base.org'),
      http('https://base-sepolia.blockpi.network/v1/rpc/public'),
      http('https://base-sepolia-rpc.publicnode.com'),
    ]),
  },
})

export const config = wagmiAdapter.wagmiConfig
