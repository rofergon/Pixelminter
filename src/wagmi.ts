import { cookieStorage, createStorage, http, fallback } from 'wagmi'
import { base, mainnet } from 'wagmi/chains'
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'

// Project ID de Reown (anteriormente WalletConnect)
// Get your free Project ID at https://dashboard.reown.com
const projectIdEnv = process.env.NEXT_PUBLIC_REOWN_PROJECT_ID?.trim()
const isValidProjectId = (value?: string) =>
  Boolean(value && /^[a-f0-9]{32}$/i.test(value) && !value.includes('YOUR'))

export const projectId: string = projectIdEnv ?? ''
export const isReownConfigured = isValidProjectId(projectId)

// Include mainnet for ENS resolution, Base for main operations
export const networks = [base, mainnet]

// Metadata para Reown AppKit
export const metadata = {
  name: 'PixelMinter',
  description: 'Create and mint pixel art on Base',
  url: process.env.NEXT_PUBLIC_SITE_URL ?? 'https://pixelminter.xyz',
  icons: ['/logo192.png']
}

// Set up the Wagmi Adapter (Config)
export const wagmiAdapter = new WagmiAdapter({
  storage: createStorage({
    storage: cookieStorage
  }) as any,
  ssr: true,
  projectId,
  networks,
  transports: {
    [base.id]: fallback([
      http('https://base-rpc.publicnode.com', { timeout: 10_000 }),
      http('https://mainnet.base.org', { timeout: 10_000 }),
      http('https://gateway.tenderly.co/public/base', { timeout: 12_000 }),
      http('https://base.drpc.org', { timeout: 12_000 }),
    ], {
      rank: true,
      retryCount: 1,
      retryDelay: 750,
    }),
    [mainnet.id]: fallback([
      http('https://eth.llamarpc.com', { timeout: 10_000 }),
      http('https://ethereum.publicnode.com', { timeout: 10_000 }),
      http('https://rpc.ankr.com/eth', { timeout: 12_000 }),
    ], {
      rank: true,
      retryCount: 1,
      retryDelay: 750,
    }),
  },
})

export const config = wagmiAdapter.wagmiConfig
