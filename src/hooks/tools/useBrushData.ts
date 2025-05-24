import { useState, useEffect, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { getContract } from 'viem';
import { BasePaintBrushAbi } from '../../abi/BasePaintBrushAbi';
import { BrushData } from '../../types/types';
import { baseClient } from '../../hooks/useDateUtils';

const contractAddress = '0xD68fe5b53e7E1AbeB5A4d0A6660667791f39263a';

// Cache for brush data to reduce requests with optimized RPC
const brushTokenCache = {
  balanceOf: { address: null as string | null, value: null as bigint | null, timestamp: 0 },
  totalSupply: { value: null as bigint | null, timestamp: 0 },
  userTokens: { address: null as string | null, tokens: [] as number[], timestamp: 0 },
  CACHE_TTL: 300000 // 5 minutes - optimal for reliable RPC
};

// Helper for retries
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const useBrushData = () => {
  const { address } = useAccount();
  const [userTokenIds, setUserTokenIds] = useState<number[]>([]);
  const [brushData, setBrushData] = useState<BrushData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [balance, setBalance] = useState<bigint | undefined>();

  // Fetch contract data with caching and retries
  const fetchContractData = useCallback(async () => {
    if (!address) {
      setIsLoading(false);
      return { balance: undefined, totalSupply: undefined };
    }

    // Check cache for balance
    if (
      brushTokenCache.balanceOf.address === address && 
      brushTokenCache.balanceOf.value !== null && 
      Date.now() - brushTokenCache.balanceOf.timestamp < brushTokenCache.CACHE_TTL
    ) {
      // Check cache for totalSupply
      if (
        brushTokenCache.totalSupply.value !== null && 
        Date.now() - brushTokenCache.totalSupply.timestamp < brushTokenCache.CACHE_TTL
      ) {
        return {
          balance: brushTokenCache.balanceOf.value,
          totalSupply: brushTokenCache.totalSupply.value
        };
      }
    }

    try {
      setIsLoading(true);
      
      // Fetch balance with fewer retries since we're using reliable RPC
      let balanceResult: bigint | undefined;
      let totalSupplyResult: bigint | undefined;

      // Reduced retries to 2 since we have reliable RPC
      for (let i = 0; i < 2; i++) {
        try {
          const contract = getContract({
            address: contractAddress,
            abi: BasePaintBrushAbi,
            client: baseClient,
          });

          // Shorter delay since RPC is more reliable
          if (i > 0) await delay(500);

          // Get balance
          balanceResult = await contract.read.balanceOf([address]);
          
          // Shorter delay between requests
          await delay(200);

          // Get total supply
          totalSupplyResult = await contract.read.totalSupply();
          
          // Update cache
          brushTokenCache.balanceOf.address = address;
          brushTokenCache.balanceOf.value = balanceResult;
          brushTokenCache.balanceOf.timestamp = Date.now();
          
          brushTokenCache.totalSupply.value = totalSupplyResult;
          brushTokenCache.totalSupply.timestamp = Date.now();
          
          break; // Exit retry loop if successful
        } catch (err) {
          console.error(`Intento ${i+1} falló:`, err);
          if (i === 1) throw err; // Re-throw on final attempt
        }
      }

      setBalance(balanceResult);
      return { balance: balanceResult, totalSupply: totalSupplyResult };
    } catch (error) {
      console.error('Error obteniendo datos del contrato:', error);
      return { balance: undefined, totalSupply: undefined };
    } finally {
      setIsLoading(false);
    }
  }, [address]);

  const fetchUserTokenIds = useCallback(async () => {
    // Check cache for user tokens
    if (
      address && 
      brushTokenCache.userTokens.address === address && 
      brushTokenCache.userTokens.tokens.length > 0 && 
      Date.now() - brushTokenCache.userTokens.timestamp < brushTokenCache.CACHE_TTL
    ) {
      setUserTokenIds(brushTokenCache.userTokens.tokens);
      return;
    }

    try {
      const { balance, totalSupply } = await fetchContractData();
      
      if (!balance || !totalSupply || !address) {
        return;
      }

      const contract = getContract({
        address: contractAddress,
        abi: BasePaintBrushAbi,
        client: baseClient,
      });

      const tokenIds: number[] = [];
      const balanceNum = Number(balance);
      const totalSupplyNum = Number(totalSupply);

      // Use a larger batch size since RPC is more reliable
      const batchSize = 200;
      for (let i = 1; i <= totalSupplyNum && tokenIds.length < balanceNum; i += batchSize) {
        const batch = Array.from(
          { length: Math.min(batchSize, totalSupplyNum - i + 1) }, 
          (_, index) => i + index
        );
        
        // Process in larger chunks with reduced delay
        for (let j = 0; j < batch.length; j += 20) {
          const chunk = batch.slice(j, j + 20);
          
          const ownerPromises = chunk.map(tokenId => 
            contract.read.ownerOf([BigInt(tokenId)])
              .catch(() => null)
          );

          // Reduced delay between chunks
          if (j > 0) await delay(200);

          const owners = await Promise.all(ownerPromises);

          owners.forEach((owner, index) => {
            if (owner) {
              const tokenId = chunk[index];
              if (owner.toLowerCase() === address.toLowerCase()) {
                tokenIds.push(tokenId);
              }
            }
          });

          // If we found enough tokens, stop querying
          if (tokenIds.length >= balanceNum) break;
        }
      }

      // Update cache
      brushTokenCache.userTokens.address = address;
      brushTokenCache.userTokens.tokens = tokenIds;
      brushTokenCache.userTokens.timestamp = Date.now();
      
      setUserTokenIds(tokenIds);
    } catch (error) {
      console.error('Error fetching user token IDs:', error);
    }
  }, [address, fetchContractData]);

  const fetchBrushData = useCallback(async () => {
    if (userTokenIds.length > 0) {
      try {
        const response = await fetch(`/api/brush/${userTokenIds[0]}`);
        if (!response.ok) throw new Error('Error al obtener datos del pincel');
        const data = await response.json();
        
        const pixelsPerDay = data.attributes.find((attr: { trait_type: string; value: any }) => 
          attr.trait_type === 'Pixels per day'
        )?.value;

        const newBrushData = {
          tokenId: data.tokenId,
          pixelsPerDay: pixelsPerDay ? Number(pixelsPerDay) : 0
        };

        setBrushData(newBrushData);
        return newBrushData;
      } catch (error) {
        console.error('Error fetching brush data:', error);
        return null;
      }
    }
    return null;
  }, [userTokenIds]);

  useEffect(() => {
    if (address) {
      fetchUserTokenIds();
    }
  }, [address, fetchUserTokenIds]);

  useEffect(() => {
    fetchBrushData();
  }, [fetchBrushData]);

  // Initial data load
  useEffect(() => {
    fetchContractData();
  }, [fetchContractData]);

  return {
    userTokenIds,
    brushData,
    isLoading,
    balance,
  };
};