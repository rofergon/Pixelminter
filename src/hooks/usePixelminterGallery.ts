import { useCallback, useEffect, useState } from 'react';
import { useContractRead, usePublicClient } from 'wagmi';
import { pixelminterAbi } from '@/abi/pixelminterAbi';
import {
  LIGHTHOUSE_GATEWAY_URL,
  PIXELMINTER_CHAIN_ID,
  PIXELMINTER_CONTRACT_ADDRESS,
} from '@/constants/pixelminter';

export interface PixelminterAttribute {
  trait_type?: string;
  value?: string | number;
  display_type?: string;
}

export interface PixelminterMetadata {
  name?: string;
  description?: string;
  image?: string;
  animation_url?: string;
  external_url?: string;
  attributes?: PixelminterAttribute[];
}

export interface PixelminterToken {
  tokenId: number;
  tokenURI: string;
  metadata?: PixelminterMetadata;
  animationUrl?: string;
  imageUrl?: string;
}

export const resolveIpfsUri = (uri?: string | null) => {
  if (!uri) return '';

  if (uri.startsWith('ipfs://')) {
    const cleaned = uri.replace('ipfs://', '').replace(/^ipfs\//, '');
    return `${LIGHTHOUSE_GATEWAY_URL}${cleaned}`;
  }

  return uri;
};

const fetchTokenMetadata = async (tokenURI: string) => {
  const resolvedUri = resolveIpfsUri(tokenURI);

  try {
    const response = await fetch(resolvedUri);
    if (!response.ok) {
      console.warn(`[Pixelminter] No se pudo leer la metadata (${response.status}) para ${resolvedUri}`);
      return undefined;
    }

    try {
      return (await response.json()) as PixelminterMetadata;
    } catch (parseError) {
      console.error(`[Pixelminter] Error parseando metadata para ${resolvedUri}`, parseError);
      return undefined;
    }
  } catch (networkError) {
    console.error(`[Pixelminter] Error de red al leer metadata para ${resolvedUri}`, networkError);
    return undefined;
  }
};

export const usePixelminterGallery = (owner?: `0x${string}` | string | null) => {
  const publicClient = usePublicClient({ chainId: PIXELMINTER_CHAIN_ID });
  const [tokens, setTokens] = useState<PixelminterToken[]>([]);
  const [isLoadingTokens, setIsLoadingTokens] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshIndex, setRefreshIndex] = useState(0);

  const normalizedOwner =
    typeof owner === 'string' && owner.length > 0 ? owner.toLowerCase() : undefined;

  const {
    data: totalSupplyData,
    isFetching: isFetchingTotalSupply,
    refetch: refetchTotalSupply,
  } = useContractRead({
    address: PIXELMINTER_CONTRACT_ADDRESS,
    abi: pixelminterAbi,
    functionName: 'totalSupply',
    chainId: PIXELMINTER_CHAIN_ID,
    query: {
      refetchInterval: 10000,
    },
  });

  const hasLoadedSupply = typeof totalSupplyData === 'bigint';
  const totalSupply = hasLoadedSupply ? Number(totalSupplyData) : 0;

  useEffect(() => {
    if (!normalizedOwner || !publicClient) {
      setTokens([]);
      setIsLoadingTokens(false);
      setError(null);
      return;
    }

    if (!hasLoadedSupply) {
      return;
    }

    if (totalSupply === 0) {
      setTokens([]);
      setIsLoadingTokens(false);
      setError(null);
      return;
    }

    let isMounted = true;

    const loadTokens = async () => {
      setIsLoadingTokens(true);
      setError(null);

      try {
        const tokenIds = Array.from({ length: totalSupply }, (_, idx) => BigInt(idx + 1));
        const ownerContracts = tokenIds.map((tokenId) => ({
          address: PIXELMINTER_CONTRACT_ADDRESS,
          abi: pixelminterAbi,
          functionName: 'ownerOf',
          args: [tokenId],
        }));

        const ownerResults = await publicClient.multicall({
          contracts: ownerContracts,
          allowFailure: true,
        });

        if (!isMounted) return;

        const ownedTokenIds: bigint[] = [];
        ownerResults.forEach((result, index) => {
          if (
            result?.status === 'success' &&
            typeof result.result === 'string' &&
            result.result.toLowerCase() === normalizedOwner
          ) {
            ownedTokenIds.push(tokenIds[index]);
          }
        });

        if (!isMounted) return;

        if (!ownedTokenIds.length) {
          setTokens([]);
          return;
        }

        const tokenUriContracts = ownedTokenIds.map((tokenId) => ({
          address: PIXELMINTER_CONTRACT_ADDRESS,
          abi: pixelminterAbi,
          functionName: 'tokenURI',
          args: [tokenId],
        }));

        const tokenUriResults = await publicClient.multicall({
          contracts: tokenUriContracts,
          allowFailure: true,
        });

        if (!isMounted) return;

        const mintedTokens = await Promise.all(
          ownedTokenIds.map(async (tokenId, index) => {
            const uriResult = tokenUriResults[index];
            const tokenURI =
              uriResult?.status === 'success' && typeof uriResult.result === 'string'
                ? uriResult.result
                : '';

            let metadata: PixelminterMetadata | undefined;
            if (tokenURI) {
              try {
                metadata = await fetchTokenMetadata(tokenURI);
              } catch (metadataError) {
                console.error(`Error al leer metadata del token ${tokenId.toString()}`, metadataError);
              }
            }

            const primaryMedia = metadata?.animation_url || metadata?.image || tokenURI;

            return {
              tokenId: Number(tokenId),
              tokenURI,
              metadata,
              animationUrl: resolveIpfsUri(primaryMedia),
              imageUrl: resolveIpfsUri(metadata?.image || primaryMedia),
            };
          })
        );

        if (!isMounted) return;
        setTokens(mintedTokens.sort((a, b) => b.tokenId - a.tokenId));
      } catch (galleryError) {
        if (!isMounted) return;
        console.error('No se pudo cargar la biblioteca NFT', galleryError);
        setError(galleryError instanceof Error ? galleryError.message : 'Error desconocido');
        setTokens([]);
      } finally {
        if (isMounted) {
          setIsLoadingTokens(false);
        }
      }
    };

    loadTokens();

    return () => {
      isMounted = false;
    };
  }, [normalizedOwner, publicClient, hasLoadedSupply, totalSupply, refreshIndex]);

  const refresh = useCallback(() => setRefreshIndex((prev) => prev + 1), []);

  return {
    tokens,
    totalSupply,
    hasLoadedSupply,
    isLoading: isFetchingTotalSupply || isLoadingTokens,
    isMetadataLoading: isLoadingTokens,
    error,
    refresh,
    refetchTotalSupply,
  };
};
