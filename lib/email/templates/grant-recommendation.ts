import { format } from "date-fns";
import { ko } from "date-fns/locale";

export interface GrantEmailData {
  grantTitle: string;
  agency: string;
  score: number;
  reasoning: string;
  deadline: string | null;
  url: string | null;
  matchedKeywords: string[];
  productName: string;
}

export function buildGrantRecommendationEmail(
  recommended: GrantEmailData[],
  potential: GrantEmailData[] = [],
): {
  subject: string;
  html: string;
} {
  const today = format(new Date(), "yyyy년 M월 d일", { locale: ko });
  const totalCount = recommended.length + potential.length;
  const subject = `[한미르 과제관리] 신규 추천 공고 ${totalCount}건 (${today})`;

  const recommendedRows = recommended
    .sort((a, b) => b.score - a.score)
    .map((g) => buildGrantRow(g))
    .join("");

  const potentialRows = potential
    .sort((a, b) => b.score - a.score)
    .map((g) => buildGrantRow(g))
    .join("");

  const recommendedSection = recommended.length > 0
    ? `
        <tr>
          <td colspan="5" style="padding:16px 12px 8px;background:#f0fdf4;border-bottom:2px solid #16a34a;">
            <strong style="color:#16a34a;font-size:15px;">🎯 추천 공고 (${recommended.length}건)</strong>
            <span style="color:#6b7280;font-size:12px;margin-left:8px;">AI 정밀 분석을 통해 높은 적합도가 확인된 공고</span>
          </td>
        </tr>
        ${recommendedRows}`
    : "";

  const potentialSection = potential.length > 0
    ? `
        <tr>
          <td colspan="5" style="padding:16px 12px 8px;background:#eff6ff;border-bottom:2px solid #3b82f6;">
            <strong style="color:#3b82f6;font-size:15px;">📋 관심 공고 (${potential.length}건)</strong>
            <span style="color:#6b7280;font-size:12px;margin-left:8px;">키워드 매칭으로 관련 가능성이 있는 공고</span>
          </td>
        </tr>
        ${potentialRows}`
    : "";

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f9fafb;">
  <div style="max-width:800px;margin:0 auto;padding:20px;">
    <div style="background:white;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
      <div style="background:#1e293b;color:white;padding:20px 24px;">
        <h1 style="margin:0;font-size:18px;">한미르 과제관리 시스템</h1>
        <p style="margin:4px 0 0;font-size:14px;opacity:0.8;">신규 추천 공고 알림</p>
      </div>
      <div style="padding:24px;">
        <p style="margin:0 0 16px;color:#374151;">
          안녕하세요, 한미르 기술 프로필과 매칭된 <strong>${totalCount}건</strong>의 신규 정부과제 공고가 있습니다.
        </p>
        ${recommended.length > 0 ? `<p style="margin:0 0 8px;color:#374151;font-size:13px;">
          🎯 <strong>추천 공고 ${recommended.length}건</strong> (AI 정밀 분석 통과)${potential.length > 0 ? ` | 📋 <strong>관심 공고 ${potential.length}건</strong> (키워드 매칭)` : ""}
        </p>` : ""}
        <table style="width:100%;border-collapse:collapse;font-size:14px;">
          <thead>
            <tr style="background:#f8fafc;">
              <th style="padding:10px 12px;text-align:left;border-bottom:2px solid #e5e7eb;">공고명</th>
              <th style="padding:10px 12px;text-align:center;border-bottom:2px solid #e5e7eb;width:70px;">점수</th>
              <th style="padding:10px 12px;text-align:left;border-bottom:2px solid #e5e7eb;width:120px;">매칭 제품</th>
              <th style="padding:10px 12px;text-align:left;border-bottom:2px solid #e5e7eb;">매칭 근거</th>
              <th style="padding:10px 12px;text-align:center;border-bottom:2px solid #e5e7eb;width:80px;">원문</th>
            </tr>
          </thead>
          <tbody>
            ${recommendedSection}
            ${potentialSection}
          </tbody>
        </table>
        <p style="margin:20px 0 0;color:#6b7280;font-size:13px;">
          * 이 메일은 한미르 과제관리 시스템에서 자동 발송되었습니다.
        </p>
      </div>
    </div>
  </div>
</body>
</html>`;

  return { subject, html };
}

function buildGrantRow(g: GrantEmailData): string {
  const deadlineText = g.deadline
    ? format(new Date(g.deadline), "yyyy.MM.dd")
    : "미정";
  const scoreColor =
    g.score >= 70 ? "#16a34a" : g.score >= 40 ? "#ca8a04" : "#6b7280";
  const urlLink = g.url
    ? `<a href="${g.url}" style="color:#2563eb;text-decoration:underline;">원문 보기</a>`
    : "-";

  return `
      <tr>
        <td style="padding:12px;border-bottom:1px solid #e5e7eb;">
          <strong>${g.grantTitle}</strong><br/>
          <span style="color:#6b7280;font-size:13px;">${g.agency} | 마감: ${deadlineText}</span>
        </td>
        <td style="padding:12px;border-bottom:1px solid #e5e7eb;text-align:center;">
          <span style="display:inline-block;padding:4px 12px;border-radius:20px;background:${scoreColor};color:white;font-weight:bold;font-size:14px;">
            ${g.score}점
          </span>
        </td>
        <td style="padding:12px;border-bottom:1px solid #e5e7eb;font-size:13px;">
          ${g.productName}
        </td>
        <td style="padding:12px;border-bottom:1px solid #e5e7eb;font-size:13px;">
          ${g.reasoning}
        </td>
        <td style="padding:12px;border-bottom:1px solid #e5e7eb;text-align:center;">
          ${urlLink}
        </td>
      </tr>`;
}
