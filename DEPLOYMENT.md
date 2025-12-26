# Cloudflare Workers 자동 배포 가이드

이 프로젝트는 GitHub Actions를 통해 main 브랜치에 push될 때마다 자동으로 Cloudflare Workers에 배포됩니다.

## 초기 설정 (1회만)

### 1. Cloudflare API 토큰 생성

1. [Cloudflare 대시보드](https://dash.cloudflare.com/profile/api-tokens) 접속
2. **Create Token** 클릭
3. **Edit Cloudflare Workers** 템플릿 사용 또는 Custom Token 생성
4. 필요한 권한:
   - Account > Cloudflare Workers > Edit
   - Account > Cloudflare D1 > Edit
5. **Continue to summary** > **Create Token**
6. 생성된 토큰 복사 (한 번만 표시됨!)

### 2. Cloudflare Account ID 확인

1. [Cloudflare 대시보드](https://dash.cloudflare.com) 접속
2. Workers & Pages 페이지로 이동
3. 우측 사이드바에서 **Account ID** 복사

### 3. GitHub Secrets 설정

1. GitHub 저장소 페이지 접속
2. **Settings** > **Secrets and variables** > **Actions**
3. **New repository secret** 클릭하여 다음 2개 추가:

   **Secret 1:**
   - Name: `CLOUDFLARE_API_TOKEN`
   - Value: 위에서 생성한 API 토큰

   **Secret 2:**
   - Name: `CLOUDFLARE_ACCOUNT_ID`
   - Value: 위에서 복사한 Account ID

### 4. Gemini API 키 설정 (최초 1회)

wrangler CLI로 수동 설정 필요 (GitHub Actions에서는 불가능):

\`\`\`bash
wrangler login
wrangler secret put GEMINI_API_KEY
# 프롬프트에 Gemini API 키 입력
\`\`\`

### 5. D1 데이터베이스 생성 (최초 1회)

\`\`\`bash
wrangler d1 create prompt-parrot-db
\`\`\`

출력된 `database_id`를 `wrangler.toml`에 업데이트:

\`\`\`toml
[[d1_databases]]
binding = "DB"
database_name = "prompt-parrot-db"
database_id = "YOUR_DATABASE_ID_HERE"
\`\`\`

커밋 및 푸시하여 자동 배포 트리거:

\`\`\`bash
git add wrangler.toml
git commit -m "Configure D1 database ID"
git push
\`\`\`

## 자동 배포 작동 방식

### 트리거 조건

- **main 브랜치에 push**: 자동으로 배포 시작
- **수동 배포**: GitHub Actions 탭에서 "Run workflow" 클릭

### 배포 과정

1. ✅ 코드 체크아웃
2. ✅ Node.js 20 설정
3. ✅ 의존성 설치 (`npm ci`)
4. ✅ Next.js 빌드 (`npm run build`)
5. ✅ D1 마이그레이션 실행 (`wrangler d1 migrations apply`)
6. ✅ Cloudflare Workers 배포 (`npm run deploy`)

### 배포 확인

1. GitHub 저장소 > **Actions** 탭
2. 최근 워크플로우 실행 상태 확인
3. 성공 시: ✅ 녹색 체크마크
4. 실패 시: ❌ 빨간 X (로그 확인)

## 개발 워크플로우

### 기능 개발

\`\`\`bash
# 1. 새 브랜치 생성
git checkout -b feature/new-feature

# 2. 코드 작성
# ...

# 3. 커밋
git add .
git commit -m "Add new feature"

# 4. 푸시 (아직 배포 안 됨)
git push origin feature/new-feature

# 5. PR 생성 및 리뷰

# 6. main에 merge → 자동 배포 🚀
git checkout main
git merge feature/new-feature
git push origin main
\`\`\`

### 수동 배포

긴급 배포가 필요한 경우:

1. GitHub 저장소 > **Actions** 탭
2. **Deploy to Cloudflare Workers** 워크플로우 선택
3. **Run workflow** 클릭
4. 브랜치 선택 (main) > **Run workflow**

## 로컬 테스트 (배포 전)

\`\`\`bash
# 로컬 빌드 테스트
npm run build

# Wrangler로 로컬 테스트
npm run wrangler:dev

# 로컬 D1 마이그레이션
npm run db:migrate:local
\`\`\`

## 트러블슈팅

### 배포 실패: "Authentication error"

- GitHub Secrets에 `CLOUDFLARE_API_TOKEN`과 `CLOUDFLARE_ACCOUNT_ID`가 올바르게 설정되었는지 확인
- Cloudflare API 토큰이 만료되지 않았는지 확인

### 배포 실패: "D1 database not found"

- `wrangler.toml`에 올바른 `database_id`가 설정되었는지 확인
- D1 데이터베이스가 실제로 생성되었는지 확인:
  \`\`\`bash
  wrangler d1 list
  \`\`\`

### 배포 성공했지만 API 에러 발생

- Gemini API 키가 설정되지 않았을 가능성:
  \`\`\`bash
  wrangler secret put GEMINI_API_KEY
  \`\`\`

### 마이그레이션 실패

- 이미 마이그레이션이 적용된 경우 재실행 시 오류 발생 가능 (정상)
- 새 마이그레이션 추가 시에만 실행됨

## 배포 URL 확인

배포 완료 후 URL 확인:

\`\`\`bash
wrangler deployments list
\`\`\`

또는 GitHub Actions 로그에서 배포 URL 확인 가능

## Cloudflare Access 설정

자동 배포 완료 후 Cloudflare Access 설정은 수동으로 진행:

1. https://one.dash.cloudflare.com/ 접속
2. Access > Applications > Add application
3. 배포된 Workers URL 설정
4. One-time PIN 인증 활성화
5. 본인 이메일만 허용

## 비용

GitHub Actions:
- **무료**: 퍼블릭 저장소 무제한
- **프라이빗**: 2,000분/월 무료

Cloudflare Workers:
- 배포 횟수 제한 없음
- 실행 비용만 발생 (무료 티어: 100,000 requests/일)

---

이제 main 브랜치에 push하면 자동으로 배포됩니다! 🚀
