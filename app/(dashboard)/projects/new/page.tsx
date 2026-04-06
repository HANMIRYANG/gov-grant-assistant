"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  PRODUCT_LINE_LABELS,
  BUDGET_CATEGORY_LABELS,
  FUND_SOURCE_LABELS,
  MILESTONE_TYPE_LABELS,
  type BudgetCategory,
  type FundSource,
  type ProductLine,
  type UserProfile,
} from "@/lib/utils/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Save, Trash2, Plus } from "lucide-react";
import { Suspense } from "react";

const STEPS = [
  { title: "\uAE30\uBCF8\uC815\uBCF4", desc: "\uACFC\uC81C \uAE30\uBCF8 \uC815\uBCF4 \uC785\uB825" },
  { title: "\uC608\uC0B0\uD3B8\uC131", desc: "\uBE44\uBAA9\uBCC4 \uC608\uC0B0 \uBC30\uBD84" },
  { title: "\uC778\uB825\uBC30\uC815", desc: "\uCC38\uC5EC \uC778\uB825 \uBC30\uC815" },
  { title: "\uB9C8\uC77C\uC2A4\uD1A4", desc: "\uC5F0\uAD6C \uB2E8\uACC4 \uBC0F \uD3C9\uAC00 \uC77C\uC815" },
];

interface BudgetRow {
  category: BudgetCategory;
  fund_source: FundSource;
  planned_amount: number;
}

interface PersonnelRow {
  user_id: string;
  role: string;
  participation_rate: number;
  monthly_cost: number;
}

interface MilestoneRow {
  title: string;
  milestone_type: string;
  due_date: string;
  kpi_target: string;
}

function ProjectNewForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const grantMatchId = searchParams.get("grant_match_id");

  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [grantTitle, setGrantTitle] = useState("");

  // Step 1: \uAE30\uBCF8\uC815\uBCF4
  const [projectName, setProjectName] = useState("");
  const [projectCode, setProjectCode] = useState("");
  const [fundingAgency, setFundingAgency] = useState("");
  const [managingOrg, setManagingOrg] = useState("");
  const [productLine, setProductLine] = useState<ProductLine>("fire_safety");
  const [piId, setPiId] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [totalBudget, setTotalBudget] = useState(0);
  const [govtFund, setGovtFund] = useState(0);
  const [privateFund, setPrivateFund] = useState(0);

  // Step 2: \uC608\uC0B0
  const [budgetItems, setBudgetItems] = useState<BudgetRow[]>([
    { category: "personnel", fund_source: "government", planned_amount: 0 },
    { category: "equipment", fund_source: "government", planned_amount: 0 },
    { category: "material", fund_source: "government", planned_amount: 0 },
    { category: "outsourcing", fund_source: "government", planned_amount: 0 },
    { category: "overhead", fund_source: "government", planned_amount: 0 },
  ]);

  // Step 3: \uC778\uB825
  const [personnel, setPersonnel] = useState<PersonnelRow[]>([]);

  // Step 4: \uB9C8\uC77C\uC2A4\uD1A4
  const [milestones, setMilestones] = useState<MilestoneRow[]>([]);

  useEffect(() => {
    loadUsers();
    if (grantMatchId) loadGrantData(grantMatchId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadUsers() {
    const supabase = createClient();
    const { data } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("is_active", true)
      .order("name");
    setUsers((data as UserProfile[]) || []);
  }

  async function loadGrantData(matchId: string) {
    const supabase = createClient();
    const { data } = await supabase
      .from("grant_matches")
      .select("*, grant_announcements(*), company_profiles(product_line)")
      .eq("id", matchId)
      .single();

    if (data?.grant_announcements) {
      const g = data.grant_announcements;
      setProjectName(g.title || "");
      setGrantTitle(g.title || "");
      setFundingAgency(g.agency || "");
      setManagingOrg(g.managing_org || "");
      // \uACF5\uACE0 \uC124\uBA85 \u2192 \uACFC\uC81C \uC124\uBA85\uC5D0 \uC790\uB3D9 \uCC44\uC6C0
      if (g.description) {
        setDescription(g.description);
      }
      // \uB9C8\uAC10\uC77C \u2192 \uC885\uB8CC\uC77C \uD78C\uD2B8\uB85C \uC0AC\uC6A9
      if (g.deadline) {
        setEndDate(g.deadline.split("T")[0]);
      }
      // \uC608\uC0B0 \uBC94\uC704 \uD30C\uC2F1 \uC2DC\uB3C4
      if (g.budget_range) {
        const nums = g.budget_range.match(/[\d,]+/g);
        if (nums && nums.length > 0) {
          const parsed = parseInt(nums[nums.length - 1].replace(/,/g, ""), 10);
          if (!isNaN(parsed)) {
            const amount = parsed <= 500 ? parsed * 100000000 : parsed;
            setTotalBudget(amount);
            setGovtFund(amount);
          }
        }
      }
      // \uC81C\uD488\uB77C\uC778
      if (data.company_profiles?.product_line) {
        setProductLine(data.company_profiles.product_line);
      }
      // AI \uB9E4\uCE6D \uBD84\uC11D \uC815\uBCF4\uB3C4 \uC124\uBA85\uC5D0 \uD3EC\uD568
      if (data.llm_reasoning) {
        setDescription((prev) =>
          prev
            ? `${prev}\n\n[AI \uB9E4\uCE6D \uBD84\uC11D]\n${data.llm_reasoning}`
            : `[AI \uB9E4\uCE6D \uBD84\uC11D]\n${data.llm_reasoning}`
        );
      }
    }
  }

  async function handleSubmit() {
    if (!projectName) { toast.error("\uACFC\uC81C\uBA85\uC744 \uC785\uB825\uD574\uC8FC\uC138\uC694."); return; }
    setSaving(true);

    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_name: projectName,
          project_code: projectCode || null,
          funding_agency: fundingAgency || "",
          managing_org: managingOrg || null,
          product_line: productLine,
          pi_id: piId || null,
          grant_match_id: grantMatchId || null,
          description: description || null,
          start_date: startDate || null,
          end_date: endDate || null,
          total_budget: totalBudget,
          govt_fund: govtFund,
          private_fund: privateFund,
          budget_items: budgetItems.filter((b) => b.planned_amount > 0),
          personnel: personnel.filter((p) => p.user_id),
          milestones: milestones.filter((m) => m.title && m.due_date),
        }),
      });

      if (!res.ok) throw new Error(await res.text());
      const project = await res.json();
      toast.success("\uACFC\uC81C\uAC00 \uB4F1\uB85D\uB418\uC5C8\uC2B5\uB2C8\uB2E4.");
      router.push(`/projects/${project.id}`);
    } catch (e) {
      toast.error(`\uB4F1\uB85D \uC2E4\uD328: ${e}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{"\uACFC\uC81C \uB4F1\uB85D"}</h1>
        {grantMatchId && (
          <div className="mt-2 rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-900 dark:bg-blue-950/20">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              {"\uCD94\uCC9C \uACF5\uACE0\uC5D0\uC11C \uC790\uB3D9 \uC785\uB825\uB428"}
              {grantTitle && <span className="ml-1 font-medium">{"\u2014 "}{grantTitle}</span>}
            </p>
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
              {"\uACF5\uACE0 \uC815\uBCF4\uAC00 \uC544\uB798 \uD3FC\uC5D0 \uCC44\uC6CC\uC838 \uC788\uC2B5\uB2C8\uB2E4. \uD655\uC778 \uD6C4 \uB098\uBA38\uC9C0 \uD56D\uBAA9\uC744 \uC785\uB825\uD574\uC8FC\uC138\uC694."}
            </p>
          </div>
        )}
      </div>

      {/* \uC2A4\uD15D \uC778\uB514\uCF00\uC774\uD130 */}
      <div className="flex gap-2">
        {STEPS.map((s, i) => (
          <button
            key={i}
            onClick={() => setStep(i)}
            className={`flex-1 rounded-lg border p-3 text-left text-sm transition-colors ${
              i === step ? "border-primary bg-primary/5 font-medium" : "opacity-60 hover:opacity-80"
            }`}
          >
            <span className="text-xs text-muted-foreground">Step {i + 1}</span>
            <p>{s.title}</p>
          </button>
        ))}
      </div>

      {/* Step 1: \uAE30\uBCF8\uC815\uBCF4 */}
      {step === 0 && (
        <Card>
          <CardHeader><CardTitle>{"\uAE30\uBCF8\uC815\uBCF4"}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label>{"\uACFC\uC81C\uBA85"} *</Label>
                <Input value={projectName} onChange={(e) => setProjectName(e.target.value)} />
              </div>
              <div>
                <Label>{"\uACFC\uC81C\uBC88\uD638"}</Label>
                <Input value={projectCode} onChange={(e) => setProjectCode(e.target.value)} placeholder="ex) 20260001" />
              </div>
              <div>
                <Label>{"\uC81C\uD488\uB77C\uC778"}</Label>
                <Select value={productLine} onValueChange={(v) => setProductLine(v as ProductLine)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(PRODUCT_LINE_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{"\uC8FC\uAD00\uAE30\uAD00"}</Label>
                <Input value={fundingAgency} onChange={(e) => setFundingAgency(e.target.value)} placeholder={"\uC608) \uC0B0\uC5C5\uD1B5\uC0C1\uC790\uC6D0\uBD80"} />
              </div>
              <div>
                <Label>{"\uC804\uBB38\uAE30\uAD00"}</Label>
                <Input value={managingOrg} onChange={(e) => setManagingOrg(e.target.value)} placeholder={"\uC608) KEIT"} />
              </div>
              <div>
                <Label>{"\uACFC\uC81C \uCC45\uC784\uC790 (PM)"}</Label>
                <Select value={piId} onValueChange={(v) => setPiId(v ?? "")}>
                  <SelectTrigger>
                    <SelectValue placeholder={"\uC120\uD0DD"}>
                      {(value: string) => {
                        const u = users.find((user) => user.id === value);
                        return u ? `${u.name} (${u.position || u.role})` : value;
                      }}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((u) => (
                      <SelectItem key={u.id} value={u.id}>{u.name} ({u.position || u.role})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{"\uC2DC\uC791\uC77C"}</Label>
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div>
                <Label>{"\uC885\uB8CC\uC77C"}</Label>
                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
              <div>
                <Label>{"\uCD1D \uC608\uC0B0 (\uC6D0)"}</Label>
                <Input type="number" value={totalBudget || ""} onChange={(e) => setTotalBudget(Number(e.target.value))} />
              </div>
              <div>
                <Label>{"\uC815\uBD80\uCD9C\uC5F0\uAE08 (\uC6D0)"}</Label>
                <Input type="number" value={govtFund || ""} onChange={(e) => setGovtFund(Number(e.target.value))} />
              </div>
              <div>
                <Label>{"\uBBFC\uAC04\uBD80\uB2F4\uAE08 (\uC6D0)"}</Label>
                <Input type="number" value={privateFund || ""} onChange={(e) => setPrivateFund(Number(e.target.value))} />
              </div>
              <div className="sm:col-span-2">
                <Label>{"\uACFC\uC81C \uC124\uBA85"}</Label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: \uC608\uC0B0\uD3B8\uC131 */}
      {step === 1 && (
        <Card>
          <CardHeader><CardTitle>{"\uBE44\uBAA9\uBCC4 \uC608\uC0B0\uD3B8\uC131"}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {budgetItems.map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-40">
                  <Select
                    value={item.category}
                    onValueChange={(v) => {
                      const next = [...budgetItems];
                      next[i] = { ...next[i], category: (v ?? "material") as BudgetCategory };
                      setBudgetItems(next);
                    }}
                  >
                    <SelectTrigger>
                      <span>{BUDGET_CATEGORY_LABELS[item.category]}</span>
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(BUDGET_CATEGORY_LABELS).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-36">
                  <Select
                    value={item.fund_source}
                    onValueChange={(v) => {
                      const next = [...budgetItems];
                      next[i] = { ...next[i], fund_source: (v ?? "government") as FundSource };
                      setBudgetItems(next);
                    }}
                  >
                    <SelectTrigger>
                      <span>{FUND_SOURCE_LABELS[item.fund_source]}</span>
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(FUND_SOURCE_LABELS).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Input
                  type="number"
                  className="flex-1"
                  placeholder={"\uAE08\uC561 (\uC6D0)"}
                  value={item.planned_amount || ""}
                  onChange={(e) => {
                    const next = [...budgetItems];
                    next[i] = { ...next[i], planned_amount: Number(e.target.value) };
                    setBudgetItems(next);
                  }}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setBudgetItems(budgetItems.filter((_, j) => j !== i))}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setBudgetItems([...budgetItems, { category: "material", fund_source: "government", planned_amount: 0 }])}
            >
              <Plus className="mr-2 h-4 w-4" />{"\uBE44\uBAA9 \uCD94\uAC00"}
            </Button>
            <div className="mt-4 rounded bg-muted p-3 text-sm font-medium">
              {"\uD3B8\uC131 \uD569\uACC4: "}
              {budgetItems.reduce((s, b) => s + b.planned_amount, 0).toLocaleString("ko-KR")}{"\uC6D0"}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: \uC778\uB825\uBC30\uC815 */}
      {step === 2 && (
        <Card>
          <CardHeader><CardTitle>{"\uCC38\uC5EC \uC778\uB825 \uBC30\uC815"}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {personnel.map((p, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-40">
                  <Select
                    value={p.user_id}
                    onValueChange={(v) => {
                      const next = [...personnel];
                      next[i] = { ...next[i], user_id: v ?? "" };
                      setPersonnel(next);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={"\uC120\uD0DD"}>
                        {(value: string) => {
                          const u = users.find((user) => user.id === value);
                          return u?.name || value;
                        }}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {users.map((u) => (
                        <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-32">
                  <Select
                    value={p.role}
                    onValueChange={(v) => {
                      const next = [...personnel];
                      next[i] = { ...next[i], role: v ?? "researcher" };
                      setPersonnel(next);
                    }}
                  >
                    <SelectTrigger>
                      <span>{{ pi: "\uCC45\uC784\uC5F0\uAD6C\uC6D0", researcher: "\uC5F0\uAD6C\uC6D0", assistant: "\uC5F0\uAD6C\uBCF4\uC870\uC6D0", co_researcher: "\uACF5\uB3D9\uC5F0\uAD6C\uC6D0" }[p.role] || p.role}</span>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pi">{"\uCC45\uC784\uC5F0\uAD6C\uC6D0"}</SelectItem>
                      <SelectItem value="co_researcher">{"\uACF5\uB3D9\uC5F0\uAD6C\uC6D0"}</SelectItem>
                      <SelectItem value="researcher">{"\uC5F0\uAD6C\uC6D0"}</SelectItem>
                      <SelectItem value="assistant">{"\uC5F0\uAD6C\uBCF4\uC870\uC6D0"}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Input
                  type="number"
                  className="w-24"
                  placeholder={"\uCC38\uC5EC\uC728(%)"}
                  value={p.participation_rate || ""}
                  onChange={(e) => {
                    const next = [...personnel];
                    next[i] = { ...next[i], participation_rate: Number(e.target.value) };
                    setPersonnel(next);
                  }}
                />
                <Input
                  type="number"
                  className="w-32"
                  placeholder={"\uC6D4 \uC778\uAC74\uBE44(\uC6D0)"}
                  value={p.monthly_cost || ""}
                  onChange={(e) => {
                    const next = [...personnel];
                    next[i] = { ...next[i], monthly_cost: Number(e.target.value) };
                    setPersonnel(next);
                  }}
                />
                <Button variant="ghost" size="icon" onClick={() => setPersonnel(personnel.filter((_, j) => j !== i))}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPersonnel([...personnel, { user_id: "", role: "researcher", participation_rate: 0, monthly_cost: 0 }])}
            >
              <Plus className="mr-2 h-4 w-4" />{"\uC778\uB825 \uCD94\uAC00"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 4: \uB9C8\uC77C\uC2A4\uD1A4 */}
      {step === 3 && (
        <Card>
          <CardHeader><CardTitle>{"\uB9C8\uC77C\uC2A4\uD1A4"}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {milestones.map((m, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-32">
                  <Select
                    value={m.milestone_type}
                    onValueChange={(v) => {
                      const next = [...milestones];
                      next[i] = { ...next[i], milestone_type: v ?? "interim_report" };
                      setMilestones(next);
                    }}
                  >
                    <SelectTrigger>
                      <span>{MILESTONE_TYPE_LABELS[m.milestone_type as keyof typeof MILESTONE_TYPE_LABELS] || m.milestone_type}</span>
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(MILESTONE_TYPE_LABELS).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Input
                  className="flex-1"
                  placeholder={"\uB9C8\uC77C\uC2A4\uD1A4\uBA85"}
                  value={m.title}
                  onChange={(e) => {
                    const next = [...milestones];
                    next[i] = { ...next[i], title: e.target.value };
                    setMilestones(next);
                  }}
                />
                <Input
                  type="date"
                  className="w-40"
                  value={m.due_date}
                  onChange={(e) => {
                    const next = [...milestones];
                    next[i] = { ...next[i], due_date: e.target.value };
                    setMilestones(next);
                  }}
                />
                <Input
                  className="w-40"
                  placeholder={"KPI \uBAA9\uD45C"}
                  value={m.kpi_target}
                  onChange={(e) => {
                    const next = [...milestones];
                    next[i] = { ...next[i], kpi_target: e.target.value };
                    setMilestones(next);
                  }}
                />
                <Button variant="ghost" size="icon" onClick={() => setMilestones(milestones.filter((_, j) => j !== i))}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setMilestones([...milestones, { title: "", milestone_type: "research_phase", due_date: "", kpi_target: "" }])}
            >
              <Plus className="mr-2 h-4 w-4" />{"\uB9C8\uC77C\uC2A4\uD1A4 \uCD94\uAC00"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* \uB124\uBE44\uAC8C\uC774\uC158 */}
      <div className="flex justify-between">
        <Button variant="outline" disabled={step === 0} onClick={() => setStep(step - 1)}>
          <ChevronLeft className="mr-2 h-4 w-4" />{"\uC774\uC804"}
        </Button>
        {step < STEPS.length - 1 ? (
          <Button onClick={() => setStep(step + 1)}>
            {"\uB2E4\uC74C"}<ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        ) : (
          <Button onClick={handleSubmit} disabled={saving}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? "\uC800\uC7A5 \uC911..." : "\uACFC\uC81C \uB4F1\uB85D"}
          </Button>
        )}
      </div>
    </div>
  );
}

export default function ProjectNewPage() {
  return (
    <Suspense fallback={<div className="py-12 text-center text-muted-foreground">{"\uBD88\uB7EC\uC624\uB294 \uC911..."}</div>}>
      <ProjectNewForm />
    </Suspense>
  );
}
