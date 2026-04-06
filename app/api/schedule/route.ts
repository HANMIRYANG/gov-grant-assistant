import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// GET /api/schedule - 전체 과제 + 마일스톤 (간트차트용)
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("projects")
    .select("id, project_name, project_code, start_date, end_date, status, product_line, milestones(id, title, milestone_type, due_date, completed_date, progress_pct)")
    .in("status", ["preparing", "active", "suspended"])
    .order("start_date");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
