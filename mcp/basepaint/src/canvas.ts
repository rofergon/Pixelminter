export const EMPTY = 255;

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Rgb {
  r: number;
  g: number;
  b: number;
}

export const hexToRgb = (hex: string): Rgb => {
  const value = hex.replace(/^#/, '');
  const full = value.length === 3 ? value.split('').map((ch) => ch + ch).join('') : value;
  return {
    r: parseInt(full.slice(0, 2), 16) || 0,
    g: parseInt(full.slice(2, 4), 16) || 0,
    b: parseInt(full.slice(4, 6), 16) || 0,
  };
};

/** Nearest palette index for an arbitrary color (squared RGB distance). */
export const nearestPaletteIndex = (palette: string[], color: Rgb): number => {
  let best = 0;
  let bestDistance = Infinity;
  palette.forEach((hex, index) => {
    const { r, g, b } = hexToRgb(hex);
    const distance = (r - color.r) ** 2 + (g - color.g) ** 2 + (b - color.b) ** 2;
    if (distance < bestDistance) {
      bestDistance = distance;
      best = index;
    }
  });
  return best;
};

/** Single-character legend per palette index: 0-9 then a-z. */
export const indexToChar = (index: number): string => index.toString(36);

/**
 * In-memory BasePaint canvas: one palette index per pixel (EMPTY when nobody
 * has painted it) plus the address that last painted each pixel.
 */
export class Canvas {
  readonly size: number;
  readonly pixels: Uint8Array;
  readonly authors: Uint16Array;
  readonly authorList: string[] = [];
  private readonly authorIndex = new Map<string, number>();

  constructor(size: number) {
    this.size = size;
    this.pixels = new Uint8Array(size * size).fill(EMPTY);
    this.authors = new Uint16Array(size * size);
  }

  clone(): Canvas {
    const copy = new Canvas(this.size);
    copy.pixels.set(this.pixels);
    copy.authors.set(this.authors);
    this.authorList.forEach((author) => copy.authorId(author));
    return copy;
  }

  inBounds(x: number, y: number): boolean {
    return Number.isInteger(x) && Number.isInteger(y) && x >= 0 && y >= 0 && x < this.size && y < this.size;
  }

  get(x: number, y: number): number {
    return this.pixels[y * this.size + x];
  }

  authorAt(x: number, y: number): string | null {
    const id = this.authors[y * this.size + x];
    return id ? this.authorList[id - 1] : null;
  }

  /** 1-based author id; 0 is reserved for "unknown". */
  authorId(author: string): number {
    const key = author.toLowerCase();
    let id = this.authorIndex.get(key);
    if (!id) {
      this.authorList.push(key);
      id = this.authorList.length;
      this.authorIndex.set(key, id);
    }
    return id;
  }

  set(x: number, y: number, color: number, authorId = 0): void {
    const index = y * this.size + x;
    this.pixels[index] = color;
    this.authors[index] = authorId;
  }

  /** Applies the `bytes pixels` payload of a Painted event: [x, y, color] triplets. */
  applyPixelBytes(hex: string, author?: string): number {
    const data = hex.startsWith('0x') ? hex.slice(2) : hex;
    const authorId = author ? this.authorId(author) : 0;
    let applied = 0;
    for (let i = 0; i + 6 <= data.length; i += 6) {
      const x = parseInt(data.slice(i, i + 2), 16);
      const y = parseInt(data.slice(i + 2, i + 4), 16);
      const color = parseInt(data.slice(i + 4, i + 6), 16);
      if (!this.inBounds(x, y)) continue;
      this.set(x, y, color, authorId);
      applied++;
    }
    return applied;
  }

  countFilled(rect?: Rect): number {
    const { x, y, width, height } = rect ?? { x: 0, y: 0, width: this.size, height: this.size };
    let filled = 0;
    for (let yy = y; yy < y + height; yy++) {
      for (let xx = x; xx < x + width; xx++) {
        if (this.pixels[yy * this.size + xx] !== EMPTY) filled++;
      }
    }
    return filled;
  }
}

/** Clamps a requested region to the canvas; missing fields default to the full canvas. */
export const clampRect = (size: number, rect: Partial<Rect>): Rect => {
  const x = Math.min(Math.max(Math.floor(rect.x ?? 0), 0), size - 1);
  const y = Math.min(Math.max(Math.floor(rect.y ?? 0), 0), size - 1);
  const width = Math.min(Math.max(Math.floor(rect.width ?? size - x), 1), size - x);
  const height = Math.min(Math.max(Math.floor(rect.height ?? size - y), 1), size - y);
  return { x, y, width, height };
};

/**
 * Text dump of a region: one char per pixel (palette index in base 36, '.' for
 * empty) with an x ruler on top and y coordinates on the left, so exact
 * coordinates can be read without guessing from an image.
 */
export const regionToAscii = (canvas: Canvas, rect: Rect): string => {
  const { x, y, width, height } = rect;
  const pad = '     ';
  const ruler = (digit: (value: number) => string) => {
    let line = pad;
    for (let xx = x; xx < x + width; xx++) line += digit(xx);
    return line;
  };
  const lines = [
    ruler((value) => (value >= 100 ? String(Math.floor(value / 100)) : ' ')),
    ruler((value) => (value >= 10 ? String(Math.floor(value / 10) % 10) : ' ')),
    ruler((value) => String(value % 10)),
  ];
  for (let yy = y; yy < y + height; yy++) {
    let row = `${String(yy).padStart(3, ' ')}  `;
    for (let xx = x; xx < x + width; xx++) {
      const color = canvas.get(xx, yy);
      row += color === EMPTY ? '.' : indexToChar(color);
    }
    lines.push(row);
  }
  return lines.join('\n');
};
