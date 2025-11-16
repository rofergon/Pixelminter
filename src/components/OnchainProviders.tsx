'use client'

import React, { ReactNode } from 'react';
import { WagmiProvider, type Config } from 'wagmi';
import { baseSepolia } from 'wagmi/chains';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createAppKit } from '@reown/appkit/react';
import { wagmiAdapter, projectId, metadata } from '../wagmi';

// Set up queryClient
const queryClient = new QueryClient();

if (!projectId) {
  throw new Error('Project ID is not defined');
}

const initializeAppKit = () => {
  if (typeof window === 'undefined') {
    return;
  }

  const clientWindow = window as typeof window & {
    __appKitModalInitialized__?: boolean;
  };

  if (clientWindow.__appKitModalInitialized__) {
    // Prevent redefining web components during HMR / multiple imports.
    return;
  }

  createAppKit({
    adapters: [wagmiAdapter],
    projectId,
    networks: [baseSepolia],
    defaultNetwork: baseSepolia,
    metadata,
    features: {
      analytics: true,
      email: false,
      socials: false,
    },
    themeMode: 'dark',
    themeVariables: {
      '--w3m-accent': '#0052ff',
      '--w3m-border-radius-master': '2px',
    },
  });

  clientWindow.__appKitModalInitialized__ = true;
};

initializeAppKit();

interface OnchainProvidersProps {
  children: ReactNode;
}

const OnchainProviders: React.FC<OnchainProvidersProps> = ({ children }) => {
  return (
    <WagmiProvider config={wagmiAdapter.wagmiConfig as Config}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  );
};

export default OnchainProviders;
