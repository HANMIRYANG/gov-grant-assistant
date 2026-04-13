import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, status: 401, message: "Unauthorized" };

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("user_profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "admin") {
    return { ok: false as const, status: 403, message: "Forbidden: admin only" };
  }
  return { ok: true as const, admin };
}

// GET /api/users?all=true (all 포함하면 비활성 사용자도 반환)
export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const showAll = searchParams.get("all") === "true";

  const admin = createAdminClient();
  let query = admin
    .from("user_profiles")
    .select("*")
    .order("name");

  if (!showAll) {
    query = query.eq("is_active", true);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// POST /api/users - 신규 직원 등록 (Supabase Auth 계정 + user_profiles 동시 생성)
export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });
  const { admin } = auth;

  const body = await request.json();

  if (!body.email || !body.name || !body.password) {
    return NextResponse.json(
      { error: "email, name, password는 필수입니다." },
      { status: 400 },
    );
  }

  if (body.employee_code && !/^H-\d{3,}$/.test(body.employee_code)) {
    return NextResponse.json(
      { error: "사원번호 형식이 올바르지 않습니다. (예: H-001)" },
      { status: 400 },
    );
  }

  if (body.employee_code) {
    const { data: dup } = await admin
      .from("user_profiles")
      .select("id")
      .eq("employee_code", body.employee_code)
      .maybeSingle();
    if (dup) {
      return NextResponse.json(
        { error: `사원번호 ${body.employee_code}는 이미 등록되어 있습니다.` },
        { status: 409 },
      );
    }
  }

  const { data: created, error: authError } = await admin.auth.admin.createUser({
    email: body.email,
    password: body.password,
    email_confirm: true,
    user_metadata: { name: body.name },
  });

  if (authError || !created.user) {
    return NextResponse.json(
      { error: authError?.message || "Auth 계정 생성 실패" },
      { status: 500 },
    );
  }

  const { data: profile, error: profileError } = await admin
    .from("user_profiles")
    .insert({
      id: created.user.id,
      name: body.name,
      email: body.email,
      department: body.department || null,
      position: body.position || null,
      role: body.role || "researcher",
      phone: body.phone || null,
      employee_code: body.employee_code || null,
      is_active: body.is_active ?? true,
    })
    .select()
    .single();

  if (profileError) {
    await admin.auth.admin.deleteUser(created.user.id);
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  return NextResponse.json(profile, { status: 201 });
}
