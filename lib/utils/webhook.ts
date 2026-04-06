/**
 * keeper-calendar로 Webhook을 전송하는 유틸리티
 */

const KEEPER_WEBHOOK_URL = process.env.KEEPER_WEBHOOK_URL; // 예: https://keeper-calendar.vercel.app/api/webhook
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;

interface WebhookPayload {
  event: string;
  data: Record<string, unknown>;
}

export async function sendToKeeper(payload: WebhookPayload): Promise<boolean> {
  if (!KEEPER_WEBHOOK_URL || !WEBHOOK_SECRET) {
    console.warn("[Webhook] KEEPER_WEBHOOK_URL 또는 WEBHOOK_SECRET이 설정되지 않았습니다.");
    return false;
  }

  try {
    const res = await fetch(KEEPER_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-webhook-secret": WEBHOOK_SECRET,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      console.error(`[Webhook] keeper-calendar 응답 오류: ${res.status}`);
      return false;
    }

    console.log(`[Webhook] keeper-calendar 전송 성공: ${payload.event}`);
    return true;
  } catch (e) {
    console.error("[Webhook] keeper-calendar 전송 실패:", e);
    return false;
  }
}

/**
 * 과제 공고 "지원 결정" 시 keeper-calendar에 결재 요청 생성
 */
export async function requestGrantApproval(params: {
  grantTitle: string;
  grantMatchId: string;
  requesterEmployeeCode: string;
  approverEmployeeCodes: string[];
  grantData: {
    project_name: string;
    funding_agency: string;
    managing_org?: string;
    deadline?: string | null;
    url?: string | null;
    product_line?: string;
    total_budget?: number;
  };
}): Promise<boolean> {
  return sendToKeeper({
    event: "grant.apply_request",
    data: {
      category: "GRANT_APPLICATION",
      title: `[과제 지원] ${params.grantTitle}`,
      content: `정부과제 공고 지원을 요청합니다.\n\n공고명: ${params.grantTitle}\n주관기관: ${params.grantData.funding_agency}\n마감일: ${params.grantData.deadline || "미정"}`,
      requesterEmployeeCode: params.requesterEmployeeCode,
      approverEmployeeCodes: params.approverEmployeeCodes,
      formData: {
        grant_match_id: params.grantMatchId,
        ...params.grantData,
      },
    },
  });
}
