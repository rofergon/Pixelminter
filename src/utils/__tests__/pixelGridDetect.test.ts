/** @jest-environment node */
import {
  detectPixelGrid,
  samplePixelGrid,
  removeBackground,
  trimTransparent,
  toPixelMap,
  nearestPaletteColor,
  reduceColors,
  PixelatedImage,
  Rgba,
} from '@/utils/pixelGridDetect';

const COLORS: Rgba[] = [
  { r: 255, g: 255, b: 255, a: 255 },
  { r: 30, g: 20, b: 90, a: 255 },
  { r: 250, g: 150, b: 200, a: 255 },
  { r: 100, g: 220, b: 250, a: 255 },
  { r: 250, g: 240, b: 140, a: 255 },
];

// Deterministic pseudo-random so the fixtures are stable.
const rng = (seed: number) => () => {
  seed = (seed * 1664525 + 1013904223) % 2 ** 32;
  return seed / 2 ** 32;
};

const makeArt = (size: number, seed = 1): Rgba[] => {
  const rand = rng(seed);
  return Array.from({ length: size * size }, () => COLORS[Math.floor(rand() * COLORS.length)]);
};

/** Nearest-neighbour upscale by a (possibly fractional) factor with a grid shift, plus optional noise. */
const upscale = (art: Rgba[], size: number, scale: number, shift = 0, noise = 0) => {
  const out = Math.floor(size * scale);
  const data = new Uint8ClampedArray(out * out * 4);
  const rand = rng(99);
  for (let y = 0; y < out; y++) {
    for (let x = 0; x < out; x++) {
      const sx = Math.min(size - 1, Math.max(0, Math.floor((x - shift) / scale)));
      const sy = Math.min(size - 1, Math.max(0, Math.floor((y - shift) / scale)));
      const c = art[sy * size + sx];
      const i = (y * out + x) * 4;
      const n = () => (rand() - 0.5) * 2 * noise;
      data[i] = c.r + n();
      data[i + 1] = c.g + n();
      data[i + 2] = c.b + n();
      data[i + 3] = 255;
    }
  }
  return { data, width: out, height: out };
};

const sameColor = (a: Rgba | null, b: Rgba | null, tolerance = 8) =>
  !!a && !!b && Math.abs(a.r - b.r) <= tolerance && Math.abs(a.g - b.g) <= tolerance && Math.abs(a.b - b.b) <= tolerance;

describe('detectPixelGrid', () => {
  it('finds an integer scale and recovers every pixel', () => {
    const art = makeArt(24);
    const img = upscale(art, 24, 8);
    const grid = detectPixelGrid(img)!;
    expect(grid.period).toBeCloseTo(8, 1);
    const sampled = samplePixelGrid(img, grid);
    expect(sampled.width).toBe(24);
    expect(sampled.height).toBe(24);
    art.forEach((c, i) => expect(sameColor(sampled.cells[i], c)).toBe(true));
  });

  it('handles fractional scales, shifted grids and compression noise', () => {
    const art = makeArt(40, 7);
    const img = upscale(art, 40, 12.7, 5, 10);
    const grid = detectPixelGrid(img)!;
    expect(Math.abs(grid.period - 12.7)).toBeLessThan(0.1);
    const sampled = samplePixelGrid(img, grid);
    // The shifted first column is a sliver of 5px (< half a cell), so it is dropped.
    expect(sampled.width).toBeGreaterThanOrEqual(39);
    expect(sampled.width).toBeLessThanOrEqual(40);
    const dx = 40 - sampled.width;
    let matches = 0;
    for (let y = 0; y < sampled.height; y++) {
      for (let x = 0; x < sampled.width; x++) {
        if (sameColor(sampled.cells[y * sampled.width + x], art[(y + dx) * 40 + x + dx], 16)) matches++;
      }
    }
    expect(matches / (sampled.width * sampled.height)).toBeGreaterThan(0.97);
  });

  it('returns null for a flat image', () => {
    const img = upscale([COLORS[0]], 1, 50);
    expect(detectPixelGrid(img)).toBeNull();
  });
});

describe('post-processing', () => {
  const W = COLORS[0];
  const D = COLORS[1];
  // White background with a dark ring that encloses a white hole.
  const ring: PixelatedImage = {
    width: 5,
    height: 5,
    cells: [
      W, W, W, W, W,
      W, D, D, D, W,
      W, D, W, D, W,
      W, D, D, D, W,
      W, W, W, W, W,
    ],
  };

  it('removes only the background connected to the border', () => {
    const cleaned = removeBackground(ring);
    expect(cleaned.cells[0]).toBeNull();
    expect(cleaned.cells[12]).toEqual(W);
    expect(cleaned.cells[6]).toEqual(D);
  });

  it('trims transparent borders', () => {
    const trimmed = trimTransparent(removeBackground(ring));
    expect(trimmed.width).toBe(3);
    expect(trimmed.height).toBe(3);
  });

  it('places pixels on the grid, clips, and snaps to the palette', () => {
    const image: PixelatedImage = { width: 2, height: 1, cells: [{ r: 250, g: 10, b: 10, a: 255 }, null] };
    const palette = ['#000000', '#ff0000'];
    expect(nearestPaletteColor(image.cells[0]!, palette)).toBe('#ff0000');
    expect([...toPixelMap(image, { left: 3, top: 4, gridSize: 16, palette })]).toEqual([['3,4', '#ff0000']]);
    expect(toPixelMap(image, { left: 3, top: 4, gridSize: 16 }).get('3,4')).toBe('#fa0a0a');
    expect(toPixelMap(image, { left: 16, top: 0, gridSize: 16 }).size).toBe(0);
  });
});

describe('reduceColors', () => {
  it('merges noisy shades down to the requested count', () => {
    const rand = rng(3);
    const cells = Array.from({ length: 400 }, (_, i) => {
      const base = COLORS[i % 3];
      const n = () => Math.round((rand() - 0.5) * 12);
      return { r: base.r + n(), g: base.g + n(), b: base.b + n(), a: 255 };
    });
    const reduced = reduceColors({ width: 20, height: 20, cells }, 3);
    const unique = new Set(reduced.cells.map((c) => `${c!.r},${c!.g},${c!.b}`));
    expect(unique.size).toBe(3);
    reduced.cells.forEach((c, i) => expect(sameColor(c, COLORS[i % 3], 8)).toBe(true));
  });
});
