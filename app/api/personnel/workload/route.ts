import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// GET /api/personnel/workload - 연구원별 과제 참여율 합계
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("project_personnel")
    .select("user_id, participation_rate, role, project:projects(id, project_name, status), user:user_profiles(id, name, department, position)")
    .order("user_id");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // group by user
  const userMap = new Map<string, {
    user: { id: string; name: string; department: string | null; position: string | null };
    assignments: Array<{ project_id: string; project_name: string; project_status: string; role: string; participation_rate: number }>;
    total_rate: number;
  }>();

  for (const row of data || []) {
    const u = row.user as unknown as { id: string; name: string; department: string | null; position: string | null };
    const p = row.project as unknown as { id: string; project_name: string; status: string };
    if (!u || !p) continue;

    if (!userMap.has(u.id)) {
      userMap.set(u.id, { user: u, assignments: [], total_rate: 0 });
    }
    const entry = userMap.get(u.id)!;
    entry.assignments.push({
      project_id: p.id,
      project_name: p.project_name,
      project_status: p.status,
      role: row.role,
      participation_rate: Number(row.participation_rate),
    });
    entry.total_rate += Number(row.participation_rate);
  }

  return NextResponse.json(Array.from(userMap.values()));
}
