import { useCallback, useMemo } from 'react';
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { useReadContract, usePublicClient } from 'wagmi';
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
  owner?: string;
}

export type PixelminterGalleryScope = 'personal' | 'global';

export interface UsePixelminterGalleryOptions {
  owner?: `0x${string}` | string | null;
  scope?: PixelminterGalleryScope;
}

export const resolveIpfsUri = (uri?: string | null) => {
  if (!uri) return '';

  if (uri.startsWith('ipfs://')) {
    const cleaned = uri.replace('ipfs://', '').replace(/^ipfs\//, '');
    return `${LIGHTHOUSE_GATEWAY_URL}${cleaned}`;
  }

  return uri;
};

const metadataCache = new Map<string, PixelminterMetadata | undefined>();
const metadataPromiseCache = new Map<string, Promise<PixelminterMetadata | undefined>>();

const fetchTokenMetadata = async (tokenURI: string) => {
  const resolvedUri = resolveIpfsUri(tokenURI);
  if (!resolvedUri) {
    return undefined;
  }

  if (metadataCache.has(resolvedUri)) {
    return metadataCache.get(resolvedUri);
  }

  const pendingPromise = metadataPromiseCache.get(resolvedUri);
  if (pendingPromise) {
    return pendingPromise;
  }

  const metadataPromise = (async () => {
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
    } finally {
      metadataPromiseCache.delete(resolvedUri);
    }
  })();

  metadataPromiseCache.set(resolvedUri, metadataPromise);
  const metadata = await metadataPromise;
  metadataCache.set(resolvedUri, metadata);
  return metadata;
};

export const usePixelminterGallery = (options: UsePixelminterGalleryOptions = {}) => {
  const { owner, scope = 'personal' } = options;
  const publicClient = usePublicClient({ chainId: PIXELMINTER_CHAIN_ID });
  const queryClient = useQueryClient();

  const shouldFilterByOwner = scope === 'personal';
  const normalizedOwner =
    shouldFilterByOwner && typeof owner === 'string' && owner.length > 0 ? owner.toLowerCase() : undefined;
  const ownerKey = shouldFilterByOwner ? normalizedOwner ?? 'none' : 'all';
  const baseQueryKey = useMemo(() => ['pixelminter-gallery', scope, ownerKey], [scope, ownerKey]);

  const {
    data: totalSupplyData,
    isFetching: isFetchingTotalSupply,
    refetch: refetchTotalSupply,
    error: totalSupplyError,
  } = useReadContract({
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
  const queryEnabled =
    Boolean(publicClient) &&
    hasLoadedSupply &&
    totalSupply > 0 &&
    (!shouldFilterByOwner || Boolean(normalizedOwner));

  const galleryQuery = useQuery({
    queryKey: [...baseQueryKey, totalSupply],
    enabled: queryEnabled,
    placeholderData: keepPreviousData,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    retry: 1,
    refetchOnWindowFocus: false,
    queryFn: async (): Promise<PixelminterToken[]> => {
      if (!publicClient) {
        return [];
      }

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

      const ownerPerToken = new Map<bigint, string>();
      const relevantTokenIds: bigint[] = [];

      ownerResults.forEach((result, index) => {
        if (result?.status === 'success' && typeof result.result === 'string') {
          const ownerAddress = result.result;
          const tokenId = tokenIds[index];
          ownerPerToken.set(tokenId, ownerAddress);

          if (
            !shouldFilterByOwner ||
            (normalizedOwner && ownerAddress.toLowerCase() === normalizedOwner)
          ) {
            relevantTokenIds.push(tokenId);
          }
        }
      });

      if (!relevantTokenIds.length) {
        return [];
      }

      const tokenUriContracts = relevantTokenIds.map((tokenId) => ({
        address: PIXELMINTER_CONTRACT_ADDRESS,
        abi: pixelminterAbi,
        functionName: 'tokenURI',
        args: [tokenId],
      }));

      const tokenUriResults = await publicClient.multicall({
        contracts: tokenUriContracts,
        allowFailure: true,
      });

      const mintedTokens = await Promise.all(
        relevantTokenIds.map(async (tokenId, index) => {
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
            owner: ownerPerToken.get(tokenId),
          };
        })
      );

      return mintedTokens.sort((a, b) => b.tokenId - a.tokenId);
    },
  });

  const tokens = queryEnabled ? galleryQuery.data ?? [] : [];
  const galleryErrorMessage =
    galleryQuery.error instanceof Error
      ? galleryQuery.error.message
      : galleryQuery.error
        ? 'Error desconocido'
        : null;
  const combinedError =
    totalSupplyError instanceof Error
      ? totalSupplyError.message
      : totalSupplyError
        ? 'Error desconocido'
        : galleryErrorMessage;

  const refresh = useCallback(() => {
    void refetchTotalSupply();
    queryClient.invalidateQueries({ queryKey: baseQueryKey });
  }, [baseQueryKey, queryClient, refetchTotalSupply]);

  return {
    tokens: tokens ?? [],
    totalSupply,
    hasLoadedSupply,
    isLoading: isFetchingTotalSupply || (queryEnabled ? galleryQuery.isFetching || galleryQuery.isPending : false),
    isMetadataLoading: queryEnabled ? galleryQuery.isFetching || galleryQuery.isPending : false,
    error: combinedError ?? null,
    refresh,
    refetchTotalSupply,
  };
};
