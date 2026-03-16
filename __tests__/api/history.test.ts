import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST, DELETE } from '@/app/api/history/route';

// Mock getCloudflareContext
vi.mock('@opennextjs/cloudflare', () => ({
  getCloudflareContext: vi.fn(),
}));

import { getCloudflareContext } from '@opennextjs/cloudflare';

const mockGetCloudflareContext = vi.mocked(getCloudflareContext);

// Helper to create mock D1 database
function createMockDb(overrides: Record<string, unknown> = {}) {
  const mockRun = vi.fn().mockResolvedValue({
    meta: { last_row_id: 1, changes: 1 },
  });
  const mockAll = vi.fn().mockResolvedValue({ results: [] });
  const mockBind = vi.fn().mockReturnValue({ run: mockRun, all: mockAll });
  const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });

  return {
    db: { prepare: mockPrepare, ...overrides },
    prepare: mockPrepare,
    bind: mockBind,
    run: mockRun,
    all: mockAll,
  };
}

function setupContext(db: unknown = null) {
  mockGetCloudflareContext.mockResolvedValue({
    env: { DB: db } as unknown as CloudflareEnv,
    ctx: {} as ExecutionContext,
    cf: {} as CfProperties,
  } as never);
}

// --- POST /api/history ---

describe('POST /api/history', () => {
  beforeEach(() => vi.resetAllMocks());

  it('returns 500 when DB is not bound', async () => {
    setupContext(null);
    const req = new NextRequest('http://localhost/api/history', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ koreanText: '안녕', englishText: 'hello' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(500);
  });

  it('saves translation without edit', async () => {
    const { db, bind } = createMockDb();
    setupContext(db);

    const req = new NextRequest('http://localhost/api/history', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        koreanText: '안녕',
        englishText: 'hello',
        editedEnglishText: null,
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.id).toBeDefined();

    // is_edited should be 0 when no edit
    expect(bind).toHaveBeenCalledWith('안녕', 'hello', null, 0);
  });

  it('saves translation with edit (is_edited=1)', async () => {
    const { db, bind } = createMockDb();
    setupContext(db);

    const req = new NextRequest('http://localhost/api/history', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        koreanText: '안녕',
        englishText: 'hello',
        editedEnglishText: 'hi there',
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);

    // is_edited should be 1 when edited text differs
    expect(bind).toHaveBeenCalledWith('안녕', 'hello', 'hi there', 1);
  });

  it('saves with is_edited=0 when editedEnglishText equals englishText', async () => {
    const { db, bind } = createMockDb();
    setupContext(db);

    const req = new NextRequest('http://localhost/api/history', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        koreanText: '안녕',
        englishText: 'hello',
        editedEnglishText: 'hello',
      }),
    });
    await POST(req);

    // Same text = not edited
    expect(bind).toHaveBeenCalledWith('안녕', 'hello', 'hello', 0);
  });

  it('returns 500 on DB error', async () => {
    const mockRun = vi.fn().mockRejectedValue(new Error('DB error'));
    const mockBind = vi.fn().mockReturnValue({ run: mockRun });
    const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
    const db = { prepare: mockPrepare };
    setupContext(db);

    const req = new NextRequest('http://localhost/api/history', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ koreanText: '안녕', englishText: 'hello' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(500);
  });
});

// --- GET /api/history ---

describe('GET /api/history', () => {
  beforeEach(() => vi.resetAllMocks());

  it('returns 500 when DB is not bound', async () => {
    setupContext(null);
    const req = new NextRequest('http://localhost/api/history');
    const res = await GET(req);
    expect(res.status).toBe(500);
  });

  it('returns translations with default offset', async () => {
    const mockTranslations = [
      { id: 1, korean_text: '안녕', english_text: 'hello', created_at: '2025-01-01' },
    ];
    const { db, all, bind } = createMockDb();
    all.mockResolvedValue({ results: mockTranslations });
    setupContext(db);

    const req = new NextRequest('http://localhost/api/history');
    const res = await GET(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.translations).toEqual(mockTranslations);

    // Default: limit=20, offset=0
    expect(bind).toHaveBeenCalledWith(20, 0);
  });

  it('passes custom offset to query', async () => {
    const { db, bind, all } = createMockDb();
    all.mockResolvedValue({ results: [] });
    setupContext(db);

    const req = new NextRequest('http://localhost/api/history?offset=40');
    const res = await GET(req);
    expect(res.status).toBe(200);

    expect(bind).toHaveBeenCalledWith(20, 40);
  });

  it('returns 500 on DB error', async () => {
    const mockAll = vi.fn().mockRejectedValue(new Error('DB error'));
    const mockBind = vi.fn().mockReturnValue({ all: mockAll });
    const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
    const db = { prepare: mockPrepare };
    setupContext(db);

    const req = new NextRequest('http://localhost/api/history');
    const res = await GET(req);
    expect(res.status).toBe(500);
  });
});

// --- DELETE /api/history ---

describe('DELETE /api/history', () => {
  beforeEach(() => vi.resetAllMocks());

  it('returns 400 when id is missing', async () => {
    const req = new NextRequest('http://localhost/api/history', { method: 'DELETE' });
    const res = await DELETE(req);
    expect(res.status).toBe(400);
  });

  it('returns 400 for non-integer id', async () => {
    const req = new NextRequest('http://localhost/api/history?id=abc', { method: 'DELETE' });
    const res = await DELETE(req);
    expect(res.status).toBe(400);
  });

  it('returns 400 for float id', async () => {
    const req = new NextRequest('http://localhost/api/history?id=1.5', { method: 'DELETE' });
    const res = await DELETE(req);
    expect(res.status).toBe(400);
  });

  it('returns 400 for zero id', async () => {
    const req = new NextRequest('http://localhost/api/history?id=0', { method: 'DELETE' });
    const res = await DELETE(req);
    expect(res.status).toBe(400);
  });

  it('returns 400 for negative id', async () => {
    const req = new NextRequest('http://localhost/api/history?id=-1', { method: 'DELETE' });
    const res = await DELETE(req);
    expect(res.status).toBe(400);
  });

  it('returns 500 when DB is not bound', async () => {
    setupContext(null);
    const req = new NextRequest('http://localhost/api/history?id=1', { method: 'DELETE' });
    const res = await DELETE(req);
    expect(res.status).toBe(500);
  });

  it('returns 404 when id does not exist', async () => {
    const { db, run } = createMockDb();
    run.mockResolvedValue({ meta: { changes: 0 } });
    setupContext(db);

    const req = new NextRequest('http://localhost/api/history?id=999', { method: 'DELETE' });
    const res = await DELETE(req);
    expect(res.status).toBe(404);
  });

  it('deletes successfully with valid id', async () => {
    const { db, bind } = createMockDb();
    setupContext(db);

    const req = new NextRequest('http://localhost/api/history?id=1', { method: 'DELETE' });
    const res = await DELETE(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.success).toBe(true);
    expect(bind).toHaveBeenCalledWith(1);
  });

  it('returns 500 on DB error', async () => {
    const mockRun = vi.fn().mockRejectedValue(new Error('DB error'));
    const mockBind = vi.fn().mockReturnValue({ run: mockRun });
    const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
    const db = { prepare: mockPrepare };
    setupContext(db);

    const req = new NextRequest('http://localhost/api/history?id=1', { method: 'DELETE' });
    const res = await DELETE(req);
    expect(res.status).toBe(500);
  });
});
