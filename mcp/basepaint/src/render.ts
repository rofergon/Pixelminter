import { PNG } from 'pngjs';
import { EMPTY, hexToRgb, type Canvas, type Rect, type Rgb } from './canvas.ts';

export type EmptyStyle = 'checker' | 'transparent' | 'palette0';

export interface RenderOptions {
  rect: Rect;
  scale: number;
  palette: string[];
  emptyStyle?: EmptyStyle;
  /** Draw grid lines every N canvas pixels (absolute coordinates). 0 disables. */
  grid?: number;
  /** Draw coordinate labels in a margin around the image. */
  labels?: boolean;
  /** Pixels (y * size + x) to outline, e.g. the cells a proposal changes. */
  highlight?: Set<number>;
}

// 3x5 bitmap digits for coordinate labels.
const DIGITS: Record<string, string[]> = {
  '0': ['111', '101', '101', '101', '111'],
  '1': ['010', '110', '010', '010', '111'],
  '2': ['111', '001', '111', '100', '111'],
  '3': ['111', '001', '111', '001', '111'],
  '4': ['101', '101', '111', '001', '001'],
  '5': ['111', '100', '111', '001', '111'],
  '6': ['111', '100', '111', '101', '111'],
  '7': ['111', '001', '001', '001', '001'],
  '8': ['111', '101', '111', '101', '111'],
  '9': ['111', '101', '111', '001', '111'],
};
const FONT_SCALE = 2;
const GLYPH_W = 3 * FONT_SCALE;
const GLYPH_H = 5 * FONT_SCALE;
const GLYPH_ADVANCE = GLYPH_W + FONT_SCALE;
const MARGIN_LEFT = 3 * GLYPH_ADVANCE + 6;
const MARGIN_TOP = GLYPH_H + 8;
const MARGIN_BG: Rgb = { r: 24, g: 24, b: 28 };
const LABEL_FG: Rgb = { r: 235, g: 235, b: 235 };
const CHECKER_A: Rgb = { r: 110, g: 110, b: 110 };
const CHECKER_B: Rgb = { r: 150, g: 150, b: 150 };
const HIGHLIGHT: Rgb = { r: 255, g: 0, b: 255 };

const luminance = ({ r, g, b }: Rgb) => 0.299 * r + 0.587 * g + 0.114 * b;

/** Picks an integer scale so the longest side of `rect` is about `target` px. */
export const autoScale = (rect: Rect, target = 1024, max = 24): number =>
  Math.min(max, Math.max(1, Math.floor(target / Math.max(rect.width, rect.height))));

export const renderCanvas = (canvas: Canvas, options: RenderOptions): Buffer => {
  const { rect, scale, palette, emptyStyle = 'checker', grid = 0, labels = true, highlight } = options;
  const marginLeft = labels ? MARGIN_LEFT : 0;
  const marginTop = labels ? MARGIN_TOP : 0;
  const width = rect.width * scale + marginLeft;
  const height = rect.height * scale + marginTop;
  const png = new PNG({ width, height });
  const colors = palette.map(hexToRgb);

  const put = (px: number, py: number, { r, g, b }: Rgb, alpha = 255) => {
    const i = (py * width + px) << 2;
    png.data[i] = r;
    png.data[i + 1] = g;
    png.data[i + 2] = b;
    png.data[i + 3] = alpha;
  };

  if (labels) {
    for (let py = 0; py < height; py++) {
      for (let px = 0; px < width; px++) {
        if (px < marginLeft || py < marginTop) put(px, py, MARGIN_BG);
      }
    }
  }

  const half = Math.max(1, Math.floor(scale / 2));
  for (let cy = 0; cy < rect.height; cy++) {
    for (let cx = 0; cx < rect.width; cx++) {
      const x = rect.x + cx;
      const y = rect.y + cy;
      const color = canvas.get(x, y);
      const base = color === EMPTY ? null : colors[color] ?? { r: 255, g: 0, b: 0 };
      const outlined = highlight?.has(y * canvas.size + x) ?? false;
      for (let dy = 0; dy < scale; dy++) {
        for (let dx = 0; dx < scale; dx++) {
          const px = marginLeft + cx * scale + dx;
          const py = marginTop + cy * scale + dy;
          const onGridX = grid > 0 && scale >= 3 && dx === 0 && x % grid === 0;
          const onGridY = grid > 0 && scale >= 3 && dy === 0 && y % grid === 0;
          const onEdge = outlined && scale >= 4 && (dx === 0 || dy === 0 || dx === scale - 1 || dy === scale - 1);

          let rgb: Rgb;
          let alpha = 255;
          if (base) {
            rgb = base;
          } else if (emptyStyle === 'palette0') {
            rgb = colors[0] ?? CHECKER_A;
          } else if (emptyStyle === 'transparent') {
            rgb = CHECKER_A;
            alpha = 0;
          } else {
            // Checker pattern inside each empty cell (or across cells at scale 1).
            const parity = scale === 1 ? (x + y) & 1 : (Math.floor(dx / half) + Math.floor(dy / half)) & 1;
            rgb = parity ? CHECKER_B : CHECKER_A;
          }

          if (onEdge) {
            rgb = HIGHLIGHT;
            alpha = 255;
          } else if (onGridX || onGridY) {
            // Contrast-adaptive grid: darken light pixels, lighten dark ones.
            const lift = luminance(rgb) > 110 ? 0.55 : 1.8;
            const strong = (onGridX && x % (grid * 4) === 0) || (onGridY && y % (grid * 4) === 0);
            const factor = strong ? (lift < 1 ? 0.3 : 2.6) : lift;
            rgb = {
              r: Math.min(255, Math.round(rgb.r * factor + (lift > 1 ? 30 : 0))),
              g: Math.min(255, Math.round(rgb.g * factor + (lift > 1 ? 30 : 0))),
              b: Math.min(255, Math.round(rgb.b * factor + (lift > 1 ? 30 : 0))),
            };
            alpha = 255;
          }
          put(px, py, rgb, alpha);
        }
      }
    }
  }

  if (labels) {
    const drawNumber = (value: number, left: number, top: number) => {
      String(value)
        .split('')
        .forEach((digit, position) => {
          DIGITS[digit].forEach((row, gy) => {
            row.split('').forEach((bit, gx) => {
              if (bit !== '1') return;
              for (let sy = 0; sy < FONT_SCALE; sy++) {
                for (let sx = 0; sx < FONT_SCALE; sx++) {
                  const px = left + position * GLYPH_ADVANCE + gx * FONT_SCALE + sx;
                  const py = top + gy * FONT_SCALE + sy;
                  if (px >= 0 && py >= 0 && px < width && py < height) put(px, py, LABEL_FG);
                }
              }
            });
          });
        });
    };

    // Label every `step` pixels, keeping labels at least ~30px apart.
    const baseStep = grid > 0 ? grid : 8;
    let step = baseStep;
    while (step * scale < 3 * GLYPH_ADVANCE + 6) step += baseStep;

    for (let x = Math.ceil(rect.x / step) * step; x < rect.x + rect.width; x += step) {
      const px = marginLeft + (x - rect.x) * scale;
      drawNumber(x, Math.min(px, width - String(x).length * GLYPH_ADVANCE), 3);
    }
    for (let y = Math.ceil(rect.y / step) * step; y < rect.y + rect.height; y += step) {
      const py = marginTop + (y - rect.y) * scale;
      const text = String(y);
      drawNumber(y, marginLeft - 4 - text.length * GLYPH_ADVANCE, Math.min(py, height - GLYPH_H));
    }
  }

  return PNG.sync.write(png);
};

const drawDigits = (png: PNG, value: number, left: number, top: number, color: Rgb) => {
  String(value)
    .split('')
    .forEach((digit, position) => {
      DIGITS[digit].forEach((row, gy) => {
        row.split('').forEach((bit, gx) => {
          if (bit !== '1') return;
          for (let sy = 0; sy < FONT_SCALE; sy++) {
            for (let sx = 0; sx < FONT_SCALE; sx++) {
              const px = left + position * GLYPH_ADVANCE + gx * FONT_SCALE + sx;
              const py = top + gy * FONT_SCALE + sy;
              if (px < 0 || py < 0 || px >= png.width || py >= png.height) continue;
              const i = (py * png.width + px) << 2;
              png.data[i] = color.r;
              png.data[i + 1] = color.g;
              png.data[i + 2] = color.b;
              png.data[i + 3] = 255;
            }
          }
        });
      });
    });
};

/** Tiles rendered frames into one PNG, each under a header with its frame number. */
export const renderFrameSheet = (frames: Buffer[], columns: number, firstIndex = 0): Buffer => {
  const images = frames.map((buffer) => PNG.sync.read(buffer));
  const cellW = Math.max(...images.map((img) => img.width));
  const cellH = Math.max(...images.map((img) => img.height));
  const header = GLYPH_H + 8;
  const gap = 6;
  const cols = Math.max(1, Math.min(columns, images.length));
  const rows = Math.ceil(images.length / cols);
  const sheet = new PNG({ width: cols * (cellW + gap) + gap, height: rows * (cellH + header + gap) + gap });
  for (let i = 0; i < sheet.data.length; i += 4) {
    sheet.data[i] = MARGIN_BG.r;
    sheet.data[i + 1] = MARGIN_BG.g;
    sheet.data[i + 2] = MARGIN_BG.b;
    sheet.data[i + 3] = 255;
  }
  images.forEach((img, n) => {
    const left = gap + (n % cols) * (cellW + gap);
    const top = gap + Math.floor(n / cols) * (cellH + header + gap);
    drawDigits(sheet, firstIndex + n, left + 2, top + 3, HIGHLIGHT);
    PNG.bitblt(img, sheet, 0, 0, img.width, img.height, left, top + header);
  });
  return PNG.sync.write(sheet);
};
