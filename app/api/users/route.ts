import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

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

// POST /api/users - 사용자 프로필 생성 (Supabase Auth 사용자가 이미 존재해야 함)
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("user_profiles")
    .upsert({
      id: body.id,
      name: body.name,
      email: body.email,
      department: body.department || null,
      position: body.position || null,
      role: body.role || "researcher",
      phone: body.phone || null,
      is_active: body.is_active ?? true,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
