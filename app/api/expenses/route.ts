import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { writeAuditLog } from "@/lib/utils/audit";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("project_id");

  const admin = createAdminClient();
  let query = admin
    .from("expenses")
    .select("*, budget_items(id, category, fund_source, project_id), submitted_by_user:user_profiles!expenses_submitted_by_fkey(id, name)")
    .order("expense_date", { ascending: false })
    .limit(200);

  if (projectId) {
    // budget_items \uD14C\uC774\uBE14\uC744 \uD1B5\uD574 \uD544\uD130\uB9C1
    query = query.eq("budget_items.project_id", projectId);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();

  // FormData \uCC98\uB9AC (\uD30C\uC77C \uC5C5\uB85C\uB4DC \uD3EC\uD568)
  const formData = await request.formData();
  const budgetItemId = formData.get("budget_item_id") as string;
  const amount = Number(formData.get("amount"));
  const vendor = formData.get("vendor") as string;
  const expenseDate = formData.get("expense_date") as string;
  const description = formData.get("description") as string;
  const file = formData.get("receipt_file") as File | null;

  if (!budgetItemId) {
    return NextResponse.json({ error: "\uC608\uC0B0 \uBE44\uBAA9\uC744 \uC120\uD0DD\uD574\uC8FC\uC138\uC694." }, { status: 400 });
  }

  // \uC99D\uBE59\uD30C\uC77C SHA-256 \uD574\uC2DC \uACC4\uC0B0 + \uC774\uC911\uC9D1\uD589 \uBC29\uC9C0
  let receiptHash: string | null = null;
  let receiptFileId: string | null = null;

  if (file && file.size > 0) {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    receiptHash = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

    // \uC774\uC911\uC9D1\uD589 \uAC80\uC0AC
    const { data: duplicate } = await admin
      .from("expenses")
      .select("id, description")
      .eq("receipt_hash", receiptHash)
      .maybeSingle();

    if (duplicate) {
      return NextResponse.json(
        {
          error: "\uC774\uC911\uC9D1\uD589 \uC758\uC2EC",
          message: `\uB3D9\uC77C\uD55C \uC99D\uBE59\uD30C\uC77C\uC774 \uC774\uBBF8 \uB4F1\uB85D\uB418\uC5B4 \uC788\uC2B5\uB2C8\uB2E4. (\uAE30\uC874: ${duplicate.description})`,
          duplicate_id: duplicate.id,
        },
        { status: 409 },
      );
    }

    // Supabase Storage \uC5C5\uB85C\uB4DC
    const ext = file.name.split(".").pop() || "pdf";
    const storagePath = `expenses/${Date.now()}_${receiptHash.slice(0, 8)}.${ext}`;
    const { error: uploadError } = await admin.storage
      .from("files")
      .upload(storagePath, buffer, { contentType: file.type });

    if (!uploadError) {
      // files \uD14C\uC774\uBE14\uC5D0 \uBA54\uD0C0\uB370\uC774\uD130 \uC800\uC7A5
      const { data: fileRecord } = await admin
        .from("files")
        .insert({
          file_name: file.name,
          file_path: storagePath,
          file_size: file.size,
          mime_type: file.type,
          sha256_hash: receiptHash,
          uploaded_by: user.id,
          related_table: "expenses",
        })
        .select("id")
        .single();
      if (fileRecord) receiptFileId = fileRecord.id;
    }
  }

  // \uC9D1\uD589 \uB4F1\uB85D
  const { data: expense, error } = await admin
    .from("expenses")
    .insert({
      budget_item_id: budgetItemId,
      expense_date: expenseDate,
      amount,
      vendor,
      description,
      receipt_file_id: receiptFileId,
      receipt_hash: receiptHash,
      approval_status: "pending",
      submitted_by: user.id,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // \uACB0\uC7AC \uC694\uCCAD \uC790\uB3D9 \uC0DD\uC131
  const { data: approvers } = await admin
    .from("user_profiles")
    .select("id, role")
    .in("role", ["pm", "executive", "admin"])
    .eq("is_active", true)
    .neq("id", user.id)
    .order("role");

  if (approvers && approvers.length > 0) {
    const approvalRows = approvers.slice(0, 2).map((a, i) => ({
      expense_id: expense.id,
      step_order: i + 1,
      approver_id: a.id,
      status: "pending" as const,
    }));
    await admin.from("approval_flows").insert(approvalRows);
  }

  await writeAuditLog({
    userId: user.id,
    action: "INSERT",
    tableName: "expenses",
    recordId: expense.id,
    newData: { amount, vendor, description, budget_item_id: budgetItemId },
  });

  return NextResponse.json(expense, { status: 201 });
}
