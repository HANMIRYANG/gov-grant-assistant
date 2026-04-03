-- ============================================
-- 한미르 정부과제 관리 시스템 - 초기 스키마
-- Supabase SQL Editor에서 실행
-- ============================================

-- 사용자 역할 enum
CREATE TYPE user_role AS ENUM ('admin', 'executive', 'pm', 'researcher', 'finance');

-- 과제 상태 enum
CREATE TYPE project_status AS ENUM ('preparing', 'active', 'suspended', 'completed', 'follow_up');

-- 제품 라인 enum
CREATE TYPE product_line AS ENUM ('fire_safety', 'battery', 'thermal', 'other');

-- 비목 카테고리 enum
CREATE TYPE budget_category AS ENUM (
  'personnel',      -- 인건비
  'equipment',       -- 연구시설·장비비
  'material',        -- 연구재료비
  'outsourcing',     -- 위탁연구비
  'travel',          -- 연구활동비(여비)
  'overhead',        -- 간접비
  'other_direct'     -- 기타 직접비
);

-- 자금 출처 enum
CREATE TYPE fund_source AS ENUM ('government', 'private_cash', 'private_inkind');

-- 결재 상태 enum
CREATE TYPE approval_status AS ENUM ('pending', 'approved', 'rejected');

-- 성과물 유형 enum
CREATE TYPE output_type AS ENUM ('patent', 'paper', 'prototype', 'certification', 'tech_transfer', 'commercialization');

-- 성과물 상태 enum
CREATE TYPE output_status AS ENUM ('in_progress', 'submitted', 'registered', 'completed');

-- 마일스톤 유형 enum
CREATE TYPE milestone_type AS ENUM ('research_phase', 'mid_evaluation', 'annual_evaluation', 'final_evaluation', 'settlement');

-- 공고 매칭 상태 enum
CREATE TYPE match_status AS ENUM ('new', 'reviewed', 'applying', 'applied', 'rejected', 'won');

-- ============================================
-- 사용자 프로필 (Supabase Auth 연동)
-- ============================================
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(200) NOT NULL,
  department VARCHAR(100),
  position VARCHAR(100),
  role user_role NOT NULL DEFAULT 'researcher',
  phone VARCHAR(20),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- 회사 기술 프로필 (매칭 기준)
-- ============================================
CREATE TABLE company_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_name VARCHAR(200) NOT NULL,            -- 예: HC Series 불연 코팅제
  product_line product_line NOT NULL,
  description TEXT,                               -- 제품 설명
  keywords TEXT[] NOT NULL DEFAULT '{}',          -- 매칭 키워드 배열
  specs JSONB DEFAULT '{}',                       -- 핵심 스펙 (내열온도, 열전도율 등)
  target_agencies TEXT[] DEFAULT '{}',            -- 관심 주관기관 (중기부, 산자부 등)
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- 수집된 정부 공고
-- ============================================
CREATE TABLE grant_announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source VARCHAR(50) NOT NULL,                    -- ntis, smba, motie, keit 등
  source_id VARCHAR(100),                         -- 원본 사이트 공고 ID
  title VARCHAR(500) NOT NULL,                    -- 공고 제목
  agency VARCHAR(200),                            -- 주관기관
  managing_org VARCHAR(200),                      -- 전문기관
  description TEXT,                               -- 공고 내용 요약
  full_text TEXT,                                 -- 공고 전문 (매칭 분석용)
  budget_range VARCHAR(100),                      -- 예상 연구비 규모
  announcement_date DATE,                         -- 공고일
  deadline DATE,                                  -- 접수 마감일
  url VARCHAR(500),                               -- 원문 링크
  category VARCHAR(100),                          -- 분야/카테고리
  raw_data JSONB DEFAULT '{}',                    -- 원본 스크래핑 데이터
  is_processed BOOLEAN NOT NULL DEFAULT false,    -- 매칭 처리 완료 여부
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 중복 공고 방지 인덱스
CREATE UNIQUE INDEX idx_grant_source ON grant_announcements(source, source_id)
  WHERE source_id IS NOT NULL;

-- ============================================
-- 공고-회사 매칭 결과
-- ============================================
CREATE TABLE grant_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grant_id UUID NOT NULL REFERENCES grant_announcements(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES company_profiles(id) ON DELETE CASCADE,
  keyword_score DECIMAL(5,2) DEFAULT 0,           -- 키워드 매칭 점수 (0-100)
  llm_score DECIMAL(5,2),                         -- LLM 정밀 매칭 점수 (0-100)
  final_score DECIMAL(5,2) DEFAULT 0,             -- 최종 점수
  llm_reasoning TEXT,                             -- LLM 매칭 근거 설명
  matched_keywords TEXT[] DEFAULT '{}',           -- 매칭된 키워드 목록
  status match_status NOT NULL DEFAULT 'new',
  reviewed_by UUID REFERENCES user_profiles(id),
  reviewed_at TIMESTAMPTZ,
  notes TEXT,                                     -- 담당자 메모
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_match_score ON grant_matches(final_score DESC);

-- ============================================
-- 과제 (수주된 정부과제)
-- ============================================
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_name VARCHAR(300) NOT NULL,
  project_code VARCHAR(50),                       -- 정부 과제번호/협약번호
  funding_agency VARCHAR(200) NOT NULL,           -- 주관기관
  managing_org VARCHAR(200),                      -- 전문기관
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  total_budget BIGINT NOT NULL,                   -- 총 연구비 (원)
  govt_fund BIGINT NOT NULL DEFAULT 0,            -- 정부출연금
  private_fund BIGINT NOT NULL DEFAULT 0,         -- 민간부담금
  pi_id UUID REFERENCES user_profiles(id),        -- 과제 책임자
  product_line product_line NOT NULL,
  status project_status NOT NULL DEFAULT 'preparing',
  description TEXT,
  grant_match_id UUID REFERENCES grant_matches(id), -- 추천 공고와 연결 (선택)
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- 비목별 예산 편성
-- ============================================
CREATE TABLE budget_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  fiscal_year INT NOT NULL,
  category budget_category NOT NULL,
  fund_source fund_source NOT NULL,
  planned_amount BIGINT NOT NULL DEFAULT 0,
  spent_amount BIGINT NOT NULL DEFAULT 0,         -- 트리거로 자동 합산
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(project_id, fiscal_year, category, fund_source)
);

-- ============================================
-- 연구비 집행 내역
-- ============================================
CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_item_id UUID NOT NULL REFERENCES budget_items(id) ON DELETE CASCADE,
  expense_date DATE NOT NULL,
  amount BIGINT NOT NULL,
  vendor VARCHAR(300) NOT NULL,
  description TEXT NOT NULL,
  receipt_file_id UUID,                           -- files 테이블 참조
  receipt_hash VARCHAR(64),                       -- SHA-256 (이중집행 방지)
  approval_status approval_status NOT NULL DEFAULT 'pending',
  submitted_by UUID NOT NULL REFERENCES user_profiles(id),
  approved_by UUID REFERENCES user_profiles(id),
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 이중집행 방지 인덱스
CREATE INDEX idx_expense_hash ON expenses(receipt_hash) WHERE receipt_hash IS NOT NULL;

-- ============================================
-- 마일스톤
-- ============================================
CREATE TABLE milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title VARCHAR(300) NOT NULL,
  description TEXT,
  milestone_type milestone_type NOT NULL DEFAULT 'research_phase',
  due_date DATE NOT NULL,
  completed_date DATE,
  progress_pct INT NOT NULL DEFAULT 0 CHECK (progress_pct >= 0 AND progress_pct <= 100),
  kpi_target JSONB DEFAULT '{}',                  -- {"열전도율": "0.020 W/mK 이하", ...}
  kpi_actual JSONB DEFAULT '{}',
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- 과제 참여 인력
-- ============================================
CREATE TABLE project_personnel (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES user_profiles(id),
  role VARCHAR(50) NOT NULL DEFAULT 'researcher',  -- 책임자, 공동연구원, 연구보조원
  participation_rate DECIMAL(5,2) NOT NULL,        -- 참여율 (%)
  monthly_cost BIGINT DEFAULT 0,                   -- 월 인건비 산정액
  start_date DATE,
  end_date DATE,
  is_external BOOLEAN NOT NULL DEFAULT false,      -- 외부 인력 여부
  external_org VARCHAR(200),                       -- 외부 소속기관명
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(project_id, user_id)
);

-- ============================================
-- 성과물
-- ============================================
CREATE TABLE outputs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  output_type output_type NOT NULL,
  title VARCHAR(500) NOT NULL,
  description TEXT,
  status output_status NOT NULL DEFAULT 'in_progress',
  achieved_date DATE,
  file_ids UUID[] DEFAULT '{}',                   -- 관련 파일 목록
  commercialization JSONB DEFAULT '{}',           -- 사업화 실적
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- 파일 메타데이터
-- ============================================
CREATE TABLE files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name VARCHAR(300) NOT NULL,
  file_path VARCHAR(500) NOT NULL,                -- Supabase Storage 경로
  file_size BIGINT,
  mime_type VARCHAR(100),
  sha256_hash VARCHAR(64),
  uploaded_by UUID REFERENCES user_profiles(id),
  related_table VARCHAR(50),                      -- 연결된 테이블명
  related_id UUID,                                -- 연결된 레코드 ID
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- 알림
-- ============================================
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id),
  title VARCHAR(300) NOT NULL,
  message TEXT NOT NULL,
  notification_type VARCHAR(50) NOT NULL,          -- grant_match, deadline, budget_alert, approval
  related_table VARCHAR(50),
  related_id UUID,
  is_read BOOLEAN NOT NULL DEFAULT false,
  is_email_sent BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notification_user ON notifications(user_id, is_read, created_at DESC);

-- ============================================
-- 전자결재
-- ============================================
CREATE TABLE approval_flows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id UUID NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
  step_order INT NOT NULL,                        -- 결재 순서
  approver_id UUID NOT NULL REFERENCES user_profiles(id),
  status approval_status NOT NULL DEFAULT 'pending',
  comment TEXT,
  decided_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- 감사 추적 로그
-- ============================================
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profiles(id),
  action VARCHAR(20) NOT NULL,                    -- INSERT, UPDATE, DELETE
  table_name VARCHAR(50) NOT NULL,
  record_id UUID,
  old_data JSONB,
  new_data JSONB,
  ip_address VARCHAR(45),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_table ON audit_logs(table_name, created_at DESC);
CREATE INDEX idx_audit_user ON audit_logs(user_id, created_at DESC);

-- ============================================
-- 협약서/공문 관리
-- ============================================
CREATE TABLE agreements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  agreement_type VARCHAR(50) NOT NULL,             -- initial, amendment, official_letter
  title VARCHAR(300) NOT NULL,
  file_id UUID REFERENCES files(id),
  version INT NOT NULL DEFAULT 1,
  effective_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- 공동 연구기관
-- ============================================
CREATE TABLE partner_orgs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  org_name VARCHAR(200) NOT NULL,
  contact_name VARCHAR(100),
  contact_email VARCHAR(200),
  contact_phone VARCHAR(20),
  role_description TEXT,
  budget_share BIGINT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- 타임시트
-- ============================================
CREATE TABLE timesheets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id),
  project_id UUID NOT NULL REFERENCES projects(id),
  week_start DATE NOT NULL,                       -- 해당 주 시작일 (월요일)
  hours DECIMAL(4,1) NOT NULL DEFAULT 0,
  activities TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, project_id, week_start)
);

-- ============================================
-- 자동 갱신 트리거: updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_user_profiles_updated BEFORE UPDATE ON user_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_company_profiles_updated BEFORE UPDATE ON company_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_projects_updated BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_budget_items_updated BEFORE UPDATE ON budget_items FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_milestones_updated BEFORE UPDATE ON milestones FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_outputs_updated BEFORE UPDATE ON outputs FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_timesheets_updated BEFORE UPDATE ON timesheets FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- 집행 금액 자동 합산 트리거
-- ============================================
CREATE OR REPLACE FUNCTION update_budget_spent()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    UPDATE budget_items SET spent_amount = (
      SELECT COALESCE(SUM(amount), 0) FROM expenses
      WHERE budget_item_id = NEW.budget_item_id AND approval_status = 'approved'
    ) WHERE id = NEW.budget_item_id;
  END IF;
  IF TG_OP = 'DELETE' THEN
    UPDATE budget_items SET spent_amount = (
      SELECT COALESCE(SUM(amount), 0) FROM expenses
      WHERE budget_item_id = OLD.budget_item_id AND approval_status = 'approved'
    ) WHERE id = OLD.budget_item_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_expense_sum
AFTER INSERT OR UPDATE OR DELETE ON expenses
FOR EACH ROW EXECUTE FUNCTION update_budget_spent();
