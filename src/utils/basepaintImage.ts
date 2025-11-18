import { baseClient, BASE_PAINT_CONTRACT_ADDRESS } from '@/hooks/useDateUtils';
import { parseAbiItem } from 'viem';
import { PNG } from 'pngjs';

const GRID_SIZE = 256;
const DEFAULT_SCALE = 20;
const MAX_SCALE = 40;
const MIN_SCALE = 1;
const LOOKBACK_BLOCKS = 400000n;
const CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes cache to reduce RPC pressure

const paintedEvent = parseAbiItem(
  'event Painted(uint256 indexed day, uint256 tokenId, address author, bytes pixels)'
);

type CachedImage = { buffer: Buffer; timestamp: number };
const imageCache = new Map<string, CachedImage>();

interface ReconstructionOptions {
  day: number;
  palette: string[];
  scale?: number;
}

interface ReconstructionMetadata {
  day: number;
  scale: number;
  paletteSize: number;
  pixelsFilled: number;
  logsProcessed: number;
  lastLogBlock?: bigint;
}

export interface ReconstructionResult {
  buffer: Buffer;
  metadata: ReconstructionMetadata;
}

const sanitizePalette = (palette: string[]): string[] =>
  palette
    .map((color) => color?.trim())
    .filter((color): color is string => Boolean(color))
    .map((color) => (color.startsWith('#') ? color : `#${color}`));

const hexToRgb = (hexColor: string): { r: number; g: number; b: number } => {
  const normalized = hexColor.startsWith('#') ? hexColor.slice(1) : hexColor;
  if (normalized.length === 3) {
    const r = parseInt(normalized[0] + normalized[0], 16);
    const g = parseInt(normalized[1] + normalized[1], 16);
    const b = parseInt(normalized[2] + normalized[2], 16);
    return {
      r: Number.isFinite(r) ? r : 0,
      g: Number.isFinite(g) ? g : 0,
      b: Number.isFinite(b) ? b : 0,
    };
  }
  if (normalized.length === 6) {
    const r = parseInt(normalized.slice(0, 2), 16);
    const g = parseInt(normalized.slice(2, 4), 16);
    const b = parseInt(normalized.slice(4, 6), 16);
    return {
      r: Number.isFinite(r) ? r : 0,
      g: Number.isFinite(g) ? g : 0,
      b: Number.isFinite(b) ? b : 0,
    };
  }
  return { r: 0, g: 0, b: 0 };
};

const buildCacheKey = (day: number, scale: number, palette: string[]): string =>
  `${day}:${scale}:${palette.join(',')}`;

const getCachedImage = (key: string): Buffer | null => {
  const cached = imageCache.get(key);
  if (!cached) return null;
  if (Date.now() - cached.timestamp > CACHE_TTL_MS) {
    imageCache.delete(key);
    return null;
  }
  return Buffer.from(cached.buffer);
};

const storeCachedImage = (key: string, buffer: Buffer): void => {
  imageCache.set(key, { buffer, timestamp: Date.now() });
};

const fetchPaintLogs = async (day: number) => {
  const latestBlock = await baseClient.getBlockNumber();
  const fromBlock = latestBlock > LOOKBACK_BLOCKS ? latestBlock - LOOKBACK_BLOCKS : 0n;

  let logs = await baseClient.getLogs({
    address: BASE_PAINT_CONTRACT_ADDRESS,
    event: paintedEvent,
    args: { day: BigInt(day) },
    fromBlock,
    toBlock: latestBlock,
  });

  if (!logs.length && fromBlock > 0n) {
    logs = await baseClient.getLogs({
      address: BASE_PAINT_CONTRACT_ADDRESS,
      event: paintedEvent,
      args: { day: BigInt(day) },
      fromBlock: 0n,
      toBlock: latestBlock,
    });
  }

  return { logs, latestBlock };
};

const decodePixels = (logs: Array<{ args?: { pixels?: string }; blockNumber?: bigint }>) => {
  const pixelIndices = new Uint8Array(GRID_SIZE * GRID_SIZE).fill(255);
  let lastLogBlock: bigint | undefined;

  logs.forEach((log) => {
    const pixels = log.args?.pixels;
    if (!pixels) return;
    lastLogBlock = log.blockNumber;
    const data = pixels.slice(2);
    for (let i = 0; i < data.length; i += 6) {
      const x = parseInt(data.slice(i, i + 2), 16);
      const y = parseInt(data.slice(i + 2, i + 4), 16);
      const colorIndex = parseInt(data.slice(i + 4, i + 6), 16);
      if (Number.isNaN(x) || Number.isNaN(y) || Number.isNaN(colorIndex)) continue;
      if (x >= GRID_SIZE || y >= GRID_SIZE) continue;
      const idx = y * GRID_SIZE + x;
      pixelIndices[idx] = colorIndex;
    }
  });

  return { pixelIndices, lastLogBlock };
};

const drawPngFromPixels = (pixelIndices: Uint8Array, palette: string[], scale: number): { buffer: Buffer; pixelsFilled: number } => {
  const canvasSize = GRID_SIZE * scale;
  const png = new PNG({ width: canvasSize, height: canvasSize });
  let pixelsFilled = 0;

  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      const colorIndex = pixelIndices[y * GRID_SIZE + x];
      if (colorIndex !== 255) {
        pixelsFilled++;
      }
      const paletteColor = palette[colorIndex] ?? null;
      const { r, g, b } = paletteColor ? hexToRgb(paletteColor) : { r: 0, g: 0, b: 0 };
      const alpha = paletteColor && colorIndex !== 255 ? 255 : 0;

      for (let dy = 0; dy < scale; dy++) {
        for (let dx = 0; dx < scale; dx++) {
          const idx = ((y * scale + dy) * canvasSize + (x * scale + dx)) << 2;
          png.data[idx] = r;
          png.data[idx + 1] = g;
          png.data[idx + 2] = b;
          png.data[idx + 3] = alpha;
        }
      }
    }
  }

  return { buffer: PNG.sync.write(png), pixelsFilled };
};

export const reconstructBasePaintImage = async (
  options: ReconstructionOptions
): Promise<ReconstructionResult> => {
  const { day, palette, scale = DEFAULT_SCALE } = options;

  if (!Number.isFinite(day) || day <= 0) {
    throw new Error('Invalid day provided for BasePaint reconstruction');
  }

  if (!palette || palette.length === 0) {
    throw new Error('A non-empty palette is required to rebuild the BasePaint image');
  }

  const sanitizedPalette = sanitizePalette(palette);
  const normalizedScale = Math.min(Math.max(Math.floor(scale), MIN_SCALE), MAX_SCALE);
  const cacheKey = buildCacheKey(day, normalizedScale, sanitizedPalette);
  const cached = getCachedImage(cacheKey);
  if (cached) {
    return {
      buffer: cached,
      metadata: {
        day,
        scale: normalizedScale,
        paletteSize: sanitizedPalette.length,
        pixelsFilled: 0,
        logsProcessed: 0,
      },
    };
  }

  const { logs } = await fetchPaintLogs(day);
  const { pixelIndices, lastLogBlock } = decodePixels(logs as Array<{ args?: { pixels?: string }; blockNumber?: bigint }>);
  const { buffer, pixelsFilled } = drawPngFromPixels(pixelIndices, sanitizedPalette, normalizedScale);

  storeCachedImage(cacheKey, buffer);

  return {
    buffer,
    metadata: {
      day,
      scale: normalizedScale,
      paletteSize: sanitizedPalette.length,
      pixelsFilled,
      logsProcessed: logs.length,
      lastLogBlock,
    },
  };
};
