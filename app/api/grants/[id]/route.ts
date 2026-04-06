import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requestGrantApproval } from "@/lib/utils/webhook";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("grant_matches")
    .select(
      "*, grant_announcements(*), company_profiles(id, product_name, product_line, keywords)",
    )
    .eq("id", id)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }
  return NextResponse.json(data);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const admin = createAdminClient();

  const updates: Record<string, unknown> = {};
  if (body.status !== undefined) updates.status = body.status;
  if (body.notes !== undefined) updates.notes = body.notes;
  if (body.status === "reviewed" || body.status === "applying") {
    updates.reviewed_by = user.id;
    updates.reviewed_at = new Date().toISOString();
  }

  const { data, error } = await admin
    .from("grant_matches")
    .update(updates)
    .eq("id", id)
    .select("*, grant_announcements(*), company_profiles(id, product_name, product_line)")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // "지원 결정" 시 keeper-calendar에 결재 요청 전송
  if (body.status === "applying" && data.grant_announcements) {
    const grant = data.grant_announcements;
    const profile = data.company_profiles;

    // 요청자 사원번호 조회
    const { data: requester } = await admin
      .from("user_profiles")
      .select("employee_code")
      .eq("id", user.id)
      .single();

    // 결재자(admin/executive) 사원번호 조회
    const { data: approvers } = await admin
      .from("user_profiles")
      .select("employee_code")
      .in("role", ["admin", "executive"])
      .eq("is_active", true)
      .not("employee_code", "is", null);

    if (requester?.employee_code && approvers && approvers.length > 0) {
      await requestGrantApproval({
        grantTitle: grant.title,
        grantMatchId: id,
        requesterEmployeeCode: requester.employee_code,
        approverEmployeeCodes: approvers.map((a) => a.employee_code!),
        grantData: {
          project_name: grant.title,
          funding_agency: grant.agency || "",
          managing_org: grant.managing_org,
          deadline: grant.deadline,
          url: grant.url,
          product_line: profile?.product_line || "other",
        },
      });
    }
  }

  return NextResponse.json(data);
}
