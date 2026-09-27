/** @jest-environment node */
import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import { isValidProposalId, listProposals, readProposal } from '@/utils/aiProposals';

const write = (dir: string, id: string, updatedAt: string, pixels: Array<[number, number, number]>) =>
  fs.writeFile(
    path.join(dir, `${id}.proposal.json`),
    JSON.stringify({
      id, title: null, day: 7, theme: 'T', size: 256, palette: ['#000000'], pixels, stats: {}, createdAt: updatedAt, updatedAt,
    })
  );

describe('aiProposals', () => {
  let dir: string;

  beforeEach(async () => {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), 'proposals-'));
    process.env.BASEPAINT_PROPOSALS_DIR = dir;
  });

  afterEach(async () => {
    delete process.env.BASEPAINT_PROPOSALS_DIR;
    await fs.rm(dir, { recursive: true, force: true });
  });

  it('lists proposals newest first with pixel counts and ignores other files', async () => {
    await write(dir, 'd7-old', '2026-01-01T00:00:00.000Z', [[0, 0, 0]]);
    await write(dir, 'd7-new', '2026-01-02T00:00:00.000Z', [[0, 0, 0], [1, 0, 0]]);
    await fs.writeFile(path.join(dir, 'd7-new.input.json'), '{}');

    const list = await listProposals();
    expect(list.map((p) => [p.id, p.pixelCount])).toEqual([['d7-new', 2], ['d7-old', 1]]);
    expect(list[0]).not.toHaveProperty('pixels');
  });

  it('summarises animations by frame count and total frame pixels', async () => {
    await fs.writeFile(
      path.join(dir, 'a7-anim.proposal.json'),
      JSON.stringify({
        id: 'a7-anim', title: 'Fish', day: 7, theme: 'T', size: 256, palette: ['#000000'], kind: 'animation', fps: 8,
        repair: 'previous', stats: {}, createdAt: 'x', updatedAt: '2026-01-03T00:00:00.000Z',
        frames: [{ pixels: [[0, 0, 0]], spritePixels: 1, repairPixels: 0 }, { pixels: [[1, 0, 0], [0, 0, 0]], spritePixels: 1, repairPixels: 1 }],
      })
    );
    const [summary] = await listProposals();
    expect(summary).toMatchObject({ id: 'a7-anim', kind: 'animation', frameCount: 2, pixelCount: 3 });
  });

  it('returns an empty list when the folder does not exist', async () => {
    process.env.BASEPAINT_PROPOSALS_DIR = path.join(dir, 'missing');
    await expect(listProposals()).resolves.toEqual([]);
  });

  it('rejects ids that could escape the folder', async () => {
    expect(isValidProposalId('../secret')).toBe(false);
    expect(isValidProposalId('d7-abc_1')).toBe(true);
    await expect(readProposal('../secret')).resolves.toBeNull();
  });
});
