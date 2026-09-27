import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildAnimation, decodeSnapshot, describeMotion, encodeSnapshot, findConflicts, type AnimationInput, type AnimationOptions } from '../src/animation.ts';
import { Canvas, EMPTY } from '../src/canvas.ts';

const PALETTE = ['#000000', '#ffffff', '#ff0000', '#00ff00'];
const base: AnimationOptions = { onlyEmpty: false, backgroundColors: [], loop: true, repair: 'previous', emptyRepair: 'palette0' };

// A 3px red bar sliding right over a painted background.
const slide: AnimationInput = {
  sprites: { bar: { rows: ['222'] } },
  frames: [0, 2, 4, 6].map((x) => ({ sprites: [{ sprite: 'bar', x, y: 1 }] })),
};

const paintedSnapshot = () => {
  const canvas = new Canvas(12);
  for (let x = 0; x < 12; x++) canvas.set(x, 1, x % 2 ? 3 : 1);
  return canvas;
};

/** What frame k should look like: snapshot with only frame k's sprite on top. */
const expectedFrame = (snapshot: Canvas, sprite: Map<number, number>) => {
  const view = snapshot.pixels.slice();
  sprite.forEach((color, index) => { view[index] = color; });
  return view;
};

test('painting frames in order always equals snapshot + current sprite (previous repair)', () => {
  const snapshot = paintedSnapshot();
  const built = buildAnimation(snapshot, PALETTE, slide, base);
  const state = snapshot.pixels.slice();
  // Two full cycles to cover the loop repair on frame 0.
  for (let cycle = 0; cycle < 2; cycle++) {
    built.frames.forEach((frame, k) => {
      frame.pixels.forEach((color, index) => { state[index] = color; });
      const sprite = new Map([...frame.pixels].filter(([index]) => {
        const x = index % 12;
        return index >= 12 && index < 24 && x >= k * 2 && x < k * 2 + 3;
      }));
      assert.deepEqual(state, expectedFrame(snapshot, sprite), `cycle ${cycle} frame ${k}`);
    });
  }
});

test('repairs restore the uncovered pixels with their snapshot colors', () => {
  const snapshot = paintedSnapshot();
  const built = buildAnimation(snapshot, PALETTE, slide, base);
  const frame1 = built.frames[1];
  assert.equal(frame1.spritePixels, 3);
  // Bar moved from x=0..2 to x=2..4: x=0 and x=1 go back to the background.
  assert.equal(frame1.repairPixels, 2);
  assert.equal(frame1.pixels.get(12 + 0), 1);
  assert.equal(frame1.pixels.get(12 + 1), 3);
  // Loop: frame 0 repairs what the last frame (x=6..8) covered.
  assert.equal(built.frames[0].repairPixels, 3);
  assert.equal(built.frames[0].sequentialDelta, 3);
  assert.equal(built.loopDelta, 6);
});

test('footprint mode makes every frame self-contained', () => {
  const snapshot = paintedSnapshot();
  const built = buildAnimation(snapshot, PALETTE, slide, { ...base, repair: 'footprint' });
  built.frames.forEach((frame) => assert.equal(frame.pixels.size, built.footprint.size));
  // Any frame painted over any other frame shows exactly itself.
  const state = expectedFrame(snapshot, built.frames[3].pixels);
  built.frames[1].pixels.forEach((color, index) => { state[index] = color; });
  assert.deepEqual(state, expectedFrame(snapshot, built.frames[1].pixels));
});

test('unpainted pixels are repaired with palette 0 or skipped', () => {
  const snapshot = new Canvas(12);
  const palette0 = buildAnimation(snapshot, PALETTE, slide, base);
  assert.equal(palette0.frames[1].pixels.get(12), 0);
  // First pass: frame 0's loop repairs land on still-empty pixels, so nothing extra is painted.
  assert.equal(palette0.frames[0].sequentialDelta, 3);
  // Frame 1 does need to repaint x=0,1 (red -> palette 0).
  assert.equal(palette0.frames[1].sequentialDelta, 3 + 2 - 1);
  const skipped = buildAnimation(snapshot, PALETTE, slide, { ...base, emptyRepair: 'skip' });
  assert.equal(skipped.frames[1].pixels.has(12), false);
  assert.ok(skipped.emptyRepairsSkipped > 0);
});

test('hold, flips and unknown sprites', () => {
  const snapshot = new Canvas(8);
  const built = buildAnimation(snapshot, PALETTE, {
    sprites: { arrow: { rows: ['12'] } },
    frames: [{ sprites: [{ sprite: 'arrow', x: 0, y: 0, flipX: true }], hold: 3 }, { sprites: [{ sprite: 'nope', x: 0, y: 0 }] }],
  }, base);
  assert.equal(built.frames.length, 4);
  assert.equal(built.frames[0].pixels.get(0), 2);
  assert.equal(built.frames[0].pixels.get(1), 1);
  assert.ok(built.warnings.some((w) => w.includes('nope')));
});

test('conflicts flag footprint pixels changed by someone else', () => {
  const snapshot = paintedSnapshot();
  const built = buildAnimation(snapshot, PALETTE, slide, base);
  const current = snapshot.clone();
  current.set(0, 1, 2); // our own sprite color: not a conflict
  current.set(7, 1, 0); // someone painted black inside the footprint
  current.set(11, 1, 0); // outside the footprint
  assert.deepEqual(findConflicts(snapshot, current, built), [12 + 7]);
});

test('snapshot survives a base64 round trip', () => {
  const snapshot = paintedSnapshot();
  snapshot.set(3, 3, EMPTY);
  assert.deepEqual(decodeSnapshot(12, encodeSnapshot(snapshot)).pixels, snapshot.pixels);
});

test('describeMotion reports direction and orientation per sprite', () => {
  assert.deepEqual(describeMotion(slide), ['bar: (0,1) -> (6,1) over 4 frames, moving right; orientation as drawn']);
  const mirrored = describeMotion({ frames: [{ sprites: [{ sprite: 'f', x: 9, y: 0, flipX: true }], hold: 2 }, { sprites: [{ sprite: 'f', x: 1, y: 3, flipX: true }] }] });
  assert.deepEqual(mirrored, ['f: (9,0) -> (1,3) over 3 frames, moving left+down; orientation flipX']);
});
