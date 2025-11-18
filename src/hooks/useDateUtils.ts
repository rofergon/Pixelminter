/* eslint-disable no-unused-vars */
import { createPublicClient, http, fallback } from 'viem';
import { base } from 'viem/chains';
import { BasePaintAbi } from '../abi/BasePaintAbi';
import { BasePaintMetadataRegistryAbi } from '../abi/BasePaintMetadataRegistryAbi';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';

dayjs.extend(utc);

// Cache implementation to avoid repeated API calls
const cache = {
  today: { value: null as number | null, timestamp: 0 },
  totalPixels: { value: null as bigint | null, timestamp: 0, day: 0 },
  
  // Cache valid for 5 minutes (300000ms)
  CACHE_TTL: 300000,
  
  isTodayValid: function() {
    return this.today.value !== null && 
           (Date.now() - this.today.timestamp) < this.CACHE_TTL;
  },
  
  isTotalPixelsValid: function(day: number) {
    return this.totalPixels.value !== null && 
           this.totalPixels.day === day && 
           (Date.now() - this.totalPixels.timestamp) < this.CACHE_TTL;
  }
};

// Create an array of transport providers with CORS-enabled reliable RPCs
// Using only endpoints verified to work from browser with proper CORS headers
const transports = [
  // Most reliable CORS-enabled public RPCs for Base mainnet
  http('https://mainnet.base.org', { timeout: 10000 }),                    // Official Base RPC: 0.375s avg, CORS-enabled
  http('https://base-rpc.publicnode.com', { timeout: 10000 }),             // Very reliable: 0.309s avg, CORS-enabled
  http('https://base.llamarpc.com', { timeout: 10000 }),                   // Fast: 0.285s avg, CORS-enabled
  http('https://gateway.tenderly.co/public/base', { timeout: 12000 }),     // Tenderly public: 0.289s avg, CORS-enabled
  http('https://base.drpc.org', { timeout: 12000 }),                       // Good fallback: 0.700s avg
];

// Create client with fallback functionality and automatic ranking
const client = createPublicClient({
  chain: base,
  transport: fallback(transports, {
    rank: true,  // Automatically ranks by performance
    retryCount: 2,
    retryDelay: 1000,
  }),
});

// Export the client for use in other files
export { client as baseClient };

// Additional clients for parallel brush searches - using different CORS-enabled endpoints
const alternativeClient = createPublicClient({
  chain: base,
  transport: http('https://base.gateway.tenderly.co', { timeout: 12000 }),
});

const tertiaryClient = createPublicClient({
  chain: base,
  transport: http('https://endpoints.omniatech.io/v1/base/mainnet/public', { timeout: 12000 }),
});

// Export the alternative client for parallel searches
export { alternativeClient };

// Export tertiary client for additional load distribution
export { tertiaryClient };

const CONTRACT_ADDRESS = '0xBa5e05cb26b78eDa3A2f8e3b3814726305dcAc83';
const METADATA_REGISTRY_ADDRESS = '0x5104482a2Ef3a03b6270D3e931eac890b86FaD01';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Obtiene el día actual consultando el contrato BasePaint with cache.
 * @returns {Promise<number>} - Promesa que resuelve al número de día actual.
 */
export const calculateDay = async (retries = 2, backoff = 1500): Promise<number> => {
  // Check cache first
  if (cache.isTodayValid()) {
    return cache.today.value as number;
  }
  
  try {
    const today = await client.readContract({
      address: CONTRACT_ADDRESS,
      abi: BasePaintAbi,
      functionName: 'today',
    });
    
    const todayNumber = Number(today);
    
    // Update cache
    cache.today.value = todayNumber;
    cache.today.timestamp = Date.now();
    
    return todayNumber;
  } catch (error) {
    console.error('Error fetching today:', error);
    
    if (retries > 0) {
      // Conservative backoff to respect rate limits
      await delay(backoff);
      return calculateDay(retries - 1, backoff * 2);
    } else {
      // If all retries fail, return cached value if available
      if (cache.today.value !== null) {
        console.warn('Using cached value for today after all retries failed');
        return cache.today.value;
      }
      // If no cache available, use a hardcoded fallback value
      console.warn('Using fallback value for day after all retries failed');
      return 616; // Hardcoded fallback value based on error message
    }
  }
};

export function getCurrentDayUTC(): string {
    return dayjs().utc().format('YYYY-MM-DD');
}

interface RawMetadata {
  name: string;
  palette: readonly bigint[];
  size: bigint;
  proposer: string;
}

export interface DayMetadata {
  name: string;
  palette: string[];
  size: number;
  proposer: string;
}

const uint24ToHex = (value: bigint | number): string => {
  const numeric = typeof value === 'bigint' ? Number(value) : value;
  if (!Number.isFinite(numeric) || numeric < 0) {
    return '#000000';
  }
  return `#${numeric.toString(16).padStart(6, '0')}`;
};

export const getBasePaintDayMetadata = async (day: number): Promise<DayMetadata | null> => {
  if (!Number.isFinite(day) || day <= 0) {
    return null;
  }

  const metadata = await client.readContract({
    address: METADATA_REGISTRY_ADDRESS,
    abi: BasePaintMetadataRegistryAbi,
    functionName: 'getMetadata',
    args: [BigInt(day)],
  }) as RawMetadata;

  if (!metadata) {
    return null;
  }

  const palette = Array.isArray(metadata.palette)
    ? metadata.palette.map(uint24ToHex)
    : [];

  const sizeValue = typeof metadata.size === 'bigint' ? Number(metadata.size) : 0;

  return {
    name: metadata.name ?? '',
    palette,
    size: sizeValue,
    proposer: metadata.proposer ?? '0x0000000000000000000000000000000000000000',
  };
};

/**
 * Obtiene la cantidad total de píxeles pintados para el día actual with cache.
 * @returns {Promise<bigint>} - Promesa que resuelve a la cantidad total de píxeles pintados.
 */
export const getTotalPixelsPaintedToday = async (retries = 2, backoff = 1500): Promise<bigint> => {
  try {
    // Use cached day if available to avoid extra requests
    const today = cache.isTodayValid() 
      ? cache.today.value as number
      : await calculateDay();
    
    // Check cache first
    if (cache.isTotalPixelsValid(today)) {
      return cache.totalPixels.value as bigint;
    }
    
    // Increased delay to respect rate limits
    await delay(500);
    
    const canvas = await client.readContract({
      address: CONTRACT_ADDRESS,
      abi: BasePaintAbi,
      functionName: 'canvases',
      args: [BigInt(today)],
    });
    
    // Verificamos que canvas sea un array y tenga al menos un elemento
    if (Array.isArray(canvas) && canvas.length > 0) {
      const totalContributions = canvas[0];
      
      // Update cache
      cache.totalPixels.value = totalContributions;
      cache.totalPixels.timestamp = Date.now();
      cache.totalPixels.day = today;
      
      return totalContributions;
    } else {
      console.error('Formato de respuesta del canvas inesperado:', canvas);
      return BigInt(0);
    }
  } catch (error) {
    console.error('Error al obtener los píxeles pintados:', error);
    if (retries > 0) {
      await delay(backoff);
      return getTotalPixelsPaintedToday(retries - 1, backoff * 2);
    } else {
      // If all retries fail, return cached value if available
      if (cache.totalPixels.value !== null) {
        console.warn('Using cached value for total pixels after all retries failed');
        return cache.totalPixels.value;
      }
      console.error('Se agotaron los reintentos para obtener los píxeles pintados');
      return BigInt(0);
    }
  }
};

/**
 * Imprime el número de píxeles pintados cada 5 minutos para reducir la carga.
 * @returns {() => void} - Función para detener el intervalo.
 */
export const logPixelsPaintedInterval = (): () => void => {
  // Further reduced frequency to every 5 minutes
  const intervalId = setInterval(async () => {
    try {
      if (!cache.isTodayValid() || !cache.isTotalPixelsValid(cache.today.value as number)) {
        const pixelesPintados = await getTotalPixelsPaintedToday();
        // Log or use the value if needed
      }
    } catch (error) {
      console.error('Error al obtener los píxeles pintados:', error);
    }
  }, 300000); // 5 minutes (300000ms)

  return () => clearInterval(intervalId);
};

// Initialize but don't automatically start logging
// const stopLogging = logPixelsPaintedInterval();
