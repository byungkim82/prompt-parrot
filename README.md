# 🦜 Prompt Parrot

한국어를 LLM 프롬프트에 최적화된 영어로 번역하는 개인용 웹앱

## 주요 기능

- ✅ Gemini 2.0 Flash API를 사용한 LLM 프롬프트 최적화 번역
- ✅ 번역 결과 수동 편집 기능
- ✅ 클립보드 자동 복사
- ✅ 암호화된 번역 히스토리 저장 (Cloudflare D1)
- ✅ 무한 스크롤 히스토리 (20개씩 로드)
- ✅ CSV 내보내기
- ✅ Cloudflare Access 인증 (개인 전용)

## 기술 스택

- **프론트엔드**: Next.js 15 (App Router), React 19, TailwindCSS 4
- **배포**: Cloudflare Workers + OpenNext
- **데이터베이스**: Cloudflare D1 (SQLite)
- **번역 API**: Google Gemini 2.0 Flash
- **인증**: Cloudflare Access

## 사전 요구사항

- Node.js 18+
- npm
- Cloudflare 계정
- Gemini API 키

## 로컬 개발 설정

### 1. 패키지 설치

\`\`\`bash
npm install
\`\`\`

### 2. Cloudflare 로그인

\`\`\`bash
npm install -g wrangler
wrangler login
\`\`\`

### 3. D1 데이터베이스 생성

\`\`\`bash
# 데이터베이스 생성
wrangler d1 create prompt-parrot-db
\`\`\`

생성 후 출력되는 `database_id`를 복사하여 `wrangler.toml` 파일을 업데이트하세요:

\`\`\`toml
[[d1_databases]]
binding = "DB"
database_name = "prompt-parrot-db"
database_id = "YOUR_DATABASE_ID_HERE"  # 여기에 복사한 ID 입력
\`\`\`

### 4. 데이터베이스 마이그레이션

\`\`\`bash
# 로컬 개발용 마이그레이션
npm run db:migrate:local

# 프로덕션 마이그레이션 (배포 후)
npm run db:migrate:prod
\`\`\`

### 5. Gemini API 키 발급

1. [Google AI Studio](https://ai.google.dev/) 접속
2. API Key 생성
3. 로컬 개발을 위해 `.dev.vars` 파일 생성:

\`\`\`bash
# .dev.vars 파일 생성
echo "GEMINI_API_KEY=your-api-key-here" > .dev.vars
\`\`\`

### 6. 로컬 개발 서버 실행

\`\`\`bash
npm run dev
\`\`\`

브라우저에서 http://localhost:3000 접속

**참고**: 로컬 개발에서는 D1 바인딩이 작동하지 않을 수 있습니다. API 엔드포인트를 테스트하려면 Wrangler dev를 사용하세요:

\`\`\`bash
npm run wrangler:dev
\`\`\`

## 🚀 자동 배포 (권장)

이 프로젝트는 GitHub Actions를 통해 **main 브랜치에 push될 때마다 자동으로 배포**됩니다.

### 초기 설정 (1회만)

**상세 가이드**: [DEPLOYMENT.md](./DEPLOYMENT.md) 참조

1. **Cloudflare API 토큰 생성**
   - [Cloudflare API Tokens](https://dash.cloudflare.com/profile/api-tokens) 접속
   - "Edit Cloudflare Workers" 템플릿으로 토큰 생성
   - 권한: Workers Edit, D1 Edit

2. **Cloudflare Account ID 확인**
   - [Cloudflare 대시보드](https://dash.cloudflare.com) 우측 사이드바에서 복사

3. **GitHub Secrets 설정**
   - 저장소 Settings > Secrets and variables > Actions
   - 다음 2개 추가:
     - `CLOUDFLARE_API_TOKEN`: 생성한 API 토큰
     - `CLOUDFLARE_ACCOUNT_ID`: Account ID

4. **D1 데이터베이스 생성 및 설정**
   \`\`\`bash
   wrangler d1 create prompt-parrot-db
   # 출력된 database_id를 wrangler.toml에 입력
   \`\`\`

5. **Gemini API 키 설정**
   \`\`\`bash
   wrangler secret put GEMINI_API_KEY
   \`\`\`

### 자동 배포 사용하기

\`\`\`bash
# main 브랜치에 push하면 자동 배포
git add .
git commit -m "Update feature"
git push origin main
# → GitHub Actions가 자동으로 빌드 및 배포 🚀
\`\`\`

**배포 상태 확인**: GitHub 저장소 > Actions 탭

---

## Cloudflare Workers 수동 배포

자동 배포 설정 없이 수동으로 배포하는 방법:

### 1. 프로덕션 D1 마이그레이션

\`\`\`bash
npm run db:migrate:prod
\`\`\`

### 2. Gemini API 키 시크릿 설정

\`\`\`bash
wrangler secret put GEMINI_API_KEY
# 프롬프트에 API 키 입력
\`\`\`

### 3. 빌드 및 배포

\`\`\`bash
npm run build
npm run deploy
\`\`\`

또는 Wrangler로 직접 배포:

\`\`\`bash
wrangler deploy
\`\`\`

## Cloudflare Access 설정

### 1. Zero Trust 대시보드 접속

https://one.dash.cloudflare.com/

### 2. Access Application 생성

1. **Access** > **Applications** > **Add an application**
2. **Self-hosted** 선택
3. 설정:
   - Application name: `Prompt Parrot`
   - Session duration: `24 hours`
   - Application domain: `your-worker.workers.dev` (또는 커스텀 도메인)

### 3. One-time PIN 활성화

1. **Settings** > **Authentication** > **Login methods**
2. **One-time PIN** 활성화

### 4. Access Policy 생성

1. Policy name: `Owner Only`
2. Action: `Allow`
3. Include:
   - **Emails**: `your-email@example.com`

## 커스텀 도메인 연결 (선택사항)

1. Cloudflare에서 도메인 구매 또는 기존 도메인 연결
2. Workers & Pages 설정에서 커스텀 도메인 추가
3. Cloudflare Access에서 도메인 업데이트

## 프로젝트 구조

\`\`\`
prompt-parrot/
├── app/
│   ├── api/
│   │   ├── translate/route.ts      # Gemini API 번역 엔드포인트
│   │   └── history/route.ts        # 히스토리 CRUD
│   ├── history/
│   │   └── page.tsx                # 히스토리 페이지
│   ├── hooks/
│   │   └── useHistory.ts           # 히스토리 조회 hook
│   ├── layout.tsx                  # 루트 레이아웃
│   ├── page.tsx                    # 메인 번역 페이지
│   ├── providers.tsx               # React Query Provider
│   └── globals.css                 # 글로벌 스타일
├── migrations/
│   └── 0001_create_translations.sql # D1 마이그레이션
├── wrangler.toml                   # Cloudflare Workers 설정
├── package.json
└── README.md
\`\`\`

## 사용 방법

### 번역하기

1. 메인 페이지에서 한국어 텍스트 입력
2. "번역하기" 버튼 클릭
3. 영어 번역 결과 확인
4. 필요시 "편집하기"로 수정
5. "클립보드에 복사" 버튼으로 복사
6. "저장" 버튼으로 히스토리에 저장

### 히스토리 관리

1. "📚 히스토리" 링크 클릭
2. 저장된 번역 목록 확인
3. 각 항목에서:
   - "📋 복사": 번역 결과 복사
   - "🗑️ 삭제": 항목 삭제
4. "📥 CSV 내보내기"로 전체 데이터 다운로드

## 비용 (무료 티어)

### Cloudflare Workers
- **무료**: 100,000 requests/일
- 개인용으로 충분

### Cloudflare D1
- **무료**: 5GB 저장소, 500만 읽기/일
- 개인용으로 충분

### Gemini 2.0 Flash API
- **무료**: 분당 15 requests, 일 1,500 requests
- **유료**: $0.075 / 1M 토큰 (매우 저렴)

## 트러블슈팅

### "D1 데이터베이스가 바인딩되지 않았습니다"

- `wrangler.toml`에서 D1 바인딩 설정 확인
- 프로덕션 환경에서만 D1이 작동 (로컬은 `--local` 플래그 필요)

### "API 키가 설정되지 않았습니다"

\`\`\`bash
# 로컬: .dev.vars 파일 생성
echo "GEMINI_API_KEY=your-api-key" > .dev.vars

# 프로덕션: wrangler secret 설정
wrangler secret put GEMINI_API_KEY
\`\`\`

### 번역 속도가 느림

- Gemini API는 보통 1-3초 소요
- 네트워크 상태 확인
- Rate limit 초과 여부 확인 (분당 15 requests)

## 향후 계획

- [ ] 검색 기능 (한국어/영어 전문 검색)
- [ ] LLM 분류 태그 (Claude, GPT, Gemini 등)
- [ ] 주제별 태그 시스템
- [ ] 즐겨찾기 기능
- [ ] 통계 대시보드
- [ ] Notion 동기화
- [ ] 다크모드
- [ ] 다중 번역 API 지원 (Claude, GPT)

## 라이선스

개인 프로젝트 - MIT License

## 참고 자료

- [Next.js Documentation](https://nextjs.org/docs)
- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [OpenNext Cloudflare](https://opennext.js.org/cloudflare)
- [Cloudflare D1 Documentation](https://developers.cloudflare.com/d1/)
- [Gemini API Documentation](https://ai.google.dev/gemini-api/docs)
- [Cloudflare Access Documentation](https://developers.cloudflare.com/cloudflare-one/)
