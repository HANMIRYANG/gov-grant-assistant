-- partial unique index를 정식 unique constraint로 변경
-- Supabase upsert의 onConflict가 partial index를 지원하지 않는 문제 해결

-- 기존 partial index 삭제
DROP INDEX IF EXISTS idx_grant_source;

-- (source, source_id) 정식 unique constraint 추가
-- source_id에 NOT NULL 제약은 두지 않음 — NULL인 경우 중복 허용 (PostgreSQL 특성)
ALTER TABLE grant_announcements
  ADD CONSTRAINT uq_grant_source_id UNIQUE (source, source_id);
