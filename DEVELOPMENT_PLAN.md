# LLM 번역 히스토리 웹앱 - 상세 개발 계획

**작성일:** 2025-12-26
**기준 정보:** 2025년 12월 최신 기술 스택 및 베스트 프랙티스

---

## 🚨 중요 아키텍처 변경사항 (2025년 최신)

### Cloudflare Workers + OpenNext 사용 (Pages 대신)

**2025년 현재 Cloudflare의 공식 권장사항:**
- ~~Cloudflare Pages~~ → **Cloudflare Workers + OpenNext 어댑터**
- `@cloudflare/next-on-pages` (deprecated) → **`@opennextjs/cloudflare`** (권장)

**변경 이유:**
- **완전한 Next.js 기능 지원**: App Router, ISR, Image Optimization 등
- **Node.js 런타임**: Edge 런타임 제약 없음, Node.js API 완벽 지원
- **더 나은 성능**: Cloudflare Workers의 전역 분산 네트워크 활용
- **D1 통합**: Cloudflare Workers에서 D1 바인딩 직접 사용

**출처:**
- [Next.js · Cloudflare Workers docs](https://developers.cloudflare.com/workers/framework-guides/web-apps/nextjs/)
- [Deploy your Next.js app to Cloudflare Workers with the Cloudflare adapter for OpenNext](https://blog.cloudflare.com/deploying-nextjs-apps-to-cloudflare-workers-with-the-opennext-adapter/)
- [OpenNext Cloudflare](https://opennext.js.org/cloudflare)

---

## 📋 프로젝트 개요

### 목표
개인 전용 LLM 프롬프트 번역 웹앱 개발 (한국어 → 영어)

### 핵심 기능 (MVP)
1. Cloudflare Access 인증 (One-time PIN)
2. Gemini 2.0 Flash API 번역 (LLM 프롬프트 최적화)
3. 번역 결과 편집 + 클립보드 복사
4. 암호화된 히스토리 저장 (Cloudflare D1)
5. 무한 스크롤 히스토리 (20개씩)
6. CSV Export
7. 에러 처리 + 재시도

---

## 🏗️ 최종 기술 스택 (2025년 12월 기준)

### 배포 인프라
| 구성 요소 | 기술 | 버전/세부사항 |
|----------|------|---------------|
| **런타임** | **Cloudflare Workers** | Node.js 호환 모드 (`nodejs_compat`) |
| **프레임워크 어댑터** | **@opennextjs/cloudflare** | 1.0-beta+ (Next.js 15 지원) |
| **데이터베이스** | Cloudflare D1 | SQLite (자동 암호화: AES-256-GCM) |
| **인증** | Cloudflare Access | One-time PIN (이메일 기반) |
| **CDN** | Cloudflare | 자동 포함 |
| **도메인** | 커스텀 도메인 | Cloudflare 등록 및 연결 |

### 프론트엔드
| 구성 요소 | 기술 | 버전 |
|----------|------|------|
| **프레임워크** | Next.js | 15.x (App Router) |
| **언어** | TypeScript | 5.x |
| **스타일링** | Tailwind CSS | 4.x |
| **UI 컴포넌트** | shadcn/ui | 최신 (선택사항) |
| **상태관리** | TanStack Query (React Query) | v5 |
| **폼 관리** | React Hook Form | 7.x |

### 백엔드 (Cloudflare Workers)
| 구성 요소 | 기술 | 용도 |
|----------|------|------|
| **API 라우트** | Next.js API Routes | Cloudflare Workers로 자동 변환 |
| **번역 API** | Gemini 2.0 Flash | Google AI API |
| **ORM (선택)** | Drizzle ORM | D1 타입 안전성 |
| **암호화** | Web Crypto API | 추가 암호화 필요 시 |

### 개발 도구
- **빌드 도구:** OpenNext CLI (`@opennextjs/cloudflare`)
- **로컬 개발:** Wrangler CLI (Cloudflare Workers 에뮬레이터)
- **패키지 매니저:** npm
- **린터:** ESLint + Prettier
- **Git:** GitHub

---

## 📊 Cloudflare 무료 티어 제한 (2025년)

### Cloudflare Workers
- **무료:** 100,000 requests/일
- **CPU 시간:** 10ms/request
- **유료 전환:** $5/월 (10M requests)

### Cloudflare D1
- **무료:** 5GB 저장소, 500만 읽기/일, 10만 쓰기/일
- **유료:** $0.75/월 (25GB까지)

### Cloudflare Access (Zero Trust)
- **무료:** 50명 사용자
- **개인용 충분**

---

## 🔑 Gemini 2.0 Flash API 세부사항 (2025년 12월 최신)

### 주요 기능
- **컨텍스트 윈도우:** 1,000,000 토큰 (충분히 큰 프롬프트 지원)
- **멀티모달:** 텍스트, 이미지, 오디오, 비디오 입력 (우리는 텍스트만 사용)
- **Native Tool Use:** 함수 호출 지원
- **가격:** $0.075 / 1M 입력 토큰, $0.30 / 1M 출력 토큰

### Rate Limits (무료 티어)
- **분당:** 15 requests
- **일일:** 1,500 requests
- **월간:** 무제한 (일일 제한만)

### API 엔드포인트
```
https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash-exp:generateContent
```

**출처:**
- [Gemini 2.0 Flash | Vertex AI](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/models/gemini/2-0-flash)
- [Gemini API Docs](https://ai.google.dev/gemini-api/docs)

---

## 🔐 보안 아키텍처

### 1. 인증: Cloudflare Access (One-time PIN)

**설정 방법:**
1. Cloudflare Zero Trust 대시보드 접속
2. Access > Applications > Add an application
3. Self-hosted 선택
4. 도메인 설정 (예: `translate.yourdomain.com`)
5. One-time PIN 활성화
6. 허용된 이메일 추가 (본인 이메일만)

**사용자 경험:**
```
1. 사용자가 translate.yourdomain.com 접속
2. Cloudflare Access 로그인 페이지 표시
3. 이메일 입력 → PIN 전송
4. PIN 입력 → 인증 완료
5. 세션 유지 (24시간)
```

**출처:**
- [Create an Access application](https://developers.cloudflare.com/learning-paths/clientless-access/access-application/create-access-app/)
- [One-time PIN login](https://developers.cloudflare.com/cloudflare-one/identity/one-time-pin/)

### 2. 데이터 암호화

#### Cloudflare D1 기본 암호화 (자동)
- **저장 시 암호화 (At Rest):** AES-256-GCM (Cloudflare 자동 관리)
- **전송 중 암호화 (In Transit):** TLS/SSL (자동)
- **키 관리:** Cloudflare KMS (개발자 설정 불필요)

**출처:**
- [D1 Data Security](https://developers.cloudflare.com/d1/reference/data-security/)

#### 추가 애플리케이션 레벨 암호화 (선택사항)
만약 민감한 내용(개인정보 등)이 포함될 경우, Workers에서 저장 전 추가 암호화 가능:

```typescript
// Web Crypto API 사용 예시
async function encryptText(text: string, key: CryptoKey): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const iv = crypto.getRandomValues(new Uint8Array(12));

  const encryptedData = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    data
  );

  return JSON.stringify({
    iv: Array.from(iv),
    data: Array.from(new Uint8Array(encryptedData))
  });
}
```

**권장사항:** MVP에서는 D1 기본 암호화로 충분. 필요 시 Phase 2에서 추가.

### 3. API 키 관리

```bash
# Cloudflare Workers Secrets에 저장
wrangler secret put GEMINI_API_KEY

# wrangler.toml에는 절대 포함하지 않음
```

---

## 📁 데이터베이스 스키마 (D1)

### translations 테이블
```sql
CREATE TABLE translations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  korean_text TEXT NOT NULL,
  english_text TEXT NOT NULL,          -- Gemini API 원본 번역
  edited_english_text TEXT,             -- 사용자 수동 편집 (nullable)
  is_edited BOOLEAN DEFAULT 0,          -- 편집 여부
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  llm_used TEXT,                        -- Phase 2: 사용한 LLM (Claude, GPT 등)
  tags TEXT,                            -- Phase 3: 쉼표 구분 태그
  is_favorite BOOLEAN DEFAULT 0,        -- Phase 3: 즐겨찾기
  notes TEXT                            -- Phase 3: 메모
);

-- 인덱스 (성능 최적화)
CREATE INDEX idx_created_at ON translations(created_at DESC);
CREATE INDEX idx_llm_used ON translations(llm_used);
CREATE INDEX idx_is_favorite ON translations(is_favorite);
```

### 초기 마이그레이션 파일
```sql
-- migrations/0001_create_translations.sql
```

---

## 🎨 UI/UX 설계

### 화면 구성

#### 1. 메인 화면 (번역)
```
┌─────────────────────────────────────────────────┐
│  🌐 Prompt Translator      [히스토리] [로그아웃]│
├─────────────────────────────────────────────────┤
│                                                 │
│  한국어 입력                                     │
│  ┌─────────────────────────────────────────┐   │
│  │                                         │   │
│  │  여러 줄 프롬프트 입력...               │   │
│  │  (최대 100만 토큰 지원)                 │   │
│  │                                         │   │
│  └─────────────────────────────────────────┘   │
│                  [번역하기 🔄]                  │
│                                                 │
│  ⏳ 번역 중... (스피너 표시)                    │
│                                                 │
│  영어 번역 결과                                 │
│  ┌─────────────────────────────────────────┐   │
│  │  Translate this Korean text to...      │   │
│  │  [편집 모드 활성화 ✏️]                  │   │
│  └─────────────────────────────────────────┘   │
│       [📋 클립보드에 복사] [💾 저장]           │
│                                                 │
│  ❌ 에러: Gemini API 호출 실패                  │
│       [🔄 재시도]                               │
└─────────────────────────────────────────────────┘
```

#### 2. 히스토리 화면
```
┌─────────────────────────────────────────────────┐
│  📚 번역 히스토리           [CSV 내보내기 📥]   │
├─────────────────────────────────────────────────┤
│  [🔍 검색] (Phase 2)                            │
│                                                 │
│  ┌──────────────────────────────────────────┐  │
│  │ 🕐 2025-12-25 14:30                      │  │
│  │ KR: Next.js와 Cloudflare Workers를...   │  │
│  │ EN: Next.js and Cloudflare Workers...   │  │
│  │ ✏️ 편집됨   [📋 복사] [🗑️ 삭제]         │  │
│  └──────────────────────────────────────────┘  │
│                                                 │
│  ┌──────────────────────────────────────────┐  │
│  │ 🕐 2025-12-24 10:15                      │  │
│  │ KR: 리액트 컴포넌트 최적화 방법...       │  │
│  │ EN: React component optimization...     │  │
│  │ [📋 복사] [🗑️ 삭제]                     │  │
│  └──────────────────────────────────────────┘  │
│                                                 │
│  ... (20개씩 로드)                              │
│  [🔄 더 불러오기] (무한 스크롤)                │
└─────────────────────────────────────────────────┘
```

### 색상 테마 (Tailwind)
- **배경:** `bg-gray-50`
- **카드:** `bg-white shadow-sm rounded-lg`
- **강조:** `text-blue-600`
- **에러:** `text-red-600`
- **성공:** `text-green-600`

---

## 🛠️ 개발 단계별 상세 계획

### Phase 1: 프로젝트 초기화 및 기본 설정 (1일차)

#### Step 1.1: Next.js 프로젝트 생성
```bash
# OpenNext + Cloudflare 템플릿으로 생성
npm create cloudflare@latest prompt-parrot -- --framework=next

# 또는 수동 설정
npx create-next-app@latest prompt-parrot --typescript --tailwind --app
cd prompt-parrot
npm install @opennextjs/cloudflare
```

**필수 설정:**
- TypeScript ✓
- Tailwind CSS ✓
- App Router ✓
- ESLint ✓

#### Step 1.2: Cloudflare Workers 설정

**wrangler.toml 생성:**
```toml
name = "prompt-parrot"
compatibility_date = "2024-09-23"  # 필수!
compatibility_flags = ["nodejs_compat"]  # 필수!

[build]
command = "npm run build"

[[d1_databases]]
binding = "DB"
database_name = "prompt-parrot-db"
database_id = "<생성 후 자동 입력>"

[vars]
NODE_ENV = "production"
```

**D1 데이터베이스 생성:**
```bash
# 로컬 개발
wrangler d1 create prompt-parrot-db

# 마이그레이션 실행
wrangler d1 migrations create prompt-parrot-db create_translations
wrangler d1 migrations apply prompt-parrot-db --local  # 로컬
wrangler d1 migrations apply prompt-parrot-db          # 프로덕션
```

#### Step 1.3: 개발 환경 구성

**package.json 스크립트:**
```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "deploy": "npx @opennextjs/cloudflare",
    "wrangler:dev": "wrangler dev",
    "db:migrate": "wrangler d1 migrations apply prompt-parrot-db --local",
    "db:migrate:prod": "wrangler d1 migrations apply prompt-parrot-db"
  }
}
```

**필수 패키지 설치:**
```bash
npm install @opennextjs/cloudflare
npm install @tanstack/react-query
npm install react-hook-form
npm install drizzle-orm  # D1 ORM (선택사항)
npm install -D @cloudflare/workers-types
```

#### Step 1.4: TypeScript 타입 정의

**env.d.ts:**
```typescript
interface CloudflareEnv {
  DB: D1Database;
  GEMINI_API_KEY: string;
}
```

---

### Phase 2: Gemini API 통합 (1일차)

#### Step 2.1: API 키 발급
1. [Google AI Studio](https://ai.google.dev/) 접속
2. API Key 발급
3. Cloudflare Workers에 저장:
```bash
wrangler secret put GEMINI_API_KEY
# 입력 프롬프트에 API 키 입력
```

#### Step 2.2: 번역 API 엔드포인트 생성

**app/api/translate/route.ts:**
```typescript
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge'; // Cloudflare Workers 호환

interface TranslateRequest {
  koreanText: string;
}

interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{ text: string }>;
    };
  }>;
}

export async function POST(request: NextRequest) {
  try {
    const { koreanText }: TranslateRequest = await request.json();

    if (!koreanText || koreanText.trim().length === 0) {
      return NextResponse.json(
        { error: '한국어 텍스트를 입력해주세요.' },
        { status: 400 }
      );
    }

    // Cloudflare Workers 환경 변수 접근
    const env = process.env as unknown as CloudflareEnv;
    const apiKey = env.GEMINI_API_KEY;

    // LLM 프롬프트 최적화 전용 번역 프롬프트
    const prompt = `You are a professional translator specializing in optimizing Korean text for use as prompts in Large Language Models (LLMs) like Claude, GPT, and Gemini.

Translate the following Korean text to English with these guidelines:
1. Maintain technical accuracy and clarity
2. Use natural, professional English suitable for AI interactions
3. Preserve the intent and nuance of the original Korean text
4. Optimize phrasing for maximum effectiveness as an LLM prompt
5. Do not add explanations or commentary - only provide the translated text

Korean text:
${koreanText}

English translation:`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.3,  // 낮은 온도로 일관성 향상
            maxOutputTokens: 2048,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API Error:', errorText);
      throw new Error('번역 API 호출 실패');
    }

    const data: GeminiResponse = await response.json();
    const englishText = data.candidates[0]?.content?.parts[0]?.text;

    if (!englishText) {
      throw new Error('번역 결과를 받지 못했습니다.');
    }

    return NextResponse.json({ englishText });
  } catch (error) {
    console.error('Translation error:', error);
    return NextResponse.json(
      { error: '번역 중 오류가 발생했습니다. 다시 시도해주세요.' },
      { status: 500 }
    );
  }
}
```

#### Step 2.3: 프론트엔드 통합

**app/hooks/useTranslate.ts:**
```typescript
import { useMutation } from '@tanstack/react-query';

interface TranslateResponse {
  englishText: string;
}

export function useTranslate() {
  return useMutation({
    mutationFn: async (koreanText: string): Promise<TranslateResponse> => {
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ koreanText }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '번역 실패');
      }

      return response.json();
    },
  });
}
```

---

### Phase 3: 데이터베이스 통합 (2일차)

#### Step 3.1: D1 바인딩 설정

**next.config.js:**
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: true,
  },
};

module.exports = nextConfig;
```

#### Step 3.2: 히스토리 저장 API

**app/api/history/route.ts:**
```typescript
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

interface SaveHistoryRequest {
  koreanText: string;
  englishText: string;
  editedEnglishText?: string;
}

export async function POST(request: NextRequest) {
  try {
    const { koreanText, englishText, editedEnglishText }: SaveHistoryRequest =
      await request.json();

    const env = process.env as unknown as CloudflareEnv;
    const db = env.DB;

    const isEdited = editedEnglishText && editedEnglishText !== englishText;

    const result = await db
      .prepare(
        `INSERT INTO translations
        (korean_text, english_text, edited_english_text, is_edited)
        VALUES (?, ?, ?, ?)`
      )
      .bind(
        koreanText,
        englishText,
        editedEnglishText || null,
        isEdited ? 1 : 0
      )
      .run();

    return NextResponse.json({
      id: result.meta.last_row_id,
      success: true
    });
  } catch (error) {
    console.error('Save history error:', error);
    return NextResponse.json(
      { error: '히스토리 저장 실패' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const offset = parseInt(searchParams.get('offset') || '0');
    const limit = 20;

    const env = process.env as unknown as CloudflareEnv;
    const db = env.DB;

    const { results } = await db
      .prepare(
        `SELECT * FROM translations
         ORDER BY created_at DESC
         LIMIT ? OFFSET ?`
      )
      .bind(limit, offset)
      .all();

    return NextResponse.json({ translations: results });
  } catch (error) {
    console.error('Get history error:', error);
    return NextResponse.json(
      { error: '히스토리 조회 실패' },
      { status: 500 }
    );
  }
}
```

#### Step 3.3: 무한 스크롤 구현

**app/hooks/useHistory.ts:**
```typescript
import { useInfiniteQuery } from '@tanstack/react-query';

interface Translation {
  id: number;
  korean_text: string;
  english_text: string;
  edited_english_text: string | null;
  is_edited: boolean;
  created_at: string;
}

export function useHistory() {
  return useInfiniteQuery({
    queryKey: ['translations'],
    queryFn: async ({ pageParam = 0 }) => {
      const response = await fetch(
        `/api/history?offset=${pageParam}`
      );
      const data = await response.json();
      return data.translations as Translation[];
    },
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length < 20) return undefined;
      return allPages.length * 20;
    },
    initialPageParam: 0,
  });
}
```

---

### Phase 4: UI 구현 (2-3일차)

#### Step 4.1: 메인 번역 페이지

**app/page.tsx:**
```typescript
'use client';

import { useState } from 'react';
import { useTranslate } from './hooks/useTranslate';

export default function Home() {
  const [koreanText, setKoreanText] = useState('');
  const [englishText, setEnglishText] = useState('');
  const [editedText, setEditedText] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [copied, setCopied] = useState(false);

  const translateMutation = useTranslate();

  const handleTranslate = async () => {
    if (!koreanText.trim()) return;

    try {
      const result = await translateMutation.mutateAsync(koreanText);
      setEnglishText(result.englishText);
      setEditedText(result.englishText);
      setIsEditing(false);
    } catch (error) {
      console.error('Translation failed:', error);
    }
  };

  const handleCopy = async () => {
    const textToCopy = isEditing ? editedText : englishText;
    await navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = async () => {
    await fetch('/api/history', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        koreanText,
        englishText,
        editedEnglishText: editedText !== englishText ? editedText : null,
      }),
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">🌐 Prompt Translator</h1>

        {/* 한국어 입력 */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">
            한국어 입력
          </label>
          <textarea
            className="w-full p-4 border rounded-lg h-40 resize-none"
            placeholder="번역할 한국어 프롬프트를 입력하세요..."
            value={koreanText}
            onChange={(e) => setKoreanText(e.target.value)}
          />
        </div>

        {/* 번역 버튼 */}
        <button
          onClick={handleTranslate}
          disabled={translateMutation.isPending || !koreanText.trim()}
          className="w-full bg-blue-600 text-white py-3 rounded-lg
                     hover:bg-blue-700 disabled:bg-gray-400 mb-6"
        >
          {translateMutation.isPending ? '⏳ 번역 중...' : '번역하기 🔄'}
        </button>

        {/* 에러 표시 */}
        {translateMutation.isError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-600">
              ❌ {translateMutation.error.message}
            </p>
            <button
              onClick={handleTranslate}
              className="mt-2 text-red-600 underline"
            >
              🔄 재시도
            </button>
          </div>
        )}

        {/* 영어 결과 */}
        {englishText && (
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium">
                영어 번역 결과
              </label>
              <button
                onClick={() => setIsEditing(!isEditing)}
                className="text-sm text-blue-600 hover:underline"
              >
                {isEditing ? '📝 편집 중' : '✏️ 편집하기'}
              </button>
            </div>

            {isEditing ? (
              <textarea
                className="w-full p-4 border rounded-lg h-40 resize-none"
                value={editedText}
                onChange={(e) => setEditedText(e.target.value)}
              />
            ) : (
              <div className="w-full p-4 border rounded-lg bg-white">
                {editedText}
              </div>
            )}

            {/* 복사 및 저장 버튼 */}
            <div className="flex gap-4 mt-4">
              <button
                onClick={handleCopy}
                className="flex-1 bg-green-600 text-white py-2 rounded-lg
                           hover:bg-green-700"
              >
                {copied ? '✓ 복사됨!' : '📋 클립보드에 복사'}
              </button>
              <button
                onClick={handleSave}
                className="flex-1 bg-gray-600 text-white py-2 rounded-lg
                           hover:bg-gray-700"
              >
                💾 저장
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
```

#### Step 4.2: 히스토리 페이지

**app/history/page.tsx:**
```typescript
'use client';

import { useHistory } from '../hooks/useHistory';
import { useEffect, useRef } from 'react';

export default function HistoryPage() {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useHistory();

  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  // 무한 스크롤
  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 1.0 }
    );

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current);
    }

    return () => observerRef.current?.disconnect();
  }, [fetchNextPage, hasNextPage]);

  const handleExportCSV = () => {
    const allTranslations = data?.pages.flat() || [];

    const csvContent = [
      ['ID', '생성일', '한국어', '영어(원본)', '영어(편집)', '편집여부'],
      ...allTranslations.map(t => [
        t.id,
        t.created_at,
        `"${t.korean_text}"`,
        `"${t.english_text}"`,
        `"${t.edited_english_text || ''}"`,
        t.is_edited ? 'TRUE' : 'FALSE',
      ]),
    ]
      .map(row => row.join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `translations-${new Date().toISOString()}.csv`;
    link.click();
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">📚 번역 히스토리</h1>
          <button
            onClick={handleExportCSV}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg
                       hover:bg-blue-700"
          >
            📥 CSV 내보내기
          </button>
        </div>

        {/* 히스토리 리스트 */}
        <div className="space-y-4">
          {data?.pages.map((page, i) => (
            <div key={i}>
              {page.map((translation) => (
                <div
                  key={translation.id}
                  className="bg-white p-4 rounded-lg shadow-sm"
                >
                  <div className="text-sm text-gray-500 mb-2">
                    🕐 {new Date(translation.created_at).toLocaleString('ko-KR')}
                  </div>
                  <div className="mb-2">
                    <span className="font-semibold">KR:</span>{' '}
                    {translation.korean_text.substring(0, 100)}
                    {translation.korean_text.length > 100 && '...'}
                  </div>
                  <div className="mb-2">
                    <span className="font-semibold">EN:</span>{' '}
                    {(translation.edited_english_text || translation.english_text)
                      .substring(0, 100)}
                    {(translation.edited_english_text || translation.english_text)
                      .length > 100 && '...'}
                  </div>
                  {translation.is_edited && (
                    <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                      ✏️ 편집됨
                    </span>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* 무한 스크롤 트리거 */}
        <div ref={loadMoreRef} className="py-4 text-center">
          {isFetchingNextPage && <p>🔄 불러오는 중...</p>}
          {!hasNextPage && <p className="text-gray-500">모든 히스토리를 불러왔습니다.</p>}
        </div>
      </div>
    </div>
  );
}
```

---

### Phase 5: Cloudflare Access 설정 (3일차)

#### Step 5.1: Zero Trust 대시보드 설정

1. **Cloudflare 대시보드 접속**
   - https://one.dash.cloudflare.com/

2. **Access Application 생성**
   ```
   Settings:
   - Application name: Prompt Translator
   - Session duration: 24 hours
   - Application domain: translate.yourdomain.com
   ```

3. **One-time PIN 활성화**
   ```
   Settings > Authentication > Login methods
   - Enable "One-time PIN"
   ```

4. **Access Policy 생성**
   ```
   Policy name: Owner Only
   Action: Allow
   Include:
     - Emails: your-email@example.com
   ```

#### Step 5.2: 도메인 연결

```bash
# Cloudflare에서 도메인 구매 또는 기존 도메인 연결
# DNS 설정:
# translate.yourdomain.com → CNAME → <worker-domain>.workers.dev
```

---

### Phase 6: 배포 (3일차)

#### Step 6.1: 빌드 및 배포

```bash
# 로컬 테스트
npm run dev
npm run wrangler:dev

# 프로덕션 빌드
npm run build

# Cloudflare Workers 배포
npx @opennextjs/cloudflare
wrangler deploy

# D1 마이그레이션 (프로덕션)
wrangler d1 migrations apply prompt-parrot-db
```

#### Step 6.2: 환경 변수 설정

```bash
# Gemini API 키
wrangler secret put GEMINI_API_KEY

# 환경 확인
wrangler tail  # 로그 확인
```

#### Step 6.3: 배포 완료 체크리스트

- [ ] Cloudflare Workers 배포 완료
- [ ] D1 데이터베이스 마이그레이션 완료
- [ ] Gemini API 키 설정 완료
- [ ] Cloudflare Access 활성화 확인
- [ ] 도메인 연결 확인
- [ ] 번역 기능 테스트
- [ ] 히스토리 저장/조회 테스트
- [ ] CSV Export 테스트
- [ ] 모바일 반응형 확인

---

## 🧪 테스트 계획

### 기능 테스트

1. **번역 기능**
   - [ ] 한국어 → 영어 번역 정확도
   - [ ] LLM 프롬프트 최적화 품질
   - [ ] 긴 텍스트 처리 (수천 토큰)
   - [ ] 에러 처리 (API 실패, 네트워크 오류)

2. **편집 기능**
   - [ ] 번역 결과 수정
   - [ ] 원본/편집본 구분 저장
   - [ ] 편집 상태 표시

3. **히스토리 기능**
   - [ ] 저장 성공
   - [ ] 무한 스크롤 (20개씩)
   - [ ] CSV Export
   - [ ] 날짜 정렬

4. **인증**
   - [ ] Cloudflare Access 로그인
   - [ ] 세션 유지 (24시간)
   - [ ] 비인가 접근 차단

### 성능 테스트

- [ ] 페이지 로드 시간 < 1초
- [ ] 번역 응답 시간 < 3초
- [ ] 히스토리 조회 < 500ms

### 보안 테스트

- [ ] API 키 노출 확인 (클라이언트 소스 검사)
- [ ] HTTPS 강제
- [ ] D1 데이터 암호화 확인

---

## 📈 Phase 2 & 3 계획 (향후)

### Phase 2: 핵심 기능 개선 (1주 후)
1. **검색 기능**
   - 한국어/영어 전문 검색 (Full-text search)
   - D1 FTS (Full-text search) 활용

2. **LLM 태깅**
   - 사용한 LLM 분류 (Claude, GPT, Gemini)
   - 필터링 기능

3. **UI/UX 개선**
   - shadcn/ui 컴포넌트 적용
   - 애니메이션 추가
   - 다크모드

### Phase 3: 고급 기능 (점진적)
1. **다중 API 지원**
   - Claude API 추가
   - GPT API 추가
   - API 선택 UI

2. **통계 대시보드**
   - 일일 번역 횟수
   - 자주 쓰는 주제
   - 토큰 사용량

3. **Notion 동기화**
   - Notion API 연동
   - 자동 백업

---

## 🚨 알려진 이슈 및 주의사항

### 1. Next.js 15.3+ Instrumentation Hook 버그
**증상:** 일부 Next.js 15.3+ 버전에서 OpenNext 호환 문제
**해결:** Next.js 15.0-15.2 사용 권장

**출처:**
- [OpenNext Cloudflare Known Issues](https://opennext.js.org/cloudflare)

### 2. D1 로컬 개발 제약
**증상:** 로컬 D1은 영구 저장 아님 (재시작 시 초기화)
**해결:** 로컬은 테스트용, 프로덕션 D1 사용

### 3. Gemini API Rate Limit
**증상:** 분당 15 requests 초과 시 429 에러
**해결:** 클라이언트 단에서 Rate limit UI 표시

---

## 📚 참고 자료

### 공식 문서
- [Next.js 15 Documentation](https://nextjs.org/docs)
- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [OpenNext Cloudflare](https://opennext.js.org/cloudflare)
- [Cloudflare D1 Documentation](https://developers.cloudflare.com/d1/)
- [Gemini API Documentation](https://ai.google.dev/gemini-api/docs)
- [Cloudflare Access Documentation](https://developers.cloudflare.com/cloudflare-one/)

### 베스트 프랙티스
- [D1 Best Practices](https://developers.cloudflare.com/d1/best-practices/)
- [Next.js on Cloudflare Workers Guide](https://developers.cloudflare.com/workers/framework-guides/web-apps/nextjs/)

---

## ✅ 성공 기준

### 기술적 성공
- [ ] 모든 MVP 기능 구현 완료
- [ ] Cloudflare Workers + D1 안정적 운영
- [ ] Gemini API 정상 작동
- [ ] Cloudflare Access 인증 작동
- [ ] 모바일 반응형 완벽 지원

### 사용자 경험 성공
- [ ] 번역 품질 만족 (LLM 프롬프트 최적화)
- [ ] 빠른 응답 속도 (< 3초)
- [ ] 직관적 UI
- [ ] 에러 발생 시 쉬운 복구

### 운영 성공
- [ ] 무료 티어 내 안정적 운영
- [ ] 데이터 무손실
- [ ] 장기 운영 가능한 인프라

---

## 🎯 다음 액션 아이템

1. **즉시 시작:**
   - [ ] Cloudflare 계정 생성 (아직 없다면)
   - [ ] Gemini API 키 발급
   - [ ] 도메인 구매/준비

2. **개발 시작 전:**
   - [ ] Node.js 18+ 설치 확인
   - [ ] wrangler CLI 설치: `npm install -g wrangler`
   - [ ] Cloudflare 로그인: `wrangler login`

3. **개발 킥오프:**
   - [ ] 프로젝트 초기화
   - [ ] D1 데이터베이스 생성
   - [ ] 첫 번째 번역 API 테스트

---

**이 계획은 2025년 12월 26일 기준 최신 정보를 반영했습니다.**
**개발 중 변경사항이 생기면 이 문서를 업데이트하세요.**
