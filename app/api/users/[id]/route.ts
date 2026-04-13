import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// PUT /api/users/[id] - 사용자 프로필 수정 (admin 전용)
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();

  const { data: caller } = await admin
    .from("user_profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!caller || caller.role !== "admin") {
    return NextResponse.json({ error: "Forbidden: admin only" }, { status: 403 });
  }

  const body = await request.json();

  if (body.employee_code !== undefined && body.employee_code !== null && body.employee_code !== "") {
    if (!/^H-\d{3,}$/.test(body.employee_code)) {
      return NextResponse.json(
        { error: "사원번호 형식이 올바르지 않습니다. (예: H-001)" },
        { status: 400 },
      );
    }
    const { data: dup } = await admin
      .from("user_profiles")
      .select("id")
      .eq("employee_code", body.employee_code)
      .neq("id", id)
      .maybeSingle();
    if (dup) {
      return NextResponse.json(
        { error: `사원번호 ${body.employee_code}는 이미 등록되어 있습니다.` },
        { status: 409 },
      );
    }
  }

  const updates: Record<string, unknown> = {};
  if (body.name !== undefined) updates.name = body.name;
  if (body.department !== undefined) updates.department = body.department;
  if (body.position !== undefined) updates.position = body.position;
  if (body.role !== undefined) updates.role = body.role;
  if (body.phone !== undefined) updates.phone = body.phone;
  if (body.is_active !== undefined) updates.is_active = body.is_active;
  if (body.employee_code !== undefined) {
    updates.employee_code = body.employee_code === "" ? null : body.employee_code;
  }

  const { data, error } = await admin
    .from("user_profiles")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
