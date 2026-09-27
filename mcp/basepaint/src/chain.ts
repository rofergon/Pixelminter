import {
  createPublicClient,
  encodeFunctionData,
  fallback,
  http,
  parseAbi,
  parseAbiItem,
  type Address,
  type Hex,
} from 'viem';
import { base } from 'viem/chains';

export const BASEPAINT_ADDRESS: Address = '0xBa5e05cb26b78eDa3A2f8e3b3814726305dcAc83';
export const METADATA_REGISTRY_ADDRESS: Address = '0x5104482a2Ef3a03b6270D3e931eac890b86FaD01';
export const BRUSH_ADDRESS: Address = '0xD68fe5b53e7E1AbeB5A4d0A6660667791f39263a';
export const BASEPAINT_API = 'https://basepaint.xyz/api';

// mainnet.base.org is the only public endpoint that reliably serves eth_getLogs
// for this contract (in 2000-block windows), so it goes first. Override with
// BASE_RPC_URL (comma-separated) when you have a private endpoint.
const DEFAULT_RPCS = [
  'https://mainnet.base.org',
  'https://base-rpc.publicnode.com',
  'https://base.drpc.org',
];

const rpcUrls = (process.env.BASE_RPC_URL ?? '')
  .split(',')
  .map((url) => url.trim())
  .filter(Boolean);

export const client = createPublicClient({
  chain: base,
  transport: fallback(
    (rpcUrls.length ? rpcUrls : DEFAULT_RPCS).map((url) =>
      http(url, { timeout: 15_000, retryCount: 2, retryDelay: 600 })
    )
  ),
});

const LOG_CHUNK = BigInt(Number(process.env.BASEPAINT_LOG_CHUNK ?? 2000));
const LOG_CONCURRENCY = Number(process.env.BASEPAINT_LOG_CONCURRENCY ?? 3);
// Base produces a block every 2 seconds; used only to estimate block ranges.
const BLOCK_TIME = 2n;
const RANGE_PADDING = 150n;

export const basePaintAbi = parseAbi([
  'function today() view returns (uint256)',
  'function startedAt() view returns (uint256)',
  'function epochDuration() view returns (uint256)',
  'function canvases(uint256 day) view returns (uint256 totalContributions, uint256 totalRaised)',
  'function brushUsed(uint256 day, uint256 tokenId) view returns (uint256)',
  'function paint(uint256 day, uint256 tokenId, bytes pixels)',
]);

const brushAbi = parseAbi([
  'function strengths(uint256 tokenId) view returns (uint256)',
  'function ownerOf(uint256 tokenId) view returns (address)',
]);

const registryAbi = parseAbi([
  'struct Metadata { string name; uint24[] palette; uint96 size; address proposer; }',
  'function getMetadata(uint256 id) view returns (Metadata)',
]);

const paintedEvent = parseAbiItem(
  'event Painted(uint256 indexed day, uint256 tokenId, address author, bytes pixels)'
);

export interface PaintEvent {
  blockNumber: bigint;
  logIndex: number;
  tokenId: bigint;
  author: Address;
  pixels: Hex;
}

export interface DayMetadata {
  day: number;
  theme: string;
  palette: string[];
  size: number;
  proposer: string;
  source: 'chain' | 'api';
}

export interface EpochInfo {
  startedAt: bigint;
  epochDuration: bigint;
}

let epochCache: EpochInfo | null = null;

export const getEpoch = async (): Promise<EpochInfo> => {
  if (epochCache) return epochCache;
  const [startedAt, epochDuration] = await Promise.all([
    client.readContract({ address: BASEPAINT_ADDRESS, abi: basePaintAbi, functionName: 'startedAt' }),
    client.readContract({ address: BASEPAINT_ADDRESS, abi: basePaintAbi, functionName: 'epochDuration' }),
  ]);
  epochCache = { startedAt, epochDuration };
  return epochCache;
};

export const dayWindow = (day: number, epoch: EpochInfo) => {
  const start = epoch.startedAt + BigInt(day - 1) * epoch.epochDuration;
  return { start, end: start + epoch.epochDuration };
};

export const getToday = async (): Promise<number> => {
  const today = await client.readContract({
    address: BASEPAINT_ADDRESS,
    abi: basePaintAbi,
    functionName: 'today',
  });
  return Number(today);
};

export const getTotalContributions = async (day: number): Promise<number> => {
  const [total] = await client.readContract({
    address: BASEPAINT_ADDRESS,
    abi: basePaintAbi,
    functionName: 'canvases',
    args: [BigInt(day)],
  });
  return Number(total);
};

const metadataCache = new Map<number, DayMetadata>();

const toHexColor = (value: number) => `#${value.toString(16).padStart(6, '0')}`;

export const getDayMetadata = async (day: number): Promise<DayMetadata> => {
  const cached = metadataCache.get(day);
  if (cached) return cached;

  let metadata: DayMetadata | null = null;
  try {
    const raw = await client.readContract({
      address: METADATA_REGISTRY_ADDRESS,
      abi: registryAbi,
      functionName: 'getMetadata',
      args: [BigInt(day)],
    });
    if (raw.palette.length) {
      metadata = {
        day,
        theme: raw.name,
        palette: raw.palette.map((color) => toHexColor(Number(color))),
        size: Number(raw.size) || 256,
        proposer: raw.proposer,
        source: 'chain',
      };
    }
  } catch {
    // Fall through to the public API below.
  }

  if (!metadata) {
    const response = await fetch(`${BASEPAINT_API}/theme/${day}`);
    if (!response.ok) throw new Error(`No metadata for day ${day} (HTTP ${response.status})`);
    const json = (await response.json()) as { theme: string; palette: string[]; size: number; proposer: string };
    metadata = {
      day,
      theme: json.theme,
      palette: json.palette.map((color) => color.toLowerCase()),
      size: json.size || 256,
      proposer: json.proposer,
      source: 'api',
    };
  }

  metadataCache.set(day, metadata);
  return metadata;
};

// Finds a block number whose timestamp is close to `timestamp`, using the fixed
// 2s block time plus one correction step against a real block header.
const estimateBlock = async (
  timestamp: bigint,
  latest: { number: bigint; timestamp: bigint }
): Promise<bigint> => {
  if (timestamp >= latest.timestamp) return latest.number;
  let estimate = latest.number - (latest.timestamp - timestamp) / BLOCK_TIME;
  if (estimate <= 0n) return 0n;
  const probe = await client.getBlock({ blockNumber: estimate });
  estimate -= (probe.timestamp - timestamp) / BLOCK_TIME;
  return estimate < 0n ? 0n : estimate;
};

const getLogsRange = async (day: number, fromBlock: bigint, toBlock: bigint): Promise<PaintEvent[]> => {
  try {
    const logs = await client.getLogs({
      address: BASEPAINT_ADDRESS,
      event: paintedEvent,
      args: { day: BigInt(day) },
      fromBlock,
      toBlock,
    });
    return logs.map((log) => ({
      blockNumber: log.blockNumber,
      logIndex: log.logIndex,
      tokenId: log.args.tokenId!,
      author: log.args.author!,
      pixels: log.args.pixels!,
    }));
  } catch (error) {
    // Providers cap either the block span or the response size; split and retry.
    if (toBlock - fromBlock < 100n) throw error;
    const mid = (fromBlock + toBlock) / 2n;
    const left = await getLogsRange(day, fromBlock, mid);
    const right = await getLogsRange(day, mid + 1n, toBlock);
    return [...left, ...right];
  }
};

const scanLogs = async (day: number, fromBlock: bigint, toBlock: bigint): Promise<PaintEvent[]> => {
  const ranges: Array<[bigint, bigint]> = [];
  for (let start = fromBlock; start <= toBlock; start += LOG_CHUNK) {
    const end = start + LOG_CHUNK - 1n;
    ranges.push([start, end > toBlock ? toBlock : end]);
  }

  const results: PaintEvent[][] = new Array(ranges.length);
  let cursor = 0;
  const worker = async () => {
    while (cursor < ranges.length) {
      const index = cursor++;
      const [start, end] = ranges[index];
      results[index] = await getLogsRange(day, start, end);
    }
  };
  await Promise.all(Array.from({ length: Math.max(1, LOG_CONCURRENCY) }, worker));

  return results.flat().sort((a, b) =>
    a.blockNumber === b.blockNumber ? a.logIndex - b.logIndex : a.blockNumber < b.blockNumber ? -1 : 1
  );
};

interface DayLogState {
  events: PaintEvent[];
  scannedTo: bigint;
  final: boolean;
}

const logStates = new Map<number, DayLogState>();

export interface PaintEventsResult {
  events: PaintEvent[];
  scannedTo: bigint;
  final: boolean;
  newEvents: number;
}

/**
 * Returns every Painted event for `day`, in chain order. Painting is only
 * accepted while `day == today()`, so the scan is bounded to that day's time
 * window. Results are cached and later calls only scan new blocks.
 */
export const getPaintEvents = async (day: number): Promise<PaintEventsResult> => {
  const existing = logStates.get(day);
  if (existing?.final) return { ...existing, newEvents: 0 };

  const epoch = await getEpoch();
  const window = dayWindow(day, epoch);
  const latest = await client.getBlock();

  const fromBlock = existing
    ? existing.scannedTo + 1n
    : (await estimateBlock(window.start, latest)) - RANGE_PADDING;
  const dayOver = window.end + 60n < latest.timestamp;
  let toBlock = latest.number;
  if (dayOver) {
    const endEstimate = (await estimateBlock(window.end, latest)) + RANGE_PADDING;
    toBlock = endEstimate < latest.number ? endEstimate : latest.number;
  }

  const fresh = fromBlock <= toBlock ? await scanLogs(day, fromBlock < 0n ? 0n : fromBlock, toBlock) : [];
  const state: DayLogState = {
    events: existing ? [...existing.events, ...fresh] : fresh,
    scannedTo: toBlock,
    final: dayOver,
  };
  logStates.set(day, state);
  return { ...state, newEvents: fresh.length };
};

export interface BrushInfo {
  tokenId: number;
  owner: Address;
  strength: number;
  usedToday: number;
  remaining: number;
  day: number;
}

export const getBrushInfo = async (tokenId: number, day: number): Promise<BrushInfo> => {
  const id = BigInt(tokenId);
  const [owner, strength, used] = await Promise.all([
    client.readContract({ address: BRUSH_ADDRESS, abi: brushAbi, functionName: 'ownerOf', args: [id] }),
    client.readContract({ address: BRUSH_ADDRESS, abi: brushAbi, functionName: 'strengths', args: [id] }),
    client.readContract({
      address: BASEPAINT_ADDRESS,
      abi: basePaintAbi,
      functionName: 'brushUsed',
      args: [BigInt(day), id],
    }),
  ]);
  return {
    tokenId,
    owner,
    strength: Number(strength),
    usedToday: Number(used),
    remaining: Math.max(0, Number(strength) - Number(used)),
    day,
  };
};

export const encodePaintCalldata = (day: number, tokenId: number, pixels: Hex): Hex =>
  encodeFunctionData({
    abi: basePaintAbi,
    functionName: 'paint',
    args: [BigInt(day), BigInt(tokenId), pixels],
  });
