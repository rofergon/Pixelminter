/**
 * Recovers the 1:1 pixel grid of upscaled pixel art (AI generated or resized
 * with blur/compression) and samples one color per logical pixel.
 *
 * Pure functions over raw RGBA buffers so they can run in the browser (canvas
 * getImageData) and in tests without a DOM.
 */

export interface RgbaImage {
  data: Uint8ClampedArray | Uint8Array;
  width: number;
  height: number;
}

export interface Rgba {
  r: number;
  g: number;
  b: number;
  a: number;
}

export interface GridDetection {
  /** Source pixels per logical pixel (can be fractional, e.g. 17.9). */
  period: number;
  /** Position (in source pixels) of a grid line on each axis, in [0, period). */
  offsetX: number;
  offsetY: number;
  /** 0..1, how strongly the edges line up with the grid. */
  confidence: number;
}

export interface PixelatedImage {
  width: number;
  height: number;
  /** Row-major, null = transparent. */
  cells: (Rgba | null)[];
}

// Channel differences below this are treated as compression noise / shading, not cell edges.
const EDGE_NOISE = 24;

/** Max per-channel difference of two pixels, alpha-premultiplied so transparent garbage RGB is ignored. */
const pixelDiff = (data: RgbaImage['data'], i: number, j: number) => {
  const ai = data[i + 3] / 255;
  const aj = data[j + 3] / 255;
  const d = Math.max(
    Math.abs(data[i] * ai - data[j] * aj),
    Math.abs(data[i + 1] * ai - data[j + 1] * aj),
    Math.abs(data[i + 2] * ai - data[j + 2] * aj),
    Math.abs(data[i + 3] - data[j + 3])
  );
  return d < EDGE_NOISE ? 0 : d;
};

/**
 * Edge strength at each boundary between source columns (axis 'x') or rows
 * (axis 'y'). Index i is the boundary at position i + 1.
 */
export const edgeProfile = (img: RgbaImage, axis: 'x' | 'y'): Float64Array => {
  const { data, width, height } = img;
  const len = (axis === 'x' ? width : height) - 1;
  const profile = new Float64Array(Math.max(len, 0));
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      if (axis === 'x' && x < width - 1) profile[x] += pixelDiff(data, i, i + 4);
      if (axis === 'y' && y < height - 1) profile[y] += pixelDiff(data, i, i + width * 4);
    }
  }
  return profile;
};

/** Normalized magnitude and phase of the profile at frequency 1/period. */
const combScore = (profile: Float64Array, total: number, period: number) => {
  let re = 0;
  let im = 0;
  const w = (2 * Math.PI) / period;
  for (let i = 0; i < profile.length; i++) {
    const v = profile[i];
    if (!v) continue;
    const angle = w * (i + 1);
    re += v * Math.cos(angle);
    im -= v * Math.sin(angle);
  }
  const offset = (((-Math.atan2(im, re) / (2 * Math.PI)) * period) % period + period) % period;
  return { score: total ? Math.hypot(re, im) / total : 0, offset };
};

const sum = (values: Float64Array) => values.reduce((acc, v) => acc + v, 0);

/**
 * Estimates the logical pixel size assuming square pixels. The periodicity of
 * the edge profiles on both axes is scanned in frequency space; harmonics
 * (period / k) are resolved toward the largest period that still fits well.
 */
export const detectPixelGrid = (
  img: RgbaImage,
  { minPeriod = 2, maxPeriod }: { minPeriod?: number; maxPeriod?: number } = {}
): GridDetection | null => {
  const px = edgeProfile(img, 'x');
  const py = edgeProfile(img, 'y');
  const tx = sum(px);
  const ty = sum(py);
  if (!tx && !ty) return null;

  const span = Math.min(img.width, img.height);
  // At least 4 logical pixels across the image.
  const maxP = Math.max(minPeriod + 0.5, maxPeriod ?? span / 4);
  const score = (period: number) => {
    const sx = combScore(px, tx, period).score;
    const sy = combScore(py, ty, period).score;
    return (sx * tx + sy * ty) / (tx + ty);
  };

  // Frequency steps a quarter of the spectral resolution, so no peak falls between samples.
  const fStep = 1 / (4 * Math.max(img.width, img.height));
  const samples: { period: number; score: number }[] = [];
  for (let f = 1 / maxP; f <= 1 / minPeriod + 1e-9; f += fStep) {
    samples.push({ period: 1 / f, score: score(1 / f) });
  }
  if (!samples.length) return null;

  const refine = (period: number) => {
    let best = { period, score: score(period) };
    let step = period * period * fStep;
    for (let pass = 0; pass < 4; pass++, step /= 4) {
      for (let k = -4; k <= 4; k++) {
        const p = best.period + k * step;
        if (p < minPeriod || p > maxP) continue;
        const s = score(p);
        if (s > best.score) best = { period: p, score: s };
      }
    }
    return best;
  };

  let best = samples.reduce((a, b) => (b.score > a.score ? b : a));
  best = refine(best.period);

  // A comb of period P also resonates at P/2, P/3...: prefer the largest multiple that scores close.
  const peakNear = (period: number) =>
    samples
      .filter((s) => Math.abs(s.period - period) <= period * 0.03)
      .reduce<{ period: number; score: number } | null>((a, b) => (!a || b.score > a.score ? b : a), null);
  for (let k = Math.floor(maxP / best.period); k >= 2; k--) {
    const candidate = peakNear(best.period * k);
    if (candidate && candidate.score >= best.score * 0.6) {
      best = refine(candidate.period);
      break;
    }
  }

  return {
    period: best.period,
    offsetX: combScore(px, tx, best.period).offset,
    offsetY: combScore(py, ty, best.period).offset,
    confidence: Math.min(1, best.score),
  };
};

/** Aligns a grid of a user-chosen period with the image edges (manual override of the detection). */
export const fitGrid = (img: RgbaImage, period: number): GridDetection => {
  const px = edgeProfile(img, 'x');
  const py = edgeProfile(img, 'y');
  const tx = sum(px);
  const ty = sum(py);
  const x = combScore(px, tx, period);
  const y = combScore(py, ty, period);
  return {
    period,
    offsetX: x.offset,
    offsetY: y.offset,
    confidence: tx + ty ? (x.score * tx + y.score * ty) / (tx + ty) : 0,
  };
};

/** Grid line positions covering [0, size], dropping slivers thinner than half a cell. */
const gridLines = (size: number, period: number, offset: number): number[] => {
  let start = offset - Math.ceil(offset / period) * period;
  if (start + period < period / 2) start += period;
  const lines = [Math.max(0, start)];
  for (let pos = start + period; pos <= size - period / 2 + 1e-6; pos += period) lines.push(pos);
  lines.push(Math.min(size, lines[lines.length - 1] + period));
  return lines;
};

/**
 * Samples one color per grid cell. Only the inner part of each cell is read, and
 * the dominant color there wins, so blurred edges and stray noise don't leak in.
 */
export const samplePixelGrid = (img: RgbaImage, grid: GridDetection): PixelatedImage => {
  const xs = gridLines(img.width, grid.period, grid.offsetX);
  const ys = gridLines(img.height, grid.period, grid.offsetY);
  const width = Math.max(xs.length - 1, 0);
  const height = Math.max(ys.length - 1, 0);
  const cells: (Rgba | null)[] = new Array(width * height).fill(null);
  const margin = grid.period * 0.25;

  const buckets = new Map<number, { n: number; r: number; g: number; b: number; a: number }>();
  for (let cy = 0; cy < height; cy++) {
    const y0 = Math.floor(ys[cy] + Math.min(margin, (ys[cy + 1] - ys[cy]) / 2 - 0.5));
    const y1 = Math.max(y0 + 1, Math.ceil(ys[cy + 1] - margin));
    for (let cx = 0; cx < width; cx++) {
      const x0 = Math.floor(xs[cx] + Math.min(margin, (xs[cx + 1] - xs[cx]) / 2 - 0.5));
      const x1 = Math.max(x0 + 1, Math.ceil(xs[cx + 1] - margin));
      buckets.clear();
      let transparent = 0;
      let count = 0;
      for (let y = Math.max(0, y0); y < Math.min(img.height, y1); y++) {
        for (let x = Math.max(0, x0); x < Math.min(img.width, x1); x++) {
          const i = (y * img.width + x) * 4;
          const d = img.data;
          count++;
          if (d[i + 3] < 128) {
            transparent++;
            continue;
          }
          // 4 bits per channel is coarse enough to merge compression noise of one flat color.
          const key = ((d[i] >> 4) << 8) | ((d[i + 1] >> 4) << 4) | (d[i + 2] >> 4);
          const bucket = buckets.get(key) ?? { n: 0, r: 0, g: 0, b: 0, a: 0 };
          bucket.n++;
          bucket.r += d[i];
          bucket.g += d[i + 1];
          bucket.b += d[i + 2];
          bucket.a += d[i + 3];
          buckets.set(key, bucket);
        }
      }
      if (!count || transparent * 2 >= count) continue;
      let top: { n: number; r: number; g: number; b: number; a: number } | null = null;
      buckets.forEach((bucket) => {
        if (!top || bucket.n > top.n) top = bucket;
      });
      if (!top) continue;
      const { n, r, g, b, a } = top;
      cells[cy * width + cx] = {
        r: Math.round(r / n),
        g: Math.round(g / n),
        b: Math.round(b / n),
        a: Math.round(a / n),
      };
    }
  }
  return { width, height, cells };
};

const colorDistance = (a: Rgba, b: Rgba) =>
  Math.max(Math.abs(a.r - b.r), Math.abs(a.g - b.g), Math.abs(a.b - b.b));

/**
 * Makes the background transparent: the most common color on the border is
 * flood-filled from the edges, so matching colors enclosed by the art survive.
 */
export const removeBackground = (image: PixelatedImage, tolerance = 32): PixelatedImage => {
  const { width, height, cells } = image;
  const border: Rgba[] = [];
  for (let x = 0; x < width; x++) border.push(cells[x]!, cells[(height - 1) * width + x]!);
  for (let y = 0; y < height; y++) border.push(cells[y * width]!, cells[y * width + width - 1]!);
  const opaqueBorder = border.filter(Boolean);
  if (!opaqueBorder.length) return image;

  const counts = new Map<number, { n: number; color: Rgba }>();
  opaqueBorder.forEach((c) => {
    const key = ((c.r >> 4) << 8) | ((c.g >> 4) << 4) | (c.b >> 4);
    const entry = counts.get(key) ?? { n: 0, color: c };
    entry.n++;
    counts.set(key, entry);
  });
  let bg = opaqueBorder[0];
  let bgCount = 0;
  counts.forEach(({ n, color }) => {
    if (n > bgCount) {
      bg = color;
      bgCount = n;
    }
  });

  const out = cells.slice();
  const seen = new Uint8Array(cells.length);
  const stack: number[] = [];
  const push = (i: number) => {
    if (seen[i]) return;
    seen[i] = 1;
    const c = cells[i];
    if (!c || colorDistance(c, bg) <= tolerance) stack.push(i);
  };
  for (let x = 0; x < width; x++) {
    push(x);
    push((height - 1) * width + x);
  }
  for (let y = 0; y < height; y++) {
    push(y * width);
    push(y * width + width - 1);
  }
  while (stack.length) {
    const i = stack.pop()!;
    out[i] = null;
    const x = i % width;
    const y = (i - x) / width;
    if (x > 0) push(i - 1);
    if (x < width - 1) push(i + 1);
    if (y > 0) push(i - width);
    if (y < height - 1) push(i + width);
  }
  return { width, height, cells: out };
};

/** Crops fully transparent rows/columns around the art. */
export const trimTransparent = (image: PixelatedImage): PixelatedImage => {
  const { width, height, cells } = image;
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!cells[y * width + x]) continue;
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }
  }
  if (maxX < 0) return { width: 0, height: 0, cells: [] };
  const w = maxX - minX + 1;
  const h = maxY - minY + 1;
  const out: (Rgba | null)[] = [];
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) out.push(cells[y * width + x]);
  }
  return { width: w, height: h, cells: out };
};

/**
 * Limits the image to at most `maxColors` colors with k-means over the cell
 * colors, merging the near-duplicate shades that compression leaves behind.
 */
export const reduceColors = (image: PixelatedImage, maxColors: number): PixelatedImage => {
  const counts = new Map<number, { n: number; color: Rgba }>();
  image.cells.forEach((c) => {
    if (!c) return;
    const key = (c.r << 16) | (c.g << 8) | c.b;
    const entry = counts.get(key) ?? { n: 0, color: c };
    entry.n++;
    counts.set(key, entry);
  });
  const colors = Array.from(counts.values());
  if (colors.length <= maxColors) return image;

  // Deterministic farthest-point init from the most frequent color keeps results stable between renders.
  colors.sort((a, b) => b.n - a.n);
  const dist = (a: Rgba, b: Rgba) => (a.r - b.r) ** 2 + (a.g - b.g) ** 2 + (a.b - b.b) ** 2;
  const centers: Rgba[] = [{ ...colors[0].color }];
  const nearest = colors.map((c) => dist(c.color, centers[0]));
  while (centers.length < maxColors) {
    let pick = 0;
    nearest.forEach((d, i) => {
      if (d * colors[i].n > nearest[pick] * colors[pick].n) pick = i;
    });
    if (!nearest[pick]) break;
    centers.push({ ...colors[pick].color });
    colors.forEach((c, i) => (nearest[i] = Math.min(nearest[i], dist(c.color, centers[centers.length - 1]))));
  }

  const assign = new Array<number>(colors.length).fill(0);
  for (let iter = 0; iter < 12; iter++) {
    colors.forEach((c, i) => {
      let best = 0;
      centers.forEach((center, k) => {
        if (dist(c.color, center) < dist(c.color, centers[best])) best = k;
      });
      assign[i] = best;
    });
    const sums = centers.map(() => ({ n: 0, r: 0, g: 0, b: 0 }));
    colors.forEach((c, i) => {
      const s = sums[assign[i]];
      s.n += c.n;
      s.r += c.color.r * c.n;
      s.g += c.color.g * c.n;
      s.b += c.color.b * c.n;
    });
    sums.forEach((s, k) => {
      if (s.n) centers[k] = { r: Math.round(s.r / s.n), g: Math.round(s.g / s.n), b: Math.round(s.b / s.n), a: 255 };
    });
  }

  const lookup = new Map<number, Rgba>();
  colors.forEach((c, i) => lookup.set((c.color.r << 16) | (c.color.g << 8) | c.color.b, centers[assign[i]]));
  return {
    ...image,
    cells: image.cells.map((c) => (c ? lookup.get((c.r << 16) | (c.g << 8) | c.b)! : null)),
  };
};

export const toHex = ({ r, g, b }: Rgba) =>
  `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`;

export const parseHex = (hex: string): Rgba | null => {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex.trim());
  return m ? { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16), a: 255 } : null;
};

/** Perceptual-ish ("redmean") RGB distance, cheap and better than plain Euclidean for palette matching. */
const redmean = (a: Rgba, b: Rgba) => {
  const rm = (a.r + b.r) / 2;
  const dr = a.r - b.r;
  const dg = a.g - b.g;
  const db = a.b - b.b;
  return (2 + rm / 256) * dr * dr + 4 * dg * dg + (2 + (255 - rm) / 256) * db * db;
};

/** Returns the palette entry (exact string, so palette.indexOf works) closest to the color. */
export const nearestPaletteColor = (color: Rgba, palette: string[]): string | null => {
  let best: string | null = null;
  let bestDistance = Infinity;
  palette.forEach((entry) => {
    const rgb = parseHex(entry);
    if (!rgb) return;
    const d = redmean(color, rgb);
    if (d < bestDistance) {
      bestDistance = d;
      best = entry;
    }
  });
  return best;
};

/**
 * Converts the sampled image to editor pixels ("x,y" -> color) placed at
 * (left, top) and clipped to the grid. Colors snap to the palette when given.
 */
export const toPixelMap = (
  image: PixelatedImage,
  { left, top, gridSize, palette }: { left: number; top: number; gridSize: number; palette?: string[] }
): Map<string, string> => {
  const pixels = new Map<string, string>();
  const usePalette = Boolean(palette && palette.length);
  for (let y = 0; y < image.height; y++) {
    for (let x = 0; x < image.width; x++) {
      const cell = image.cells[y * image.width + x];
      const gx = x + left;
      const gy = y + top;
      if (!cell || gx < 0 || gy < 0 || gx >= gridSize || gy >= gridSize) continue;
      const color = usePalette ? nearestPaletteColor(cell, palette!) : toHex(cell);
      if (color) pixels.set(`${gx},${gy}`, color);
    }
  }
  return pixels;
};
