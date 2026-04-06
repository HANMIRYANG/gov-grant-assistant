-- ============================================
-- user_profiles에 사원번호(employee_code) 추가
-- keeper-calendar 시스템과 연동하기 위한 공통 식별자
-- ============================================

ALTER TABLE user_profiles
  ADD COLUMN employee_code VARCHAR(20) UNIQUE;

-- 기존 사용자에게는 keeper-calendar 관리자 페이지에서
-- "사원번호 일괄 부여" 후 수동으로 맞춰야 합니다.

COMMENT ON COLUMN user_profiles.employee_code IS 'keeper-calendar 연동용 사원번호 (예: H-001)';
