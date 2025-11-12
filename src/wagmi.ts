import { http, createConfig, fallback } from 'wagmi'
import { base } from 'wagmi/chains'
import { coinbaseWallet, injected, walletConnect } from 'wagmi/connectors'

export const config = createConfig({
  chains: [base],
  connectors: [
    injected(),
    coinbaseWallet({ appName: 'Pixelminter' }),
    walletConnect({ projectId: '5e5860a7d1e851164f12d83211023640' }),
  ],
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