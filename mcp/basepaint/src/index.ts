#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { PNG } from 'pngjs';
import { z } from 'zod';
import { analyzeCanvas } from './analysis.ts';
import {
  buildAnimation,
  decodeSnapshot,
  describeMotion,
  encodeSnapshot,
  findConflicts,
  frameDelta,
  type AnimationInput,
  type AnimationOptions,
  type BuiltAnimation,
} from './animation.ts';
import { Canvas, clampRect, indexToChar, regionToAscii, type Rect } from './canvas.ts';
import {
  BASEPAINT_ADDRESS,
  BRUSH_ADDRESS,
  dayWindow,
  encodePaintCalldata,
  getBrushInfo,
  getDayMetadata,
  getEpoch,
  getTotalContributions,
} from './chain.ts';
import { applyProposal, buildProposal, encodeProposal, type ProposalInput, type ProposalOptions } from './proposal.ts';
import { autoScale, renderCanvas, renderFrameSheet } from './render.ts';
import { loadCanvas, resolveDay, type LoadedCanvas } from './source.ts';

// Runs from dist/src/, so the package root is two levels up.
const PROPOSALS_DIR =
  process.env.BASEPAINT_PROPOSALS_DIR ??
  path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'proposals');

// Pixelminter (the Next.js app in this repo) lists these proposals via /api/proposals
// and loads them as a layer, so the user can review and commit with their wallet.
const PIXELMINTER_URL = (process.env.PIXELMINTER_URL ?? 'http://localhost:3000').replace(/\/$/, '');

const server = new McpServer({ name: 'basepaint', version: '0.1.0' });

// ---------- shared schemas ----------

const daySchema = z.number().int().positive().optional().describe('BasePaint day number. Defaults to today (the only day that can still be painted).');
const sourceSchema = z
  .enum(['auto', 'chain', 'api'])
  .default('auto')
  .describe("'chain' replays Painted events (knows unpainted pixels and authors); 'api' uses the basepaint.xyz image; 'auto' tries chain first.");
const regionShape = {
  x: z.number().int().min(0).optional().describe('Left edge of the region (canvas px). Default 0.'),
  y: z.number().int().min(0).optional().describe('Top edge of the region (canvas px). Default 0.'),
  width: z.number().int().positive().optional().describe('Region width. Default: rest of the canvas.'),
  height: z.number().int().positive().optional().describe('Region height. Default: rest of the canvas.'),
};
const colorRef = z
  .union([z.number().int().min(0), z.string()])
  .describe("Palette index (0-based) or '#rrggbb', which is snapped to the nearest palette color.");
const proposalShape = {
  rects: z
    .array(
      z.object({
        x: z.number().int(),
        y: z.number().int(),
        width: z.number().int().positive(),
        height: z.number().int().positive(),
        color: colorRef,
        filled: z.boolean().optional().describe('false = outline only. Default true.'),
      })
    )
    .optional()
    .describe('Rectangles, applied first.'),
  lines: z
    .array(z.object({ x1: z.number().int(), y1: z.number().int(), x2: z.number().int(), y2: z.number().int(), color: colorRef }))
    .optional()
    .describe('1px Bresenham lines, applied after rects.'),
  ascii: z
    .array(
      z.object({
        x: z.number().int().describe('Canvas x of the first char of each row.'),
        y: z.number().int().describe('Canvas y of the first row.'),
        rows: z.array(z.string()).describe('One string per row, one char per pixel.'),
        legend: z
          .record(z.string(), z.union([colorRef, z.null()]))
          .optional()
          .describe("Char -> color. Without a legend, 0-9/a-z mean palette index and '.', ' ', '_' leave the pixel untouched."),
      })
    )
    .optional()
    .describe('Pixel-art sprites as text, applied after lines. Best format for detailed art.'),
  pixels: z
    .array(z.tuple([z.number().int(), z.number().int(), colorRef]))
    .optional()
    .describe('Individual [x, y, color] pixels, applied last.'),
};
const proposalOptionsShape = {
  onlyEmpty: z.boolean().default(false).describe("Never cover other people's pixels (drops those pixels from the proposal)."),
  backgroundColors: z
    .array(z.number().int().min(0))
    .default([])
    .describe('Palette indices that count as paintable background (for onlyEmpty and analysis), e.g. a flat base color.'),
};

// ---------- helpers ----------

const text = (value: string) => ({ type: 'text' as const, text: value });
const image = (buffer: Buffer) => ({ type: 'image' as const, data: buffer.toString('base64'), mimeType: 'image/png' });

const formatDuration = (seconds: number) => {
  if (seconds <= 0) return 'ended';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
};

const paletteLines = (palette: string[]) => palette.map((hex, i) => `  ${indexToChar(i)} = ${i} ${hex}`).join('\n');

const describeLoaded = (loaded: LoadedCanvas) => {
  const lines = [
    `Day ${loaded.day}${loaded.day === loaded.today ? ' (today, still paintable)' : ` (closed; today is ${loaded.today})`} — theme "${loaded.meta.theme}"`,
    `Source: ${loaded.source}${loaded.source === 'chain' ? `, ${loaded.eventCount} Painted events up to block ${loaded.scannedToBlock}` : ''}`,
  ];
  return lines.concat(loaded.warnings.map((w) => `Warning: ${w}`)).join('\n');
};

const withMargin = (size: number, rect: Rect, margin: number): Rect =>
  clampRect(size, {
    x: rect.x - margin,
    y: rect.y - margin,
    width: rect.width + margin * 2 + Math.min(0, rect.x - margin),
    height: rect.height + margin * 2 + Math.min(0, rect.y - margin),
  });

const errorResult = (error: unknown) => ({
  isError: true,
  content: [text(`Error: ${(error as Error).message ?? String(error)}`)],
});

interface StoredProposal {
  id: string;
  day: number;
  title?: string;
  input: ProposalInput;
  options: ProposalOptions;
  createdAt: string;
}

const proposals = new Map<string, StoredProposal>();

const saveProposal = async (proposal: StoredProposal) => {
  proposals.set(proposal.id, proposal);
  await mkdir(PROPOSALS_DIR, { recursive: true });
  await writeFile(path.join(PROPOSALS_DIR, `${proposal.id}.input.json`), JSON.stringify(proposal, null, 2));
};

const loadProposal = async (id: string): Promise<StoredProposal> => {
  const cached = proposals.get(id);
  if (cached) return cached;
  if (!/^[\w-]+$/.test(id)) throw new Error(`Invalid proposal id ${id}`);
  try {
    const stored = JSON.parse(await readFile(path.join(PROPOSALS_DIR, `${id}.input.json`), 'utf8')) as StoredProposal;
    proposals.set(id, stored);
    return stored;
  } catch {
    throw new Error(`Unknown proposal id ${id}`);
  }
};

/** Resolved pixels consumed by Pixelminter's AI Proposals panel. */
const writeResolvedProposal = async (
  stored: StoredProposal,
  loaded: LoadedCanvas,
  ops: Map<number, number>,
  stats: Record<string, unknown>
) => {
  const size = loaded.meta.size;
  const pixels = [...ops.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([index, color]) => [index % size, Math.floor(index / size), color]);
  await mkdir(PROPOSALS_DIR, { recursive: true });
  await writeFile(
    path.join(PROPOSALS_DIR, `${stored.id}.proposal.json`),
    JSON.stringify({
      id: stored.id,
      title: stored.title ?? null,
      day: loaded.day,
      theme: loaded.meta.theme,
      size,
      palette: loaded.meta.palette,
      kind: 'static',
      pixels,
      stats,
      createdAt: stored.createdAt,
      updatedAt: new Date().toISOString(),
    })
  );
  return `${PIXELMINTER_URL}/?proposal=${encodeURIComponent(stored.id)}`;
};


interface StoredAnimation {
  id: string;
  day: number;
  title?: string;
  input: AnimationInput;
  options: AnimationOptions;
  fps: number;
  size: number;
  /** Canvas palette indices before the animation existed, base64. Repairs restore these colors. */
  snapshot: string;
  snapshotBlock?: string;
  createdAt: string;
}

const animations = new Map<string, StoredAnimation>();

const animationPath = (id: string) => path.join(PROPOSALS_DIR, `${id}.animation.json`);

const saveAnimation = async (animation: StoredAnimation) => {
  animations.set(animation.id, animation);
  await mkdir(PROPOSALS_DIR, { recursive: true });
  await writeFile(animationPath(animation.id), JSON.stringify(animation));
};

const loadAnimation = async (id: string): Promise<StoredAnimation | null> => {
  const cached = animations.get(id);
  if (cached) return cached;
  if (!/^[\w-]+$/.test(id)) return null;
  try {
    const stored = JSON.parse(await readFile(animationPath(id), 'utf8')) as StoredAnimation;
    animations.set(id, stored);
    return stored;
  } catch {
    return null;
  }
};

const toTriplets = (pixels: Map<number, number>, size: number) =>
  [...pixels.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([index, color]) => [index % size, Math.floor(index / size), color]);

/** Frames for Pixelminter: each becomes one editor frame holding sprite + repair pixels. */
const writeResolvedAnimation = async (stored: StoredAnimation, loaded: LoadedCanvas, built: BuiltAnimation) => {
  await mkdir(PROPOSALS_DIR, { recursive: true });
  await writeFile(
    path.join(PROPOSALS_DIR, `${stored.id}.proposal.json`),
    JSON.stringify({
      id: stored.id,
      title: stored.title ?? null,
      day: stored.day,
      theme: loaded.meta.theme,
      size: stored.size,
      palette: loaded.meta.palette,
      kind: 'animation',
      fps: stored.fps,
      repair: stored.options.repair,
      frames: built.frames.map((frame) => ({
        pixels: toTriplets(frame.pixels, stored.size),
        spritePixels: frame.spritePixels,
        repairPixels: frame.repairPixels,
      })),
      stats: {
        frames: built.frames.length,
        footprint: built.footprint.size,
        sequentialDelta: built.frames.reduce((sum, frame) => sum + frame.sequentialDelta, 0),
        loopDelta: built.loopDelta,
      },
      createdAt: stored.createdAt,
      updatedAt: new Date().toISOString(),
    })
  );
  return `${PIXELMINTER_URL}/?proposal=${encodeURIComponent(stored.id)}`;
};

const proposalPng = (size: number, palette: string[], ops: Map<number, number>) => {
  const png = new PNG({ width: size, height: size });
  for (const [index, color] of ops) {
    const hex = palette[color].replace('#', '');
    const i = index << 2;
    png.data[i] = parseInt(hex.slice(0, 2), 16);
    png.data[i + 1] = parseInt(hex.slice(2, 4), 16);
    png.data[i + 2] = parseInt(hex.slice(4, 6), 16);
    png.data[i + 3] = 255;
  }
  return PNG.sync.write(png);
};

/**
 * Encodes an animation for sequential onchain painting. Frames are rebuilt from
 * the stored snapshot, then each frame's payload is only the pixels that differ
 * from the canvas state left by the previous frame (starting from the live canvas).
 */
const encodeAnimation = async (
  stored: StoredAnimation,
  opts: { brushTokenId?: number; maxPixelsPerTx: number; inlineHex: boolean; startFrame: number; frameCount?: number }
) => {
  const loaded = await loadCanvas(stored.day, 'chain');
  const snapshot = decodeSnapshot(stored.size, stored.snapshot);
  const built = buildAnimation(snapshot, loaded.meta.palette, stored.input, stored.options);
  const conflicts = findConflicts(snapshot, loaded.canvas, built);
  const notes: string[] = [...built.warnings];
  if (loaded.day !== loaded.today) {
    notes.push(`Day ${loaded.day} is closed (today is ${loaded.today}); paint() would revert with "Invalid day".`);
  }
  if (conflicts.length) {
    notes.push(`${conflicts.length} footprint px were changed by someone else since the snapshot; repairs will overwrite them.`);
  }

  const end = Math.min(built.frames.length, opts.startFrame + (opts.frameCount ?? built.frames.length));
  if (opts.startFrame >= end) throw new Error(`startFrame ${opts.startFrame} is past the last frame (${built.frames.length - 1}).`);

  const state = loaded.canvas.pixels.slice();
  const frames = [];
  for (let k = opts.startFrame; k < end; k++) {
    const delta = frameDelta(built.frames[k], state);
    delta.forEach((color, index) => { state[index] = color; });
    const chunks = encodeProposal(delta, stored.size, opts.maxPixelsPerTx);
    frames.push({
      frame: k,
      pixelCount: delta.size,
      transactions: chunks.map((hex) => ({
        pixelCount: (hex.length - 2) / 6,
        pixels: hex,
        ...(opts.brushTokenId !== undefined
          ? { to: BASEPAINT_ADDRESS, data: encodePaintCalldata(loaded.day, opts.brushTokenId, hex) }
          : {}),
      })),
    });
  }
  const total = frames.reduce((sum, frame) => sum + frame.pixelCount, 0);

  let brush: Awaited<ReturnType<typeof getBrushInfo>> | null = null;
  if (opts.brushTokenId !== undefined) {
    brush = await getBrushInfo(opts.brushTokenId, loaded.day);
    if (total > brush.remaining) {
      let budget = brush.remaining;
      let fit = 0;
      for (const frame of frames) {
        if (frame.pixelCount > budget) break;
        budget -= frame.pixelCount;
        fit++;
      }
      notes.push(`Brush #${brush.tokenId} has ${brush.remaining} px left today: enough for the first ${fit} of ${frames.length} frames.`);
    }
  }

  await mkdir(PROPOSALS_DIR, { recursive: true });
  const jsonPath = path.join(PROPOSALS_DIR, `${stored.id}.encoded.json`);
  await writeFile(
    jsonPath,
    JSON.stringify(
      {
        id: stored.id,
        kind: 'animation',
        title: stored.title,
        day: loaded.day,
        theme: loaded.meta.theme,
        palette: loaded.meta.palette,
        contract: BASEPAINT_ADDRESS,
        function: 'paint(uint256 day, uint256 tokenId, bytes pixels)',
        order: 'Send frames in order; each frame restores what the previous one covered.',
        brush,
        frames,
        encodedAt: new Date().toISOString(),
        validatedAgainstBlock: loaded.scannedToBlock?.toString(),
      },
      null,
      2
    )
  );
  const link = await writeResolvedAnimation(stored, loaded, built);

  const output = [
    `Animation ${stored.id} for day ${loaded.day} ("${loaded.meta.theme}") validated against block ${loaded.scannedToBlock}.`,
    `Frames ${opts.startFrame}..${end - 1}: ${total} px to paint in order, starting from the current canvas.`,
    ...frames.map((frame) => `  frame #${frame.frame}: ${frame.pixelCount} px in ${frame.transactions.length} tx`),
    brush
      ? `Brush #${brush.tokenId}: owner ${brush.owner}, strength ${brush.strength}, used today ${brush.usedToday}, remaining ${brush.remaining}.`
      : 'No brushTokenId given: only the pixels payloads were encoded.',
    ...notes.map((n) => `Note: ${n}`),
    `Saved: ${jsonPath}`,
    `Review in Pixelminter: ${link}`,
    'Nothing was signed or sent. Each frame is a separate paint() call from the brush owner wallet, in order.',
  ];
  if (opts.inlineHex || total <= 400) {
    frames.forEach((frame) =>
      frame.transactions.forEach((tx, i) => {
        output.push(`\nFrame ${frame.frame} tx ${i + 1} (${tx.pixelCount} px) pixels: ${tx.pixels}`);
        if ('data' in tx) output.push(`calldata: ${tx.data}`);
      })
    );
  }
  return { content: [text(output.join('\n'))] };
};

// ---------- tools ----------

server.registerTool(
  'basepaint_status',
  {
    title: 'BasePaint day status',
    description:
      'Current BasePaint day: theme, palette (with the one-char legend used by the other tools), canvas size, pixels painted and time left. Call this first.',
    inputSchema: { day: daySchema },
    annotations: { readOnlyHint: true, openWorldHint: true },
  },
  async ({ day }) => {
    try {
      const resolved = await resolveDay(day);
      const [meta, epoch, painted] = await Promise.all([
        getDayMetadata(resolved.day),
        getEpoch(),
        getTotalContributions(resolved.day),
      ]);
      const window = dayWindow(resolved.day, epoch);
      const now = Math.floor(Date.now() / 1000);
      const iso = (value: bigint) => new Date(Number(value) * 1000).toISOString();
      return {
        content: [
          text(
            [
              `Day ${resolved.day}${resolved.day === resolved.today ? ' (today)' : ` (closed; today is ${resolved.today})`}`,
              `Theme: "${meta.theme}" (proposed by ${meta.proposer})`,
              `Canvas: ${meta.size}x${meta.size}`,
              `Pixels painted (contract counter, includes overpaints): ${painted}`,
              `Window: ${iso(window.start)} -> ${iso(window.end)} (time left: ${formatDuration(Number(window.end) - now)})`,
              `Palette (${meta.palette.length} colors; char = index):`,
              paletteLines(meta.palette),
              `Contracts: BasePaint ${BASEPAINT_ADDRESS}, Brush ${BRUSH_ADDRESS}`,
            ].join('\n')
          ),
        ],
      };
    } catch (error) {
      return errorResult(error);
    }
  }
);

server.registerTool(
  'basepaint_get_canvas',
  {
    title: 'Render BasePaint canvas',
    description:
      'Renders the canvas (or a region) as a PNG with coordinate labels and a grid. Unpainted pixels show as a gray checker pattern. Use it to see the composition; use basepaint_get_region_pixels for exact pixels.',
    inputSchema: {
      day: daySchema,
      ...regionShape,
      scale: z.number().int().min(1).max(24).optional().describe('Screen px per canvas px. Default: fit ~1024px.'),
      grid: z.number().int().min(0).max(128).default(16).describe('Grid line spacing in canvas px (0 = none). Every 4th line is stronger.'),
      emptyStyle: z.enum(['checker', 'palette0', 'transparent']).default('checker'),
      labels: z.boolean().default(true).describe('Draw x/y coordinate labels in a margin.'),
      source: sourceSchema,
    },
    annotations: { readOnlyHint: true, openWorldHint: true },
  },
  async ({ day, x, y, width, height, scale, grid, emptyStyle, labels, source }) => {
    try {
      const loaded = await loadCanvas(day, source);
      const rect = clampRect(loaded.meta.size, { x, y, width, height });
      const finalScale = scale ?? autoScale(rect);
      const png = renderCanvas(loaded.canvas, { rect, scale: finalScale, palette: loaded.meta.palette, emptyStyle, grid, labels });
      const filled = loaded.canvas.countFilled(rect);
      return {
        content: [
          text(
            `${describeLoaded(loaded)}\nRegion x=${rect.x} y=${rect.y} ${rect.width}x${rect.height}, scale ${finalScale}, grid ${grid}px. ` +
              `Painted ${filled}/${rect.width * rect.height} px.`
          ),
          image(png),
        ],
      };
    } catch (error) {
      return errorResult(error);
    }
  }
);

server.registerTool(
  'basepaint_get_region_pixels',
  {
    title: 'Read exact region pixels',
    description:
      "Returns a region as text: one char per pixel (palette index in base 36, '.' = unpainted), with x ruler and y labels. Use this before continuing someone's work so lines and colors line up exactly.",
    inputSchema: {
      day: daySchema,
      x: z.number().int().min(0),
      y: z.number().int().min(0),
      width: z.number().int().min(1).max(128),
      height: z.number().int().min(1).max(128),
      source: sourceSchema,
    },
    annotations: { readOnlyHint: true, openWorldHint: true },
  },
  async ({ day, x, y, width, height, source }) => {
    try {
      const loaded = await loadCanvas(day, source);
      const rect = clampRect(loaded.meta.size, { x, y, width, height });
      return {
        content: [
          text(
            `${describeLoaded(loaded)}\nPalette:\n${paletteLines(loaded.meta.palette)}\n\n` +
              `Region x=${rect.x}..${rect.x + rect.width - 1} y=${rect.y}..${rect.y + rect.height - 1} (x ruler is 3 rows: hundreds/tens/ones):\n` +
              regionToAscii(loaded.canvas, rect)
          ),
        ],
      };
    } catch (error) {
      return errorResult(error);
    }
  }
);

server.registerTool(
  'basepaint_analyze',
  {
    title: 'Analyze canvas',
    description:
      'Finds where to paint: density heatmap, sparse regions (sketches or unfinished work), largest open rectangles, color usage and top contributors.',
    inputSchema: {
      day: daySchema,
      ...regionShape,
      tileSize: z.number().int().min(2).max(64).default(8),
      sparseThreshold: z.number().min(0.01).max(0.95).default(0.35),
      windowSize: z.number().int().min(8).max(128).default(32).describe('Size of the windows used to rank unfinished areas.'),
      maxResults: z.number().int().min(1).max(30).default(8),
      minRectSide: z.number().int().min(1).max(128).default(6),
      backgroundColors: proposalOptionsShape.backgroundColors,
      source: sourceSchema,
    },
    annotations: { readOnlyHint: true, openWorldHint: true },
  },
  async ({ day, x, y, width, height, tileSize, sparseThreshold, windowSize, maxResults, minRectSide, backgroundColors, source }) => {
    try {
      const loaded = await loadCanvas(day, source);
      const rect = clampRect(loaded.meta.size, { x, y, width, height });
      const result = analyzeCanvas(loaded.canvas, loaded.meta.palette, {
        rect,
        tileSize,
        sparseThreshold,
        windowSize,
        maxResults,
        minRectSide,
        backgroundColors,
      });
      return { content: [text(`${describeLoaded(loaded)}\n\n${result.text}`)] };
    } catch (error) {
      return errorResult(error);
    }
  }
);

server.registerTool(
  'basepaint_preview_proposal',
  {
    title: 'Preview a pixel-art proposal',
    description:
      'Composites a proposal (rects, lines, ASCII sprites, pixels) onto the current canvas without painting anything. Returns stats, a proposalId, and before/after crops. Iterate until it looks right, then call basepaint_encode_proposal.',
    inputSchema: {
      day: daySchema,
      title: z.string().max(80).optional().describe('Short name for the proposal.'),
      replaceId: z.string().optional().describe('Reuse an existing proposalId instead of creating a new one.'),
      ...proposalShape,
      ...proposalOptionsShape,
      margin: z.number().int().min(0).max(128).default(12).describe('Context pixels around the proposal in the crops.'),
      scale: z.number().int().min(1).max(24).optional(),
      showFullCanvas: z.boolean().default(false).describe('Also return the whole canvas with the proposal applied.'),
      source: sourceSchema,
    },
    annotations: { readOnlyHint: true, openWorldHint: true },
  },
  async ({ day, title, replaceId, rects, lines, ascii, pixels, onlyEmpty, backgroundColors, margin, scale, showFullCanvas, source }) => {
    try {
      const loaded = await loadCanvas(day, source);
      const input: ProposalInput = { rects, lines, ascii, pixels };
      const options: ProposalOptions = { onlyEmpty, backgroundColors };
      const built = buildProposal(loaded.canvas, loaded.meta.palette, input, options);
      const id = replaceId ?? `d${loaded.day}-${Date.now().toString(36)}`;
      const stored: StoredProposal = { id, day: loaded.day, title, input, options, createdAt: new Date().toISOString() };
      await saveProposal(stored);
      const link = await writeResolvedProposal(stored, loaded, built.ops, { ...built.stats });

      const { stats } = built;
      const summary = [
        describeLoaded(loaded),
        `proposalId: ${id}${title ? ` ("${title}")` : ''}`,
        `Pixels to paint: ${stats.final} (on empty: ${stats.onEmpty}, overwriting others: ${stats.overwrites})`,
        `Dropped: ${stats.unchanged} already that color, ${stats.skippedPainted} protected by onlyEmpty, ${stats.outOfBounds} out of bounds, ${stats.invalid} invalid color`,
        `Colors: ${Object.entries(stats.colors).map(([c, n]) => `${indexToChar(Number(c))}:${n}`).join(' ') || 'none'}`,
        built.bbox ? `Bounding box: x=${built.bbox.x} y=${built.bbox.y} ${built.bbox.width}x${built.bbox.height}` : 'Nothing would change.',
        ...built.warnings.map((w) => `Warning: ${w}`),
      ];
      if (loaded.day !== loaded.today) summary.push(`Note: day ${loaded.day} is closed; only today (${loaded.today}) can be painted.`);
      if (built.bbox) summary.push(`Review and commit in Pixelminter: ${link} (loads as a layer; "AI Proposals" panel)`);

      const content: Array<ReturnType<typeof text> | ReturnType<typeof image>> = [text(summary.join('\n'))];
      if (built.bbox) {
        const after = applyProposal(loaded.canvas, built.ops);
        const rect = withMargin(loaded.meta.size, built.bbox, margin);
        const cropScale = scale ?? autoScale(rect, 640);
        const render = (canvas: Canvas) =>
          renderCanvas(canvas, { rect, scale: cropScale, palette: loaded.meta.palette, grid: 8 });
        content.push(text(`Before (x=${rect.x} y=${rect.y} ${rect.width}x${rect.height}, scale ${cropScale}):`), image(render(loaded.canvas)));
        content.push(text('After:'), image(render(after)));
        if (showFullCanvas) {
          const full = clampRect(loaded.meta.size, {});
          content.push(
            text('Full canvas with proposal:'),
            image(renderCanvas(after, { rect: full, scale: autoScale(full, 768), palette: loaded.meta.palette, grid: 32 }))
          );
        }
      }
      return { content };
    } catch (error) {
      return errorResult(error);
    }
  }
);

const spriteSchema = z.object({
  rows: z.array(z.string()).describe("One string per row; chars as in ascii proposals ('.' = transparent)."),
  legend: z.record(z.string(), z.union([colorRef, z.null()])).optional(),
});
const frameSchema = z.object({
  sprites: z
    .array(
      z.object({
        sprite: z.string().describe('Name of a sprite in `sprites`.'),
        x: z.number().int(),
        y: z.number().int(),
        flipX: z.boolean().optional(),
        flipY: z.boolean().optional(),
      })
    )
    .optional()
    .describe('Sprite stamps for this frame (applied before rects/lines/ascii/pixels of the frame).'),
  ...proposalShape,
  hold: z.number().int().min(1).max(30).optional().describe('Repeat this frame N times.'),
});

server.registerTool(
  'basepaint_preview_animation',
  {
    title: 'Preview a frame-by-frame animation',
    description:
      'Builds a looping pixel animation over the current canvas. Draw sprites facing their direction of travel (or set flipX/flipY); the reply lists each sprite\'s motion to check. A snapshot of the canvas is taken the first time (reused with replaceId), and every frame automatically repairs the pixels the previous frame covered back to their snapshot colors, so painting frames in order never leaves trails. Returns per-frame stats, a contact sheet, and a Pixelminter link that loads each frame into the editor for GIF minting or frame-by-frame commits.',
    inputSchema: {
      day: daySchema,
      title: z.string().max(80).optional(),
      replaceId: z.string().optional().describe('Revise an existing animation id; keeps its original background snapshot.'),
      sprites: z.record(z.string(), spriteSchema).optional().describe('Reusable named sprites.'),
      frames: z.array(frameSchema).min(1).max(120),
      fps: z.number().int().min(1).max(30).default(8),
      loop: z.boolean().default(true).describe('Frame 0 repairs what the last frame covered, so the animation repeats cleanly.'),
      repair: z
        .enum(['previous', 'footprint'])
        .default('previous')
        .describe("'previous' restores what the previous frame covered (smallest frames); 'footprint' restores every pixel the animation ever covers (self-contained frames)."),
      emptyRepair: z
        .enum(['palette0', 'skip'])
        .default('palette0')
        .describe('Unpainted pixels cannot be un-painted onchain: restore them with palette color 0 (how BasePaint shows empty pixels) or leave them.'),
      onlyEmpty: z.boolean().default(false).describe("Sprites never cover other people's pixels."),
      backgroundColors: proposalOptionsShape.backgroundColors,
      refreshBackground: z.boolean().default(false).describe('With replaceId: retake the snapshot from the current canvas. Avoid after committing frames, or the committed sprite becomes "background".'),
      margin: z.number().int().min(0).max(64).default(6),
      columns: z.number().int().min(1).max(8).default(4),
      source: sourceSchema,
    },
    annotations: { readOnlyHint: true, openWorldHint: true },
  },
  async ({ day, title, replaceId, sprites, frames, fps, loop, repair, emptyRepair, onlyEmpty, backgroundColors, refreshBackground, margin, columns, source }) => {
    try {
      const previous = replaceId ? await loadAnimation(replaceId) : null;
      const loaded = await loadCanvas(previous?.day ?? day, source);
      const reuseSnapshot = previous && !refreshBackground && previous.size === loaded.meta.size;
      const snapshot = reuseSnapshot ? decodeSnapshot(previous.size, previous.snapshot) : loaded.canvas.clone();

      const input: AnimationInput = { sprites, frames };
      const options: AnimationOptions = { onlyEmpty, backgroundColors, loop, repair, emptyRepair };
      const built = buildAnimation(snapshot, loaded.meta.palette, input, options);
      const conflicts = reuseSnapshot ? findConflicts(snapshot, loaded.canvas, built) : [];

      const stored: StoredAnimation = {
        id: replaceId ?? `a${loaded.day}-${Date.now().toString(36)}`,
        day: loaded.day,
        title,
        input,
        options,
        fps,
        size: loaded.meta.size,
        snapshot: reuseSnapshot ? previous.snapshot : encodeSnapshot(snapshot),
        snapshotBlock: reuseSnapshot ? previous.snapshotBlock : loaded.scannedToBlock?.toString(),
        createdAt: previous?.createdAt ?? new Date().toISOString(),
      };
      await saveAnimation(stored);
      const link = await writeResolvedAnimation(stored, loaded, built);

      const totalFramePixels = built.frames.reduce((sum, frame) => sum + frame.pixels.size, 0);
      const totalDelta = built.frames.reduce((sum, frame) => sum + frame.sequentialDelta, 0);
      const summary = [
        describeLoaded(loaded),
        `animationId: ${stored.id}${title ? ` ("${title}")` : ''} — ${built.frames.length} frames @ ${fps} fps, repair '${repair}'${loop ? ', loop' : ''}`,
        `Background snapshot: ${reuseSnapshot ? 'reused from the original preview' : 'taken now'}${stored.snapshotBlock ? ` (block ${stored.snapshotBlock})` : ''}`,
        built.bbox
          ? `Footprint: ${built.footprint.size} px in x=${built.bbox.x} y=${built.bbox.y} ${built.bbox.width}x${built.bbox.height}`
          : 'Footprint: empty (nothing to animate).',
        ...(() => {
          const motion = describeMotion(input);
          return motion.length
            ? ['Sprite motion (check each sprite faces the way it moves; use flipX/flipY if not):', ...motion.map((m) => `  ${m}`)]
            : [];
        })(),
        'Frame: sprite px + repair px = frame px | px that change when painted in order',
        ...built.frames.map(
          (frame, k) => `  #${k}: ${frame.spritePixels} + ${frame.repairPixels} = ${frame.pixels.size} | ${frame.sequentialDelta}`
        ),
        loop ? `Loop: frame 0 after the last frame changes ${built.loopDelta} px.` : '',
        `Brush cost: committing every frame from Pixelminter = ${totalFramePixels} px; painting only the changes in order (basepaint_encode_proposal) = ${totalDelta} px for one pass.`,
        onlyEmpty ? `onlyEmpty dropped ${built.skippedPainted} sprite px.` : '',
        conflicts.length
          ? `Warning: ${conflicts.length} footprint px were changed by someone else since the snapshot; repairs would overwrite them. Move the animation or use refreshBackground.`
          : '',
        ...built.warnings.map((w) => `Warning: ${w}`),
        loaded.day !== loaded.today ? `Note: day ${loaded.day} is closed; only today (${loaded.today}) can be painted.` : '',
        built.bbox ? `Open in Pixelminter (one editor frame per animation frame, ready for GIF mint or per-frame commit): ${link}` : '',
      ].filter(Boolean);

      const content: Array<ReturnType<typeof text> | ReturnType<typeof image>> = [text(summary.join('\n'))];
      if (built.bbox) {
        const rect = withMargin(loaded.meta.size, built.bbox, margin);
        const shown = built.frames.slice(0, 24);
        const cols = Math.min(columns, shown.length);
        const cellScale = autoScale(rect, Math.floor(1400 / cols) - 40, 16);
        const cells = shown.map((frame) =>
          // Empty pixels drawn as palette 0, the way BasePaint shows them, so repairs look like background.
          renderCanvas(applyProposal(snapshot, frame.pixels), {
            rect,
            scale: cellScale,
            palette: loaded.meta.palette,
            grid: 8,
            emptyStyle: 'palette0',
          })
        );
        content.push(
          text(
            `Contact sheet: each frame over the background snapshot, unpainted pixels shown as palette 0 like BasePaint (x=${rect.x} y=${rect.y} ${rect.width}x${rect.height}, scale ${cellScale})` +
              (built.frames.length > shown.length ? `; showing the first ${shown.length} of ${built.frames.length} frames.` : '.')
          ),
          image(renderFrameSheet(cells, cols))
        );
      }
      return { content };
    } catch (error) {
      return errorResult(error);
    }
  }
);

server.registerTool(
  'basepaint_encode_proposal',
  {
    title: 'Encode proposal for painting',
    description:
      'Re-validates a proposal against the latest canvas and encodes it as BasePaint paint(day, tokenId, pixels) payloads, split into transactions. Writes a JSON (and a transparent PNG) to the proposals folder. Does not sign or send anything.',
    inputSchema: {
      proposalId: z.string().optional().describe('Id returned by basepaint_preview_proposal.'),
      day: daySchema,
      ...proposalShape,
      onlyEmpty: z.boolean().optional().describe('Override the stored proposal option.'),
      backgroundColors: z.array(z.number().int().min(0)).optional().describe('Override the stored proposal option.'),
      brushTokenId: z.number().int().min(0).optional().describe('BasePaint Brush token id: checks remaining strength and builds full calldata.'),
      maxPixelsPerTx: z.number().int().min(1).max(20000).default(5000),
      inlineHex: z.boolean().default(false).describe('Include the pixel hex in the reply even when large.'),
      startFrame: z.number().int().min(0).default(0).describe('Animations only: first frame to encode (e.g. after painting earlier frames).'),
      frameCount: z.number().int().min(1).optional().describe('Animations only: how many frames to encode (default: through the last frame).'),
    },
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true },
  },
  async ({ proposalId, day, rects, lines, ascii, pixels, onlyEmpty, backgroundColors, brushTokenId, maxPixelsPerTx, inlineHex, startFrame, frameCount }) => {
    try {
      const animation = proposalId ? await loadAnimation(proposalId) : null;
      if (animation) {
        return await encodeAnimation(animation, { brushTokenId, maxPixelsPerTx, inlineHex, startFrame, frameCount });
      }
      let stored: StoredProposal;
      if (proposalId) {
        stored = await loadProposal(proposalId);
      } else {
        if (!rects && !lines && !ascii && !pixels) throw new Error('Pass a proposalId or proposal content.');
        const resolved = await resolveDay(day);
        stored = {
          id: `d${resolved.day}-${Date.now().toString(36)}`,
          day: resolved.day,
          input: { rects, lines, ascii, pixels },
          options: { onlyEmpty: false, backgroundColors: [] },
          createdAt: new Date().toISOString(),
        };
      }
      const options: ProposalOptions = {
        onlyEmpty: onlyEmpty ?? stored.options.onlyEmpty,
        backgroundColors: backgroundColors ?? stored.options.backgroundColors,
      };

      // Always rebuild against the freshest canvas: others may have painted since the preview.
      const loaded = await loadCanvas(stored.day, 'chain');
      const built = buildProposal(loaded.canvas, loaded.meta.palette, stored.input, options);
      const notes: string[] = [...built.warnings];
      if (loaded.day !== loaded.today) {
        notes.push(`Day ${loaded.day} is closed (today is ${loaded.today}); paint() would revert with "Invalid day".`);
      }

      let ops = built.ops;
      let brush: Awaited<ReturnType<typeof getBrushInfo>> | null = null;
      if (brushTokenId !== undefined) {
        brush = await getBrushInfo(brushTokenId, loaded.day);
        if (ops.size > brush.remaining) {
          notes.push(`Brush #${brushTokenId} has ${brush.remaining} px left today; keeping the first ${brush.remaining} px (top to bottom).`);
          ops = new Map([...ops.entries()].sort((a, b) => a[0] - b[0]).slice(0, brush.remaining));
        }
      }

      const chunks = encodeProposal(ops, loaded.meta.size, maxPixelsPerTx);
      const transactions = chunks.map((hex) => ({
        pixelCount: (hex.length - 2) / 6,
        pixels: hex,
        ...(brushTokenId !== undefined ? { to: BASEPAINT_ADDRESS, data: encodePaintCalldata(loaded.day, brushTokenId, hex) } : {}),
      }));

      await mkdir(PROPOSALS_DIR, { recursive: true });
      const jsonPath = path.join(PROPOSALS_DIR, `${stored.id}.encoded.json`);
      const pngPath = path.join(PROPOSALS_DIR, `${stored.id}.png`);
      await writeFile(
        jsonPath,
        JSON.stringify(
          {
            id: stored.id,
            title: stored.title,
            day: loaded.day,
            theme: loaded.meta.theme,
            palette: loaded.meta.palette,
            contract: BASEPAINT_ADDRESS,
            function: 'paint(uint256 day, uint256 tokenId, bytes pixels)',
            brush,
            stats: { ...built.stats, encoded: ops.size },
            transactions,
            encodedAt: new Date().toISOString(),
            validatedAgainstBlock: loaded.scannedToBlock?.toString(),
          },
          null,
          2
        )
      );
      await writeFile(pngPath, proposalPng(loaded.meta.size, loaded.meta.palette, ops));
      const link = await writeResolvedProposal(stored, loaded, ops, { ...built.stats, encoded: ops.size });

      const output = [
        `Proposal ${stored.id} for day ${loaded.day} ("${loaded.meta.theme}") validated against block ${loaded.scannedToBlock}.`,
        `Encoded ${ops.size} px (on empty: ${built.stats.onEmpty}, overwriting: ${built.stats.overwrites}) in ${transactions.length} transaction(s).`,
        brush
          ? `Brush #${brush.tokenId}: owner ${brush.owner}, strength ${brush.strength}, used today ${brush.usedToday}, remaining ${brush.remaining}.`
          : 'No brushTokenId given: only the pixels payload was encoded (call paint(day, tokenId, pixels) with your brush).',
        ...notes.map((n) => `Note: ${n}`),
        `Saved: ${jsonPath}`,
        `Saved overlay PNG (${loaded.meta.size}x${loaded.meta.size}, transparent): ${pngPath}`,
        `Review and commit in Pixelminter: ${link}`,
        'Nothing was signed or sent. Submit the transaction(s) from the brush owner wallet.',
      ];
      const showHex = inlineHex || ops.size <= 400;
      if (showHex) {
        transactions.forEach((tx, i) => {
          output.push(`\nTx ${i + 1} (${tx.pixelCount} px) pixels: ${tx.pixels}`);
          if ('data' in tx) output.push(`calldata: ${tx.data}`);
        });
      }
      return { content: [text(output.join('\n'))] };
    } catch (error) {
      return errorResult(error);
    }
  }
);

server.registerTool(
  'basepaint_brush_info',
  {
    title: 'Brush strength',
    description: 'Owner, strength (pixels per day) and pixels already used today for a BasePaint Brush token.',
    inputSchema: { tokenId: z.number().int().min(0), day: daySchema },
    annotations: { readOnlyHint: true, openWorldHint: true },
  },
  async ({ tokenId, day }) => {
    try {
      const resolved = await resolveDay(day);
      const info = await getBrushInfo(tokenId, resolved.day);
      return {
        content: [
          text(`Brush #${info.tokenId} owner ${info.owner}\nStrength ${info.strength} px/day, used on day ${info.day}: ${info.usedToday}, remaining: ${info.remaining}`),
        ],
      };
    } catch (error) {
      return errorResult(error);
    }
  }
);

server.registerPrompt(
  'basepaint_contribute',
  {
    title: 'Contribute to today\'s BasePaint',
    description: 'Guided workflow: inspect the daily canvas, pick a spot, draft pixel art and encode it.',
    argsSchema: {
      goal: z.string().optional().describe('What to do, e.g. "finish the sketched ship hull" or "add a small fish in an empty area".'),
      maxPixels: z.string().optional().describe('Pixel budget (e.g. your brush strength).'),
    },
  },
  ({ goal, maxPixels }) => ({
    messages: [
      {
        role: 'user',
        content: {
          type: 'text',
          text: [
            `Help me contribute to today's BasePaint canvas.${goal ? ` Goal: ${goal}.` : ' Pick the most valuable contribution: finishing an unfinished/sketched area first, otherwise a small theme-appropriate piece in open space.'}`,
            maxPixels ? `Pixel budget: ${maxPixels}.` : '',
            '1. basepaint_status for theme, palette and time left.',
            '2. basepaint_get_canvas (whole canvas) to understand the composition and style.',
            '3. basepaint_analyze to find sparse regions (sketches, half-finished work) and open rectangles.',
            '4. Zoom in: basepaint_get_canvas on the target region, then basepaint_get_region_pixels for exact pixels.',
            '   For motion, use basepaint_preview_animation: define sprites once, place them per frame; repairs of covered background are automatic.',
            "5. Draft in the canvas's existing style (outline colors, shading ramps, pixel density) using only the palette. Prefer ASCII sprites.",
            '6. basepaint_preview_proposal and iterate on the result; avoid covering others\' finished work (use onlyEmpty unless you are completing a sketch).',
            '7. Give me the Pixelminter link from the preview so I can review it as a layer and commit with my wallet (or use basepaint_encode_proposal for raw calldata). Never claim anything was painted: I sign the transaction myself.',
          ]
            .filter(Boolean)
            .join('\n'),
        },
      },
    ],
  })
);

const transport = new StdioServerTransport();
await server.connect(transport);
console.error(`basepaint MCP server ready (proposals dir: ${PROPOSALS_DIR})`);
