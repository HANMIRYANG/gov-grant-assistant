import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { writeAuditLog } from "@/lib/utils/audit";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const action: "approved" | "rejected" = body.action;
  const comment: string | null = body.comment || null;

  if (!["approved", "rejected"].includes(action)) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const admin = createAdminClient();

  // \uACB0\uC7AC \uD750\uB984 \uC5C5\uB370\uC774\uD2B8
  const { data: flow, error: flowError } = await admin
    .from("approval_flows")
    .update({
      status: action,
      comment,
      decided_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("approver_id", user.id)
    .select("*, expenses(id, amount, budget_item_id)")
    .single();

  if (flowError) return NextResponse.json({ error: flowError.message }, { status: 500 });

  const expense = flow.expenses as { id: string; amount: number; budget_item_id: string };

  if (action === "approved") {
    // \uD574\uB2F9 expense\uC758 \uBAA8\uB4E0 \uACB0\uC7AC \uB2E8\uACC4\uAC00 \uC2B9\uC778\uB418\uC5C8\uB294\uC9C0 \uD655\uC778
    const { data: allFlows } = await admin
      .from("approval_flows")
      .select("status")
      .eq("expense_id", expense.id);

    const allApproved = allFlows?.every((f) => f.status === "approved");

    if (allApproved) {
      await admin
        .from("expenses")
        .update({
          approval_status: "approved",
          approved_by: user.id,
          approved_at: new Date().toISOString(),
        })
        .eq("id", expense.id);

      // budget_items.spent_amount \uC5C5\uB370\uC774\uD2B8 (DB \uD2B8\uB9AC\uAC70 \uBC31\uC5C5)
      if (expense.budget_item_id) {
        const { data: budgetItem } = await admin
          .from("budget_items")
          .select("spent_amount")
          .eq("id", expense.budget_item_id)
          .single();

        if (budgetItem) {
          await admin
            .from("budget_items")
            .update({ spent_amount: (budgetItem.spent_amount || 0) + expense.amount })
            .eq("id", expense.budget_item_id);
        }
      }
    }
  } else {
    await admin
      .from("expenses")
      .update({ approval_status: "rejected", rejection_reason: comment })
      .eq("id", expense.id);
  }

  await writeAuditLog({
    userId: user.id,
    action: "UPDATE",
    tableName: "approval_flows",
    recordId: id,
    newData: { status: action, expense_id: expense.id, comment },
  });

  return NextResponse.json({ ok: true, action });
}
