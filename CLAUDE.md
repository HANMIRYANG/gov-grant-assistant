# Gov Grant Assistant - 한미르 정부과제 추천 및 관리 시스템

## 프로젝트 개요
한미르 주식회사(나노 세라믹 기반 안전 소재 전문기업)를 위한 정부 R&D 과제 자동 추천 및 과제 관리 시스템.
정부 공고를 자동 수집하여 한미르의 기술/제품 스펙과 매칭하고, 적합한 과제를 담당자에게 알림으로 전달.
동시에 수주한 과제의 예산, 인력, 마일스톤, 성과물을 통합 관리.

## 기술 스택
- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript
- **Database**: Supabase (PostgreSQL + Auth + Storage)
- **Deployment**: Vercel Pro
- **Styling**: Tailwind CSS + shadcn/ui
- **Email**: Nodemailer + 하이웍스 SMTP (smtp.hiworks.com:587)
- **LLM**: Anthropic Claude API (Sonnet) - 공고 정밀 매칭용
- **Scraping**: Cheerio (정적 페이지) + Playwright (동적 페이지, 필요 시)
- **Charts**: Recharts
- **Gantt**: dhtmlx-gantt 또는 frappe-gantt

## 인프라 구성
```
Vercel Pro (Next.js)
├── /app          → 프론트엔드 페이지 (React Server Components)
├── /app/api      → 백엔드 API Routes
├── /app/api/cron → 스케줄링 작업 (Vercel Cron Jobs)
└── vercel.json   → Cron 스케줄 설정

Supabase (Free Tier)
├── PostgreSQL    → 모든 데이터 저장
├── Auth          → 사용자 인증 (이메일/비밀번호)
├── Storage       → 파일 저장 (협약서, 증빙, 보고서)
└── RLS           → Row Level Security (역할 기반 접근)
```

## 한미르 회사 정보 (매칭 컨텍스트)
- **설립**: 2009년
- **핵심 기술**: 나노 세라믹 기반 불연/난연/단열/방열 소재
- **제품 라인**:
  1. 화재안전 솔루션: HC Series(불연 코팅), HAF Series(방염 페인트)
  2. 이차전지 솔루션: 열폭주 방지 면압패드, 에어로겔 시트, 실리콘 음극재
  3. 열관리 솔루션: HE Series(내고온 방열 코팅)
  4. 기타: 불연 접착제(SMG-505Y), 불연 발포 충진제(SMG-200/400P), 단열/차열 페인트(HIC), 방오 페인트
- **인증**: ISO 9001, ISO 14001, Inno-Biz, 조달청 우수혁신제품
- **파트너**: 현대모비스, LG에너지솔루션, KCC, POSCO
- **기존 정부과제**: 중기부(불연단열패널), 산자부(양산성능평가), 이차전지 열폭주방지 분리막

## 사용자 역할 (10명 이내)
- **admin**: 시스템 관리자 (전체 권한)
- **executive**: 경영진 (전체 조회, 승인)
- **pm**: 과제 책임자 (담당 과제 편집)
- **researcher**: 연구원 (타임시트, 성과물 입력)
- **finance**: 경영지원 (예산 집행, 정산)

## 주요 기능 모듈

### 1. 과제 공고 추천 (자동)
- Vercel Cron으로 매일 06:00 KST 실행
- NTIS API + 주요 정부 사이트 스크래핑
- 키워드 매칭 (1차) → Claude API 정밀 매칭 (2차)
- 매칭 결과 이메일/웹훅 알림

### 2. 과제 관리
- 과제 등록 (기본정보, 비목별 예산, 참여인력, 마일스톤)
- 연구비 집행 관리 (이중집행 방지, 전자결재)
- 마일스톤/간트차트
- 성능 목표(KPI) 추적
- 참여 인력/참여율 관리

### 3. 성과물 관리
- 특허, 논문, 시제품, 인증서 등록
- 사업화 실적 추적 (조달 등재, 매출 연결)

### 4. 보고서 자동 생성
- 중간/최종/정산 보고서 초안 자동 생성
- RCMS/IRIS 업로드용 데이터 추출

### 5. 알림
- 하이웍스 SMTP 이메일 알림
- 마감일 사전 알림 (30/14/7/3일 전)
- 예산 소진율 경고 (80%/95%)
- 추천 과제 알림

## 디렉토리 구조
```
gov-grant-assistant/
├── CLAUDE.md                    # 이 파일 (Claude Code 컨텍스트)
├── README.md
├── package.json
├── next.config.ts
├── tsconfig.json
├── vercel.json                  # Cron Jobs 설정
├── .env.local                   # 로컬 환경변수 (Git 제외)
├── .env.example                 # 환경변수 템플릿
├── .gitignore
│
├── app/
│   ├── layout.tsx               # 루트 레이아웃 (사이드바, 네비게이션)
│   ├── page.tsx                 # 메인 대시보드
│   ├── login/
│   │   └── page.tsx             # 로그인 페이지
│   │
│   ├── grants/                  # 과제 공고 추천
│   │   ├── page.tsx             # 추천 공고 목록
│   │   └── [id]/page.tsx        # 공고 상세
│   │
│   ├── projects/                # 과제 관리
│   │   ├── page.tsx             # 과제 목록
│   │   ├── new/page.tsx         # 과제 등록 (위자드 폼)
│   │   └── [id]/
│   │       ├── page.tsx         # 과제 상세 (탭: 기본/예산/인력/마일스톤/성과)
│   │       ├── budget/page.tsx  # 예산 상세
│   │       └── reports/page.tsx # 보고서 생성
│   │
│   ├── schedule/                # 간트차트
│   │   └── page.tsx
│   │
│   ├── approvals/               # 전자결재
│   │   └── page.tsx
│   │
│   ├── settings/                # 시스템 설정
│   │   ├── page.tsx             # 일반 설정
│   │   ├── users/page.tsx       # 사용자 관리
│   │   └── keywords/page.tsx    # 매칭 키워드 관리
│   │
│   └── api/
│       ├── cron/
│       │   └── scrape-grants/
│       │       └── route.ts     # 매일 06:00 KST 실행 - 공고 수집 + 매칭 + 알림
│       │
│       ├── grants/
│       │   ├── route.ts         # GET: 추천 공고 목록
│       │   └── [id]/route.ts    # GET: 공고 상세
│       │
│       ├── projects/
│       │   ├── route.ts         # GET: 과제 목록, POST: 과제 등록
│       │   └── [id]/
│       │       ├── route.ts     # GET/PUT/DELETE: 과제 CRUD
│       │       ├── budget/route.ts
│       │       ├── milestones/route.ts
│       │       ├── personnel/route.ts
│       │       └── outputs/route.ts
│       │
│       ├── expenses/
│       │   └── route.ts         # POST: 집행 등록 (이중집행 검사 포함)
│       │
│       ├── approvals/
│       │   └── [id]/route.ts    # PUT: 승인/반려
│       │
│       ├── reports/
│       │   └── generate/route.ts # POST: 보고서 생성 (docx/pdf)
│       │
│       └── notifications/
│           └── route.ts         # POST: 알림 발송
│
├── lib/
│   ├── supabase/
│   │   ├── client.ts            # Supabase 브라우저 클라이언트
│   │   ├── server.ts            # Supabase 서버 클라이언트
│   │   └── admin.ts             # Supabase Admin (서비스 역할)
│   │
│   ├── scraper/
│   │   ├── index.ts             # 스크래퍼 오케스트레이터
│   │   ├── ntis.ts              # NTIS API 연동
│   │   ├── smba.ts              # 중소벤처기업부 공고
│   │   ├── motie.ts             # 산업통상자원부 공고
│   │   └── utils.ts             # 공통 유틸 (날짜 파싱, 텍스트 정제)
│   │
│   ├── matcher/
│   │   ├── keyword.ts           # 1차: 키워드/TF-IDF 매칭
│   │   ├── llm.ts               # 2차: Claude API 정밀 매칭
│   │   └── company-profile.ts   # 한미르 기술 프로필 (매칭 기준)
│   │
│   ├── email/
│   │   ├── sender.ts            # Nodemailer + 하이웍스 SMTP
│   │   └── templates/
│   │       ├── grant-recommendation.tsx  # 추천 공고 알림 템플릿
│   │       ├── deadline-reminder.tsx     # 마감일 알림
│   │       └── budget-alert.tsx          # 예산 경고
│   │
│   ├── reports/
│   │   ├── generator.ts         # 보고서 생성 엔진
│   │   └── templates/           # 정부 양식 템플릿
│   │
│   └── utils/
│       ├── constants.ts         # 상수 (비목 코드, 역할 등)
│       ├── types.ts             # TypeScript 타입 정의
│       └── helpers.ts           # 공통 헬퍼 함수
│
├── components/
│   ├── ui/                      # shadcn/ui 컴포넌트
│   ├── layout/
│   │   ├── Sidebar.tsx
│   │   ├── Header.tsx
│   │   └── Navigation.tsx
│   ├── dashboard/
│   │   ├── ProjectCard.tsx
│   │   ├── BudgetGauge.tsx
│   │   ├── DdayTimeline.tsx
│   │   └── PersonnelHeatmap.tsx
│   ├── grants/
│   │   ├── GrantCard.tsx
│   │   └── MatchScore.tsx
│   ├── projects/
│   │   ├── ProjectForm.tsx
│   │   ├── BudgetTable.tsx
│   │   ├── MilestoneList.tsx
│   │   └── KpiTracker.tsx
│   └── common/
│       ├── DataTable.tsx
│       ├── FileUpload.tsx
│       └── ApprovalBadge.tsx
│
├── supabase/
│   └── migrations/
│       ├── 001_initial_schema.sql   # 초기 DB 스키마
│       ├── 002_rls_policies.sql     # Row Level Security
│       └── 003_seed_data.sql        # 초기 데이터 (한미르 키워드, 사용자)
│
└── public/
    └── logo.svg
```

## 데이터베이스 스키마 (Supabase PostgreSQL)

### 핵심 테이블
- `users` - 사용자 (Supabase Auth 연동)
- `company_profiles` - 회사 기술 프로필 (제품별 키워드, 스펙)
- `grant_announcements` - 수집된 정부 공고
- `grant_matches` - 공고-회사 매칭 결과
- `projects` - 수주 과제
- `budget_items` - 비목별 예산 편성
- `expenses` - 연구비 집행 내역
- `milestones` - 마일스톤
- `project_personnel` - 과제 참여 인력
- `outputs` - 성과물
- `files` - 첨부파일 메타데이터
- `notifications` - 알림 내역
- `approval_flows` - 전자결재
- `audit_logs` - 감사 추적

## 환경변수 (.env.local)
```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Anthropic
ANTHROPIC_API_KEY=

# SMTP (하이웍스)
SMTP_HOST=smtp.hiworks.com
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM=

# Vercel Cron Secret
CRON_SECRET=

# NTIS API (신청 필요)
NTIS_API_KEY=

# Webhook (선택)
KAKAOWORK_WEBHOOK_URL=
SLACK_WEBHOOK_URL=
```

## Vercel Cron 설정 (vercel.json)
```json
{
  "crons": [
    {
      "path": "/api/cron/scrape-grants",
      "schedule": "0 21 * * *"
    }
  ]
}
```
참고: Vercel Cron은 UTC 기준. 한국시간 06:00 = UTC 21:00 (전날).

## 개발 순서 (Claude Code 작업 순서)

### Phase 0: 프로젝트 초기화
1. `npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir=false`
2. shadcn/ui 설치: `npx shadcn@latest init`
3. 의존성 설치: supabase-js, nodemailer, cheerio, recharts, docx, date-fns
4. Supabase 프로젝트 생성 및 환경변수 설정
5. DB 마이그레이션 실행

### Phase 1: 인증 + 기본 레이아웃
1. Supabase Auth 설정 (이메일/비밀번호)
2. 로그인 페이지
3. 사이드바 + 헤더 레이아웃
4. 미들웨어 (인증 체크, 역할 체크)

### Phase 2: 과제 공고 추천 시스템
1. company_profiles 테이블 + 키워드 관리 UI
2. 스크래퍼 모듈 (NTIS API 우선)
3. 키워드 매칭 엔진
4. Claude API 정밀 매칭
5. Vercel Cron 설정
6. 이메일 알림 발송
7. 추천 공고 목록/상세 UI

### Phase 3: 과제 관리 기본
1. 과제 CRUD (등록 위자드, 목록, 상세)
2. 비목별 예산 편성
3. 연구비 집행 등록 + 이중집행 방지
4. 전자결재 (간단한 승인 워크플로우)

### Phase 4: 일정/인력/성과
1. 마일스톤 관리 + 간트차트
2. KPI 추적
3. 참여 인력 관리 + 참여율 검증
4. 성과물 관리

### Phase 5: 대시보드 + 보고서
1. 메인 대시보드 (요약 카드, 차트)
2. 보고서 자동 생성
3. 감사 로그

## 코딩 컨벤션
- 모든 컴포넌트: React Server Component 기본, 인터랙션 필요 시 'use client'
- API Routes: try-catch로 에러 핸들링, NextResponse.json() 반환
- DB 쿼리: Supabase JS SDK 사용 (raw SQL은 마이그레이션에서만)
- 타입: lib/utils/types.ts에 중앙 관리
- 날짜: date-fns 사용, 한국 로케일
- 파일 업로드: Supabase Storage, 최대 10MB
- 한국어 UI, 영어 코드/변수명
