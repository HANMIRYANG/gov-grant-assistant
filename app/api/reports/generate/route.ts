import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateReport, type ReportType } from "@/lib/reports/generator";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { projectId, reportType } = body as {
      projectId: string;
      reportType: ReportType;
    };

    if (!projectId || !reportType) {
      return NextResponse.json(
        { error: "projectId and reportType are required" },
        { status: 400 },
      );
    }

    if (!["mid", "final", "settlement"].includes(reportType)) {
      return NextResponse.json(
        { error: "Invalid reportType" },
        { status: 400 },
      );
    }

    // 과제 기본 정보
    const { data: project, error: projError } = await supabase
      .from("projects")
      .select("*, pi:user_profiles!projects_pi_id_fkey(name, department, position)")
      .eq("id", projectId)
      .single();

    if (projError || !project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // 예산 항목
    const { data: budgetItems } = await supabase
      .from("budget_items")
      .select("category, fund_source, planned_amount, spent_amount")
      .eq("project_id", projectId);

    // 집행 내역 (승인된 것만)
    const { data: rawExpenses } = await supabase
      .from("expenses")
      .select("expense_date, amount, vendor, description, budget_items(category)")
      .eq("approval_status", "approved")
      .in(
        "budget_item_id",
        (budgetItems ?? []).map((b) => (b as unknown as { id: string }).id),
      )
      .order("expense_date", { ascending: true });

    // budget_item_id로 직접 조회
    const { data: expensesFromProject } = await supabase
      .from("expenses")
      .select("expense_date, amount, vendor, description, budget_items!inner(category, project_id)")
      .eq("budget_items.project_id", projectId)
      .eq("approval_status", "approved")
      .order("expense_date", { ascending: true });

    const expenses = (expensesFromProject ?? []).map((e) => ({
      expense_date: e.expense_date,
      amount: Number(e.amount),
      vendor: e.vendor,
      description: e.description,
      category: (e.budget_items as unknown as { category: string })?.category ?? "",
    }));

    // 마일스톤
    const { data: milestones } = await supabase
      .from("milestones")
      .select("title, milestone_type, due_date, completed_date, progress_pct, kpi_target, kpi_actual")
      .eq("project_id", projectId)
      .order("sort_order", { ascending: true });

    // 참여 인력
    const { data: personnel } = await supabase
      .from("project_personnel")
      .select("role, participation_rate, monthly_cost, user_profiles(name)")
      .eq("project_id", projectId);

    // 성과물
    const { data: outputs } = await supabase
      .from("outputs")
      .select("output_type, title, status, achieved_date")
      .eq("project_id", projectId);

    const reportData = {
      project: {
        project_name: project.project_name,
        project_code: project.project_code,
        funding_agency: project.funding_agency,
        managing_org: project.managing_org,
        start_date: project.start_date,
        end_date: project.end_date,
        total_budget: Number(project.total_budget),
        govt_fund: Number(project.govt_fund),
        private_fund: Number(project.private_fund),
        description: project.description,
        status: project.status,
        pi: project.pi,
      },
      budgetItems: (budgetItems ?? []).map((b) => ({
        category: b.category,
        fund_source: b.fund_source,
        planned_amount: Number(b.planned_amount),
        spent_amount: Number(b.spent_amount),
      })),
      expenses,
      milestones: (milestones ?? []).map((m) => ({
        title: m.title,
        milestone_type: m.milestone_type,
        due_date: m.due_date,
        completed_date: m.completed_date,
        progress_pct: m.progress_pct,
        kpi_target: m.kpi_target ?? {},
        kpi_actual: m.kpi_actual ?? {},
      })),
      personnel: (personnel ?? []).map((p) => ({
        name: (p.user_profiles as unknown as { name: string })?.name ?? "",
        role: p.role,
        participation_rate: Number(p.participation_rate),
        monthly_cost: Number(p.monthly_cost),
      })),
      outputs: (outputs ?? []).map((o) => ({
        output_type: o.output_type,
        title: o.title,
        status: o.status,
        achieved_date: o.achieved_date,
      })),
    };

    const buffer = await generateReport(reportType, reportData);

    const filename = `${project.project_name}_${reportType}_${new Date().toISOString().split("T")[0]}.docx`;

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
      },
    });
  } catch (error) {
    console.error("Report generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate report" },
      { status: 500 },
    );
  }
}
