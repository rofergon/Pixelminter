import { renderHook, waitFor } from '@testing-library/react';
import { useAddressName } from '../useAddressName';
import { useEnsName } from 'wagmi';

// Mock wagmi hooks
jest.mock('wagmi', () => ({
  useEnsName: jest.fn(),
}));

describe('useAddressName', () => {
  const mockAddress = '0x1234567890123456789012345678901234567890';
  const mockEnsName = 'vitalik.eth';

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should return fallback for null address', () => {
    (useEnsName as jest.Mock).mockReturnValue({
      data: null,
      isLoading: false,
    });

    const { result } = renderHook(() => useAddressName(null));

    expect(result.current.displayName).toBe('—');
    expect(result.current.isLoading).toBe(false);
  });

  it('should return fallback for undefined address', () => {
    (useEnsName as jest.Mock).mockReturnValue({
      data: null,
      isLoading: false,
    });

    const { result } = renderHook(() => useAddressName(undefined));

    expect(result.current.displayName).toBe('—');
    expect(result.current.isLoading).toBe(false);
  });

  it('should return ENS name when available', async () => {
    (useEnsName as jest.Mock).mockReturnValue({
      data: mockEnsName,
      isLoading: false,
    });

    const { result } = renderHook(() => useAddressName(mockAddress));

    await waitFor(() => {
      expect(result.current.displayName).toBe(mockEnsName);
      expect(result.current.isLoading).toBe(false);
    });
  });

  it('should show loading state when ENS is loading', () => {
    (useEnsName as jest.Mock).mockReturnValue({
      data: null,
      isLoading: true,
    });

    const { result } = renderHook(() => useAddressName(mockAddress));

    expect(result.current.isLoading).toBe(true);
  });

  it('should attempt Basename resolution when ENS is not available', async () => {
    const mockBasename = 'test.base.eth';
    
    (useEnsName as jest.Mock).mockReturnValue({
      data: null,
      isLoading: false,
    });

    // Mock successful basename resolution
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      json: async () => ({
        result: '0x' + Buffer.from(mockBasename).toString('hex').padStart(128, '0'),
      }),
    });

    const { result } = renderHook(() => useAddressName(mockAddress));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Since basename decoding is complex, we just verify fetch was called
    expect(global.fetch).toHaveBeenCalledWith(
      'https://mainnet.base.org',
      expect.objectContaining({
        method: 'POST',
      })
    );
  });

  it('should fallback to shortened address when ENS and Basename fail', async () => {
    (useEnsName as jest.Mock).mockReturnValue({
      data: null,
      isLoading: false,
    });

    // Mock failed basename resolution
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      json: async () => ({
        result: '0x',
      }),
    });

    const { result } = renderHook(() => useAddressName(mockAddress));

    await waitFor(() => {
      expect(result.current.displayName).toBe('0x1234…7890');
      expect(result.current.isLoading).toBe(false);
    });
  });

  it('should handle fetch errors gracefully', async () => {
    (useEnsName as jest.Mock).mockReturnValue({
      data: null,
      isLoading: false,
    });

    // Mock fetch error
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useAddressName(mockAddress));

    await waitFor(() => {
      expect(result.current.displayName).toBe('0x1234…7890');
      expect(result.current.isLoading).toBe(false);
    });
  });

  it('should update when address changes', async () => {
    const newAddress = '0x9876543210987654321098765432109876543210';
    
    (useEnsName as jest.Mock).mockReturnValue({
      data: null,
      isLoading: false,
    });

    (global.fetch as jest.Mock).mockResolvedValue({
      json: async () => ({ result: '0x' }),
    });

    const { result, rerender } = renderHook(
      ({ addr }) => useAddressName(addr),
      { initialProps: { addr: mockAddress } }
    );

    await waitFor(() => {
      expect(result.current.displayName).toBe('0x1234…7890');
    });

    // Change address
    rerender({ addr: newAddress });

    await waitFor(() => {
      expect(result.current.displayName).toBe('0x9876…3210');
    });
  });
});
