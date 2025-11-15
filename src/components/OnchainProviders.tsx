'use client'

import React, { ReactNode } from 'react';
import { WagmiProvider, type Config } from 'wagmi';
import { base } from 'wagmi/chains';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createAppKit } from '@reown/appkit/react';
import { wagmiAdapter, projectId, metadata } from '../wagmi';

// Set up queryClient
const queryClient = new QueryClient();

if (!projectId) {
  throw new Error('Project ID is not defined');
}

// Create modal with Reown AppKit
const modal = createAppKit({
  adapters: [wagmiAdapter],
  projectId,
  networks: [base],
  defaultNetwork: base,
  metadata: metadata,
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