import { EMPTY, hexToRgb, nearestPaletteIndex, type Canvas, type Rect } from './canvas.ts';

/** Palette index, or a '#rrggbb' color snapped to the nearest palette entry. */
export type ColorRef = number | string;

export interface AsciiBlock {
  x: number;
  y: number;
  rows: string[];
  /** Char -> color. Defaults: 0-9/a-z = palette index, '.', ' ' and '_' = leave untouched. */
  legend?: Record<string, ColorRef | null>;
}

export interface RectOp {
  x: number;
  y: number;
  width: number;
  height: number;
  color: ColorRef;
  filled?: boolean;
}

export interface LineOp {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: ColorRef;
}

export interface ProposalInput {
  rects?: RectOp[];
  lines?: LineOp[];
  ascii?: AsciiBlock[];
  pixels?: Array<[number, number, ColorRef]>;
}

export interface ProposalOptions {
  /** Drop pixels that would cover someone else's painted pixel. */
  onlyEmpty: boolean;
  /** With onlyEmpty, these palette indices still count as paintable background. */
  backgroundColors: number[];
}

export interface ProposalStats {
  requested: number;
  outOfBounds: number;
  invalid: number;
  unchanged: number;
  skippedPainted: number;
  onEmpty: number;
  overwrites: number;
  final: number;
  colors: Record<number, number>;
}

export interface BuiltProposal {
  /** Canvas index (y * size + x) -> palette index, only pixels that change. */
  ops: Map<number, number>;
  stats: ProposalStats;
  bbox: Rect | null;
  warnings: string[];
}

const TRANSPARENT_CHARS = new Set(['.', ' ', '_']);

export interface ResolvedPixels {
  /** Canvas index -> palette index, in paint order (later layers win). */
  requested: Map<number, number>;
  outOfBounds: number;
  invalid: number;
  warnings: string[];
}

/** Rasterises rects, lines, ASCII blocks and pixels into canvas indices, without looking at the canvas. */
export const resolveProposalPixels = (size: number, palette: string[], input: ProposalInput): ResolvedPixels => {
  const inBounds = (x: number, y: number) =>
    Number.isInteger(x) && Number.isInteger(y) && x >= 0 && y >= 0 && x < size && y < size;
  const warnings = new Set<string>();
  const requested = new Map<number, number>();
  let outOfBounds = 0;
  let invalid = 0;

  const resolveColor = (ref: ColorRef | null | undefined): number | null => {
    if (typeof ref === 'number') {
      if (Number.isInteger(ref) && ref >= 0 && ref < palette.length) return ref;
      warnings.add(`Palette index ${ref} is out of range (0-${palette.length - 1}).`);
      return null;
    }
    if (typeof ref === 'string' && /^#?[0-9a-f]{6}$/i.test(ref)) {
      return nearestPaletteIndex(palette, hexToRgb(ref));
    }
    warnings.add(`Unrecognised color ${JSON.stringify(ref)}.`);
    return null;
  };

  const plot = (x: number, y: number, color: number | null) => {
    if (color === null) {
      invalid++;
      return;
    }
    if (!inBounds(x, y)) {
      outOfBounds++;
      return;
    }
    // Later layers win; delete first so the pixel moves to the end of the order.
    const index = y * size + x;
    requested.delete(index);
    requested.set(index, color);
  };

  for (const rect of input.rects ?? []) {
    const color = resolveColor(rect.color);
    for (let y = rect.y; y < rect.y + rect.height; y++) {
      for (let x = rect.x; x < rect.x + rect.width; x++) {
        const edge = x === rect.x || y === rect.y || x === rect.x + rect.width - 1 || y === rect.y + rect.height - 1;
        if (rect.filled !== false || edge) plot(x, y, color);
      }
    }
  }

  for (const line of input.lines ?? []) {
    const color = resolveColor(line.color);
    // Bresenham
    let { x1: x, y1: y } = line;
    const dx = Math.abs(line.x2 - x);
    const dy = -Math.abs(line.y2 - y);
    const sx = x < line.x2 ? 1 : -1;
    const sy = y < line.y2 ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      plot(x, y, color);
      if (x === line.x2 && y === line.y2) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x += sx; }
      if (e2 <= dx) { err += dx; y += sy; }
    }
  }

  for (const block of input.ascii ?? []) {
    const legend = new Map<string, number | null>();
    for (const [char, ref] of Object.entries(block.legend ?? {})) {
      legend.set(char, ref === null || ref === '' ? null : resolveColor(ref));
    }
    block.rows.forEach((row, dy) => {
      Array.from(row).forEach((char, dx) => {
        let color: number | null;
        if (legend.has(char)) {
          color = legend.get(char)!;
          if (color === null) return;
        } else if (TRANSPARENT_CHARS.has(char)) {
          return;
        } else {
          const index = parseInt(char, 36);
          if (Number.isNaN(index) || index >= palette.length) {
            warnings.add(`ASCII char '${char}' has no legend entry and is not a palette index.`);
            color = null;
          } else {
            color = index;
          }
        }
        plot(block.x + dx, block.y + dy, color);
      });
    });
  }

  for (const [x, y, ref] of input.pixels ?? []) plot(x, y, resolveColor(ref));

  if (outOfBounds) warnings.add(`${outOfBounds} pixels fell outside the ${size}x${size} canvas.`);
  return { requested, outOfBounds, invalid, warnings: [...warnings] };
};

export const buildProposal = (
  canvas: Canvas,
  palette: string[],
  input: ProposalInput,
  options: ProposalOptions
): BuiltProposal => {
  const { requested, outOfBounds, invalid, warnings } = resolveProposalPixels(canvas.size, palette, input);
  const background = new Set(options.backgroundColors);
  const ops = new Map<number, number>();
  const colors: Record<number, number> = {};
  let unchanged = 0;
  let skippedPainted = 0;
  let onEmpty = 0;
  let overwrites = 0;
  let minX = Infinity, minY = Infinity, maxX = -1, maxY = -1;

  for (const [index, color] of requested) {
    const current = canvas.pixels[index];
    if (current === color) {
      unchanged++;
      continue;
    }
    const painted = current !== EMPTY && !background.has(current);
    if (painted && options.onlyEmpty) {
      skippedPainted++;
      continue;
    }
    if (current === EMPTY) onEmpty++;
    else overwrites++;
    ops.set(index, color);
    colors[color] = (colors[color] ?? 0) + 1;
    const x = index % canvas.size;
    const y = Math.floor(index / canvas.size);
    minX = Math.min(minX, x); maxX = Math.max(maxX, x);
    minY = Math.min(minY, y); maxY = Math.max(maxY, y);
  }

  return {
    ops,
    bbox: ops.size ? { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 } : null,
    warnings,
    stats: {
      requested: requested.size,
      outOfBounds,
      invalid,
      unchanged,
      skippedPainted,
      onEmpty,
      overwrites,
      final: ops.size,
      colors,
    },
  };
};

export const applyProposal = (canvas: Canvas, ops: Map<number, number>): Canvas => {
  const next = canvas.clone();
  const author = next.authorId('proposal');
  for (const [index, color] of ops) {
    next.pixels[index] = color;
    next.authors[index] = author;
  }
  return next;
};

/**
 * Encodes ops as BasePaint `bytes pixels` payloads ([x, y, color] per pixel),
 * row-major so a partial submission paints top-to-bottom, split into chunks.
 */
export const encodeProposal = (ops: Map<number, number>, size: number, chunkSize: number): `0x${string}`[] => {
  const byte = (value: number) => value.toString(16).padStart(2, '0');
  const sorted = [...ops.entries()].sort((a, b) => a[0] - b[0]);
  const chunks: `0x${string}`[] = [];
  for (let start = 0; start < sorted.length; start += chunkSize) {
    let hex = '';
    for (const [index, color] of sorted.slice(start, start + chunkSize)) {
      hex += byte(index % size) + byte(Math.floor(index / size)) + byte(color);
    }
    chunks.push(`0x${hex}`);
  }
  return chunks;
};
