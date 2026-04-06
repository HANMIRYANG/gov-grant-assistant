import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// GET /api/timesheets?user_id=...&project_id=...&month=2026-04
export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("user_id") || user.id;
  const projectId = searchParams.get("project_id");
  const month = searchParams.get("month"); // "2026-04"

  const admin = createAdminClient();
  let query = admin
    .from("timesheets")
    .select("*, project:projects(id, project_name, project_code)")
    .eq("user_id", userId)
    .order("week_start");

  if (projectId) query = query.eq("project_id", projectId);

  if (month) {
    const [y, m] = month.split("-").map(Number);
    const start = `${y}-${String(m).padStart(2, "0")}-01`;
    const lastDay = new Date(y, m, 0).getDate();
    const end = `${y}-${String(m).padStart(2, "0")}-${lastDay}`;
    query = query.gte("week_start", start).lte("week_start", end);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// POST /api/timesheets - upsert (week_start + project_id + user_id unique)
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("timesheets")
    .upsert(
      {
        user_id: body.user_id || user.id,
        project_id: body.project_id,
        week_start: body.week_start,
        hours: body.hours || 0,
        activities: body.activities || null,
      },
      { onConflict: "user_id,project_id,week_start" },
    )
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
