import React, { ReactNode } from 'react';
import { WagmiProvider, createConfig, http } from 'wagmi';
import { base } from 'wagmi/chains';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { coinbaseWallet, walletConnect, injected } from 'wagmi/connectors';
import { OnchainKitProvider } from '@coinbase/onchainkit';

const config = createConfig({
  chains: [base],
  connectors: [
    coinbaseWallet({
      appName: 'PixelMinter',
    }),
    injected(),
    walletConnect({
      projectId: '5e5860a7d1e851164f12d83211023640',
    }),
  ],
  ssr: true,
  transports: {
    [base.id]: http(),
  },
});

const queryClient = new QueryClient();

interface OnchainProvidersProps {
  children: ReactNode;
}

const OnchainProviders: React.FC<OnchainProvidersProps> = ({ children }) => {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <OnchainKitProvider
          apiKey={process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY}
          chain={base}
        >
          {children}
        </OnchainKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
};

export default OnchainProviders;