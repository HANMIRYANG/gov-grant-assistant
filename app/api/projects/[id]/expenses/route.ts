import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// GET /api/projects/[id]/expenses - 과제별 집행 내역
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();

  // 먼저 해당 과제의 budget_item ids를 가져옴
  const { data: budgetItems } = await admin
    .from("budget_items")
    .select("id")
    .eq("project_id", id);

  if (!budgetItems || budgetItems.length === 0) {
    return NextResponse.json([]);
  }

  const budgetItemIds = budgetItems.map((b) => b.id);

  const { data, error } = await admin
    .from("expenses")
    .select("*, budget_items(id, category, fund_source), submitted_by_user:user_profiles!expenses_submitted_by_fkey(id, name)")
    .in("budget_item_id", budgetItemIds)
    .order("expense_date", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
