import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ToastProvider } from '@/app/components/ToastProvider';
import Home from '@/app/page';

// Mock fetch
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// Mock clipboard
const mockWriteText = vi.fn();
Object.assign(navigator, {
  clipboard: { writeText: mockWriteText },
});

function renderHome() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <Home />
      </ToastProvider>
    </QueryClientProvider>
  );
}

describe('Home Page', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockWriteText.mockResolvedValue(undefined);
  });

  // --- Initial render ---

  it('renders the page title and input', () => {
    renderHome();
    expect(screen.getByText('Prompt Parrot')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('번역할 한국어 프롬프트를 입력하세요...')).toBeInTheDocument();
  });

  it('translate button is disabled when input is empty', () => {
    renderHome();
    expect(screen.getByText('번역하기')).toBeCloseTo;
    const button = screen.getByText('번역하기').closest('button')!;
    expect(button).toBeDisabled();
  });

  it('has maxLength of 4000 on textarea', () => {
    renderHome();
    const textarea = screen.getByPlaceholderText('번역할 한국어 프롬프트를 입력하세요...');
    expect(textarea).toHaveAttribute('maxLength', '4000');
  });

  // --- Clear button ---

  it('shows clear button when text is entered', async () => {
    renderHome();
    const textarea = screen.getByPlaceholderText('번역할 한국어 프롬프트를 입력하세요...');

    expect(screen.queryByLabelText('Clear input')).not.toBeInTheDocument();

    await userEvent.type(textarea, '안녕');
    expect(screen.getByLabelText('Clear input')).toBeInTheDocument();
  });

  it('clears input when clear button is clicked', async () => {
    renderHome();
    const textarea = screen.getByPlaceholderText('번역할 한국어 프롬프트를 입력하세요...');

    await userEvent.type(textarea, '안녕');
    await userEvent.click(screen.getByLabelText('Clear input'));

    expect(textarea).toHaveValue('');
  });

  // --- Translation ---

  it('shows loading state during translation', async () => {
    let resolveTranslate: (value: unknown) => void;
    mockFetch.mockReturnValueOnce(
      new Promise((resolve) => { resolveTranslate = resolve; })
    );

    renderHome();
    const textarea = screen.getByPlaceholderText('번역할 한국어 프롬프트를 입력하세요...');
    await userEvent.type(textarea, '안녕하세요');

    const button = screen.getByText('번역하기').closest('button')!;
    await userEvent.click(button);

    expect(screen.getByText('번역 중...')).toBeInTheDocument();

    // Resolve to prevent hanging
    resolveTranslate!({
      ok: true,
      json: () => Promise.resolve({ englishText: 'Hello' }),
    });
  });

  it('displays translation result on success', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ englishText: 'Hello world' }),
    });

    renderHome();
    const textarea = screen.getByPlaceholderText('번역할 한국어 프롬프트를 입력하세요...');
    await userEvent.type(textarea, '안녕하세요');

    await userEvent.click(screen.getByText('번역하기').closest('button')!);

    await waitFor(() => {
      expect(screen.getByText('Hello world')).toBeInTheDocument();
    });

    expect(screen.getByText('영어 번역 결과')).toBeInTheDocument();
  });

  it('shows error message on translation failure', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: '번역 API 호출 실패' }),
    });

    renderHome();
    await userEvent.type(
      screen.getByPlaceholderText('번역할 한국어 프롬프트를 입력하세요...'),
      '안녕'
    );
    await userEvent.click(screen.getByText('번역하기').closest('button')!);

    await waitFor(() => {
      expect(screen.getByText('번역 API 호출 실패')).toBeInTheDocument();
    });

    expect(screen.getByText('다시 시도')).toBeInTheDocument();
  });

  it('shows error on network failure', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    renderHome();
    await userEvent.type(
      screen.getByPlaceholderText('번역할 한국어 프롬프트를 입력하세요...'),
      '안녕'
    );
    await userEvent.click(screen.getByText('번역하기').closest('button')!);

    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });
  });

  it('retries translation when retry button is clicked', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: '실패' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ englishText: 'Success' }),
      });

    renderHome();
    await userEvent.type(
      screen.getByPlaceholderText('번역할 한국어 프롬프트를 입력하세요...'),
      '안녕'
    );
    await userEvent.click(screen.getByText('번역하기').closest('button')!);

    await waitFor(() => {
      expect(screen.getByText('다시 시도')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByText('다시 시도'));

    await waitFor(() => {
      expect(screen.getByText('Success')).toBeInTheDocument();
    });

    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  // --- Edit mode ---

  it('toggles edit mode', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ englishText: 'Hello' }),
    });

    renderHome();
    await userEvent.type(
      screen.getByPlaceholderText('번역할 한국어 프롬프트를 입력하세요...'),
      '안녕'
    );
    await userEvent.click(screen.getByText('번역하기').closest('button')!);

    await waitFor(() => {
      expect(screen.getByText('편집하기')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByText('편집하기'));
    expect(screen.getByText('편집 중')).toBeInTheDocument();

    await userEvent.click(screen.getByText('편집 중'));
    expect(screen.getByText('편집하기')).toBeInTheDocument();
  });

  // --- Copy ---

  it('copies translation to clipboard', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ englishText: 'Hello' }),
    });

    renderHome();
    await userEvent.type(
      screen.getByPlaceholderText('번역할 한국어 프롬프트를 입력하세요...'),
      '안녕'
    );
    await userEvent.click(screen.getByText('번역하기').closest('button')!);

    await waitFor(() => {
      expect(screen.getByText('클립보드에 복사')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByText('클립보드에 복사').closest('button')!);

    expect(mockWriteText).toHaveBeenCalledWith('Hello');
    await waitFor(() => {
      expect(screen.getByText('복사됨!')).toBeInTheDocument();
    });
  });

  it('shows error toast when clipboard fails', async () => {
    mockWriteText.mockRejectedValueOnce(new Error('Clipboard denied'));
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ englishText: 'Hello' }),
    });

    renderHome();
    await userEvent.type(
      screen.getByPlaceholderText('번역할 한국어 프롬프트를 입력하세요...'),
      '안녕'
    );
    await userEvent.click(screen.getByText('번역하기').closest('button')!);

    await waitFor(() => {
      expect(screen.getByText('클립보드에 복사')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByText('클립보드에 복사').closest('button')!);

    await waitFor(() => {
      expect(screen.getByText('클립보드 복사 실패')).toBeInTheDocument();
    });
  });

  // --- Save ---

  it('shows success toast on save', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ englishText: 'Hello' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, id: 1 }),
      });

    renderHome();
    await userEvent.type(
      screen.getByPlaceholderText('번역할 한국어 프롬프트를 입력하세요...'),
      '안녕'
    );
    await userEvent.click(screen.getByText('번역하기').closest('button')!);

    await waitFor(() => {
      expect(screen.getByText('저장')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByText('저장').closest('button')!);

    await waitFor(() => {
      expect(screen.getByText('저장되었습니다!')).toBeInTheDocument();
    });
  });

  it('shows error toast when save fails (non-ok response)', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ englishText: 'Hello' }),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

    renderHome();
    await userEvent.type(
      screen.getByPlaceholderText('번역할 한국어 프롬프트를 입력하세요...'),
      '안녕'
    );
    await userEvent.click(screen.getByText('번역하기').closest('button')!);

    await waitFor(() => {
      expect(screen.getByText('저장')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByText('저장').closest('button')!);

    await waitFor(() => {
      expect(screen.getByText('저장 실패')).toBeInTheDocument();
    });
  });

  it('shows error toast when save throws network error', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ englishText: 'Hello' }),
      })
      .mockRejectedValueOnce(new Error('Network error'));

    renderHome();
    await userEvent.type(
      screen.getByPlaceholderText('번역할 한국어 프롬프트를 입력하세요...'),
      '안녕'
    );
    await userEvent.click(screen.getByText('번역하기').closest('button')!);

    await waitFor(() => {
      expect(screen.getByText('저장')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByText('저장').closest('button')!);

    await waitFor(() => {
      expect(screen.getByText('저장 실패')).toBeInTheDocument();
    });
  });
});
