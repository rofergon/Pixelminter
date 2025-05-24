import { http, createConfig } from 'wagmi'
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
    [base.id]: http(),
  },
})