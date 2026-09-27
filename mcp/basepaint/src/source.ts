import { PNG } from 'pngjs';
import { Canvas, nearestPaletteIndex } from './canvas.ts';
import { BASEPAINT_API, getDayMetadata, getPaintEvents, getToday, type DayMetadata } from './chain.ts';

export type CanvasSource = 'auto' | 'chain' | 'api';

export interface LoadedCanvas {
  day: number;
  today: number;
  meta: DayMetadata;
  canvas: Canvas;
  source: 'chain' | 'api';
  eventCount: number;
  scannedToBlock?: bigint;
  warnings: string[];
}

interface ChainCanvasState {
  canvas: Canvas;
  appliedEvents: number;
}

const chainCanvases = new Map<number, ChainCanvasState>();

const loadFromChain = async (day: number, meta: DayMetadata) => {
  const { events, scannedTo } = await getPaintEvents(day);
  let state = chainCanvases.get(day);
  if (!state) {
    state = { canvas: new Canvas(meta.size), appliedEvents: 0 };
    chainCanvases.set(day, state);
  }
  // Events are append-only, so only replay the ones not applied yet.
  for (let i = state.appliedEvents; i < events.length; i++) {
    state.canvas.applyPixelBytes(events[i].pixels, events[i].author);
  }
  state.appliedEvents = events.length;
  return { canvas: state.canvas, eventCount: events.length, scannedTo };
};

const loadFromApi = async (day: number, meta: DayMetadata): Promise<Canvas> => {
  const response = await fetch(`${BASEPAINT_API}/art/image?day=${day}&scale=1&t=${Date.now()}`);
  if (!response.ok) throw new Error(`basepaint.xyz image request failed (HTTP ${response.status})`);
  const png = PNG.sync.read(Buffer.from(await response.arrayBuffer()));
  const canvas = new Canvas(meta.size);
  const scale = Math.max(1, Math.round(png.width / meta.size));
  const exact = new Map(meta.palette.map((hex, index) => [hex.toLowerCase(), index]));
  for (let y = 0; y < meta.size; y++) {
    for (let x = 0; x < meta.size; x++) {
      const i = ((y * scale) * png.width + x * scale) << 2;
      if (png.data[i + 3] === 0) continue;
      const rgb = { r: png.data[i], g: png.data[i + 1], b: png.data[i + 2] };
      const hex = `#${[rgb.r, rgb.g, rgb.b].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
      canvas.set(x, y, exact.get(hex) ?? nearestPaletteIndex(meta.palette, rgb));
    }
  }
  return canvas;
};

export const resolveDay = async (day?: number): Promise<{ day: number; today: number }> => {
  const today = await getToday();
  const resolved = day ?? today;
  if (!Number.isInteger(resolved) || resolved < 1 || resolved > today) {
    throw new Error(`Day must be between 1 and ${today} (today).`);
  }
  return { day: resolved, today };
};

/**
 * Loads a day's canvas. The chain source replays Painted events and knows
 * which pixels are still unpainted; the API image is a fallback that renders
 * unpainted pixels with palette color 0, so emptiness cannot be detected.
 */
export const loadCanvas = async (day: number | undefined, source: CanvasSource = 'auto'): Promise<LoadedCanvas> => {
  const resolved = await resolveDay(day);
  const meta = await getDayMetadata(resolved.day);
  const warnings: string[] = [];

  if (source !== 'api') {
    try {
      const chain = await loadFromChain(resolved.day, meta);
      return {
        ...resolved,
        meta,
        canvas: chain.canvas,
        source: 'chain',
        eventCount: chain.eventCount,
        scannedToBlock: chain.scannedTo,
        warnings,
      };
    } catch (error) {
      if (source === 'chain') throw error;
      warnings.push(`Chain read failed (${(error as Error).message.split('\n')[0]}); fell back to the basepaint.xyz image.`);
    }
  }

  const canvas = await loadFromApi(resolved.day, meta);
  warnings.push('API image source: unpainted pixels appear as palette color 0 and cannot be told apart from painted ones; author data is unavailable.');
  return { ...resolved, meta, canvas, source: 'api', eventCount: 0, warnings };
};
