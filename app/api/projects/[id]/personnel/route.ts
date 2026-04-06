import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function checkParticipationRate(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  excludeId?: string,
  newRate?: number,
): Promise<{ ok: boolean; total: number }> {
  const { data } = await admin
    .from("project_personnel")
    .select("id, participation_rate")
    .eq("user_id", userId);

  let total = (data || [])
    .filter((p) => p.id !== excludeId)
    .reduce((sum, p) => sum + Number(p.participation_rate), 0);

  if (newRate !== undefined) total += newRate;

  return { ok: total <= 100, total };
}

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
    .from("project_personnel")
    .select("*, user:user_profiles(id, name, email, department, position)")
    .eq("project_id", id)
    .order("created_at");

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

  // 참여율 검증
  const rate = Number(body.participation_rate) || 0;
  const check = await checkParticipationRate(admin, body.user_id, undefined, rate);
  if (!check.ok) {
    return NextResponse.json(
      { error: `참여율 초과: 현재 ${check.total}% (최대 100%)` },
      { status: 400 },
    );
  }

  const { data, error } = await admin
    .from("project_personnel")
    .insert({
      project_id: id,
      user_id: body.user_id,
      role: body.role || "researcher",
      participation_rate: rate,
      monthly_cost: body.monthly_cost || 0,
      start_date: body.start_date || null,
      end_date: body.end_date || null,
      is_external: body.is_external || false,
      external_org: body.external_org || null,
    })
    .select("*, user:user_profiles(id, name, email, department, position)")
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "이미 배정된 인력입니다." }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
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
  const personnelId = body.personnel_id;
  if (!personnelId) return NextResponse.json({ error: "personnel_id required" }, { status: 400 });

  const admin = createAdminClient();

  // 참여율 변경 시 검증
  if (body.participation_rate !== undefined) {
    const { data: existing } = await admin
      .from("project_personnel")
      .select("user_id")
      .eq("id", personnelId)
      .single();

    if (existing) {
      const check = await checkParticipationRate(
        admin, existing.user_id, personnelId, Number(body.participation_rate),
      );
      if (!check.ok) {
        return NextResponse.json(
          { error: `참여율 초과: 현재 ${check.total}% (최대 100%)` },
          { status: 400 },
        );
      }
    }
  }

  const updates: Record<string, unknown> = {};
  if (body.role !== undefined) updates.role = body.role;
  if (body.participation_rate !== undefined) updates.participation_rate = body.participation_rate;
  if (body.monthly_cost !== undefined) updates.monthly_cost = body.monthly_cost;
  if (body.start_date !== undefined) updates.start_date = body.start_date;
  if (body.end_date !== undefined) updates.end_date = body.end_date;
  if (body.is_external !== undefined) updates.is_external = body.is_external;
  if (body.external_org !== undefined) updates.external_org = body.external_org;

  const { data, error } = await admin
    .from("project_personnel")
    .update(updates)
    .eq("id", personnelId)
    .eq("project_id", id)
    .select("*, user:user_profiles(id, name, email, department, position)")
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
  const personnelId = searchParams.get("personnel_id");
  if (!personnelId) return NextResponse.json({ error: "personnel_id required" }, { status: 400 });

  const admin = createAdminClient();
  const { error } = await admin
    .from("project_personnel")
    .delete()
    .eq("id", personnelId)
    .eq("project_id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
