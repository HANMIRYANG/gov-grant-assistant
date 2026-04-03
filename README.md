# 한미르 정부과제 추천 및 관리 시스템

> 정부 R&D 과제 공고를 자동 수집하여 한미르의 기술/제품과 매칭하고, 수주 과제의 예산·인력·성과를 통합 관리하는 시스템

## Quick Start

### 1. 사전 준비
- [Node.js 18+](https://nodejs.org/) 설치
- [Supabase](https://supabase.com/) 프로젝트 생성 (무료)
- [Vercel](https://vercel.com/) 계정 (Pro 구독 중)
- [Anthropic Console](https://console.anthropic.com/) API Key 발급

### 2. 프로젝트 초기화
```bash
# Next.js 프로젝트 생성 (이미 폴더가 있으므로 현재 디렉토리에 설치)
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir=false --import-alias="@/*"

# shadcn/ui 설치
npx shadcn@latest init

# 핵심 의존성 설치
npm install @supabase/supabase-js @supabase/ssr nodemailer cheerio date-fns recharts docx @anthropic-ai/sdk

# 타입 패키지
npm install -D @types/nodemailer @types/cheerio
```

### 3. 환경변수 설정
```bash
cp .env.example .env.local
# .env.local 파일을 열어 실제 값 입력
```

### 4. Supabase DB 초기화
- Supabase 대시보드 > SQL Editor에서 `supabase/migrations/001_initial_schema.sql` 실행
- 이어서 `supabase/migrations/003_seed_data.sql` 실행

### 5. 로컬 개발
```bash
npm run dev
# http://localhost:3000 접속
```

### 6. Vercel 배포
```bash
# Vercel CLI로 배포 (또는 GitHub 연동 자동 배포)
npx vercel --prod
```

## 아키텍처
```
Vercel Pro
  ├── Next.js App Router (프론트엔드 + API)
  ├── Vercel Cron (매일 06:00 KST 스크래핑)
  └── Serverless Functions (최대 300초)

Supabase Free
  ├── PostgreSQL (데이터)
  ├── Auth (인증)
  └── Storage (파일)

External
  ├── 하이웍스 SMTP (이메일)
  ├── Claude API (LLM 매칭)
  └── NTIS API (공고 수집)
```

## 개발 가이드
- `CLAUDE.md`에 전체 프로젝트 컨텍스트가 정리되어 있습니다
- Claude Code에서 작업할 때 이 파일을 자동으로 참조합니다
- 개발 순서는 CLAUDE.md의 "개발 순서" 섹션을 따릅니다

## 월 비용
| 항목 | 비용 |
|------|------|
| Vercel Pro | 이미 구독 중 |
| Supabase | 무료 |
| 하이웍스 SMTP | 기존 사용 중 |
| Claude API | ~6,000-9,000원 |
| **합계** | **~6,000-9,000원** |
