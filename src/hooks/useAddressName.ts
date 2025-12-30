import { useEffect, useState } from 'react';
import { useEnsName, usePublicClient } from 'wagmi';
import { mainnet, base } from 'wagmi/chains';

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

  const publicClient = usePublicClient({ chainId: base.id });

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
        if (publicClient) {
          const basename = await resolveBasename(address, publicClient);
          if (basename) {
            setDisplayName(basename);
            setIsLoading(false);
            return;
          }
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
/**
 * Resolve Basename from Base L2 using the public resolver
 * Basenames follow the pattern: name.base.eth
 * 
 * @param address - The wallet address
 * @param client - The Viem public client
 * @returns The Basename or null
 */
const resolveBasename = async (address: string, client: any): Promise<string | null> => {
  try {
    const reverseNode = `0x55ea6c47${address.slice(2).padStart(64, '0')}`; // node(bytes32) of the reverse record name
    const L2_RESOLVER_ADDRESS = '0xC6d566A56A1aFf6508b41f6c90ff131615583BCD';

    // We can't use standard ENS hooks easily for L2 Basenames yet without custom config,
    // so we manually query the resolver contract.
    // Function: name(bytes32 node) returns (string)
    // Selector for name(bytes32) is 0x691f3431

    // However, the L2 resolver usually works with the reverse registrar.
    // The previous code simulated a low-level call. Let's try to use readContract if we knew the ABI,
    // or just use call/raw request via the client to avoid ABI bloat if we want to mimic the previous behavior safely.

    // A safer way matching the previous logic (calling L2 Reverse Registrar):
    const data = await client.call({
      to: L2_RESOLVER_ADDRESS,
      data: `${reverseNode}`,
    });

    if (data.data && data.data !== '0x') {
      return decodeBasename(data.data);
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
    // Basic hex to string decoding for specific contract return
    // Remove 0x
    const hex = hexResult.startsWith('0x') ? hexResult.slice(2) : hexResult;

    // The return is usually abi-encoded string.
    // Offset (32 bytes) + Length (32 bytes) + String data
    if (hex.length < 128) return null; // Too short

    // Skip offset and length (64 bytes = 128 chars)
    const dataHex = hex.slice(128);

    let basename = '';
    for (let i = 0; i < dataHex.length; i += 2) {
      const code = parseInt(dataHex.substr(i, 2), 16);
      if (code === 0) break;
      basename += String.fromCharCode(code);
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
