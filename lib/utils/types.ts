export type UserRole = "admin" | "executive" | "pm" | "researcher" | "finance";

export type ProjectStatus =
  | "preparing"
  | "active"
  | "suspended"
  | "completed"
  | "follow_up";

export type ProductLine = "fire_safety" | "battery" | "thermal" | "other";

export type BudgetCategory =
  | "personnel"
  | "equipment"
  | "material"
  | "outsourcing"
  | "travel"
  | "overhead"
  | "other_direct";

export type ApprovalStatus = "pending" | "approved" | "rejected";

export type MatchStatus =
  | "new"
  | "reviewed"
  | "applying"
  | "applied"
  | "rejected"
  | "won";

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  department: string | null;
  position: string | null;
  role: UserRole;
  phone: string | null;
  employee_code: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CompanyProfile {
  id: string;
  product_name: string;
  product_line: ProductLine;
  description: string | null;
  keywords: string[];
  specs: Record<string, string>;
  target_agencies: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface GrantAnnouncement {
  id: string;
  source: string;
  source_id: string | null;
  title: string;
  agency: string | null;
  managing_org: string | null;
  description: string | null;
  full_text: string | null;
  budget_range: string | null;
  announcement_date: string | null;
  deadline: string | null;
  url: string | null;
  category: string | null;
  raw_data: Record<string, unknown>;
  is_processed: boolean;
  created_at: string;
}

export interface GrantMatch {
  id: string;
  grant_id: string;
  profile_id: string;
  keyword_score: number;
  llm_score: number | null;
  final_score: number;
  llm_reasoning: string | null;
  matched_keywords: string[];
  status: MatchStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  notes: string | null;
  created_at: string;
  grant_announcements?: GrantAnnouncement;
  company_profiles?: CompanyProfile;
}

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  admin: "\uC2DC\uC2A4\uD15C \uAD00\uB9AC\uC790",
  executive: "\uACBD\uC601\uC9C4",
  pm: "\uACFC\uC81C \uCC45\uC784\uC790",
  researcher: "\uC5F0\uAD6C\uC6D0",
  finance: "\uACBD\uC601\uC9C0\uC6D0",
};

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  preparing: "\uC900\uBE44\uC911",
  active: "\uC218\uD589\uC911",
  suspended: "\uC911\uB2E8",
  completed: "\uC644\uB8CC",
  follow_up: "\uD6C4\uC18D\uAD00\uB9AC",
};

export const PRODUCT_LINE_LABELS: Record<ProductLine, string> = {
  fire_safety: "\uD654\uC7AC\uC548\uC804",
  battery: "\uC774\uCC28\uC804\uC9C0",
  thermal: "\uC5F4\uAD00\uB9AC",
  other: "\uAE30\uD0C0",
};

export const BUDGET_CATEGORY_LABELS: Record<BudgetCategory, string> = {
  personnel: "\uC778\uAC74\uBE44",
  equipment: "\uC5F0\uAD6C\uC2DC\uC124\xB7\uC7A5\uBE44\uBE44",
  material: "\uC5F0\uAD6C\uC7AC\uB8CC\uBE44",
  outsourcing: "\uC704\uD0C1\uC5F0\uAD6C\uBE44",
  travel: "\uC5F0\uAD6C\uD65C\uB3D9\uBE44",
  overhead: "\uAC04\uC811\uBE44",
  other_direct: "\uAE30\uD0C0 \uC9C1\uC811\uBE44",
};

export type FundSource = "government" | "private_cash" | "private_inkind";

export type MilestoneType =
  | "research_phase"
  | "mid_evaluation"
  | "annual_evaluation"
  | "final_evaluation"
  | "settlement";

export type OutputType =
  | "patent"
  | "paper"
  | "prototype"
  | "certification"
  | "tech_transfer"
  | "commercialization";

export type OutputStatus = "in_progress" | "submitted" | "registered" | "completed";

export interface Project {
  id: string;
  project_name: string;
  project_code: string | null;
  funding_agency: string;
  managing_org: string | null;
  product_line: ProductLine;
  status: ProjectStatus;
  pi_id: string | null;
  grant_match_id: string | null;
  description: string | null;
  start_date: string;
  end_date: string;
  total_budget: number;
  govt_fund: number;
  private_fund: number;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  pi?: UserProfile;
}

export interface BudgetItem {
  id: string;
  project_id: string;
  category: BudgetCategory;
  fund_source: FundSource;
  fiscal_year: number;
  planned_amount: number;
  spent_amount: number;
  created_at: string;
  updated_at: string;
}

export interface Expense {
  id: string;
  budget_item_id: string;
  expense_date: string;
  amount: number;
  vendor: string;
  description: string;
  receipt_file_id: string | null;
  receipt_hash: string | null;
  approval_status: ApprovalStatus;
  submitted_by: string;
  approved_by: string | null;
  approved_at: string | null;
  rejection_reason: string | null;
  created_at: string;
  budget_items?: BudgetItem;
  submitted_by_user?: UserProfile;
}

export interface Milestone {
  id: string;
  project_id: string;
  title: string;
  milestone_type: MilestoneType;
  description: string | null;
  due_date: string;
  completed_date: string | null;
  progress_pct: number;
  kpi_target: Record<string, string>;
  kpi_actual: Record<string, string>;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface ProjectPersonnel {
  id: string;
  project_id: string;
  user_id: string;
  role: string;
  participation_rate: number;
  monthly_cost: number;
  start_date: string | null;
  end_date: string | null;
  is_external: boolean;
  external_org: string | null;
  created_at: string;
  user?: UserProfile;
}

export interface Timesheet {
  id: string;
  user_id: string;
  project_id: string;
  week_start: string;
  hours: number;
  activities: string | null;
  created_at: string;
  updated_at: string;
  project?: Project;
  user?: UserProfile;
}

export const PERSONNEL_ROLE_LABELS: Record<string, string> = {
  pi: "책임연구원",
  co_researcher: "공동연구원",
  researcher: "연구원",
  assistant: "연구보조원",
};

export interface Output {
  id: string;
  project_id: string;
  output_type: OutputType;
  title: string;
  description: string | null;
  status: OutputStatus;
  achieved_date: string | null;
  file_ids: string[];
  commercialization: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface ApprovalFlow {
  id: string;
  expense_id: string;
  step_order: number;
  approver_id: string;
  status: ApprovalStatus;
  comment: string | null;
  decided_at: string | null;
  created_at: string;
  approver?: UserProfile;
  expenses?: Expense;
}

export const FUND_SOURCE_LABELS: Record<FundSource, string> = {
  government: "\uC815\uBD80\uCD9C\uC5F0\uAE08",
  private_cash: "\uBBFC\uAC04\uBD80\uB2F4\uAE08(\uD604\uAE08)",
  private_inkind: "\uBBFC\uAC04\uBD80\uB2F4\uAE08(\uD604\uBB3C)",
};

export const MILESTONE_TYPE_LABELS: Record<MilestoneType, string> = {
  research_phase: "\uC5F0\uAD6C\uB2E8\uACC4",
  mid_evaluation: "\uC911\uAC04\uD3C9\uAC00",
  annual_evaluation: "\uC5F0\uCC28\uD3C9\uAC00",
  final_evaluation: "\uCD5C\uC885\uD3C9\uAC00",
  settlement: "\uC815\uC0B0",
};

export const OUTPUT_TYPE_LABELS: Record<OutputType, string> = {
  patent: "\uD2B9\uD5C8",
  paper: "\uB17C\uBB38",
  prototype: "\uC2DC\uC81C\uD488",
  certification: "\uC778\uC99D",
  tech_transfer: "\uAE30\uC220\uC774\uC804",
  commercialization: "\uC0AC\uC5C5\uD654",
};

export const OUTPUT_STATUS_LABELS: Record<OutputStatus, string> = {
  in_progress: "\uC9C4\uD589\uC911",
  submitted: "\uC81C\uCD9C",
  registered: "\uB4F1\uB85D",
  completed: "\uC644\uB8CC",
};

export const APPROVAL_STATUS_LABELS: Record<ApprovalStatus, string> = {
  pending: "\uB300\uAE30",
  approved: "\uC2B9\uC778",
  rejected: "\uBC18\uB824",
};

export const MATCH_STATUS_LABELS: Record<MatchStatus, string> = {
  new: "\uC2E0\uADDC",
  reviewed: "\uAC80\uD1A0\uC644\uB8CC",
  applying: "\uC9C0\uC6D0\uC900\uBE44",
  applied: "\uC9C0\uC6D0\uC644\uB8CC",
  rejected: "\uC81C\uC678",
  won: "\uC120\uC815",
};
