# Claude Code 작업 가이드

이 파일은 Claude Code 터미널에서 순서대로 실행할 명령어와 지시사항을 정리한 것입니다.
각 단계를 Claude Code에 복사하여 실행하세요.

---

## 사전 준비 (수동으로 해야 할 것들)

### 1. Supabase 프로젝트 생성
1. https://supabase.com 접속 > New Project 생성
2. Region: Northeast Asia (Tokyo) 선택 (한국에서 가장 빠름)
3. 프로젝트 생성 후 Settings > API에서 아래 값 복사:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - anon public key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - service_role key → `SUPABASE_SERVICE_ROLE_KEY`

### 2. Supabase DB 초기화
1. Supabase 대시보드 > SQL Editor
2. `supabase/migrations/001_initial_schema.sql` 내용 붙여넣기 > Run
3. `supabase/migrations/003_seed_data.sql` 내용 붙여넣기 > Run

### 3. Supabase Auth 설정
1. Authentication > Providers > Email 활성화
2. Authentication > URL Configuration:
   - Site URL: `http://localhost:3000` (개발) / 나중에 Vercel URL로 변경
   - Redirect URLs: `http://localhost:3000/**`

### 4. Anthropic API Key 발급
1. https://console.anthropic.com/ 접속
2. API Keys > Create Key
3. 생성된 키를 `.env.local`의 `ANTHROPIC_API_KEY`에 입력

### 5. 하이웍스 SMTP 확인
1. 하이웍스 관리자 > 메일 설정 > SMTP/POP3/IMAP 사용 여부 확인
2. 사용할 메일 계정과 비밀번호를 `.env.local`에 입력

---

## Phase 0: 프로젝트 초기화

Claude Code에 다음과 같이 지시하세요:

```
gov-grant-assistant 폴더에서 Next.js 프로젝트를 초기화해줘.
이미 CLAUDE.md, README.md, vercel.json, .env.example, .gitignore,
supabase/migrations/*.sql 파일이 있으니 덮어쓰지 말고,
나머지 Next.js 기본 구조만 생성해줘.

실행할 명령어:
1. npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir=false --import-alias="@/*"
   (충돌나는 파일은 No 선택)
2. npx shadcn@latest init (New York 스타일, Zinc 컬러)
3. npm install @supabase/supabase-js @supabase/ssr nodemailer cheerio date-fns recharts docx @anthropic-ai/sdk
4. npm install -D @types/nodemailer @types/cheerio

그 다음 .env.example을 .env.local로 복사해줘.
```

---

## Phase 1: 인증 + 기본 레이아웃

```
CLAUDE.md를 읽고 Phase 1을 구현해줘.

1. lib/supabase/client.ts - 브라우저용 Supabase 클라이언트
2. lib/supabase/server.ts - 서버 컴포넌트/API Route용 Supabase 클라이언트
3. lib/supabase/admin.ts - Service Role 키를 쓰는 Admin 클라이언트
4. middleware.ts - 인증 체크 미들웨어 (로그인 안 된 사용자는 /login으로 리다이렉트)
5. app/login/page.tsx - 로그인 페이지 (이메일/비밀번호)
6. app/layout.tsx - 루트 레이아웃 (사이드바 네비게이션 포함)
7. app/page.tsx - 대시보드 (일단 빈 페이지, 나중에 채움)
8. components/layout/Sidebar.tsx - 사이드바 (메뉴: 대시보드, 추천공고, 과제관리, 일정, 결재, 설정)

사이드바는 한국어로, 깔끔한 관리자 대시보드 스타일로 만들어줘.
shadcn/ui 컴포넌트를 최대한 활용해줘.
```

---

## Phase 2: 과제 공고 추천 시스템

```
CLAUDE.md를 읽고 Phase 2를 구현해줘.

### 2-1. 매칭 기준 관리
1. app/settings/keywords/page.tsx - 한미르 제품별 키워드 관리 UI
   (company_profiles 테이블 CRUD)
2. lib/matcher/company-profile.ts - DB에서 프로필 로드하는 유틸

### 2-2. 스크래퍼
3. lib/scraper/ntis.ts - NTIS 공고 수집 (API 또는 스크래핑)
4. lib/scraper/utils.ts - 텍스트 정제, 날짜 파싱 유틸
5. lib/scraper/index.ts - 스크래퍼 오케스트레이터 (여러 소스 순회)

### 2-3. 매칭 엔진
6. lib/matcher/keyword.ts - TF-IDF 기반 키워드 매칭
7. lib/matcher/llm.ts - Claude API 정밀 매칭
   (시스템 프롬프트에 한미르 기술 프로필 포함,
    공고 텍스트를 분석하여 적합도 점수 + 근거 반환)

### 2-4. 알림
8. lib/email/sender.ts - Nodemailer + 하이웍스 SMTP 발송
9. lib/email/templates/grant-recommendation.tsx - 추천 공고 이메일 템플릿

### 2-5. Cron Job
10. app/api/cron/scrape-grants/route.ts - Vercel Cron 엔드포인트
    (CRON_SECRET 검증 → 스크래핑 → 매칭 → 알림 순서로 실행)

### 2-6. UI
11. app/grants/page.tsx - 추천 공고 목록 (점수순 정렬, 상태 필터)
12. app/grants/[id]/page.tsx - 공고 상세 (매칭 근거, 메모, 상태 변경)
13. components/grants/GrantCard.tsx - 공고 카드 컴포넌트
14. components/grants/MatchScore.tsx - 매칭 점수 시각화

중요: Cron 엔드포인트는 Authorization 헤더로 CRON_SECRET을 검증해야 해.
Vercel Cron이 자동으로 이 헤더를 보내줘.
```

---

## Phase 3: 과제 관리 기본

```
CLAUDE.md를 읽고 Phase 3를 구현해줘.

### 3-1. 과제 CRUD
1. app/projects/page.tsx - 과제 목록 (상태별 탭, 검색)
2. app/projects/new/page.tsx - 과제 등록 (단계별 위자드 폼)
3. app/projects/[id]/page.tsx - 과제 상세 (탭: 기본정보, 예산, 인력, 마일스톤, 성과물)
4. app/api/projects/route.ts - GET/POST
5. app/api/projects/[id]/route.ts - GET/PUT/DELETE

### 3-2. 예산 관리
6. app/projects/[id]/budget/page.tsx - 비목별 예산 현황 (편성 vs 집행)
7. app/api/projects/[id]/budget/route.ts - 예산 CRUD
8. app/api/expenses/route.ts - 집행 등록 (이중집행 방지 로직 포함)
9. components/projects/BudgetTable.tsx - 비목별 예산 테이블

### 3-3. 전자결재
10. app/approvals/page.tsx - 결재 대기/완료 목록
11. app/api/approvals/[id]/route.ts - 승인/반려

이중집행 방지: 증빙파일 업로드 시 SHA-256 해시를 계산하고,
expenses.receipt_hash에 저장. 동일 해시가 DB에 있으면 등록 차단.
```

---

## Phase 4-5는 3까지 완성된 후 진행

Phase 3까지 완성하고 실제 데이터를 넣어서 테스트한 후,
Phase 4(일정/인력/성과), Phase 5(대시보드/보고서)를 진행합니다.

---

## 유용한 Claude Code 명령 패턴

### 새 기능 추가 시
```
CLAUDE.md를 참고해서 [기능명]을 구현해줘.
관련 테이블은 [테이블명]이고, API Route와 UI 페이지 모두 만들어줘.
```

### 버그 수정 시
```
[파일경로]에서 [증상] 에러가 발생해. 수정해줘.
```

### 디자인 개선 시
```
[페이지경로] 페이지의 UI를 개선해줘.
shadcn/ui 컴포넌트를 활용하고, 한국어 관리자 대시보드 스타일로.
```

### Supabase 쿼리 도움
```
[테이블명] 테이블에서 [조건]인 데이터를 가져오는
Supabase 쿼리를 작성해줘. RLS 정책도 함께.
```
