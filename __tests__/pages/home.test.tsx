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

const MODELS_RESPONSE = {
  ok: true,
  json: () =>
    Promise.resolve({
      models: [
        { id: 'gemini', name: 'Gemini 2.5 Flash Lite', available: true },
        { id: 'claude', name: 'Claude Haiku', available: true },
      ],
    }),
};

function mockAPI(overrides: Record<string, unknown> = {}) {
  const responses: Record<string, unknown> = {
    '/api/models': MODELS_RESPONSE,
    ...overrides,
  };

  mockFetch.mockImplementation((url: string) => {
    for (const [key, value] of Object.entries(responses)) {
      if (url === key || url.startsWith(key)) {
        return typeof value === 'function' ? value() : Promise.resolve(value);
      }
    }
    return Promise.resolve({ ok: false, json: () => Promise.resolve({ error: 'not mocked' }) });
  });
}

describe('Home Page', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockWriteText.mockResolvedValue(undefined);
  });

  // --- Initial render ---

  it('renders the page title and input', () => {
    mockAPI();
    renderHome();
    expect(screen.getByText('Prompt Parrot')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('번역할 한국어 프롬프트를 입력하세요...')).toBeInTheDocument();
  });

  it('translate button is disabled when input is empty', () => {
    mockAPI();
    renderHome();
    expect(screen.getByText('번역하기')).toBeCloseTo;
    const button = screen.getByText('번역하기').closest('button')!;
    expect(button).toBeDisabled();
  });

  it('has maxLength of 4000 on textarea', () => {
    mockAPI();
    renderHome();
    const textarea = screen.getByPlaceholderText('번역할 한국어 프롬프트를 입력하세요...');
    expect(textarea).toHaveAttribute('maxLength', '4000');
  });

  // --- Clear button ---

  it('shows clear button when text is entered', async () => {
    mockAPI();
    renderHome();
    const textarea = screen.getByPlaceholderText('번역할 한국어 프롬프트를 입력하세요...');

    expect(screen.queryByLabelText('Clear input')).not.toBeInTheDocument();

    await userEvent.type(textarea, '안녕');
    expect(screen.getByLabelText('Clear input')).toBeInTheDocument();
  });

  it('clears input when clear button is clicked', async () => {
    mockAPI();
    renderHome();
    const textarea = screen.getByPlaceholderText('번역할 한국어 프롬프트를 입력하세요...');

    await userEvent.type(textarea, '안녕');
    await userEvent.click(screen.getByLabelText('Clear input'));

    expect(textarea).toHaveValue('');
  });

  // --- Translation ---

  it('shows loading state during translation', async () => {
    let resolveTranslate: (value: unknown) => void;
    const translatePromise = new Promise((resolve) => {
      resolveTranslate = resolve;
    });

    mockFetch.mockImplementation((url: string) => {
      if (url === '/api/models') {
        return Promise.resolve(MODELS_RESPONSE);
      }
      return translatePromise;
    });

    renderHome();
    const textarea = screen.getByPlaceholderText('번역할 한국어 프롬프트를 입력하세요...');
    await userEvent.type(textarea, '안녕하세요');

    const button = screen.getByText('번역하기').closest('button')!;
    await userEvent.click(button);

    expect(screen.getByText('번역 중...')).toBeInTheDocument();

    // Resolve to prevent hanging
    resolveTranslate!({
      ok: true,
      json: () => Promise.resolve({ englishText: 'Hello', model: 'gemini-2.5-flash-lite' }),
    });
  });

  it('displays translation result on success', async () => {
    mockAPI({
      '/api/translate': {
        ok: true,
        json: () => Promise.resolve({ englishText: 'Hello world', model: 'gemini-2.5-flash-lite' }),
      },
    });

    renderHome();
    const textarea = screen.getByPlaceholderText('번역할 한국어 프롬프트를 입력하세요...');
    await userEvent.type(textarea, '안녕하세요');

    await userEvent.click(screen.getByText('번역하기').closest('button')!);

    await waitFor(() => {
      expect(screen.getByText('Hello world')).toBeInTheDocument();
    });

    expect(screen.getByText('출력 · English')).toBeInTheDocument();
  });

  it('shows error message on translation failure', async () => {
    mockAPI({
      '/api/translate': {
        ok: false,
        json: () => Promise.resolve({ error: '번역 API 호출 실패' }),
      },
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
    mockFetch.mockImplementation((url: string) => {
      if (url === '/api/models') {
        return Promise.resolve(MODELS_RESPONSE);
      }
      return Promise.reject(new Error('Network error'));
    });

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
    let translateCallCount = 0;

    mockFetch.mockImplementation((url: string) => {
      if (url === '/api/models') {
        return Promise.resolve(MODELS_RESPONSE);
      }
      translateCallCount++;
      if (translateCallCount === 1) {
        return Promise.resolve({
          ok: false,
          json: () => Promise.resolve({ error: '실패' }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ englishText: 'Success', model: 'gemini-2.5-flash-lite' }),
      });
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

    expect(translateCallCount).toBe(2);
  });

  // --- Edit mode ---

  it('toggles edit mode', async () => {
    mockAPI({
      '/api/translate': {
        ok: true,
        json: () => Promise.resolve({ englishText: 'Hello', model: 'gemini-2.5-flash-lite' }),
      },
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
    mockAPI({
      '/api/translate': {
        ok: true,
        json: () => Promise.resolve({ englishText: 'Hello', model: 'gemini-2.5-flash-lite' }),
      },
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
    mockAPI({
      '/api/translate': {
        ok: true,
        json: () => Promise.resolve({ englishText: 'Hello', model: 'gemini-2.5-flash-lite' }),
      },
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
    mockAPI({
      '/api/translate': {
        ok: true,
        json: () => Promise.resolve({ englishText: 'Hello', model: 'gemini-2.5-flash-lite' }),
      },
      '/api/history': {
        ok: true,
        json: () => Promise.resolve({ success: true, id: 1 }),
      },
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
    mockAPI({
      '/api/translate': {
        ok: true,
        json: () => Promise.resolve({ englishText: 'Hello', model: 'gemini-2.5-flash-lite' }),
      },
      '/api/history': {
        ok: false,
        status: 500,
      },
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
    let historyCallCount = 0;

    mockFetch.mockImplementation((url: string) => {
      if (url === '/api/models') {
        return Promise.resolve(MODELS_RESPONSE);
      }
      if (url === '/api/translate') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ englishText: 'Hello', model: 'gemini-2.5-flash-lite' }),
        });
      }
      if (url === '/api/history') {
        historyCallCount++;
        return Promise.reject(new Error('Network error'));
      }
      return Promise.resolve({ ok: false, json: () => Promise.resolve({ error: 'not mocked' }) });
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
});
