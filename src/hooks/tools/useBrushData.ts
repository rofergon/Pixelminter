import { useState, useEffect, useCallback, useRef } from 'react';
import { useAccount } from 'wagmi';
import { getContract, parseAbiItem, type Address } from 'viem';
import { BasePaintBrushAbi } from '../../abi/BasePaintBrushAbi';
import { BrushData } from '../../types/types';
import { baseClient } from '../../hooks/useDateUtils';

const contractAddress = '0xD68fe5b53e7E1AbeB5A4d0A6660667791f39263a';
const transferEvent = parseAbiItem(
  'event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)'
);

// Cache for brush data with improved TTL
const brushTokenCache = {
  balanceOf: { address: null as string | null | undefined, value: null as bigint | null, timestamp: 0 },
  userTokens: { address: null as string | null | undefined, tokens: [] as number[], timestamp: 0, lastScannedBlock: 0n },
  CACHE_TTL: 300000 // 5 minutes
};

// Helper for retries
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
const BRUSH_TOKEN_CACHE_KEY = 'pixelminter-brush-token-cache';

type BrushTokenCacheEntry = {
  tokens: number[];
  lastScannedBlock: string;
  timestamp: number;
};

const normalizeAddress = (address: string) => address.toLowerCase();

// Manual brush token override, persisted per address so the automatic
// log scan can be skipped entirely on subsequent visits.
const MANUAL_BRUSH_TOKEN_KEY = 'pixelminter-manual-brush-token';

const readManualTokenCache = (address: string): number | null => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(MANUAL_BRUSH_TOKEN_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const token = parsed[normalizeAddress(address)];
    const tokenNumber = Number(token);
    return Number.isFinite(tokenNumber) && tokenNumber > 0 ? tokenNumber : null;
  } catch (error) {
    console.error('Error reading manual brush token cache:', error);
    return null;
  }
};

const writeManualTokenCache = (address: string, tokenId: number) => {
  if (typeof window === 'undefined') return;
  try {
    const raw = window.localStorage.getItem(MANUAL_BRUSH_TOKEN_KEY);
    const parsed = raw ? (JSON.parse(raw) as Record<string, number>) : {};
    parsed[normalizeAddress(address)] = tokenId;
    window.localStorage.setItem(MANUAL_BRUSH_TOKEN_KEY, JSON.stringify(parsed));
  } catch (error) {
    console.error('Error writing manual brush token cache:', error);
  }
};

const readPersistentTokenCache = (address: string): BrushTokenCacheEntry | null => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(BRUSH_TOKEN_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Record<string, BrushTokenCacheEntry>;
    const entry = parsed[normalizeAddress(address)];
    if (!entry || !Array.isArray(entry.tokens)) return null;
    return entry;
  } catch (error) {
    console.error('Error reading brush cache:', error);
    return null;
  }
};

const writePersistentTokenCache = (address: string, entry: BrushTokenCacheEntry) => {
  if (typeof window === 'undefined') return;
  try {
    const raw = window.localStorage.getItem(BRUSH_TOKEN_CACHE_KEY);
    const parsed = raw ? (JSON.parse(raw) as Record<string, BrushTokenCacheEntry>) : {};
    parsed[normalizeAddress(address)] = entry;
    window.localStorage.setItem(BRUSH_TOKEN_CACHE_KEY, JSON.stringify(parsed));
  } catch (error) {
    console.error('Error writing brush cache:', error);
  }
};

type TransferLog = {
  args?: { from?: string; to?: string; tokenId?: bigint };
  blockNumber?: bigint;
  logIndex?: number;
};

const sortLogs = (logs: TransferLog[]) =>
  logs.sort((a, b) => {
    const blockA = a.blockNumber ? Number(a.blockNumber) : 0;
    const blockB = b.blockNumber ? Number(b.blockNumber) : 0;
    if (blockA !== blockB) return blockA - blockB;
    const indexA = a.logIndex ?? 0;
    const indexB = b.logIndex ?? 0;
    return indexA - indexB;
  });

const fetchTransferLogs = async (address: string, fromBlock: bigint, toBlock: bigint): Promise<TransferLog[]> => {
  const [toLogs, fromLogs] = await Promise.all([
    baseClient.getLogs({
      address: contractAddress as Address,
      event: transferEvent,
      args: { to: address as Address },
      fromBlock,
      toBlock
    }),
    baseClient.getLogs({
      address: contractAddress as Address,
      event: transferEvent,
      args: { from: address as Address },
      fromBlock,
      toBlock
    })
  ]);

  return sortLogs([...toLogs, ...fromLogs] as TransferLog[]);
};

const fetchTransferLogsWithFallback = async (
  address: string,
  fromBlock: bigint,
  toBlock: bigint,
  isCancelled?: () => boolean
): Promise<TransferLog[]> => {
  if (isCancelled?.()) return [];

  try {
    return await fetchTransferLogs(address, fromBlock, toBlock);
  } catch (error) {
    if (isCancelled?.()) return [];
    console.warn('Full-range log query failed, retrying in chunks:', error);
  }

  const chunkSize = 100000n;
  const logs: TransferLog[] = [];
  let start = fromBlock;

  while (start <= toBlock) {
    if (isCancelled?.()) return sortLogs(logs);
    const end = start + chunkSize - 1n > toBlock ? toBlock : start + chunkSize - 1n;
    const chunkLogs = await fetchTransferLogs(address, start, end);
    logs.push(...chunkLogs);
    start = end + 1n;
    if (start <= toBlock) {
      await delay(150);
    }
  }

  return sortLogs(logs);
};

const applyTransferLogs = (ownedTokens: Set<number>, logs: TransferLog[], address: string) => {
  const addressLower = normalizeAddress(address);
  logs.forEach((log) => {
    const from = log.args?.from ? normalizeAddress(log.args.from) : '';
    const to = log.args?.to ? normalizeAddress(log.args.to) : '';
    const tokenId = log.args?.tokenId;
    if (tokenId === undefined) return;
    const tokenNumber = Number(tokenId);
    if (!Number.isFinite(tokenNumber)) return;

    if (from === addressLower) {
      ownedTokens.delete(tokenNumber);
    }
    if (to === addressLower) {
      ownedTokens.add(tokenNumber);
    }
  });
};

export const useBrushData = () => {
  const { address } = useAccount();
  const [userTokenIds, setUserTokenIds] = useState<number[]>([]);
  const [brushData, setBrushData] = useState<BrushData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [balance, setBalance] = useState<bigint | undefined>();
  const [manualTokenId, setManualTokenIdState] = useState<number | null>(null);

  // Manual override (number) halts every automatic RPC lookup once set.
  // The generation counter aborts in-flight block scans.
  const manualOverrideRef = useRef<number | null>(null);
  const scanGenerationRef = useRef(0);
  const brushDataResolvedRef = useRef(false);

  // Sync manual override from cache before any fetch effect runs.
  useEffect(() => {
    scanGenerationRef.current += 1;
    brushDataResolvedRef.current = false;
    setIsSearching(false);
    const cached = address ? readManualTokenCache(address) : null;
    manualOverrideRef.current = cached;
    setManualTokenIdState(cached);
  }, [address]);

  // Fetch contract data with caching and retries
  const fetchContractData = useCallback(async () => {
    if (!address || manualOverrideRef.current) {
      setIsLoading(false);
      return { balance: undefined };
    }

    // Check cache for balance
    if (
      brushTokenCache.balanceOf.address === normalizeAddress(address) &&
      brushTokenCache.balanceOf.value !== null &&
      Date.now() - brushTokenCache.balanceOf.timestamp < brushTokenCache.CACHE_TTL
    ) {
      return {
        balance: brushTokenCache.balanceOf.value
      };
    }

    try {
      setIsLoading(true);

      const contract = getContract({
        address: contractAddress,
        abi: BasePaintBrushAbi,
        client: baseClient,
      });

      const balanceResult = await contract.read.balanceOf([address]);

      brushTokenCache.balanceOf.address = normalizeAddress(address);
      brushTokenCache.balanceOf.value = balanceResult;
      brushTokenCache.balanceOf.timestamp = Date.now();

      setBalance(balanceResult);
      return { balance: balanceResult };
    } catch (error) {
      console.error('Error obtaining contract data:', error);
      return { balance: undefined };
    } finally {
      setIsLoading(false);
    }
  }, [address]);

  const fetchUserTokenIds = useCallback(async () => {
    if (!address || manualOverrideRef.current) {
      setUserTokenIds([]);
      return;
    }

    const generation = scanGenerationRef.current;
    const isCancelled = () =>
      manualOverrideRef.current !== null || scanGenerationRef.current !== generation;

    // Check cache for user tokens
    if (
      brushTokenCache.userTokens.address === normalizeAddress(address) &&
      brushTokenCache.userTokens.tokens.length > 0 &&
      Date.now() - brushTokenCache.userTokens.timestamp < brushTokenCache.CACHE_TTL
    ) {
      setUserTokenIds(brushTokenCache.userTokens.tokens);
      return;
    }

    try {
      setIsSearching(true);
      const { balance } = await fetchContractData();

      if (isCancelled()) return;

      const persistentCache = readPersistentTokenCache(address);
      const cachedTokens = (persistentCache?.tokens ?? []).filter(token => Number.isFinite(token));
      let cachedLastScannedBlock = 0n;
      if (persistentCache?.lastScannedBlock) {
        try {
          cachedLastScannedBlock = BigInt(persistentCache.lastScannedBlock);
        } catch {
          cachedLastScannedBlock = 0n;
        }
      }
      const cachedTimestamp = persistentCache?.timestamp ?? 0;

      if (!balance) {
        if (cachedTokens.length > 0) {
          setUserTokenIds(cachedTokens);
        }
        return;
      }

      const balanceNum = Number(balance);
      if (balanceNum <= 0) {
        brushTokenCache.userTokens.address = normalizeAddress(address);
        brushTokenCache.userTokens.tokens = [];
        brushTokenCache.userTokens.timestamp = Date.now();
        brushTokenCache.userTokens.lastScannedBlock = cachedLastScannedBlock;
        writePersistentTokenCache(address, {
          tokens: [],
          lastScannedBlock: cachedLastScannedBlock.toString(),
          timestamp: Date.now()
        });
        setUserTokenIds([]);
        return;
      }

      if (
        cachedTokens.length === balanceNum &&
        Date.now() - cachedTimestamp < brushTokenCache.CACHE_TTL
      ) {
        brushTokenCache.userTokens.address = normalizeAddress(address);
        brushTokenCache.userTokens.tokens = cachedTokens;
        brushTokenCache.userTokens.timestamp = cachedTimestamp;
        brushTokenCache.userTokens.lastScannedBlock = cachedLastScannedBlock;
        setUserTokenIds(cachedTokens);
        return;
      }

      const ownedTokens = new Set<number>(cachedTokens);
      const latestBlock = await baseClient.getBlockNumber();
      if (isCancelled()) return;
      const fromBlock = cachedLastScannedBlock > 0n ? cachedLastScannedBlock + 1n : 0n;

      if (fromBlock <= latestBlock) {
        const logs = await fetchTransferLogsWithFallback(address, fromBlock, latestBlock, isCancelled);
        if (isCancelled()) return;
        applyTransferLogs(ownedTokens, logs, address);
      }

      const tokenIds = Array.from(ownedTokens).sort((a, b) => a - b);

      // Update cache
      brushTokenCache.userTokens.address = normalizeAddress(address);
      brushTokenCache.userTokens.tokens = tokenIds;
      brushTokenCache.userTokens.timestamp = Date.now();
      brushTokenCache.userTokens.lastScannedBlock = latestBlock;
      writePersistentTokenCache(address, {
        tokens: tokenIds,
        lastScannedBlock: latestBlock.toString(),
        timestamp: Date.now()
      });

      setUserTokenIds(tokenIds);
    } catch (error) {
      console.error('Error fetching user token IDs:', error);
    } finally {
      if (scanGenerationRef.current === generation && manualOverrideRef.current === null) {
        setIsSearching(false);
      }
    }
  }, [address, fetchContractData]);

  const fetchBrushStrength = useCallback(async (tokenId: number) => {
    const strength = await baseClient.readContract({
      address: contractAddress,
      abi: BasePaintBrushAbi,
      functionName: 'strengths',
      args: [BigInt(tokenId)],
    });

    return Number(strength);
  }, []);

  const fetchBrushData = useCallback(async () => {
    if (manualOverrideRef.current || brushDataResolvedRef.current) {
      return null;
    }

    if (userTokenIds.length === 0) {
      setBrushData(null);
      return null;
    }

    try {
      let selectedToken = userTokenIds[0];
      let maxPixels = 0;

      for (const tokenId of userTokenIds) {
        const strength = await fetchBrushStrength(tokenId);
        if (manualOverrideRef.current) return null;
        if (strength > maxPixels) {
          maxPixels = strength;
          selectedToken = tokenId;
        }
      }

      const newBrushData = {
        tokenId: selectedToken.toString(),
        pixelsPerDay: Number.isFinite(maxPixels) ? maxPixels : 0,
      };

      brushDataResolvedRef.current = true;
      setBrushData(newBrushData);
      return newBrushData;
    } catch (error) {
      console.error('Error reading brush data from contract:', error);
      setBrushData(null);
      return null;
    }
  }, [userTokenIds, fetchBrushStrength]);

  // Manually set the brush token ID: persists the override and permanently
  // stops the automatic scan. Brush data is resolved by the effect below.
  const setManualTokenId = useCallback((tokenId: number): boolean => {
    if (!address) return false;
    const parsed = Number(tokenId);
    if (!Number.isFinite(parsed) || parsed <= 0) return false;

    scanGenerationRef.current += 1;
    manualOverrideRef.current = parsed;
    brushDataResolvedRef.current = true;
    setManualTokenIdState(parsed);
    setIsSearching(false);
    writeManualTokenCache(address, parsed);

    return true;
  }, [address]);

  // Resolve brush data for the manual token (fresh entry or restored from cache).
  useEffect(() => {
    if (manualTokenId === null) return;
    let cancelled = false;

    const resolve = async () => {
      try {
        const strength = await fetchBrushStrength(manualTokenId);
        if (!cancelled) {
          setBrushData({
            tokenId: manualTokenId.toString(),
            pixelsPerDay: Number.isFinite(strength) ? strength : 0,
          });
        }
      } catch (error) {
        console.error('Error reading manual brush strength:', error);
        if (!cancelled) {
          setBrushData({ tokenId: manualTokenId.toString(), pixelsPerDay: 0 });
        }
      }
    };

    resolve();
    return () => {
      cancelled = true;
    };
  }, [manualTokenId, fetchBrushStrength]);

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
    isSearching,
    balance,
    manualTokenId,
    setManualTokenId,
  };
};
