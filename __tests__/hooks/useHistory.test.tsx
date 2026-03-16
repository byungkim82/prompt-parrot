import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useHistory } from '@/app/hooks/useHistory';
import { ReactNode } from 'react';

// Mock fetch
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }
  return Wrapper;
}

function makeTranslations(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    korean_text: `한국어${i}`,
    english_text: `English${i}`,
    edited_english_text: null,
    is_edited: 0,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  }));
}

describe('useHistory', () => {
  beforeEach(() => vi.resetAllMocks());

  it('fetches initial page with offset=0', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ translations: makeTranslations(5) }),
    });

    const { result } = renderHook(() => useHistory(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockFetch).toHaveBeenCalledWith('/api/history?offset=0');
    expect(result.current.data?.pages[0]).toHaveLength(5);
  });

  it('returns hasNextPage=false when less than 20 items', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ translations: makeTranslations(10) }),
    });

    const { result } = renderHook(() => useHistory(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.hasNextPage).toBe(false);
  });

  it('returns hasNextPage=true when exactly 20 items', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ translations: makeTranslations(20) }),
    });

    const { result } = renderHook(() => useHistory(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.hasNextPage).toBe(true);
  });

  it('fetches next page with correct offset', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ translations: makeTranslations(20) }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ translations: makeTranslations(5) }),
      });

    const { result } = renderHook(() => useHistory(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    result.current.fetchNextPage();

    await waitFor(() => expect(result.current.data?.pages).toHaveLength(2));

    expect(mockFetch).toHaveBeenCalledWith('/api/history?offset=20');
    expect(result.current.hasNextPage).toBe(false);
  });

  it('sets error state on non-ok response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    const { result } = renderHook(() => useHistory(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe('히스토리 조회 실패');
  });

  it('returns empty array for empty table', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ translations: [] }),
    });

    const { result } = renderHook(() => useHistory(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.pages[0]).toHaveLength(0);
    expect(result.current.hasNextPage).toBe(false);
  });
});
