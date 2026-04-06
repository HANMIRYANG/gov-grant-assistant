-- grant_matches 테이블에 (grant_id, profile_id) 유니크 제약 추가
-- upsert 시 중복 매칭 방지를 위해 필요
ALTER TABLE grant_matches
  ADD CONSTRAINT uq_grant_matches_grant_profile UNIQUE (grant_id, profile_id);
