import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/translate/route';

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

function createRequest(body: object): NextRequest {
  return new NextRequest('http://localhost/api/translate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function geminiResponse(text: string) {
  return {
    ok: true,
    status: 200,
    json: () => Promise.resolve({
      candidates: [{ content: { parts: [{ text }] } }],
    }),
  };
}

describe('POST /api/translate', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubEnv('GEMINI_API_KEY', 'test-api-key');
    vi.stubEnv('ANTHROPIC_API_KEY', 'test-anthropic-key');
    vi.stubEnv('CF_AI_GATEWAY_URL', 'https://gateway.example.com');
  });

  // --- Input validation ---

  it('returns 400 for empty input', async () => {
    const res = await POST(createRequest({ koreanText: '' }));
    expect(res.status).toBe(400);
    const data = await res.json() as Record<string, unknown>;
    expect(data.error).toContain('한국어 텍스트를 입력해주세요');
  });

  it('returns 400 for whitespace-only input', async () => {
    const res = await POST(createRequest({ koreanText: '   ' }));
    expect(res.status).toBe(400);
  });

  it('returns 400 for input exceeding 5000 characters', async () => {
    const res = await POST(createRequest({ koreanText: 'a'.repeat(5001) }));
    expect(res.status).toBe(400);
    const data = await res.json() as Record<string, unknown>;
    expect(data.error).toContain('5,000자');
  });

  it('accepts input at exactly 5000 characters', async () => {
    mockFetch.mockResolvedValueOnce(geminiResponse('translated text'));
    const res = await POST(createRequest({ koreanText: 'a'.repeat(5000) }));
    expect(res.status).toBe(200);
  });

  // --- Environment variable checks ---

  it('returns 500 when GEMINI_API_KEY is not set', async () => {
    vi.stubEnv('GEMINI_API_KEY', '');
    const res = await POST(createRequest({ koreanText: '안녕하세요' }));
    expect(res.status).toBe(500);
  });

  it('returns 500 when CF_AI_GATEWAY_URL is not set', async () => {
    vi.stubEnv('CF_AI_GATEWAY_URL', '');
    const res = await POST(createRequest({ koreanText: '안녕하세요' }));
    expect(res.status).toBe(500);
    const data = await res.json() as Record<string, unknown>;
    expect(data.error).toContain('AI Gateway');
  });

  // --- Gemini API error handling ---

  it('returns 429 when Gemini returns rate limit', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 429,
      text: () => Promise.resolve('rate limited'),
    });
    const res = await POST(createRequest({ koreanText: '안녕하세요' }));
    expect(res.status).toBe(429);
    const data = await res.json() as Record<string, unknown>;
    expect(data.error).toContain('요청이 너무 많습니다');
  });

  it('returns 500 for other Gemini errors', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 503,
      text: () => Promise.resolve('service unavailable'),
    });
    const res = await POST(createRequest({ koreanText: '안녕하세요' }));
    expect(res.status).toBe(500);
  });

  it('returns 500 when Gemini returns empty candidates', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ candidates: [] }),
    });
    const res = await POST(createRequest({ koreanText: '안녕하세요' }));
    expect(res.status).toBe(500);
  });

  // --- Timeout ---

  it('returns 504 on timeout', async () => {
    const timeoutError = new DOMException('signal timed out', 'TimeoutError');
    mockFetch.mockRejectedValueOnce(timeoutError);
    const res = await POST(createRequest({ koreanText: '안녕하세요' }));
    expect(res.status).toBe(504);
    const data = await res.json() as Record<string, unknown>;
    expect(data.error).toContain('시간이 초과');
  });

  // --- Happy path ---

  it('returns translated text on success', async () => {
    mockFetch.mockResolvedValueOnce(geminiResponse('Hello world'));
    const res = await POST(createRequest({ koreanText: '안녕하세요' }));
    expect(res.status).toBe(200);
    const data = await res.json() as Record<string, unknown>;
    expect(data.englishText).toBe('Hello world');
    expect(data.model).toBe('gemini-2.5-flash-lite');
  });

  it('trims whitespace from translated text', async () => {
    mockFetch.mockResolvedValueOnce(geminiResponse('  Hello world  \n'));
    const res = await POST(createRequest({ koreanText: '안녕하세요' }));
    const data = await res.json() as Record<string, unknown>;
    expect(data.englishText).toBe('Hello world');
  });

  it('sends correct request to Gemini API', async () => {
    mockFetch.mockResolvedValueOnce(geminiResponse('translated'));
    await POST(createRequest({ koreanText: '테스트' }));

    expect(mockFetch).toHaveBeenCalledOnce();
    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toContain('https://gateway.example.com/google-ai-studio/v1/models/gemini-2.5-flash-lite:generateContent');
    expect(options.method).toBe('POST');
    expect(options.headers['x-goog-api-key']).toBe('test-api-key');
    expect(options.signal).toBeDefined();

    const body = JSON.parse(options.body);
    expect(body.contents[0].parts[0].text).toContain('테스트');
    expect(body.generationConfig.temperature).toBe(0.1);
    expect(body.generationConfig.maxOutputTokens).toBe(4096);
  });

  it('returns 400 for invalid model', async () => {
    const res = await POST(createRequest({ koreanText: '안녕하세요', model: 'invalid' }));
    expect(res.status).toBe(400);
    const data = await res.json() as Record<string, unknown>;
    expect(data.error).toContain('지원하지 않는 모델');
  });

  it('sends correct request to Claude API', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        content: [{ type: 'text', text: 'translated by claude' }],
        model: 'claude-haiku-4-5-20251001',
      }),
    });
    const res = await POST(createRequest({ koreanText: '테스트', model: 'claude' }));
    expect(res.status).toBe(200);
    const data = await res.json() as Record<string, unknown>;
    expect(data.englishText).toBe('translated by claude');
    expect(data.model).toBe('claude-haiku-4-5-20251001');

    expect(mockFetch).toHaveBeenCalledOnce();
    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toContain('https://gateway.example.com/anthropic/v1/messages');
    expect(options.headers['x-api-key']).toBe('test-anthropic-key');
    expect(options.headers['anthropic-version']).toBe('2023-06-01');

    const body = JSON.parse(options.body);
    expect(body.model).toBe('claude-haiku-4-5-20251001');
    expect(body.messages[0].content).toContain('테스트');
    expect(body.temperature).toBe(0.1);
  });

  it('returns 500 when ANTHROPIC_API_KEY is not set for Claude model', async () => {
    vi.stubEnv('ANTHROPIC_API_KEY', '');
    const res = await POST(createRequest({ koreanText: '안녕하세요', model: 'claude' }));
    expect(res.status).toBe(500);
    const data = await res.json() as Record<string, unknown>;
    expect(data.error).toContain('API 키가 설정되지 않았습니다');
  });
});
