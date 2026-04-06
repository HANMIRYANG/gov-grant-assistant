-- ============================================
-- RLS 정책 추가
-- Supabase는 기본적으로 RLS가 활���화 상태이므���,
-- 인증된 사용자가 데이터를 읽고 쓸 수 있도록 정책을 추가해야 합니다.
-- ============================================

-- 모든 테이블에 RLS 활성화 확인 (이미 활성화된 경우 무시)
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE grant_announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE grant_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_personnel ENABLE ROW LEVEL SECURITY;
ALTER TABLE outputs ENABLE ROW LEVEL SECURITY;
ALTER TABLE files ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_flows ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 인증된 사용자 — 읽기 허용 (10명 이내 소규모 팀이므로 ��순 ���책)
-- ============================================

-- user_profiles: 인증된 사용자 전원 읽기, 본인 수정
CREATE POLICY "user_profiles_select" ON user_profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "user_profiles_update_own" ON user_profiles FOR UPDATE TO authenticated USING (id = auth.uid());

-- company_profiles: 인증된 사용자 전원 읽기/쓰기
CREATE POLICY "company_profiles_select" ON company_profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "company_profiles_insert" ON company_profiles FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "company_profiles_update" ON company_profiles FOR UPDATE TO authenticated USING (true);
CREATE POLICY "company_profiles_delete" ON company_profiles FOR DELETE TO authenticated USING (true);

-- grant_announcements: 인증된 사용자 전원 읽기
CREATE POLICY "grant_announcements_select" ON grant_announcements FOR SELECT TO authenticated USING (true);

-- grant_matches: 인증된 사용자 전원 읽기/수정 (상태 변경, 메모 등)
CREATE POLICY "grant_matches_select" ON grant_matches FOR SELECT TO authenticated USING (true);
CREATE POLICY "grant_matches_update" ON grant_matches FOR UPDATE TO authenticated USING (true);

-- projects: 인증된 사용자 전원 읽기/쓰기
CREATE POLICY "projects_select" ON projects FOR SELECT TO authenticated USING (true);
CREATE POLICY "projects_insert" ON projects FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "projects_update" ON projects FOR UPDATE TO authenticated USING (true);
CREATE POLICY "projects_delete" ON projects FOR DELETE TO authenticated USING (true);

-- budget_items: 인증된 사용자 전원 읽기/쓰기
CREATE POLICY "budget_items_select" ON budget_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "budget_items_insert" ON budget_items FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "budget_items_update" ON budget_items FOR UPDATE TO authenticated USING (true);

-- expenses: 인증된 사용자 전원 읽기, 본인 등록
CREATE POLICY "expenses_select" ON expenses FOR SELECT TO authenticated USING (true);
CREATE POLICY "expenses_insert" ON expenses FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "expenses_update" ON expenses FOR UPDATE TO authenticated USING (true);

-- milestones: 인증된 사용자 전원 읽기/쓰기
CREATE POLICY "milestones_select" ON milestones FOR SELECT TO authenticated USING (true);
CREATE POLICY "milestones_insert" ON milestones FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "milestones_update" ON milestones FOR UPDATE TO authenticated USING (true);

-- project_personnel: 인증된 사용자 전원 읽기/쓰기
CREATE POLICY "project_personnel_select" ON project_personnel FOR SELECT TO authenticated USING (true);
CREATE POLICY "project_personnel_insert" ON project_personnel FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "project_personnel_update" ON project_personnel FOR UPDATE TO authenticated USING (true);

-- outputs: 인증된 사용자 전원 읽기/쓰기
CREATE POLICY "outputs_select" ON outputs FOR SELECT TO authenticated USING (true);
CREATE POLICY "outputs_insert" ON outputs FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "outputs_update" ON outputs FOR UPDATE TO authenticated USING (true);

-- files: 인증된 사용자 전원 읽기, 본인 업로드
CREATE POLICY "files_select" ON files FOR SELECT TO authenticated USING (true);
CREATE POLICY "files_insert" ON files FOR INSERT TO authenticated WITH CHECK (true);

-- notifications: 본인 알림만 읽기
CREATE POLICY "notifications_select" ON notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "notifications_update" ON notifications FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- approval_flows: 인증된 사용자 전원 읽기, 본인 결재건 수정
CREATE POLICY "approval_flows_select" ON approval_flows FOR SELECT TO authenticated USING (true);
CREATE POLICY "approval_flows_update" ON approval_flows FOR UPDATE TO authenticated USING (approver_id = auth.uid());

-- audit_logs: 인증된 사용자 전원 읽기
CREATE POLICY "audit_logs_select" ON audit_logs FOR SELECT TO authenticated USING (true);

-- ============================================
-- Service Role은 RLS를 무시하므로, API Routes에서
-- createAdminClient()를 사용하면 모든 작업이 가능합니다.
-- ============================================
