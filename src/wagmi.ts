import { cookieStorage, createStorage, http, fallback } from 'wagmi'
import { base } from 'wagmi/chains'
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'

// Project ID de Reown (anteriormente WalletConnect)
// Get your free Project ID at https://dashboard.reown.com
const projectIdEnv = process.env.NEXT_PUBLIC_REOWN_PROJECT_ID

if (!projectIdEnv) {
  throw new Error('NEXT_PUBLIC_REOWN_PROJECT_ID is not defined. Get one at https://dashboard.reown.com')
}

export const projectId: string = projectIdEnv

export const networks = [base]

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
      http('https://base.llamarpc.com'),
      http('https://gateway.tenderly.co/public/base'),
      http('https://base.drpc.org'),
    ]),
  },
})

export const config = wagmiAdapter.wagmiConfig
