/* eslint-env jest */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useEndOfDayDisable } from '../useEndOfDayDisable';

// Helper function to create a date in Colombia timezone (UTC-5)
const createColombiaDate = (hours: number, minutes: number): Date => {
  const date = new Date();
  // Set UTC time that corresponds to the desired Colombia time
  // Colombia is UTC-5, so we add 5 hours to get UTC time
  date.setUTCHours(hours + 5, minutes, 0, 0);
  return date;
};

describe('useEndOfDayDisable', () => {
  let originalDateNow: () => number;

  beforeEach(() => {
    // Save original Date.now
    originalDateNow = Date.now;
    jest.useFakeTimers();
  });

  afterEach(() => {
    // Restore original Date.now
    Date.now = originalDateNow;
    jest.useRealTimers();
  });

  it('should return false when time is before 11:25 AM Colombia time', () => {
    // Mock time to be 10:00 AM Colombia time
    const mockDate = createColombiaDate(10, 0);
    jest.setSystemTime(mockDate);

    const { result } = renderHook(() => useEndOfDayDisable());

    expect(result.current).toBe(false);
  });

  it('should return true when time is exactly 11:25 AM Colombia time', () => {
    // Mock time to be 11:25 AM Colombia time
    const mockDate = createColombiaDate(11, 25);
    jest.setSystemTime(mockDate);

    const { result } = renderHook(() => useEndOfDayDisable());

    expect(result.current).toBe(true);
  });

  it('should return true when time is between 11:25 AM and 11:40 AM Colombia time', () => {
    // Mock time to be 11:30 AM Colombia time
    const mockDate = createColombiaDate(11, 30);
    jest.setSystemTime(mockDate);

    const { result } = renderHook(() => useEndOfDayDisable());

    expect(result.current).toBe(true);
  });

  it('should return true when time is 11:39 AM Colombia time (last minute)', () => {
    // Mock time to be 11:39 AM Colombia time
    const mockDate = createColombiaDate(11, 39);
    jest.setSystemTime(mockDate);

    const { result } = renderHook(() => useEndOfDayDisable());

    expect(result.current).toBe(true);
  });

  it('should return false when time is exactly 11:40 AM Colombia time', () => {
    // Mock time to be 11:40 AM Colombia time (end of disable period)
    const mockDate = createColombiaDate(11, 40);
    jest.setSystemTime(mockDate);

    const { result } = renderHook(() => useEndOfDayDisable());

    expect(result.current).toBe(false);
  });

  it('should return false when time is after 11:40 AM Colombia time', () => {
    // Mock time to be 12:00 PM Colombia time
    const mockDate = createColombiaDate(12, 0);
    jest.setSystemTime(mockDate);

    const { result } = renderHook(() => useEndOfDayDisable());

    expect(result.current).toBe(false);
  });

  it('should update when time crosses into disable period', async () => {
    // Start at 11:24 AM Colombia time (before disable period)
    const initialDate = createColombiaDate(11, 24);
    jest.setSystemTime(initialDate);

    const { result } = renderHook(() => useEndOfDayDisable());

    // Should be false initially
    expect(result.current).toBe(false);

    // Advance time to 11:26 AM (during disable period)
    act(() => {
      const newDate = createColombiaDate(11, 26);
      jest.setSystemTime(newDate);
      jest.advanceTimersByTime(30000); // Advance by 30 seconds (interval time)
    });

    // Wait for the state to update
    await waitFor(() => {
      expect(result.current).toBe(true);
    });
  });

  it('should update when time crosses out of disable period', async () => {
    // Start at 11:39 AM Colombia time (during disable period)
    const initialDate = createColombiaDate(11, 39);
    jest.setSystemTime(initialDate);

    const { result } = renderHook(() => useEndOfDayDisable());

    // Should be true initially
    expect(result.current).toBe(true);

    // Advance time to 11:41 AM (after disable period)
    act(() => {
      const newDate = createColombiaDate(11, 41);
      jest.setSystemTime(newDate);
      jest.advanceTimersByTime(30000); // Advance by 30 seconds
    });

    // Wait for the state to update
    await waitFor(() => {
      expect(result.current).toBe(false);
    });
  });

  it('should handle timezone conversion correctly for users in different timezones', () => {
    // Simulate a user in Japan (UTC+9) when it's 11:30 AM in Colombia
    // 11:30 AM Colombia (UTC-5) = 16:30 UTC = 01:30 AM next day in Japan (UTC+9)
    const colombiaTime = createColombiaDate(11, 30);
    jest.setSystemTime(colombiaTime);

    const { result } = renderHook(() => useEndOfDayDisable());

    // Should be disabled regardless of user's local timezone
    expect(result.current).toBe(true);
  });

  it('should clean up interval on unmount', () => {
    const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
    const mockDate = createColombiaDate(10, 0);
    jest.setSystemTime(mockDate);

    const { unmount } = renderHook(() => useEndOfDayDisable());

    unmount();

    expect(clearIntervalSpy).toHaveBeenCalled();
    clearIntervalSpy.mockRestore();
  });

  it('should check time every 30 seconds', async () => {
    const mockDate = createColombiaDate(11, 24);
    jest.setSystemTime(mockDate);

    const { result } = renderHook(() => useEndOfDayDisable());

    expect(result.current).toBe(false);

    // Advance time by 30 seconds and change the system time
    act(() => {
      const newDate = createColombiaDate(11, 26);
      jest.setSystemTime(newDate);
      jest.advanceTimersByTime(30000);
    });

    await waitFor(() => {
      expect(result.current).toBe(true);
    });

    // Advance another 30 seconds
    act(() => {
      jest.advanceTimersByTime(30000);
    });

    // Should still be true as we're still in the disable period
    expect(result.current).toBe(true);
  });
});
