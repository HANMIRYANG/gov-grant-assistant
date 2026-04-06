import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

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
    .from("milestones")
    .select("*")
    .eq("project_id", id)
    .order("sort_order");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(
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
    .from("milestones")
    .insert({
      project_id: id,
      title: body.title,
      milestone_type: body.milestone_type || "research_phase",
      description: body.description || null,
      due_date: body.due_date,
      progress_pct: body.progress_pct || 0,
      kpi_target: body.kpi_target || {},
      kpi_actual: body.kpi_actual || {},
      sort_order: body.sort_order || 0,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
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

  const updates: Record<string, unknown> = {};
  if (body.title !== undefined) updates.title = body.title;
  if (body.milestone_type !== undefined) updates.milestone_type = body.milestone_type;
  if (body.description !== undefined) updates.description = body.description;
  if (body.due_date !== undefined) updates.due_date = body.due_date;
  if (body.completed_date !== undefined) updates.completed_date = body.completed_date;
  if (body.progress_pct !== undefined) updates.progress_pct = body.progress_pct;
  if (body.kpi_target !== undefined) updates.kpi_target = body.kpi_target;
  if (body.kpi_actual !== undefined) updates.kpi_actual = body.kpi_actual;
  if (body.sort_order !== undefined) updates.sort_order = body.sort_order;

  // milestone_id is in body, project_id is from route
  const milestoneId = body.milestone_id;
  if (!milestoneId) return NextResponse.json({ error: "milestone_id required" }, { status: 400 });

  const { data, error } = await admin
    .from("milestones")
    .update(updates)
    .eq("id", milestoneId)
    .eq("project_id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const milestoneId = searchParams.get("milestone_id");
  if (!milestoneId) return NextResponse.json({ error: "milestone_id required" }, { status: 400 });

  const admin = createAdminClient();
  const { error } = await admin
    .from("milestones")
    .delete()
    .eq("id", milestoneId)
    .eq("project_id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
