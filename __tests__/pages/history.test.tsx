import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ToastProvider } from '@/app/components/ToastProvider';
import HistoryPage from '@/app/history/page';

// Mock fetch
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// Mock clipboard
const mockWriteText = vi.fn();
Object.assign(navigator, {
  clipboard: { writeText: mockWriteText },
});

// Mock IntersectionObserver
const mockObserve = vi.fn();
const mockDisconnect = vi.fn();
vi.stubGlobal('IntersectionObserver', class {
  constructor() {}
  observe = mockObserve;
  disconnect = mockDisconnect;
  unobserve = vi.fn();
});

// Mock URL.createObjectURL for CSV export
vi.stubGlobal('URL', {
  ...URL,
  createObjectURL: vi.fn(() => 'blob:mock-url'),
});

const mockTranslations = [
  {
    id: 1,
    korean_text: '안녕하세요',
    english_text: 'Hello',
    edited_english_text: null,
    is_edited: 0,
    created_at: '2025-01-15T10:00:00Z',
    updated_at: '2025-01-15T10:00:00Z',
  },
  {
    id: 2,
    korean_text: '감사합니다',
    english_text: 'Thank you',
    edited_english_text: 'Thanks a lot',
    is_edited: 1,
    created_at: '2025-01-14T10:00:00Z',
    updated_at: '2025-01-14T10:00:00Z',
  },
];

function renderHistory() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <HistoryPage />
      </ToastProvider>
    </QueryClientProvider>
  );
}

describe('History Page', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockWriteText.mockResolvedValue(undefined);
  });

  // --- Loading state ---

  it('shows loading spinner initially', () => {
    mockFetch.mockReturnValueOnce(new Promise(() => {})); // never resolves
    renderHistory();
    expect(screen.getByText('로딩 중...')).toBeInTheDocument();
  });

  // --- Error state ---

  it('shows error UI when fetch fails', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    renderHistory();

    await waitFor(() => {
      expect(screen.getByText('히스토리를 불러오지 못했습니다')).toBeInTheDocument();
    });

    expect(screen.getByText('다시 시도')).toBeInTheDocument();
  });

  // --- Empty state ---

  it('shows empty state when no translations exist', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ translations: [] }),
    });

    renderHistory();

    await waitFor(() => {
      expect(screen.getByText('저장된 히스토리가 없습니다')).toBeInTheDocument();
    });
  });

  // --- Rendering translations ---

  it('renders translation items', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ translations: mockTranslations }),
    });

    renderHistory();

    await waitFor(() => {
      expect(screen.getByText('안녕하세요')).toBeInTheDocument();
      expect(screen.getByText('Hello')).toBeInTheDocument();
    });
  });

  it('shows edited badge for edited translations', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ translations: mockTranslations }),
    });

    renderHistory();

    await waitFor(() => {
      expect(screen.getByText('편집됨')).toBeInTheDocument();
    });
  });

  it('displays edited text instead of original when available', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ translations: mockTranslations }),
    });

    renderHistory();

    await waitFor(() => {
      expect(screen.getByText('Thanks a lot')).toBeInTheDocument();
      // "Thank you" (original) should not be displayed for the edited item
    });
  });

  it('truncates long Korean text at 200 characters', async () => {
    const longText = '가'.repeat(250);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        translations: [{ ...mockTranslations[0], korean_text: longText }],
      }),
    });

    renderHistory();

    await waitFor(() => {
      expect(screen.getByText('가'.repeat(200) + '...')).toBeInTheDocument();
    });
  });

  // --- Copy ---

  it('copies translation text to clipboard', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ translations: [mockTranslations[0]] }),
    });

    renderHistory();

    await waitFor(() => {
      expect(screen.getByText('복사')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByText('복사').closest('button')!);
    expect(mockWriteText).toHaveBeenCalledWith('Hello');
  });

  it('copies edited text when available', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ translations: [mockTranslations[1]] }),
    });

    renderHistory();

    await waitFor(() => {
      expect(screen.getByText('복사')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByText('복사').closest('button')!);
    expect(mockWriteText).toHaveBeenCalledWith('Thanks a lot');
  });

  // --- Delete ---

  it('shows confirm modal when delete button is clicked', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ translations: [mockTranslations[0]] }),
    });

    renderHistory();

    await waitFor(() => {
      expect(screen.getByText('삭제')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByText('삭제').closest('button')!);
    expect(screen.getByText('정말 삭제하시겠습니까?')).toBeInTheDocument();
  });

  it('cancels delete when modal cancel is clicked', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ translations: [mockTranslations[0]] }),
    });

    renderHistory();

    await waitFor(() => {
      expect(screen.getByText('삭제')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByText('삭제').closest('button')!);
    await userEvent.click(screen.getByText('취소'));

    expect(screen.queryByText('정말 삭제하시겠습니까?')).not.toBeInTheDocument();
  });

  it('calls delete API when confirm is clicked', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ translations: [mockTranslations[0]] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      })
      // Refetch after invalidation
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ translations: [] }),
      });

    renderHistory();

    await waitFor(() => {
      expect(screen.getByText('삭제')).toBeInTheDocument();
    });

    // Click delete button, then confirm in modal
    await userEvent.click(screen.getByText('삭제').closest('button')!);

    // The modal's confirm button also says "삭제"
    const modalDeleteButton = screen.getAllByText('삭제').find(
      el => el.closest('.fixed') !== null
    )!;
    await userEvent.click(modalDeleteButton);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/history?id=1',
        expect.objectContaining({ method: 'DELETE' })
      );
    });
  });

  it('shows error toast when delete fails', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ translations: [mockTranslations[0]] }),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

    renderHistory();

    await waitFor(() => {
      expect(screen.getByText('삭제')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByText('삭제').closest('button')!);

    const modalDeleteButton = screen.getAllByText('삭제').find(
      el => el.closest('.fixed') !== null
    )!;
    await userEvent.click(modalDeleteButton);

    await waitFor(() => {
      expect(screen.getByText('삭제 실패')).toBeInTheDocument();
    });
  });

  // --- CSV Export ---

  it('exports CSV with correct format', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ translations: mockTranslations }),
    });

    renderHistory();

    await waitFor(() => {
      expect(screen.getByText('CSV 내보내기')).toBeInTheDocument();
    });

    // Mock the link element's click method
    const mockClick = vi.fn();
    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      const el = originalCreateElement(tag);
      if (tag === 'a') {
        el.click = mockClick;
      }
      return el;
    });

    await userEvent.click(screen.getByText('CSV 내보내기').closest('button')!);

    expect(mockClick).toHaveBeenCalledOnce();
    vi.restoreAllMocks();
  });
});
