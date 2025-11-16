'use client'

import React, { ReactNode, useMemo } from 'react';
import { WagmiProvider, type Config } from 'wagmi';
import { base } from 'wagmi/chains';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import { createAppKit } from '@reown/appkit/react';
import { wagmiAdapter, projectId, metadata } from '../wagmi';

// Set up queryClient
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
    },
  },
});

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
    networks: [base],
    defaultNetwork: base,
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
  const persister = useMemo(() => {
    if (typeof window === 'undefined') {
      return null;
    }

    return createSyncStoragePersister({
      storage: window.localStorage,
      key: 'pixelminter-query-cache',
    });
  }, []);

  const queryProviders = persister ? (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister,
        maxAge: 1000 * 60 * 60, // 1 hour
      }}
    >
      {children}
    </PersistQueryClientProvider>
  ) : (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );

  return (
    <WagmiProvider config={wagmiAdapter.wagmiConfig as Config}>
      {queryProviders}
    </WagmiProvider>
  );
};

export default OnchainProviders;
