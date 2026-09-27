import { Canvas, EMPTY, type Rect } from './canvas.ts';
import { resolveProposalPixels, type AsciiBlock, type ColorRef, type ProposalInput } from './proposal.ts';

export interface SpriteDef {
  rows: string[];
  legend?: Record<string, ColorRef | null>;
}

export interface SpritePlacement {
  sprite: string;
  x: number;
  y: number;
  flipX?: boolean;
  flipY?: boolean;
}

export interface FrameSpec extends ProposalInput {
  /** Named sprites stamped at a position, applied before the frame's own ascii/pixels. */
  sprites?: SpritePlacement[];
  /** Show this frame for N consecutive frames (Pixelminter uses one fps for all frames). */
  hold?: number;
}

export interface AnimationInput {
  sprites?: Record<string, SpriteDef>;
  frames: FrameSpec[];
}

export type RepairMode = 'previous' | 'footprint';

export interface AnimationOptions {
  /** Drop sprite pixels that would cover someone else's painted pixel. */
  onlyEmpty: boolean;
  backgroundColors: number[];
  /** Frame 0 also repairs what the last frame covered, so the animation can repeat. */
  loop: boolean;
  /**
   * 'previous': each frame restores only what the previous frame covered (smallest
   * per-frame payload; exact when frames are painted in order).
   * 'footprint': each frame restores every pixel any frame covers (self-contained
   * frames, robust even if the background already shows another frame).
   */
  repair: RepairMode;
  /** Unpainted pixels can't be "unpainted" onchain: repaint them with palette 0 or leave them. */
  emptyRepair: 'palette0' | 'skip';
}

export interface BuiltFrame {
  /** Canvas index -> palette index: sprite pixels plus repairs. */
  pixels: Map<number, number>;
  spritePixels: number;
  repairPixels: number;
  /** Indices in `pixels` that are repairs (restore the snapshot) rather than sprite. */
  repairs: Set<number>;
  /** Pixels that actually change when frames are painted in order, starting from the snapshot. */
  sequentialDelta: number;
}

export interface BuiltAnimation {
  frames: BuiltFrame[];
  footprint: Set<number>;
  bbox: Rect | null;
  /** Delta of frame 0 when it follows the last frame (loop steady state). */
  loopDelta: number;
  skippedPainted: number;
  emptyRepairsSkipped: number;
  warnings: string[];
}

const MAX_FRAMES = 120;

const spriteToAscii = (sprite: SpriteDef, placement: SpritePlacement): AsciiBlock => {
  let rows = placement.flipY ? [...sprite.rows].reverse() : sprite.rows;
  if (placement.flipX) {
    const width = Math.max(...rows.map((row) => Array.from(row).length));
    rows = rows.map((row) => Array.from(row.padEnd(width, '.')).reverse().join(''));
  }
  return { x: placement.x, y: placement.y, rows, legend: sprite.legend };
};

/** Expands `hold` and turns sprite placements into ASCII blocks. */
export const expandFrames = (input: AnimationInput): { frames: ProposalInput[]; warnings: string[] } => {
  const warnings: string[] = [];
  const frames: ProposalInput[] = [];
  for (const spec of input.frames) {
    const ascii: AsciiBlock[] = [];
    for (const placement of spec.sprites ?? []) {
      const sprite = input.sprites?.[placement.sprite];
      if (!sprite) {
        warnings.push(`Unknown sprite "${placement.sprite}".`);
        continue;
      }
      ascii.push(spriteToAscii(sprite, placement));
    }
    const frame: ProposalInput = {
      rects: spec.rects,
      lines: spec.lines,
      ascii: [...ascii, ...(spec.ascii ?? [])],
      pixels: spec.pixels,
    };
    const hold = Math.max(1, Math.floor(spec.hold ?? 1));
    for (let i = 0; i < hold; i++) frames.push(frame);
  }
  if (frames.length > MAX_FRAMES) {
    warnings.push(`Animation truncated to ${MAX_FRAMES} frames.`);
    frames.length = MAX_FRAMES;
  }
  return { frames, warnings };
};

/**
 * One line per sprite: where it starts and ends and which way it travels, so
 * the author can check the sprite faces its direction of motion.
 */
export const describeMotion = (input: AnimationInput): string[] => {
  const tracks = new Map<string, SpritePlacement[]>();
  for (const spec of input.frames) {
    for (const placement of spec.sprites ?? []) {
      const hold = Math.max(1, Math.floor(spec.hold ?? 1));
      for (let i = 0; i < hold; i++) {
        if (!tracks.has(placement.sprite)) tracks.set(placement.sprite, []);
        tracks.get(placement.sprite)!.push(placement);
      }
    }
  }
  return [...tracks.entries()].map(([name, track]) => {
    const first = track[0];
    const last = track[track.length - 1];
    const dx = last.x - first.x;
    const dy = last.y - first.y;
    const direction = [dx > 0 ? 'right' : dx < 0 ? 'left' : '', dy > 0 ? 'down' : dy < 0 ? 'up' : '']
      .filter(Boolean)
      .join('+') || 'stationary';
    const flips = [...new Set(track.map((p) => [p.flipX ? 'flipX' : '', p.flipY ? 'flipY' : ''].filter(Boolean).join('+') || 'as drawn'))];
    return `${name}: (${first.x},${first.y}) -> (${last.x},${last.y}) over ${track.length} frames, moving ${direction}; orientation ${flips.join(' / ')}`;
  });
};

/**
 * Builds animation frames against a snapshot of the canvas taken before the
 * animation existed. Each frame = its sprite pixels + repairs that put back the
 * snapshot color wherever an earlier frame covered a pixel this frame doesn't.
 * Invariant: painting frames 0..k in order onto the snapshot yields exactly
 * snapshot + frame k's sprite (see tests).
 */
export const buildAnimation = (
  snapshot: Canvas,
  palette: string[],
  input: AnimationInput,
  options: AnimationOptions
): BuiltAnimation => {
  const size = snapshot.size;
  const background = new Set(options.backgroundColors);
  const expanded = expandFrames(input);
  const warnings = new Set(expanded.warnings);
  let skippedPainted = 0;

  const covers = expanded.frames.map((frame) => {
    const resolved = resolveProposalPixels(size, palette, frame);
    resolved.warnings.forEach((w) => warnings.add(w));
    if (!options.onlyEmpty) return resolved.requested;
    const kept = new Map<number, number>();
    for (const [index, color] of resolved.requested) {
      const current = snapshot.pixels[index];
      if (current !== EMPTY && !background.has(current) && current !== color) {
        skippedPainted++;
        continue;
      }
      kept.set(index, color);
    }
    return kept;
  });

  const footprint = new Set<number>();
  covers.forEach((cover) => cover.forEach((_, index) => footprint.add(index)));

  let emptyRepairsSkipped = 0;
  const repairColor = (index: number): number | null => {
    const original = snapshot.pixels[index];
    if (original !== EMPTY) return original;
    if (options.emptyRepair === 'skip') {
      emptyRepairsSkipped++;
      return null;
    }
    return 0;
  };

  const frames: BuiltFrame[] = covers.map((cover, k) => {
    const previous = k > 0 ? covers[k - 1] : options.loop && covers.length > 1 ? covers[covers.length - 1] : null;
    const toRepair: Iterable<number> = options.repair === 'footprint' ? footprint : previous?.keys() ?? [];
    const pixels = new Map(cover);
    const repairs = new Set<number>();
    for (const index of toRepair) {
      if (cover.has(index)) continue;
      const color = repairColor(index);
      if (color === null) continue;
      pixels.set(index, color);
      repairs.add(index);
    }
    return { pixels, spritePixels: cover.size, repairPixels: repairs.size, repairs, sequentialDelta: 0 };
  });

  // Simulate painting the frames in order, starting from the snapshot.
  const state = snapshot.pixels.slice();
  const paint = (frame: BuiltFrame) => {
    const delta = frameDelta(frame, state);
    delta.forEach((color, index) => { state[index] = color; });
    return delta.size;
  };
  frames.forEach((frame) => {
    frame.sequentialDelta = paint(frame);
  });
  const loopDelta = frames.length ? paint(frames[0]) : 0;

  let minX = Infinity, minY = Infinity, maxX = -1, maxY = -1;
  for (const index of footprint) {
    const x = index % size;
    const y = Math.floor(index / size);
    minX = Math.min(minX, x); maxX = Math.max(maxX, x);
    minY = Math.min(minY, y); maxY = Math.max(maxY, y);
  }

  if (emptyRepairsSkipped) {
    warnings.add(`${emptyRepairsSkipped} repairs target unpainted pixels and were skipped (emptyRepair: 'skip'); trails will remain there.`);
  }

  return {
    frames,
    footprint,
    bbox: footprint.size ? { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 } : null,
    loopDelta,
    skippedPainted,
    emptyRepairsSkipped,
    warnings: [...warnings],
  };
};

/**
 * Pixels of `frame` that change `state` (a canvas pixel array). A palette-0
 * repair on a still-unpainted pixel is skipped: BasePaint already shows empty
 * pixels as palette 0, so painting it would only spend brush strength.
 */
export const frameDelta = (frame: BuiltFrame, state: Uint8Array): Map<number, number> => {
  const delta = new Map<number, number>();
  for (const [index, color] of frame.pixels) {
    const current = state[index];
    if (current === color) continue;
    if (current === EMPTY && color === 0 && frame.repairs.has(index)) continue;
    delta.set(index, color);
  }
  return delta;
};

/**
 * Footprint pixels that someone else changed since the snapshot: the current
 * color is neither the snapshot color nor any color this animation paints there.
 * Repairs would overwrite that newer work.
 */
export const findConflicts = (snapshot: Canvas, current: Canvas, animation: BuiltAnimation): number[] => {
  const ours = new Map<number, Set<number>>();
  animation.frames.forEach((frame) =>
    frame.pixels.forEach((color, index) => {
      if (!ours.has(index)) ours.set(index, new Set());
      ours.get(index)!.add(color);
    })
  );
  const conflicts: number[] = [];
  for (const index of animation.footprint) {
    const now = current.pixels[index];
    if (now === snapshot.pixels[index] || ours.get(index)?.has(now)) continue;
    conflicts.push(index);
  }
  return conflicts;
};

export const encodeSnapshot = (canvas: Canvas): string => Buffer.from(canvas.pixels).toString('base64');

export const decodeSnapshot = (size: number, base64: string): Canvas => {
  const canvas = new Canvas(size);
  canvas.pixels.set(Buffer.from(base64, 'base64').subarray(0, size * size));
  return canvas;
};
