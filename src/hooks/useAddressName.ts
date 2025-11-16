import { useEffect, useState } from 'react';
import { useEnsName } from 'wagmi';
import { mainnet } from 'wagmi/chains';

/**
 * Hook to resolve address names in priority order:
 * 1. ENS name (from Ethereum mainnet)
 * 2. Basename (from Base L2)
 * 3. Shortened address as fallback
 * 
 * @param address - The wallet address to resolve
 * @returns The resolved name or shortened address
 */
export const useAddressName = (address?: string | null) => {
  const [displayName, setDisplayName] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Try to resolve ENS name from Ethereum mainnet
  const { data: ensName, isLoading: ensLoading } = useEnsName({
    address: address as `0x${string}` | undefined,
    chainId: mainnet.id,
  });

  useEffect(() => {
    const resolveAddressName = async () => {
      if (!address) {
        setDisplayName('—');
        return;
      }

      setIsLoading(true);

      try {
        // 1. If ENS name is available, use it
        if (ensName) {
          setDisplayName(ensName);
          setIsLoading(false);
          return;
        }

        // 2. Try to resolve Basename from Base L2
        // Basename uses a reverse resolver pattern similar to ENS
        // We'll query the Base L2 public resolver
        const basename = await resolveBasename(address);
        if (basename) {
          setDisplayName(basename);
          setIsLoading(false);
          return;
        }

        // 3. Fallback to shortened address
        setDisplayName(shortenAddress(address));
      } catch (error) {
        console.error('Error resolving address name:', error);
        setDisplayName(shortenAddress(address));
      } finally {
        setIsLoading(false);
      }
    };

    resolveAddressName();
  }, [address, ensName]);

  return { displayName, isLoading: isLoading || ensLoading };
};

/**
 * Resolve Basename from Base L2 using the public resolver
 * Basenames follow the pattern: name.base.eth
 * 
 * @param address - The wallet address
 * @returns The Basename or null
 */
const resolveBasename = async (address: string): Promise<string | null> => {
  try {
    // Use Base's public RPC to query the reverse resolver
    // Base uses the same ENS infrastructure but on L2
    const response = await fetch('https://mainnet.base.org', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_call',
        params: [
          {
            // L2 Reverse Registrar contract on Base
            to: '0xC6d566A56A1aFf6508b41f6c90ff131615583BCD',
            data: `0x55ea6c47${address.slice(2).padStart(64, '0')}`, // node(bytes32)
          },
          'latest',
        ],
      }),
    });

    const data = await response.json();
    
    if (data.result && data.result !== '0x') {
      // Decode the result to get the basename
      const basename = decodeBasename(data.result);
      if (basename) {
        return basename;
      }
    }

    return null;
  } catch (error) {
    console.error('Error resolving Basename:', error);
    return null;
  }
};

/**
 * Decode hex result to Basename string
 * 
 * @param hexResult - The hex-encoded result from the contract call
 * @returns The decoded basename or null
 */
const decodeBasename = (hexResult: string): string | null => {
  try {
    // Remove 0x prefix and decode
    const hex = hexResult.slice(2);
    
    // Skip the first 64 characters (offset pointer) and next 64 (length)
    const dataHex = hex.slice(128);
    
    // Convert hex to string
    let basename = '';
    for (let i = 0; i < dataHex.length; i += 2) {
      const charCode = parseInt(dataHex.substr(i, 2), 16);
      if (charCode === 0) break;
      basename += String.fromCharCode(charCode);
    }

    return basename.trim() || null;
  } catch (error) {
    console.error('Error decoding Basename:', error);
    return null;
  }
};

/**
 * Shorten an Ethereum address for display
 * 
 * @param address - The full address
 * @returns Shortened address in format 0x1234…5678
 */
const shortenAddress = (address: string): string => {
  if (!address) return '—';
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
};
