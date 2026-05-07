import type { NextApiRequest, NextApiResponse } from 'next';
import { reconstructBasePaintImage } from '@/utils/basepaintImage';
import { calculateDay } from '@/hooks/useDateUtils';
import axios from 'axios';
import { PNG } from 'pngjs';

const REMOTE_IMAGE_BASE = 'https://basepaint.xyz/api/art/image';
const BASEPAINT_GRID_SIZE = 256;

const parsePaletteParam = (paletteParam: string | string[] | undefined): string[] => {
  if (!paletteParam) return [];
  const values = Array.isArray(paletteParam) ? paletteParam : [paletteParam];
  return values
    .flatMap((entry) => entry.split(','))
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
};

const hexToRgb = (hexColor: string): { r: number; g: number; b: number } => {
  const normalized = hexColor.trim().replace(/^#/, '');
  if (normalized.length !== 6) {
    return { r: -1, g: -1, b: -1 };
  }

  return {
    r: parseInt(normalized.slice(0, 2), 16),
    g: parseInt(normalized.slice(2, 4), 16),
    b: parseInt(normalized.slice(4, 6), 16),
  };
};

const pixelMatchesColor = (png: PNG, x: number, y: number, color: { r: number; g: number; b: number }): boolean => {
  const idx = (y * png.width + x) << 2;
  return png.data[idx] === color.r &&
    png.data[idx + 1] === color.g &&
    png.data[idx + 2] === color.b &&
    png.data[idx + 3] !== 0;
};

const makeBorderConnectedPaletteBackgroundTransparent = (buffer: Buffer, palette: string[]): Buffer => {
  if (!palette[0]) return buffer;

  const png = PNG.sync.read(buffer);
  const scale = png.width / BASEPAINT_GRID_SIZE;
  if (!Number.isInteger(scale) || scale <= 0 || png.height !== png.width) {
    return buffer;
  }

  const backgroundColor = hexToRgb(palette[0]);
  if ([backgroundColor.r, backgroundColor.g, backgroundColor.b].some((value) => Number.isNaN(value) || value < 0)) {
    return buffer;
  }

  const cellCount = BASEPAINT_GRID_SIZE * BASEPAINT_GRID_SIZE;
  const backgroundCells = new Uint8Array(cellCount);
  const visited = new Uint8Array(cellCount);
  const queue = new Uint32Array(cellCount);
  let head = 0;
  let tail = 0;

  const enqueue = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= BASEPAINT_GRID_SIZE || y >= BASEPAINT_GRID_SIZE) return;

    const cellIndex = y * BASEPAINT_GRID_SIZE + x;
    if (!backgroundCells[cellIndex] || visited[cellIndex]) return;

    visited[cellIndex] = 1;
    queue[tail++] = cellIndex;
  };

  for (let y = 0; y < BASEPAINT_GRID_SIZE; y++) {
    for (let x = 0; x < BASEPAINT_GRID_SIZE; x++) {
      const sampleX = x * scale;
      const sampleY = y * scale;
      if (pixelMatchesColor(png, sampleX, sampleY, backgroundColor)) {
        backgroundCells[y * BASEPAINT_GRID_SIZE + x] = 1;
      }
    }
  }

  for (let i = 0; i < BASEPAINT_GRID_SIZE; i++) {
    enqueue(i, 0);
    enqueue(i, BASEPAINT_GRID_SIZE - 1);
    enqueue(0, i);
    enqueue(BASEPAINT_GRID_SIZE - 1, i);
  }

  while (head < tail) {
    const cellIndex = queue[head++];
    const x = cellIndex % BASEPAINT_GRID_SIZE;
    const y = Math.floor(cellIndex / BASEPAINT_GRID_SIZE);

    enqueue(x + 1, y);
    enqueue(x - 1, y);
    enqueue(x, y + 1);
    enqueue(x, y - 1);
  }

  for (let y = 0; y < BASEPAINT_GRID_SIZE; y++) {
    for (let x = 0; x < BASEPAINT_GRID_SIZE; x++) {
      if (!visited[y * BASEPAINT_GRID_SIZE + x]) continue;

      for (let dy = 0; dy < scale; dy++) {
        for (let dx = 0; dx < scale; dx++) {
          const idx = ((y * scale + dy) * png.width + (x * scale + dx)) << 2;
          png.data[idx + 3] = 0;
        }
      }
    }
  }

  return PNG.sync.write(png);
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const palette = parsePaletteParam(req.query.palette as string | string[] | undefined);
    if (!palette.length) {
      return res.status(400).json({ error: 'Palette parameter is required' });
    }

    const dayParam = Array.isArray(req.query.day) ? req.query.day[0] : req.query.day;
    const parsedDay = dayParam ? parseInt(dayParam, 10) : NaN;
    const day = Number.isFinite(parsedDay) && parsedDay > 0 ? parsedDay : await calculateDay();

    const scaleParam = Array.isArray(req.query.scale) ? req.query.scale[0] : req.query.scale;
    const parsedScale = scaleParam ? parseInt(scaleParam, 10) : undefined;

    const { buffer, metadata } = await reconstructBasePaintImage({
      day,
      palette,
      scale: parsedScale,
    });

    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=60');
    res.setHeader('x-basepaint-day', metadata.day.toString());
    res.setHeader('x-basepaint-pixels', metadata.pixelsFilled.toString());
    res.setHeader('x-basepaint-scale', metadata.scale.toString());
    res.send(buffer);
  } catch (error) {
    console.error('Failed to reconstruct BasePaint image:', error);

    try {
      const dayParam = Array.isArray(req.query.day) ? req.query.day[0] : req.query.day;
      const parsedDay = dayParam ? parseInt(dayParam, 10) : NaN;
      const day = Number.isFinite(parsedDay) && parsedDay > 0 ? parsedDay : await calculateDay();

      const scaleParam = Array.isArray(req.query.scale) ? req.query.scale[0] : req.query.scale;
      const parsedScale = scaleParam ? parseInt(scaleParam, 10) : undefined;
      const scale = Number.isFinite(parsedScale) && parsedScale > 0 ? parsedScale : undefined;

      const remoteResponse = await axios.get(REMOTE_IMAGE_BASE, {
        params: {
          day,
          scale,
          v: 3,
        },
        responseType: 'arraybuffer',
        timeout: 15000,
      });
      const fallbackBuffer = makeBorderConnectedPaletteBackgroundTransparent(
        Buffer.from(remoteResponse.data),
        parsePaletteParam(req.query.palette as string | string[] | undefined)
      );

      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Cache-Control', 'public, max-age=60');
      res.setHeader('x-basepaint-day', day.toString());
      res.setHeader('x-basepaint-image-source', 'remote-fallback');
      return res.send(fallbackBuffer);
    } catch (fallbackError) {
      console.error('Failed to load BasePaint fallback image:', fallbackError);
      res.status(500).json({
        error: 'Failed to reconstruct BasePaint image',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}
