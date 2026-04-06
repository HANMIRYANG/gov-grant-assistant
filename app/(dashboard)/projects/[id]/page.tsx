"use client";

import { useEffect, useState, use, useCallback } from "react";
import type {
  Project, BudgetItem, Expense, Milestone,
  ProjectPersonnel, Output, BudgetCategory, UserProfile,
  MilestoneType, OutputType, OutputStatus,
} from "@/lib/utils/types";
import {
  PROJECT_STATUS_LABELS, PRODUCT_LINE_LABELS,
  BUDGET_CATEGORY_LABELS, FUND_SOURCE_LABELS,
  MILESTONE_TYPE_LABELS, OUTPUT_TYPE_LABELS,
  OUTPUT_STATUS_LABELS, APPROVAL_STATUS_LABELS,
  PERSONNEL_ROLE_LABELS,
  type ProjectStatus, type FundSource,
} from "@/lib/utils/types";
import { formatWon, formatNumber, formatPercent, formatDate, dDay } from "@/lib/utils/helpers";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card, CardContent, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { ArrowLeft, Plus, Upload, Save, Pencil, Trash2, Target, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from "recharts";

const STATUS_COLORS: Record<string, string> = {
  preparing: "bg-yellow-100 text-yellow-800",
  active: "bg-green-100 text-green-800",
  suspended: "bg-red-100 text-red-800",
  completed: "bg-blue-100 text-blue-800",
  follow_up: "bg-purple-100 text-purple-800",
  pending: "bg-yellow-100 text-yellow-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
};

export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [project, setProject] = useState<Project | null>(null);
  const [budgetItems, setBudgetItems] = useState<BudgetItem[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [personnel, setPersonnel] = useState<ProjectPersonnel[]>([]);
  const [outputs, setOutputs] = useState<Output[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  // 집행 등록 다이얼로그
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [expenseForm, setExpenseForm] = useState({
    category: "material" as BudgetCategory,
    title: "",
    amount: 0,
    vendor: "",
    expense_date: new Date().toISOString().slice(0, 10),
    receipt_number: "",
    description: "",
  });
  const [expenseFile, setExpenseFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // 마일스톤 다이얼로그
  const [msOpen, setMsOpen] = useState(false);
  const [msEditId, setMsEditId] = useState<string | null>(null);
  const [msForm, setMsForm] = useState({
    title: "", milestone_type: "research_phase" as MilestoneType,
    description: "", due_date: "", progress_pct: 0, sort_order: 0,
    kpi_target: {} as Record<string, string>, kpi_actual: {} as Record<string, string>,
  });
  const [kpiKey, setKpiKey] = useState("");
  const [kpiTargetVal, setKpiTargetVal] = useState("");

  // 인력 다이얼로그
  const [perOpen, setPerOpen] = useState(false);
  const [perEditId, setPerEditId] = useState<string | null>(null);
  const [perForm, setPerForm] = useState({
    user_id: "", role: "researcher", participation_rate: 0,
    monthly_cost: 0, start_date: "", end_date: "",
    is_external: false, external_org: "",
  });

  // 성과물 다이얼로그
  const [outOpen, setOutOpen] = useState(false);
  const [outEditId, setOutEditId] = useState<string | null>(null);
  const [outForm, setOutForm] = useState({
    output_type: "patent" as OutputType, title: "", description: "",
    status: "in_progress" as OutputStatus, achieved_date: "",
    commercialization: {} as Record<string, unknown>,
  });
  const [commKey, setCommKey] = useState("");
  const [commVal, setCommVal] = useState("");

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [pRes, bRes, eRes, mRes, perRes, oRes, uRes] = await Promise.all([
        fetch(`/api/projects/${id}`).then((r) => r.json()),
        fetch(`/api/projects/${id}/budget`).then((r) => r.json()),
        fetch(`/api/projects/${id}/budget`).then(() =>
          // expenses via supabase direct - use budget to get project expenses
          fetch(`/api/projects/${id}/expenses`).then((r) => r.ok ? r.json() : []).catch(() => [])
        ),
        fetch(`/api/projects/${id}/milestones`).then((r) => r.json()),
        fetch(`/api/projects/${id}/personnel`).then((r) => r.json()),
        fetch(`/api/projects/${id}/outputs`).then((r) => r.json()),
        fetch(`/api/users`).then((r) => r.ok ? r.json() : []).catch(() => []),
      ]);
      setProject(pRes);
      setBudgetItems(Array.isArray(bRes) ? bRes : []);
      setExpenses(Array.isArray(eRes) ? eRes : []);
      setMilestones(Array.isArray(mRes) ? mRes : []);
      setPersonnel(Array.isArray(perRes) ? perRes : []);
      setOutputs(Array.isArray(oRes) ? oRes : []);
      setUsers(Array.isArray(uRes) ? uRes : []);
    } catch { /* ignore */ }
    setLoading(false);
  }, [id]);

  useEffect(() => { loadAll(); }, [loadAll]);

  async function updateStatus(status: ProjectStatus) {
    const res = await fetch(`/api/projects/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      setProject((p) => p ? { ...p, status } : p);
      toast.success(`상태가 '${PROJECT_STATUS_LABELS[status]}'으로 변경되었습니다.`);
    }
  }

  // ──── 집행 등록 ────
  async function submitExpense() {
    if (!expenseForm.title || !expenseForm.amount) {
      toast.error("항목명과 금액을 입력해주세요.");
      return;
    }
    setSubmitting(true);
    const matchBudget = budgetItems.find((b) => b.category === expenseForm.category);
    if (!matchBudget) {
      toast.error("해당 비목의 예산이 편성되지 않았습니다.");
      setSubmitting(false);
      return;
    }

    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          budget_item_id: matchBudget.id,
          expense_date: expenseForm.expense_date,
          amount: expenseForm.amount,
          vendor: expenseForm.vendor,
          description: expenseForm.title,
        }),
      });
      if (res.status === 409) {
        const err = await res.json();
        toast.error(`이중집행 의심: ${err.message}`);
      } else if (!res.ok) {
        const err = await res.json();
        toast.error(`등록 실패: ${err.error}`);
      } else {
        toast.success("집행이 등록되었습니다.");
        setExpenseOpen(false);
        loadAll();
      }
    } catch (e) {
      toast.error(`오류: ${e}`);
    } finally {
      setSubmitting(false);
    }
  }

  // ──── 마일스톤 CRUD ────
  function openMsCreate() {
    setMsEditId(null);
    setMsForm({
      title: "", milestone_type: "research_phase",
      description: "", due_date: "", progress_pct: 0,
      sort_order: milestones.length, kpi_target: {}, kpi_actual: {},
    });
    setMsOpen(true);
  }
  function openMsEdit(m: Milestone) {
    setMsEditId(m.id);
    setMsForm({
      title: m.title, milestone_type: m.milestone_type,
      description: m.description || "", due_date: m.due_date,
      progress_pct: m.progress_pct, sort_order: m.sort_order,
      kpi_target: { ...m.kpi_target }, kpi_actual: { ...m.kpi_actual },
    });
    setMsOpen(true);
  }
  async function saveMilestone() {
    if (!msForm.title || !msForm.due_date) {
      toast.error("명칭과 마감일을 입력해주세요.");
      return;
    }
    const payload = msEditId
      ? { ...msForm, milestone_id: msEditId }
      : msForm;
    const res = await fetch(`/api/projects/${id}/milestones`, {
      method: msEditId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      toast.success(msEditId ? "수정되었습니다." : "추가되었습니다.");
      setMsOpen(false);
      loadAll();
    } else {
      const err = await res.json();
      toast.error(err.error || "저장 실패");
    }
  }
  async function deleteMilestone(msId: string) {
    if (!confirm("삭제하시겠습니까?")) return;
    const res = await fetch(`/api/projects/${id}/milestones?milestone_id=${msId}`, { method: "DELETE" });
    if (res.ok) { toast.success("삭제되었습니다."); loadAll(); }
  }
  function addKpi() {
    if (kpiKey.trim()) {
      setMsForm({
        ...msForm,
        kpi_target: { ...msForm.kpi_target, [kpiKey.trim()]: kpiTargetVal.trim() },
        kpi_actual: { ...msForm.kpi_actual, [kpiKey.trim()]: msForm.kpi_actual[kpiKey.trim()] || "" },
      });
      setKpiKey(""); setKpiTargetVal("");
    }
  }
  function removeKpi(key: string) {
    const t = { ...msForm.kpi_target }; delete t[key];
    const a = { ...msForm.kpi_actual }; delete a[key];
    setMsForm({ ...msForm, kpi_target: t, kpi_actual: a });
  }

  // ──── 인력 CRUD ────
  function openPerCreate() {
    setPerEditId(null);
    setPerForm({ user_id: "", role: "researcher", participation_rate: 0, monthly_cost: 0, start_date: project?.start_date || "", end_date: project?.end_date || "", is_external: false, external_org: "" });
    setPerOpen(true);
  }
  function openPerEdit(p: ProjectPersonnel) {
    setPerEditId(p.id);
    setPerForm({
      user_id: p.user_id, role: p.role,
      participation_rate: p.participation_rate, monthly_cost: p.monthly_cost,
      start_date: p.start_date || "", end_date: p.end_date || "",
      is_external: p.is_external, external_org: p.external_org || "",
    });
    setPerOpen(true);
  }
  async function savePersonnel() {
    if (!perForm.user_id && !perForm.is_external) {
      toast.error("인력을 선택해주세요.");
      return;
    }
    const payload = perEditId
      ? { ...perForm, personnel_id: perEditId }
      : perForm;
    const res = await fetch(`/api/projects/${id}/personnel`, {
      method: perEditId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      toast.success(perEditId ? "수정되었습니다." : "배정되었습니다.");
      setPerOpen(false);
      loadAll();
    } else {
      const err = await res.json();
      toast.error(err.error || "저장 실패");
    }
  }
  async function deletePersonnel(perId: string) {
    if (!confirm("배정을 해제하시겠습니까?")) return;
    const res = await fetch(`/api/projects/${id}/personnel?personnel_id=${perId}`, { method: "DELETE" });
    if (res.ok) { toast.success("해제되었습니다."); loadAll(); }
  }

  // ──── 성과물 CRUD ────
  function openOutCreate() {
    setOutEditId(null);
    setOutForm({ output_type: "patent", title: "", description: "", status: "in_progress", achieved_date: "", commercialization: {} });
    setOutOpen(true);
  }
  function openOutEdit(o: Output) {
    setOutEditId(o.id);
    setOutForm({
      output_type: o.output_type, title: o.title,
      description: o.description || "", status: o.status,
      achieved_date: o.achieved_date || "",
      commercialization: { ...o.commercialization },
    });
    setOutOpen(true);
  }
  async function saveOutput() {
    if (!outForm.title) { toast.error("제목을 입력해주세요."); return; }
    const payload = outEditId
      ? { ...outForm, output_id: outEditId }
      : outForm;
    const res = await fetch(`/api/projects/${id}/outputs`, {
      method: outEditId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      toast.success(outEditId ? "수정되었습니다." : "등록되었습니다.");
      setOutOpen(false);
      loadAll();
    } else {
      const err = await res.json();
      toast.error(err.error || "저장 실패");
    }
  }
  async function deleteOutput(outId: string) {
    if (!confirm("삭제하시겠습니까?")) return;
    const res = await fetch(`/api/projects/${id}/outputs?output_id=${outId}`, { method: "DELETE" });
    if (res.ok) { toast.success("삭제되었습니다."); loadAll(); }
  }
  function addComm() {
    if (commKey.trim() && commVal.trim()) {
      setOutForm({ ...outForm, commercialization: { ...outForm.commercialization, [commKey.trim()]: commVal.trim() } });
      setCommKey(""); setCommVal("");
    }
  }
  function removeComm(key: string) {
    const c = { ...outForm.commercialization }; delete c[key];
    setOutForm({ ...outForm, commercialization: c });
  }

  if (loading || !project) {
    return <div className="py-12 text-center text-muted-foreground">{"불러오는 중..."}</div>;
  }

  // 예산 차트 데이터
  const budgetChartData = Object.keys(BUDGET_CATEGORY_LABELS).map((cat) => {
    const items = budgetItems.filter((b) => b.category === cat);
    const planned = items.reduce((s, b) => s + b.planned_amount, 0);
    const spent = items.reduce((s, b) => s + (b.spent_amount || 0), 0);
    return { name: BUDGET_CATEGORY_LABELS[cat as BudgetCategory], planned, spent };
  }).filter((d) => d.planned > 0);

  const totalPlanned = budgetItems.reduce((s, b) => s + b.planned_amount, 0);
  const totalSpent = budgetItems.reduce((s, b) => s + (b.spent_amount || 0), 0);

  // KPI 달성률 차트 데이터
  const kpiData = milestones.flatMap((m) =>
    Object.entries(m.kpi_target).map(([key, target]) => {
      const targetNum = parseFloat(target);
      const actualStr = m.kpi_actual?.[key] || "0";
      const actualNum = parseFloat(actualStr);
      const pct = targetNum > 0 ? Math.min((actualNum / targetNum) * 100, 150) : 0;
      return {
        milestone: m.title,
        kpi: key,
        target: targetNum,
        actual: actualNum,
        pct,
        unit: target.replace(/[\d.,\s]+/g, "").trim(),
      };
    })
  );

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Link href="/projects">
              <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
            </Link>
            <h1 className="text-2xl font-bold">{project.project_name}</h1>
            <Badge className={STATUS_COLORS[project.status]}>
              {PROJECT_STATUS_LABELS[project.status]}
            </Badge>
          </div>
          <div className="ml-12 flex gap-4 text-sm text-muted-foreground">
            {project.funding_agency && <span>{project.funding_agency}</span>}
            {project.project_code && <span className="font-mono">{project.project_code}</span>}
            <span>{formatDate(project.start_date)} ~ {formatDate(project.end_date)}</span>
            {project.end_date && <span className="font-medium">{dDay(project.end_date)}</span>}
          </div>
        </div>
        <Select value={project.status} onValueChange={(v) => updateStatus(v as ProjectStatus)}>
          <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {Object.entries(PROJECT_STATUS_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* 요약 카드 */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card><CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">{"총 예산"}</p>
          <p className="text-xl font-bold">{formatWon(project.total_budget)}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">{"집행액"}</p>
          <p className="text-xl font-bold">{formatWon(totalSpent)}</p>
          <p className="text-xs text-muted-foreground">{formatPercent(totalSpent, totalPlanned)} {"집행"}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">{"참여 인력"}</p>
          <p className="text-xl font-bold">{personnel.length}{"명"}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">{"성과물"}</p>
          <p className="text-xl font-bold">{outputs.length}{"건"}</p>
        </CardContent></Card>
      </div>

      {/* 탭 */}
      <Tabs defaultValue="budget">
        <TabsList>
          <TabsTrigger value="info">{"기본정보"}</TabsTrigger>
          <TabsTrigger value="budget">{"예산"}</TabsTrigger>
          <TabsTrigger value="personnel">{"인력"}</TabsTrigger>
          <TabsTrigger value="milestones">{"마일스톤"}</TabsTrigger>
          <TabsTrigger value="outputs">{"성과물"}</TabsTrigger>
        </TabsList>

        {/* ═══ 기본정보 탭 ═══ */}
        <TabsContent value="info">
          <Card><CardContent className="pt-6">
            <dl className="grid gap-4 sm:grid-cols-2">
              <div><dt className="text-sm text-muted-foreground">{"과제명"}</dt><dd className="font-medium">{project.project_name}</dd></div>
              <div><dt className="text-sm text-muted-foreground">{"과제번호"}</dt><dd>{project.project_code || "-"}</dd></div>
              <div><dt className="text-sm text-muted-foreground">{"주관기관"}</dt><dd>{project.funding_agency || "-"}</dd></div>
              <div><dt className="text-sm text-muted-foreground">{"전문기관"}</dt><dd>{project.managing_org || "-"}</dd></div>
              <div><dt className="text-sm text-muted-foreground">{"제품라인"}</dt><dd>{PRODUCT_LINE_LABELS[project.product_line]}</dd></div>
              <div><dt className="text-sm text-muted-foreground">{"PM"}</dt><dd>{(project.pi as unknown as { name: string })?.name || "-"}</dd></div>
              <div><dt className="text-sm text-muted-foreground">{"정부출연금"}</dt><dd>{formatWon(project.govt_fund)}</dd></div>
              <div><dt className="text-sm text-muted-foreground">{"민간부담금"}</dt><dd>{formatWon(project.private_fund)}</dd></div>
              <div className="sm:col-span-2"><dt className="text-sm text-muted-foreground">{"과제 설명"}</dt><dd className="mt-1 whitespace-pre-wrap">{project.description || "-"}</dd></div>
            </dl>
          </CardContent></Card>
        </TabsContent>

        {/* ═══ 예산 탭 ═══ */}
        <TabsContent value="budget" className="space-y-6">
          {budgetChartData.length > 0 && (
            <Card>
              <CardHeader><CardTitle>{"비목별 편성 대비 집행"}</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={budgetChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" fontSize={12} />
                    <YAxis tickFormatter={(v) => `${(v / 10000).toFixed(0)}만`} fontSize={12} />
                    <Tooltip formatter={(v) => formatNumber(Number(v)) + "원"} />
                    <Legend />
                    <Bar dataKey="planned" name={"편성액"} fill="#93c5fd" />
                    <Bar dataKey="spent" name={"집행액"} fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{"비목별 예산"}</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{"비목"}</TableHead>
                    <TableHead>{"재원"}</TableHead>
                    <TableHead className="text-right">{"편성액"}</TableHead>
                    <TableHead className="text-right">{"집행액"}</TableHead>
                    <TableHead className="text-right">{"집행률"}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {budgetItems.map((b) => (
                    <TableRow key={b.id}>
                      <TableCell>{BUDGET_CATEGORY_LABELS[b.category]}</TableCell>
                      <TableCell>{FUND_SOURCE_LABELS[b.fund_source as FundSource]}</TableCell>
                      <TableCell className="text-right">{formatNumber(b.planned_amount)}</TableCell>
                      <TableCell className="text-right">{formatNumber(b.spent_amount || 0)}</TableCell>
                      <TableCell className="text-right">{formatPercent(b.spent_amount || 0, b.planned_amount)}</TableCell>
                    </TableRow>
                  ))}
                  {budgetItems.length === 0 && (
                    <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">{"편성된 예산이 없습니다."}</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* 집행 내역 */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{"집행 내역"}</CardTitle>
              <Dialog open={expenseOpen} onOpenChange={setExpenseOpen}>
                <DialogTrigger render={<Button size="sm" />}>
                  <Plus className="mr-2 h-4 w-4" />{"집행 등록"}
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader><DialogTitle>{"연구비 집행 등록"}</DialogTitle></DialogHeader>
                  <div className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <Label>{"비목"}</Label>
                        <Select value={expenseForm.category} onValueChange={(v) => setExpenseForm({ ...expenseForm, category: v as BudgetCategory })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {Object.entries(BUDGET_CATEGORY_LABELS).map(([k, v]) => (
                              <SelectItem key={k} value={k}>{v}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>{"집행일"}</Label>
                        <Input type="date" value={expenseForm.expense_date} onChange={(e) => setExpenseForm({ ...expenseForm, expense_date: e.target.value })} />
                      </div>
                      <div className="sm:col-span-2">
                        <Label>{"항목명"} *</Label>
                        <Input value={expenseForm.title} onChange={(e) => setExpenseForm({ ...expenseForm, title: e.target.value })} />
                      </div>
                      <div>
                        <Label>{"금액 (원)"} *</Label>
                        <Input type="number" value={expenseForm.amount || ""} onChange={(e) => setExpenseForm({ ...expenseForm, amount: Number(e.target.value) })} />
                      </div>
                      <div>
                        <Label>{"공급업체"}</Label>
                        <Input value={expenseForm.vendor} onChange={(e) => setExpenseForm({ ...expenseForm, vendor: e.target.value })} />
                      </div>
                    </div>
                    <Button onClick={submitExpense} disabled={submitting} className="w-full">
                      <Upload className="mr-2 h-4 w-4" />
                      {submitting ? "등록 중..." : "집행 등록"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{"일자"}</TableHead>
                    <TableHead>{"비목"}</TableHead>
                    <TableHead>{"항목"}</TableHead>
                    <TableHead className="text-right">{"금액"}</TableHead>
                    <TableHead>{"결재"}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenses.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell>{formatDate(e.expense_date)}</TableCell>
                      <TableCell>{(e.budget_items as unknown as { category: string })?.category ? BUDGET_CATEGORY_LABELS[(e.budget_items as unknown as { category: BudgetCategory }).category] : "-"}</TableCell>
                      <TableCell>{e.description}</TableCell>
                      <TableCell className="text-right">{formatNumber(e.amount)}</TableCell>
                      <TableCell>
                        <Badge className={STATUS_COLORS[e.approval_status]}>
                          {APPROVAL_STATUS_LABELS[e.approval_status]}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  {expenses.length === 0 && (
                    <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">{"집행 내역이 없습니다."}</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══ 인력 탭 ═══ */}
        <TabsContent value="personnel" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{"참여 인력"}</CardTitle>
              <Button size="sm" onClick={openPerCreate}>
                <Plus className="mr-2 h-4 w-4" />{"인력 배정"}
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{"성명"}</TableHead>
                    <TableHead>{"부서"}</TableHead>
                    <TableHead>{"역할"}</TableHead>
                    <TableHead className="text-right">{"참여율"}</TableHead>
                    <TableHead className="text-right">{"월 인건비"}</TableHead>
                    <TableHead>{"기간"}</TableHead>
                    <TableHead className="w-20" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {personnel.map((p) => {
                    const u = p.user as unknown as { name: string; department: string; position: string } | undefined;
                    return (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">
                          {u?.name || "-"}
                          {p.is_external && <Badge variant="outline" className="ml-1 text-xs">{"외부"}</Badge>}
                        </TableCell>
                        <TableCell>{u?.department || p.external_org || "-"}</TableCell>
                        <TableCell>{PERSONNEL_ROLE_LABELS[p.role] || p.role}</TableCell>
                        <TableCell className="text-right">{p.participation_rate}%</TableCell>
                        <TableCell className="text-right">{formatNumber(p.monthly_cost)}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {p.start_date && p.end_date ? `${formatDate(p.start_date)}~${formatDate(p.end_date)}` : "-"}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openPerEdit(p)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deletePersonnel(p.id)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {personnel.length === 0 && (
                    <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">{"배정된 인력이 없습니다."}</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* 인력 배정 다이얼로그 */}
          <Dialog open={perOpen} onOpenChange={setPerOpen}>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>{perEditId ? "인력 정보 수정" : "인력 배정"}</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>{"연구원"}</Label>
                  <Select value={perForm.user_id} onValueChange={(v) => v && setPerForm({ ...perForm, user_id: v })} disabled={!!perEditId}>
                    <SelectTrigger>
                      <SelectValue placeholder={"연구원 선택"}>
                        {(value: string) => {
                          const u = users.find((user) => user.id === value);
                          return u ? `${u.name} (${u.department || u.position || u.email})` : value;
                        }}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {users.map((u) => (
                        <SelectItem key={u.id} value={u.id}>{u.name} ({u.department || u.position || u.email})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label>{"역할"}</Label>
                    <Select value={perForm.role} onValueChange={(v) => v && setPerForm({ ...perForm, role: v })}>
                      <SelectTrigger><span>{PERSONNEL_ROLE_LABELS[perForm.role] || perForm.role}</span></SelectTrigger>
                      <SelectContent>
                        {Object.entries(PERSONNEL_ROLE_LABELS).map(([k, v]) => (
                          <SelectItem key={k} value={k}>{v}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>{"참여율 (%)"}</Label>
                    <Input type="number" min={0} max={100} value={perForm.participation_rate || ""} onChange={(e) => setPerForm({ ...perForm, participation_rate: Number(e.target.value) })} />
                  </div>
                  <div>
                    <Label>{"월 인건비 (원)"}</Label>
                    <Input type="number" value={perForm.monthly_cost || ""} onChange={(e) => setPerForm({ ...perForm, monthly_cost: Number(e.target.value) })} />
                  </div>
                  <div>
                    <Label>{"시작일"}</Label>
                    <Input type="date" value={perForm.start_date} onChange={(e) => setPerForm({ ...perForm, start_date: e.target.value })} />
                  </div>
                  <div>
                    <Label>{"종료일"}</Label>
                    <Input type="date" value={perForm.end_date} onChange={(e) => setPerForm({ ...perForm, end_date: e.target.value })} />
                  </div>
                </div>
                <Button onClick={savePersonnel} className="w-full">
                  <Save className="mr-2 h-4 w-4" />
                  {"저장"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* ═══ 마일스톤 탭 ═══ */}
        <TabsContent value="milestones" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{"마일스톤"}</CardTitle>
              <Button size="sm" onClick={openMsCreate}>
                <Plus className="mr-2 h-4 w-4" />{"마일스톤 추가"}
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{"구분"}</TableHead>
                    <TableHead>{"명칭"}</TableHead>
                    <TableHead>{"마감일"}</TableHead>
                    <TableHead>D-Day</TableHead>
                    <TableHead>{"진행률"}</TableHead>
                    <TableHead>{"KPI"}</TableHead>
                    <TableHead className="w-20" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {milestones.map((m) => {
                    const isLate = !m.completed_date && new Date(m.due_date) < new Date();
                    return (
                      <TableRow key={m.id} className={isLate ? "bg-red-50" : ""}>
                        <TableCell><Badge variant="outline">{MILESTONE_TYPE_LABELS[m.milestone_type]}</Badge></TableCell>
                        <TableCell className="font-medium">
                          {m.title}
                          {isLate && <AlertTriangle className="ml-1 inline h-3.5 w-3.5 text-red-500" />}
                        </TableCell>
                        <TableCell>{formatDate(m.due_date)}</TableCell>
                        <TableCell className={isLate ? "text-red-600 font-medium" : ""}>{dDay(m.due_date)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-20 rounded-full bg-muted">
                              <div
                                className={`h-2 rounded-full ${isLate ? "bg-red-500" : "bg-primary"}`}
                                style={{ width: `${m.progress_pct}%` }}
                              />
                            </div>
                            <span className="text-xs">{m.progress_pct}%</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs">
                          {Object.entries(m.kpi_target).length > 0 ? (
                            <div className="space-y-0.5">
                              {Object.entries(m.kpi_target).map(([key, target]) => {
                                const actual = m.kpi_actual?.[key] || "-";
                                return (
                                  <div key={key}>
                                    <span className="text-muted-foreground">{key}:</span>{" "}
                                    <span className="font-medium">{actual}</span>
                                    <span className="text-muted-foreground"> / {target}</span>
                                  </div>
                                );
                              })}
                            </div>
                          ) : "-"}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openMsEdit(m)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteMilestone(m.id)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {milestones.length === 0 && (
                    <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">{"마일스톤이 없습니다."}</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* KPI 달성 현황 차트 */}
          {kpiData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-4 w-4" />{"KPI 달성 현황"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={kpiData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="kpi" type="category" width={120} fontSize={11} />
                    <Tooltip
                      formatter={(value, name) =>
                        [formatNumber(Number(value)), name === "target" ? "목표" : "달성"]
                      }
                    />
                    <Legend formatter={(v) => v === "target" ? "목표" : "달성"} />
                    <Bar dataKey="target" fill="#93c5fd" />
                    <Bar dataKey="actual" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
                {/* 달성률 프로그레스 */}
                <div className="mt-4 space-y-2">
                  {kpiData.map((kpi, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <span className="w-28 truncate text-sm text-muted-foreground">{kpi.kpi}</span>
                      <div className="flex-1 h-3 rounded-full bg-muted">
                        <div
                          className={`h-3 rounded-full transition-all ${kpi.pct >= 100 ? "bg-green-500" : kpi.pct >= 70 ? "bg-blue-500" : "bg-amber-500"}`}
                          style={{ width: `${Math.min(kpi.pct, 100)}%` }}
                        />
                      </div>
                      <span className="w-20 text-right text-sm font-medium">
                        {kpi.pct.toFixed(1)}%
                      </span>
                      <span className="w-24 text-right text-xs text-muted-foreground">
                        {kpi.actual} / {kpi.target}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* 마일스톤 다이얼로그 */}
          <Dialog open={msOpen} onOpenChange={setMsOpen}>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
              <DialogHeader><DialogTitle>{msEditId ? "마일스톤 수정" : "마일스톤 추가"}</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label>{"명칭"} *</Label>
                    <Input value={msForm.title} onChange={(e) => setMsForm({ ...msForm, title: e.target.value })} placeholder={"1차년도 중간평가"} />
                  </div>
                  <div>
                    <Label>{"유형"}</Label>
                    <Select value={msForm.milestone_type} onValueChange={(v) => setMsForm({ ...msForm, milestone_type: v as MilestoneType })}>
                      <SelectTrigger><span>{MILESTONE_TYPE_LABELS[msForm.milestone_type]}</span></SelectTrigger>
                      <SelectContent>
                        {Object.entries(MILESTONE_TYPE_LABELS).map(([k, v]) => (
                          <SelectItem key={k} value={k}>{v}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>{"마감일"} *</Label>
                    <Input type="date" value={msForm.due_date} onChange={(e) => setMsForm({ ...msForm, due_date: e.target.value })} />
                  </div>
                  <div>
                    <Label>{"진행률 (%)"}</Label>
                    <Input type="number" min={0} max={100} value={msForm.progress_pct} onChange={(e) => setMsForm({ ...msForm, progress_pct: Number(e.target.value) })} />
                  </div>
                </div>
                <div>
                  <Label>{"설명"}</Label>
                  <Textarea value={msForm.description} onChange={(e) => setMsForm({ ...msForm, description: e.target.value })} rows={2} />
                </div>

                {/* KPI 목표/달성 */}
                <div className="space-y-2">
                  <Label>{"KPI 목표 / 달성"}</Label>
                  <div className="flex gap-2">
                    <Input value={kpiKey} onChange={(e) => setKpiKey(e.target.value)} placeholder={"항목 (예: 내열온도)"} className="flex-1" />
                    <Input value={kpiTargetVal} onChange={(e) => setKpiTargetVal(e.target.value)} placeholder={"목표값 (예: 1300)"} className="flex-1" />
                    <Button type="button" variant="outline" onClick={addKpi}>{"추가"}</Button>
                  </div>
                  {Object.entries(msForm.kpi_target).length > 0 && (
                    <div className="space-y-2 rounded border p-3">
                      {Object.entries(msForm.kpi_target).map(([key, target]) => (
                        <div key={key} className="flex items-center gap-2 text-sm">
                          <span className="w-24 font-medium truncate">{key}</span>
                          <span className="text-muted-foreground">{"목표:"}</span>
                          <span>{target}</span>
                          <span className="text-muted-foreground ml-2">{"달성:"}</span>
                          <Input
                            className="h-7 w-24"
                            value={msForm.kpi_actual[key] || ""}
                            onChange={(e) => setMsForm({
                              ...msForm,
                              kpi_actual: { ...msForm.kpi_actual, [key]: e.target.value },
                            })}
                            placeholder={"실측값"}
                          />
                          <button className="ml-auto text-destructive text-xs hover:underline" onClick={() => removeKpi(key)}>{"삭제"}</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <Button onClick={saveMilestone} className="w-full">
                  <Save className="mr-2 h-4 w-4" />{"저장"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* ═══ 성과물 탭 ═══ */}
        <TabsContent value="outputs" className="space-y-6">
          {/* 성과 달성 현황 */}
          {outputs.length > 0 && (
            <Card>
              <CardHeader><CardTitle>{"성과 달성 현황"}</CardTitle></CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-3">
                  {Object.entries(OUTPUT_TYPE_LABELS).map(([type, label]) => {
                    const items = outputs.filter((o) => o.output_type === type);
                    if (items.length === 0) return null;
                    const completed = items.filter((o) => o.status === "completed" || o.status === "registered").length;
                    return (
                      <div key={type} className="rounded-lg border p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">{label}</span>
                          <Badge variant={completed === items.length ? "default" : "secondary"}>
                            {completed}/{items.length}
                          </Badge>
                        </div>
                        <div className="h-2 rounded-full bg-muted">
                          <div
                            className={`h-2 rounded-full ${completed === items.length ? "bg-green-500" : "bg-blue-500"}`}
                            style={{ width: `${(completed / items.length) * 100}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{"성과물"}</CardTitle>
              <Button size="sm" onClick={openOutCreate}>
                <Plus className="mr-2 h-4 w-4" />{"성과물 등록"}
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{"유형"}</TableHead>
                    <TableHead>{"제목"}</TableHead>
                    <TableHead>{"상태"}</TableHead>
                    <TableHead>{"달성일"}</TableHead>
                    <TableHead>{"사업화"}</TableHead>
                    <TableHead className="w-20" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {outputs.map((o) => (
                    <TableRow key={o.id}>
                      <TableCell><Badge variant="outline">{OUTPUT_TYPE_LABELS[o.output_type]}</Badge></TableCell>
                      <TableCell className="font-medium">{o.title}</TableCell>
                      <TableCell><Badge variant="outline">{OUTPUT_STATUS_LABELS[o.status]}</Badge></TableCell>
                      <TableCell>{formatDate(o.achieved_date)}</TableCell>
                      <TableCell className="text-xs">
                        {Object.keys(o.commercialization).length > 0
                          ? Object.entries(o.commercialization).map(([k, v]) => (
                            <div key={k}><span className="text-muted-foreground">{k}:</span> {String(v)}</div>
                          ))
                          : "-"}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openOutEdit(o)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteOutput(o.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {outputs.length === 0 && (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">{"성과물이 없습니다."}</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* 성과물 다이얼로그 */}
          <Dialog open={outOpen} onOpenChange={setOutOpen}>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
              <DialogHeader><DialogTitle>{outEditId ? "성과물 수정" : "성과물 등록"}</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label>{"유형"} *</Label>
                    <Select value={outForm.output_type} onValueChange={(v) => setOutForm({ ...outForm, output_type: v as OutputType })}>
                      <SelectTrigger><span>{OUTPUT_TYPE_LABELS[outForm.output_type]}</span></SelectTrigger>
                      <SelectContent>
                        {Object.entries(OUTPUT_TYPE_LABELS).map(([k, v]) => (
                          <SelectItem key={k} value={k}>{v}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>{"상태"}</Label>
                    <Select value={outForm.status} onValueChange={(v) => setOutForm({ ...outForm, status: v as OutputStatus })}>
                      <SelectTrigger><span>{OUTPUT_STATUS_LABELS[outForm.status]}</span></SelectTrigger>
                      <SelectContent>
                        {Object.entries(OUTPUT_STATUS_LABELS).map(([k, v]) => (
                          <SelectItem key={k} value={k}>{v}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>{"제목"} *</Label>
                  <Input value={outForm.title} onChange={(e) => setOutForm({ ...outForm, title: e.target.value })} placeholder={"나노 세라믹 불연 코팅 조성물 특허"} />
                </div>
                <div>
                  <Label>{"설명"}</Label>
                  <Textarea value={outForm.description} onChange={(e) => setOutForm({ ...outForm, description: e.target.value })} rows={2} />
                </div>
                <div>
                  <Label>{"달성일"}</Label>
                  <Input type="date" value={outForm.achieved_date} onChange={(e) => setOutForm({ ...outForm, achieved_date: e.target.value })} />
                </div>

                {/* 사업화 실적 */}
                {outForm.output_type === "commercialization" && (
                  <div className="space-y-2">
                    <Label>{"사업화 실적"}</Label>
                    <div className="flex gap-2">
                      <Input value={commKey} onChange={(e) => setCommKey(e.target.value)} placeholder={"항목 (예: 매출액, 수출액)"} className="flex-1" />
                      <Input value={commVal} onChange={(e) => setCommVal(e.target.value)} placeholder={"값"} className="flex-1" />
                      <Button type="button" variant="outline" onClick={addComm}>{"추가"}</Button>
                    </div>
                    {Object.entries(outForm.commercialization).length > 0 && (
                      <div className="space-y-1 rounded border p-3">
                        {Object.entries(outForm.commercialization).map(([k, v]) => (
                          <div key={k} className="flex items-center gap-2 text-sm">
                            <span className="font-medium">{k}:</span>
                            <span>{String(v)}</span>
                            <button className="ml-auto text-destructive text-xs hover:underline" onClick={() => removeComm(k)}>{"삭제"}</button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <Button onClick={saveOutput} className="w-full">
                  <Save className="mr-2 h-4 w-4" />{"저장"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </TabsContent>
      </Tabs>
    </div>
  );
}
