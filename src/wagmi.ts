import { cookieStorage, createStorage, http, fallback } from 'wagmi'
import { base, mainnet } from 'wagmi/chains'
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'

// Project ID de Reown (anteriormente WalletConnect)
// Get your free Project ID at https://dashboard.reown.com
const projectIdEnv = process.env.NEXT_PUBLIC_REOWN_PROJECT_ID

if (!projectIdEnv) {
  throw new Error('NEXT_PUBLIC_REOWN_PROJECT_ID is not defined. Get one at https://dashboard.reown.com')
}

export const projectId: string = projectIdEnv

// Include mainnet for ENS resolution, Base for main operations
export const networks = [base, mainnet]

// Metadata para Reown AppKit
export const metadata = {
  name: 'PixelMinter',
  description: 'Create and mint pixel art on Base',
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
    [base.id]: fallback([
      http('https://mainnet.base.org'),
      http('https://base-rpc.publicnode.com'),
      http('https://base.blockpi.network/v1/rpc/public'),
    ]),
    [mainnet.id]: fallback([
      http('https://eth.llamarpc.com'),
      http('https://ethereum.publicnode.com'),
      http('https://rpc.ankr.com/eth'),
    ]),
  },
})

export const config = wagmiAdapter.wagmiConfig
