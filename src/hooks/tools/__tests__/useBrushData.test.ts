/** @jest-environment node */
import { findOwnedTokens } from '@/hooks/tools/useBrushData';
import { baseClient } from '@/hooks/useDateUtils';

jest.mock('wagmi', () => ({ useAccount: () => ({ address: undefined }) }));
jest.mock('@/hooks/useDateUtils', () => ({
  baseClient: { readContract: jest.fn(), multicall: jest.fn() },
}));

const ME = '0x6fe1e006ad733717539bac3f7e73470fc5b34bad';
const OTHER = '0x0000000000000000000000000000000000000001';
const client = baseClient as unknown as { readContract: jest.Mock; multicall: jest.Mock };

type Call = { args: [bigint] };
const ownersBy = (owned: number[]) => ({ contracts }: { contracts: Call[] }) =>
  Promise.resolve(
    contracts.map(({ args: [id] }) => ({
      status: 'success',
      result: owned.includes(Number(id)) ? ME.toUpperCase().replace('0X', '0x') : OTHER,
    }))
  );

describe('findOwnedTokens', () => {
  beforeEach(() => {
    client.readContract.mockReset().mockResolvedValue(600n);
    client.multicall.mockReset();
  });

  it('scans newest tokens first and stops once balanceOf tokens are found', async () => {
    client.multicall.mockImplementation(ownersBy([590, 420]));
    await expect(findOwnedTokens(ME, 2, () => false)).resolves.toEqual([420, 590]);
    // 600..351 covers both tokens: one batch of 250 ids, nothing older is read.
    expect(client.multicall).toHaveBeenCalledTimes(1);
    const firstIds = client.multicall.mock.calls[0][0].contracts.map((c: Call) => Number(c.args[0]));
    expect(firstIds[0]).toBe(600);
    expect(firstIds).toHaveLength(250);
  });

  it('keeps scanning down to token 1 when needed', async () => {
    client.multicall.mockImplementation(ownersBy([1]));
    await expect(findOwnedTokens(ME, 1, () => false)).resolves.toEqual([1]);
    expect(client.multicall).toHaveBeenCalledTimes(3); // 600-351, 350-101, 100-1
  });

  it('retries a batch when the whole RPC request failed', async () => {
    client.multicall
      .mockResolvedValueOnce(Array.from({ length: 250 }, () => ({ status: 'failure', error: new Error('HTTP') })))
      .mockImplementation(ownersBy([599]));
    await expect(findOwnedTokens(ME, 1, () => false)).resolves.toEqual([599]);
    expect(client.multicall).toHaveBeenCalledTimes(2);
  });

  it('stops when cancelled', async () => {
    client.multicall.mockImplementation(ownersBy([]));
    await expect(findOwnedTokens(ME, 1, () => true)).resolves.toEqual([]);
    expect(client.multicall).not.toHaveBeenCalled();
  });
});
