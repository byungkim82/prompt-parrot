# Prompt Parrot 개선 로드맵

> 2026-03-15 분석 기준. 보안/에러 핸들링 이슈는 모두 해결된 상태.

## 현재 상태

- 코드베이스: ~1000 LOC, 4개 프로덕션 의존성, 109kB 번들
- 테스트: 82개 (API, 컴포넌트, 페이지 통합, Hook)
- D1 스키마에 미사용 컬럼 존재: `tags`, `notes`, `is_favorite`, `llm_used`

---

## Phase 1: Quick Wins (총 ~2시간)

### 1-1. 키보드 단축키 (30분)
- `Cmd/Ctrl+Enter`: 번역 실행
- `Cmd/Ctrl+S`: 저장
- textarea에 `autoFocus` 추가
- `app/page.tsx`의 textarea에 `onKeyDown` 핸들러 추가
- 전역 단축키는 `useEffect` + `document.addEventListener('keydown')` (~20줄)

### 1-2. 번역 완료 시 자동 복사 (30분)
- `handleTranslate` 성공 후 `navigator.clipboard.writeText` 호출
- localStorage에 on/off 토글 저장 (원치 않는 사용자를 위해)
- `app/page.tsx:36-38` 이후에 추가

### 1-3. React Query staleTime 증가 (20분)
- `app/providers.tsx:11`의 `staleTime`을 60초 → 5분으로 변경
- 히스토리 페이지 불필요한 API 재호출 80% 감소

### 1-4. 폰트 로딩 최적화 (30분)
- `app/layout.tsx`의 Pretendard 폰트 link를 deferred loading으로 변경
- `media="print" onLoad="this.media='all'"` 패턴 또는 `font-display: swap` 적용
- FCP 10-15% 개선

### 1-5. localStorage 드래프트 보존 (15분)
- 번역 결과를 `localStorage`에 저장 (`koreanText`, `englishText`, `editedText`)
- 페이지 이동 후 돌아와도 작업 유지
- `app/page.tsx`에 `useEffect` 2개 추가 (저장 + 복원, ~15줄)

---

## Phase 2: 핵심 기능 (총 ~15시간)

### 2-1. 스트리밍 번역 응답 (3시간)
- 현재: Gemini 전체 응답 대기 (2-8초 스피너)
- 변경: `streamGenerateContent` 엔드포인트 + `ReadableStream` 반환
- 백엔드: `app/api/translate/route.ts` - SSE 스트리밍 (~30줄 변경)
- 프론트엔드: `app/page.tsx` - `response.body.getReader()` 루프 (~20줄 변경)
- Cloudflare Workers는 `TransformStream`/`ReadableStream` 네이티브 지원
- AI Gateway도 스트리밍 패스스루 지원

### 2-2. 즐겨찾기 시스템 (2시간)
- DB: `is_favorite` 컬럼 + `idx_is_favorite` 인덱스 이미 존재 (마이그레이션 불필요)
- API: `PATCH /api/history` - `is_favorite` 토글
- API: `GET /api/history?favorites=true` - `WHERE is_favorite = 1` 필터
- UI: 히스토리 카드에 별 토글 버튼, 즐겨찾기 필터 토글

### 2-3. 태그 시스템 (4시간)
- DB: `tags TEXT` 컬럼 이미 존재 (마이그레이션 불필요)
- 저장 시 `JSON.stringify(tags)`, 필터 시 `WHERE tags LIKE '%"tag"%'`
- API: `POST /api/history` - `tags: string[]` 필드 추가
- API: `GET /api/history?tag=claude` - 태그 필터
- UI: 태그 입력 (저장 시), 태그 pill 표시 (히스토리 카드), 필터 UI

### 2-4. 히스토리 검색 + 필터 (2시간)
- API: `GET /api/history?q=검색어` - `WHERE korean_text LIKE ? OR english_text LIKE ?`
- UI: 디바운스된 검색 입력, 편집됨 필터 (`WHERE is_edited = 1`)
- 히스토리 카드 클릭 시 전체 내용 펼치기 (현재 200자 truncation만 있음)

### 2-5. 번역 스타일 옵션 (2시간)
- 4가지 스타일: 일반 / 시스템 프롬프트 / 간결 / 코드
- API: `TranslateRequest`에 `style` 필드 추가, 스타일별 프롬프트 수정자 적용
- UI: 번역 버튼 위 세그먼트 컨트롤 (4버튼)
- 사용한 스타일을 `tags` 컬럼에 저장하면 히스토리 분석 가능

### 2-6. 번역 캐싱 / 중복 제거 (2시간)
- 새 테이블: `translation_cache` (korean_text 해시 → english_text)
- 번역 전 해시로 캐시 조회, 히트 시 Gemini API 호출 생략
- 응답에 `cached: true` 플래그 포함
- 동일 입력 재번역 시 API 비용 30% 절감

---

## Phase 3: 프로 도구 (총 ~19시간)

### 3-1. 멀티모델 지원 (5시간)
- Cloudflare AI Gateway가 이미 프록시 역할 → 경로만 변경하면 됨
  - Gemini: `/google-ai-studio/v1/models/{model}:generateContent`
  - Claude: `/anthropic/v1/messages`
  - OpenAI: `/openai/v1/chat/completions`
- `lib/llm.ts`에 `callLLM(model, prompt)` 추상화 레이어
- 각 프로바이더별 요청 빌더 + 응답 파서
- 시크릿: `ANTHROPIC_API_KEY`, `OPENAI_API_KEY` 추가
- `llm_used` 컬럼 활성화

### 3-2. 다크모드 (4시간)
- `tailwind.config.ts`에 `darkMode: 'class'` 추가
- 헤더에 테마 토글 버튼 (sun/moon)
- `localStorage`에 선호 테마 저장
- 주요 매핑: `bg-white → dark:bg-slate-900`, `text-slate-800 → dark:text-slate-100` 등
- `app/page.tsx`, `app/history/page.tsx` 전체에 `dark:` 변형 추가

### 3-3. JSON/마크다운 내보내기 (2시간)
- 히스토리 페이지 CSV 내보내기 버튼을 드롭다운으로 변경 (CSV / JSON / Markdown)
- JSON: 머신 리더블, 다른 도구로 임포트 가능
- Markdown: 프롬프트 라이브러리 문서로 바로 커밋 가능
- 클라이언트 사이드 생성 (API 변경 불필요)

### 3-4. 프롬프트 템플릿 시스템 (4시간)
- v1: `localStorage`에 저장 (API 변경 불필요)
- 인터페이스: `{ id, name, style, systemHint?, createdAt }`
- UI: 스타일 선택기 옆 "Templates" 드롭다운, 번역 후 "Save as template" 버튼
- v2: D1에 `templates` 테이블 추가 (영구 저장)

### 3-5. PWA 지원 (2시간)
- `public/manifest.json` (name, icons, display: standalone)
- `public/sw.js` (최소 서비스 워커, 셸 캐싱)
- `app/layout.tsx`에 `<link rel="manifest">` 추가
- 오프라인 번역은 불가하나, 전용 창 + 빠른 실행 제공

### 3-6. CLI 도구 연동 (2시간)
- API에 Bearer token 인증 추가 (Wrangler secret: `APP_API_TOKEN`)
- 미들웨어에서 `Authorization` 헤더 검증
- 셸 함수 예시:
  ```bash
  pp() {
    curl -s -X POST https://worker.dev/api/translate \
      -H "Authorization: Bearer $PP_TOKEN" \
      -H "Content-Type: application/json" \
      -d "{\"koreanText\": \"$1\"}" | jq -r '.englishText'
  }
  ```
- 같은 토큰으로 VS Code 확장, 브라우저 확장 가능

---

## 히스토리 "재사용" 기능 (추가 아이디어)

- 히스토리 카드에 "다시 번역" 버튼: 같은 한국어 텍스트로 새 번역 실행
- "입력으로 사용" 버튼: 메인 페이지로 이동 + 한국어 텍스트 프리로드
- 번역 버전 비교: 같은 입력의 다른 번역 결과를 나란히 비교 (멀티모델 후 구현)

---

## 노트 필드 활성화 (2시간)

- DB: `notes TEXT` 컬럼 이미 존재
- API: `POST/PATCH /api/history` - `notes` 필드 추가
- UI: 히스토리 카드에 접힌 "메모 추가" 토글 (인라인 textarea)
- 용도: "코드 리뷰 봇 시스템 프롬프트", "Claude에서 거부됨, GPT로 전환" 등 컨텍스트 기록
