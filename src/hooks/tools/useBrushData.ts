import { useState, useEffect, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { getContract } from 'viem';
import { BasePaintBrushAbi } from '../../abi/BasePaintBrushAbi';
import { BrushData } from '../../types/types';
import { baseClient, alternativeClient, tertiaryClient } from '../../hooks/useDateUtils';

const contractAddress = '0xD68fe5b53e7E1AbeB5A4d0A6660667791f39263a';

// Cache for brush data with improved TTL
const brushTokenCache = {
  balanceOf: { address: null as string | null, value: null as bigint | null, timestamp: 0 },
  totalSupply: { value: null as bigint | null, timestamp: 0 },
  userTokens: { address: null as string | null, tokens: [] as number[], timestamp: 0 },
  CACHE_TTL: 300000 // 5 minutes
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
      
      // Fetch balance with fewer retries and better error handling
      let balanceResult: bigint | undefined;
      let totalSupplyResult: bigint | undefined;

      // Only 1 retry since we have multiple RPCs in fallback with internal retries
      for (let i = 0; i < 1; i++) {
        try {
          const contract = getContract({
            address: contractAddress,
            abi: BasePaintBrushAbi,
            client: baseClient,
          });

          // Get balance
          balanceResult = await contract.read.balanceOf([address]);
          
          // Increased delay between requests to respect rate limits
          await delay(400);

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
          console.error(`Attempt ${i+1} failed:`, err);
          if (i === 0) throw err; // Re-throw on final attempt
        }
      }

      setBalance(balanceResult);
      return { balance: balanceResult, totalSupply: totalSupplyResult };
    } catch (error) {
      console.error('Error obtaining contract data:', error);
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

      // Contracts for parallel search using three different CORS-enabled clients
      const contractMain = getContract({
        address: contractAddress,
        abi: BasePaintBrushAbi,
        client: baseClient,
      });

      const contractAlt = getContract({
        address: contractAddress,
        abi: BasePaintBrushAbi,
        client: alternativeClient,
      });

      const contractTertiary = getContract({
        address: contractAddress,
        abi: BasePaintBrushAbi,
        client: tertiaryClient,
      });

      const tokenIds: number[] = [];
      const balanceNum = Number(balance);
      const totalSupplyNum = Number(totalSupply);

      // Reduced batch size to avoid rate limits (conservative approach)
      const batchSize = 150;
      for (let i = 1; i <= totalSupplyNum && tokenIds.length < balanceNum; i += batchSize) {
        const batch = Array.from(
          { length: Math.min(batchSize, totalSupplyNum - i + 1) }, 
          (_, index) => i + index
        );
        
        // Process in smaller chunks with moderate delays to avoid 429
        for (let j = 0; j < batch.length; j += 15) {
          const chunk = batch.slice(j, j + 15);
          
          // Distribute load across three clients
          const ownerPromises = chunk.map(tokenId => {
            // Rotate through 3 CORS-enabled clients
            const contract = tokenId % 3 === 0 ? contractMain : 
                            tokenId % 3 === 1 ? contractAlt : 
                            contractTertiary;
            return contract.read.ownerOf([BigInt(tokenId)])
              .catch(() => null);
          });

          // Increased delay between chunks to respect rate limits
          if (j > 0) await delay(300);

          const owners = await Promise.all(ownerPromises);

          owners.forEach((owner, index) => {
            if (owner) {
              const tokenId = chunk[index];
              if (owner.toLowerCase() === address.toLowerCase()) {
                // Log to show which client found the brush
                const clientUsed = tokenId % 3 === 0 ? 'Main (Fallback Pool)' : 
                                  tokenId % 3 === 1 ? 'Alternative (Tenderly)' : 
                                  'Tertiary (Omniatech)';
                console.log(`🎨 Brush found! Token ID: ${tokenId} | Client: ${clientUsed}`);
                
                tokenIds.push(tokenId);
              }
            }
          });

          // If we found enough tokens, stop querying
          if (tokenIds.length >= balanceNum) break;
        }
        
        // Add delay between batches to avoid overwhelming the RPCs
        if (i + batchSize <= totalSupplyNum && tokenIds.length < balanceNum) {
          await delay(500);
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

  const fetchBrushStrength = useCallback(async (tokenId: number) => {
    const clients = [baseClient, alternativeClient, tertiaryClient];
    for (const client of clients) {
      try {
        const strength = await client.readContract({
          address: contractAddress,
          abi: BasePaintBrushAbi,
          functionName: 'strengths',
          args: [BigInt(tokenId)],
        });
        return Number(strength);
      } catch (error) {
        console.error(`Error fetching strength for token ${tokenId}`, error);
      }
    }
    throw new Error('Unable to fetch brush strength');
  }, []);

  const fetchBrushData = useCallback(async () => {
    if (userTokenIds.length === 0) {
      setBrushData(null);
      return null;
    }

    try {
      let selectedToken = userTokenIds[0];
      let maxPixels = 0;

      for (const tokenId of userTokenIds) {
        const strength = await fetchBrushStrength(tokenId);
        if (strength > maxPixels) {
          maxPixels = strength;
          selectedToken = tokenId;
        }
      }

      const newBrushData = {
        tokenId: selectedToken.toString(),
        pixelsPerDay: Number.isFinite(maxPixels) ? maxPixels : 0,
      };

      setBrushData(newBrushData);
      return newBrushData;
    } catch (error) {
      console.error('Error reading brush data from contract:', error);
      setBrushData(null);
      return null;
    }
  }, [userTokenIds, fetchBrushStrength]);

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
