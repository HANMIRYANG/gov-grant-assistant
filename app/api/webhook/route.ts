import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Webhook 수신 API
 * keeper-calendar에서 결재 승인, 과제 상태 변경 등의 이벤트를 수신합니다.
 *
 * 이벤트 유형:
 * - approval.approved: 결재 승인 완료 (과제 신청 결재 등)
 * - approval.rejected: 결재 반려
 * - project.created: keeper-calendar에서 프로젝트 생성됨
 */
export async function POST(request: Request) {
  // Webhook 시크릿 검증
  const authHeader = request.headers.get("x-webhook-secret");
  if (authHeader !== process.env.WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { event, data } = body;

  if (!event || !data) {
    return NextResponse.json({ error: "Missing event or data" }, { status: 400 });
  }

  const supabase = createAdminClient();

  try {
    switch (event) {
      // 결재 승인 → 과제 자동 생성
      case "approval.approved": {
        if (data.category !== "GRANT_APPLICATION") break;

        const grantData = data.formData;
        if (!grantData) break;

        // grant_match 상태 업데이트
        if (grantData.grant_match_id) {
          await supabase
            .from("grant_matches")
            .update({ status: "applying" })
            .eq("id", grantData.grant_match_id);
        }

        // 과제 자동 생성
        const { data: project, error } = await supabase
          .from("projects")
          .insert({
            project_name: grantData.project_name,
            project_code: grantData.project_code || null,
            funding_agency: grantData.funding_agency || "",
            managing_org: grantData.managing_org || null,
            product_line: grantData.product_line || "other",
            status: "preparing",
            description: grantData.description || null,
            start_date: grantData.start_date || new Date().toISOString().split("T")[0],
            end_date: grantData.end_date || new Date().toISOString().split("T")[0],
            total_budget: grantData.total_budget || 0,
            govt_fund: grantData.govt_fund || 0,
            private_fund: grantData.private_fund || 0,
            grant_match_id: grantData.grant_match_id || null,
            metadata: {
              keeper_approval_id: data.approvalId,
              keeper_project_id: data.keeperProjectId,
              auto_created: true,
            },
          })
          .select()
          .single();

        if (error) {
          console.error("[Webhook] Project creation failed:", error);
          return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // grant_match 상태를 won으로 업데이트
        if (grantData.grant_match_id) {
          await supabase
            .from("grant_matches")
            .update({ status: "won" })
            .eq("id", grantData.grant_match_id);
        }

        console.log(`[Webhook] Project auto-created: ${project.id}`);
        return NextResponse.json({
          ok: true,
          event,
          projectId: project.id,
        });
      }

      // 결재 반려 → grant_match 상태 복원
      case "approval.rejected": {
        if (data.category !== "GRANT_APPLICATION") break;

        const grantMatchId = data.formData?.grant_match_id;
        if (grantMatchId) {
          await supabase
            .from("grant_matches")
            .update({ status: "reviewed" })
            .eq("id", grantMatchId);
        }

        return NextResponse.json({ ok: true, event });
      }

      default:
        break;
    }

    return NextResponse.json({ ok: true, event });
  } catch (e) {
    console.error("[Webhook] Error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
