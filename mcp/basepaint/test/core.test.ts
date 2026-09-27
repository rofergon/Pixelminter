import assert from 'node:assert/strict';
import { test } from 'node:test';
import { PNG } from 'pngjs';
import { analyzeCanvas } from '../src/analysis.ts';
import { Canvas, EMPTY, clampRect, regionToAscii } from '../src/canvas.ts';
import { applyProposal, buildProposal, encodeProposal } from '../src/proposal.ts';
import { renderCanvas } from '../src/render.ts';

const PALETTE = ['#000000', '#ffffff', '#ff0000', '#00ff00'];
const noOptions = { onlyEmpty: false, backgroundColors: [] };

test('applyPixelBytes decodes [x, y, color] triplets and tracks authors', () => {
  const canvas = new Canvas(16);
  // (1,2)=color 3, (15,15)=color 1, (20,0) is out of bounds
  const applied = canvas.applyPixelBytes('0x010203' + '0f0f01' + '140001', '0xAbC');
  assert.equal(applied, 2);
  assert.equal(canvas.get(1, 2), 3);
  assert.equal(canvas.get(15, 15), 1);
  assert.equal(canvas.get(0, 0), EMPTY);
  assert.equal(canvas.authorAt(1, 2), '0xabc');
  assert.equal(canvas.countFilled(), 2);
});

test('regionToAscii prints rulers, y labels and base-36 colors', () => {
  const canvas = new Canvas(16);
  canvas.set(10, 3, 2);
  const ascii = regionToAscii(canvas, { x: 9, y: 3, width: 3, height: 2 });
  assert.deepEqual(ascii.split('\n'), [
    '        ',
    '      11',
    '     901',
    '  3  .2.',
    '  4  ...',
  ]);
});

test('buildProposal layers rects, lines, ascii and pixels and drops no-ops', () => {
  const canvas = new Canvas(16);
  canvas.set(0, 0, 1);
  const built = buildProposal(
    canvas,
    PALETTE,
    {
      rects: [{ x: 0, y: 0, width: 2, height: 2, color: 1 }],
      lines: [{ x1: 0, y1: 5, x2: 3, y2: 5, color: '#ff1010' }],
      ascii: [{ x: 4, y: 0, rows: ['2.2', 'RR'], legend: { R: 3 } }],
      pixels: [[1, 1, 0], [99, 0, 1]],
    },
    noOptions
  );
  assert.equal(built.stats.unchanged, 1); // (0,0) already white
  assert.equal(built.stats.outOfBounds, 1);
  assert.equal(built.ops.get(1 * 16 + 1), 0); // pixel overrides rect
  assert.equal(built.ops.get(5 * 16 + 2), 2); // hex snapped to red
  assert.equal(built.ops.get(0 * 16 + 5), undefined); // '.' is transparent
  assert.equal(built.ops.get(1 * 16 + 5), 3);
  assert.deepEqual(built.bbox, { x: 0, y: 0, width: 7, height: 6 });
});

test('onlyEmpty protects painted pixels except background colors', () => {
  const canvas = new Canvas(8);
  canvas.set(0, 0, 2); // someone's art
  canvas.set(1, 0, 0); // flat background
  const built = buildProposal(
    canvas,
    PALETTE,
    { pixels: [[0, 0, 1], [1, 0, 1], [2, 0, 1]] },
    { onlyEmpty: true, backgroundColors: [0] }
  );
  assert.equal(built.stats.skippedPainted, 1);
  assert.equal(built.stats.overwrites, 1);
  assert.equal(built.stats.onEmpty, 1);
  assert.equal(built.ops.has(0), false);
});

test('invalid colors and unknown ascii chars are reported, not painted', () => {
  const canvas = new Canvas(8);
  const built = buildProposal(canvas, PALETTE, { pixels: [[0, 0, 9]], ascii: [{ x: 0, y: 1, rows: ['z!'] }] }, noOptions);
  assert.equal(built.ops.size, 0);
  assert.equal(built.stats.invalid, 3);
  assert.ok(built.warnings.length >= 2);
});

test('encodeProposal emits row-major chunks that round-trip through the canvas', () => {
  const canvas = new Canvas(16);
  const built = buildProposal(canvas, PALETTE, { pixels: [[3, 2, 1], [1, 0, 2], [0, 2, 3]] }, noOptions);
  const chunks = encodeProposal(built.ops, 16, 2);
  assert.deepEqual(chunks, ['0x010002' + '000203', '0x030201']);
  const replay = new Canvas(16);
  chunks.forEach((hex) => replay.applyPixelBytes(hex));
  const expected = applyProposal(canvas, built.ops);
  assert.deepEqual(replay.pixels, expected.pixels);
});

test('analyzeCanvas finds open rectangles and sparse sketch regions', () => {
  const canvas = new Canvas(32);
  // Fill the left half solid, leave the right half empty except a sketch line.
  for (let y = 0; y < 32; y++) for (let x = 0; x < 16; x++) canvas.set(x, y, 1);
  for (let y = 0; y < 10; y++) canvas.set(24, y, 2);
  const result = analyzeCanvas(canvas, PALETTE, {
    rect: clampRect(32, {}),
    tileSize: 8,
    backgroundColors: [],
    maxResults: 3,
    sparseThreshold: 0.35,
    windowSize: 16,
    minRectSide: 4,
  });
  assert.deepEqual(
    { x: result.openRects[0].x, y: result.openRects[0].y, w: result.openRects[0].width, h: result.openRects[0].height },
    { x: 16, y: 10, w: 16, h: 22 }
  );
  assert.equal(result.sparseRegions.length, 1);
  assert.deepEqual(
    { x: result.sparseRegions[0].x, y: result.sparseRegions[0].y, h: result.sparseRegions[0].height },
    { x: 16, y: 0, h: 16 }
  );
  assert.match(result.text, /Largest open rectangles/);
});

test('renderCanvas produces a labelled PNG of the expected size', () => {
  const canvas = new Canvas(16);
  canvas.set(0, 0, 2);
  const buffer = renderCanvas(canvas, { rect: clampRect(16, {}), scale: 4, palette: PALETTE, grid: 4 });
  const png = PNG.sync.read(buffer);
  assert.ok(png.width > 64 && png.height > 64);
  const unlabelled = PNG.sync.read(renderCanvas(canvas, { rect: clampRect(16, {}), scale: 4, palette: PALETTE, labels: false }));
  assert.equal(unlabelled.width, 64);
  // Top-left pixel (not on a grid line since grid is off) is pure red.
  assert.deepEqual([...unlabelled.data.slice(4 * 65, 4 * 65 + 4)], [255, 0, 0, 255]);
});
