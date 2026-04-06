import { createClient } from "@/lib/supabase/server";

export async function writeAuditLog(params: {
  userId: string | null;
  action: "INSERT" | "UPDATE" | "DELETE";
  tableName: string;
  recordId: string | null;
  oldData?: Record<string, unknown> | null;
  newData?: Record<string, unknown> | null;
  ipAddress?: string | null;
}) {
  try {
    const supabase = await createClient();
    await supabase.from("audit_logs").insert({
      user_id: params.userId,
      action: params.action,
      table_name: params.tableName,
      record_id: params.recordId,
      old_data: params.oldData ?? null,
      new_data: params.newData ?? null,
      ip_address: params.ipAddress ?? null,
    });
  } catch (error) {
    console.error("Audit log write error:", error);
  }
}
