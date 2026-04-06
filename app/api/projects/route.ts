import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { writeAuditLog } from "@/lib/utils/audit";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("projects")
    .select("*, pi:user_profiles!projects_pi_id_fkey(id, name, email)")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const admin = createAdminClient();

  // \uD504\uB85C\uC81D\uD2B8 \uC0DD\uC131
  const { data: project, error: projectError } = await admin
    .from("projects")
    .insert({
      project_name: body.project_name,
      project_code: body.project_code || null,
      funding_agency: body.funding_agency || "",
      managing_org: body.managing_org || null,
      product_line: body.product_line || "other",
      status: "preparing",
      pi_id: body.pi_id || null,
      grant_match_id: body.grant_match_id || null,
      description: body.description || null,
      start_date: body.start_date || new Date().toISOString().split("T")[0],
      end_date: body.end_date || new Date().toISOString().split("T")[0],
      total_budget: body.total_budget || 0,
      govt_fund: body.govt_fund || 0,
      private_fund: body.private_fund || 0,
    })
    .select()
    .single();

  if (projectError) return NextResponse.json({ error: projectError.message }, { status: 500 });

  // \uC608\uC0B0 \uD56D\uBAA9 \uC77C\uAD04 \uC0DD\uC131
  if (body.budget_items && body.budget_items.length > 0) {
    const budgetRows = body.budget_items.map((item: Record<string, unknown>) => ({
      project_id: project.id,
      category: item.category,
      fund_source: item.fund_source || "government",
      fiscal_year: item.fiscal_year || new Date().getFullYear(),
      planned_amount: item.planned_amount || 0,
    }));
    await admin.from("budget_items").insert(budgetRows);
  }

  // \uC778\uB825 \uBC30\uC815
  if (body.personnel && body.personnel.length > 0) {
    const personnelRows = body.personnel.map((p: Record<string, unknown>) => ({
      project_id: project.id,
      user_id: p.user_id,
      role: p.role || "researcher",
      participation_rate: p.participation_rate || 0,
      monthly_cost: p.monthly_cost || 0,
      start_date: body.start_date || null,
      end_date: body.end_date || null,
    }));
    await admin.from("project_personnel").insert(personnelRows);
  }

  // \uB9C8\uC77C\uC2A4\uD1A4 \uC0DD\uC131
  if (body.milestones && body.milestones.length > 0) {
    const milestoneRows = body.milestones.map((m: Record<string, unknown>, i: number) => ({
      project_id: project.id,
      title: m.title,
      milestone_type: m.milestone_type || "research_phase",
      description: m.description || null,
      due_date: m.due_date,
      kpi_target: m.kpi_target ? { target: m.kpi_target } : {},
      sort_order: i,
    }));
    await admin.from("milestones").insert(milestoneRows);
  }

  // grant_match \uC0C1\uD0DC \uC5C5\uB370\uC774\uD2B8
  if (body.grant_match_id) {
    await admin
      .from("grant_matches")
      .update({ status: "won" })
      .eq("id", body.grant_match_id);
  }

  // 감사 로그
  await writeAuditLog({
    userId: user.id,
    action: "INSERT",
    tableName: "projects",
    recordId: project.id,
    newData: { project_name: project.project_name, total_budget: project.total_budget, status: project.status },
  });

  return NextResponse.json(project, { status: 201 });
}
