import { EMPTY, clampRect, indexToChar, type Canvas, type Rect } from './canvas.ts';

export interface AnalysisOptions {
  rect: Rect;
  /** Tile edge in pixels for the density heatmap and sparse-region detection. */
  tileSize: number;
  /** Palette indices treated as "background" (paintable) in addition to empty pixels. */
  backgroundColors: number[];
  maxResults: number;
  /** Tiles with 0 < density <= this value count as sparse (sketches, unfinished areas). */
  sparseThreshold: number;
  /** Edge of the windows used to rank sparse areas. */
  windowSize: number;
  /** Minimum side length for reported open rectangles. */
  minRectSide: number;
}

interface ColorCount {
  index: number;
  hex: string;
  pixels: number;
}

interface Region extends Rect {
  sparseTiles: number;
  pixels: number;
  density: number;
  colors: string;
  authors: string;
}

const pct = (value: number) => `${(value * 100).toFixed(1)}%`;

/** Largest axis-aligned rectangle of open cells (histogram + monotonic stack). */
const largestOpenRect = (open: Uint8Array, rect: Rect, minSide: number): (Rect & { area: number }) | null => {
  const heights = new Int32Array(rect.width);
  let best: (Rect & { area: number }) | null = null;
  for (let row = 0; row < rect.height; row++) {
    for (let col = 0; col < rect.width; col++) {
      heights[col] = open[row * rect.width + col] ? heights[col] + 1 : 0;
    }
    const stack: number[] = [];
    for (let col = 0; col <= rect.width; col++) {
      const h = col < rect.width ? heights[col] : 0;
      while (stack.length && heights[stack[stack.length - 1]] >= h) {
        const height = heights[stack.pop()!];
        const left = stack.length ? stack[stack.length - 1] + 1 : 0;
        const width = col - left;
        const area = width * height;
        if (width >= minSide && height >= minSide && area > (best?.area ?? 0)) {
          best = { x: rect.x + left, y: rect.y + row - height + 1, width, height, area };
        }
      }
      stack.push(col);
    }
  }
  return best;
};

export const analyzeCanvas = (canvas: Canvas, palette: string[], options: AnalysisOptions) => {
  const { rect, tileSize, backgroundColors, maxResults, sparseThreshold, windowSize, minRectSide } = options;
  const background = new Set(backgroundColors);
  const isOpen = (color: number) => color === EMPTY || background.has(color);

  // Open-pixel mask local to the analysed rect.
  const open = new Uint8Array(rect.width * rect.height);
  const colorCounts = new Map<number, number>();
  const authorCounts = new Map<string, number>();
  let empty = 0;
  for (let y = 0; y < rect.height; y++) {
    for (let x = 0; x < rect.width; x++) {
      const color = canvas.get(rect.x + x, rect.y + y);
      if (color === EMPTY) {
        empty++;
      } else {
        colorCounts.set(color, (colorCounts.get(color) ?? 0) + 1);
        const author = canvas.authorAt(rect.x + x, rect.y + y);
        if (author) authorCounts.set(author, (authorCounts.get(author) ?? 0) + 1);
      }
      if (isOpen(color)) open[y * rect.width + x] = 1;
    }
  }
  const total = rect.width * rect.height;

  const colors: ColorCount[] = [...colorCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([index, pixels]) => ({ index, hex: palette[index] ?? '?', pixels }));

  const topColors = (counts: Map<number, number>) =>
    [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([index, count]) => `${indexToChar(index)}:${count}`)
      .join(' ');

  // Tile densities (share of non-open pixels per tile).
  const cols = Math.ceil(rect.width / tileSize);
  const rows = Math.ceil(rect.height / tileSize);
  const density = new Float32Array(cols * rows);
  for (let ty = 0; ty < rows; ty++) {
    for (let tx = 0; tx < cols; tx++) {
      let filled = 0;
      let cells = 0;
      for (let y = ty * tileSize; y < Math.min((ty + 1) * tileSize, rect.height); y++) {
        for (let x = tx * tileSize; x < Math.min((tx + 1) * tileSize, rect.width); x++) {
          cells++;
          if (!open[y * rect.width + x]) filled++;
        }
      }
      density[ty * cols + tx] = filled / cells;
    }
  }

  const heatmapLines = [`     ${Array.from({ length: cols }, (_, c) => indexToChar(c % 36)).join('')}`];
  for (let ty = 0; ty < rows; ty++) {
    let line = `${String(rect.y + ty * tileSize).padStart(3, ' ')}  `;
    for (let tx = 0; tx < cols; tx++) {
      const d = density[ty * cols + tx];
      line += d === 0 ? '.' : d >= 0.98 ? '#' : String(Math.max(1, Math.floor(d * 10)));
    }
    heatmapLines.push(line);
  }

  // Sparse tiles (sketch lines, half-finished areas) ranked by window: each
  // candidate is a windowSize square scored by how many sparse tiles it holds,
  // picked greedily without overlap so every result is a concrete crop to zoom into.
  const sparseTile = new Uint8Array(cols * rows);
  density.forEach((d, i) => {
    if (d > 0 && d <= sparseThreshold) sparseTile[i] = 1;
  });
  const span = Math.max(1, Math.round(windowSize / tileSize));
  const taken = new Uint8Array(cols * rows);
  const sparseRegions: Region[] = [];
  while (sparseRegions.length < maxResults) {
    let best = { score: 0, tx: 0, ty: 0 };
    for (let ty = 0; ty + span <= Math.max(rows, span); ty++) {
      for (let tx = 0; tx + span <= Math.max(cols, span); tx++) {
        let score = 0;
        let blocked = false;
        for (let y = ty; y < Math.min(ty + span, rows) && !blocked; y++) {
          for (let x = tx; x < Math.min(tx + span, cols); x++) {
            if (taken[y * cols + x]) { blocked = true; break; }
            score += sparseTile[y * cols + x];
          }
        }
        if (!blocked && score > best.score) best = { score, tx, ty };
      }
    }
    if (best.score < Math.max(2, Math.ceil((span * span) / 8))) break;
    for (let y = best.ty; y < Math.min(best.ty + span, rows); y++) {
      taken.fill(1, y * cols + best.tx, y * cols + Math.min(best.tx + span, cols));
    }

    const region: Rect = clampRect(canvas.size, {
      x: rect.x + best.tx * tileSize,
      y: rect.y + best.ty * tileSize,
      width: Math.min(span * tileSize, rect.x + rect.width - (rect.x + best.tx * tileSize)),
      height: Math.min(span * tileSize, rect.y + rect.height - (rect.y + best.ty * tileSize)),
    });
    const regionColors = new Map<number, number>();
    const regionAuthors = new Map<string, number>();
    let pixels = 0;
    for (let y = region.y; y < region.y + region.height; y++) {
      for (let x = region.x; x < region.x + region.width; x++) {
        const color = canvas.get(x, y);
        if (isOpen(color)) continue;
        pixels++;
        regionColors.set(color, (regionColors.get(color) ?? 0) + 1);
        const author = canvas.authorAt(x, y);
        if (author) regionAuthors.set(author, (regionAuthors.get(author) ?? 0) + 1);
      }
    }
    sparseRegions.push({
      ...region,
      sparseTiles: best.score,
      pixels,
      density: pixels / (region.width * region.height),
      colors: topColors(regionColors),
      authors: [...regionAuthors.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 2)
        .map(([author, count]) => `${author.slice(0, 8)}…(${count})`)
        .join(' '),
    });
  }

  // Largest open rectangles, carved out one after another so they don't overlap.
  const openRects: Array<Rect & { area: number }> = [];
  const carve = open.slice();
  for (let i = 0; i < maxResults; i++) {
    const found = largestOpenRect(carve, rect, minRectSide);
    if (!found) break;
    openRects.push(found);
    for (let y = found.y - rect.y; y < found.y - rect.y + found.height; y++) {
      carve.fill(0, y * rect.width + (found.x - rect.x), y * rect.width + (found.x - rect.x) + found.width);
    }
  }

  const contributors = [...authorCounts.entries()].sort((a, b) => b[1] - a[1]);

  const lines: string[] = [];
  lines.push(`Region x=${rect.x} y=${rect.y} ${rect.width}x${rect.height} (${total} px)`);
  lines.push(`Painted: ${total - empty} (${pct((total - empty) / total)}), unpainted: ${empty} (${pct(empty / total)})`);
  if (background.size) {
    const openCount = open.reduce((sum, value) => sum + value, 0);
    lines.push(`Open incl. background colors [${[...background].join(',')}]: ${openCount} (${pct(openCount / total)})`);
  }
  lines.push('');
  lines.push('Color usage (char = legend used by region/proposal tools):');
  colors.forEach((c) => lines.push(`  ${indexToChar(c.index)} ${c.hex}  ${c.pixels} px (${pct(c.pixels / total)})`));
  const unused = palette.map((_, i) => i).filter((i) => !colorCounts.has(i));
  if (unused.length) lines.push(`  unused: ${unused.map((i) => `${indexToChar(i)} ${palette[i]}`).join(', ')}`);
  lines.push('');
  lines.push(`Density heatmap, ${tileSize}px tiles ('.' open, 1-9 = tenths painted, '#' full). Column c starts at x=${rect.x}+c*${tileSize}:`);
  lines.push(...heatmapLines);
  lines.push('');
  lines.push(`Unfinished areas: ${windowSize}px windows ranked by sparse tiles (0 < density <= ${pct(sparseThreshold)}; sketches, outlines, half-done work):`);
  if (!sparseRegions.length) lines.push('  none');
  sparseRegions.forEach((r, i) =>
    lines.push(`  #${i + 1} x=${r.x} y=${r.y} ${r.width}x${r.height}  sparse tiles ${r.sparseTiles}/${span * span}  painted ${r.pixels} (${pct(r.density)})  colors ${r.colors}  by ${r.authors || 'n/a'}`)
  );
  lines.push('');
  lines.push(`Largest open rectangles (min side ${minRectSide}px, non-overlapping):`);
  if (!openRects.length) lines.push('  none');
  openRects.forEach((r, i) => lines.push(`  #${i + 1} x=${r.x} y=${r.y} ${r.width}x${r.height} (${r.area} px)`));
  if (contributors.length) {
    lines.push('');
    lines.push(`Visible pixels by author (${contributors.length} authors, top 10):`);
    contributors.slice(0, 10).forEach(([author, count]) => lines.push(`  ${author} ${count} (${pct(count / (total - empty || 1))})`));
  }

  return { text: lines.join('\n'), sparseRegions, openRects, colors };
};
