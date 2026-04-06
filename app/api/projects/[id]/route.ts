import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { writeAuditLog } from "@/lib/utils/audit";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("projects")
    .select("*, pi:user_profiles!projects_pi_id_fkey(id, name, email)")
    .eq("id", id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json(data);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("projects")
    .update({
      project_name: body.project_name,
      project_code: body.project_code,
      funding_agency: body.funding_agency,
      managing_org: body.managing_org,
      product_line: body.product_line,
      status: body.status,
      pi_id: body.pi_id,
      description: body.description,
      start_date: body.start_date,
      end_date: body.end_date,
      total_budget: body.total_budget,
      govt_fund: body.govt_fund,
      private_fund: body.private_fund,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await writeAuditLog({
    userId: user.id,
    action: "UPDATE",
    tableName: "projects",
    recordId: id,
    oldData: body._old ?? null,
    newData: { project_name: data.project_name, status: data.status, total_budget: data.total_budget },
  });

  return NextResponse.json(data);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();

  // 삭제 전 데이터 조회
  const { data: existing } = await admin
    .from("projects")
    .select("project_name, status")
    .eq("id", id)
    .single();

  const { error } = await admin.from("projects").delete().eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await writeAuditLog({
    userId: user.id,
    action: "DELETE",
    tableName: "projects",
    recordId: id,
    oldData: existing ?? null,
  });

  return NextResponse.json({ ok: true });
}
