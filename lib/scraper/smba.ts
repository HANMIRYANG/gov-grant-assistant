import * as cheerio from "cheerio";
import { type ScrapedGrant, parseKoreanDate, cleanText } from "./utils";

// 중기부 사업공고 (cbIdx=310) — 보도자료(86)가 아님!
const SMBA_LIST_URL = "https://www.mss.go.kr/site/smba/ex/bbs/List.do?cbIdx=310";
const SMBA_VIEW_URL = "https://www.mss.go.kr/site/smba/ex/bbs/View.do";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36";

export async function scrapeSmba(): Promise<ScrapedGrant[]> {
  try {
    const res = await fetch(SMBA_LIST_URL, {
      headers: { "User-Agent": UA },
      signal: AbortSignal.timeout(30000),
    });
    if (!res.ok) throw new Error(`SMBA ${res.status}`);

    const html = await res.text();
    const $ = cheerio.load(html);
    const results: ScrapedGrant[] = [];

    // 구조: <tr onclick="doBbsFView('310','bcIdx','Gbn','parentSeq');" title="공고제목">
    $("tr[onclick*='doBbsFView']").each((_, row) => {
      const $row = $(row);
      const onclick = $row.attr("onclick") || "";
      const title = $row.attr("title") || "";

      if (!title || title.length < 5) return;

      // doBbsFView('310','1066917','16010100','1066917') 파싱
      const match = onclick.match(/doBbsFView\s*\(\s*'(\d+)'\s*,\s*'(\d+)'\s*,\s*'([^']*)'\s*,\s*'(\d+)'\s*\)/);
      if (!match) return;

      const cbIdx = match[1];
      const bcIdx = match[2];
      const parentSeq = match[4];

      // 날짜 추출 — 행 내 텍스트에서 YYYY.MM.DD 찾기
      const rowText = $row.text();
      const datePattern = /(\d{4}\.\d{2}\.\d{2})/g;
      const dates = rowText.match(datePattern) || [];

      const viewUrl = `${SMBA_VIEW_URL}?cbIdx=${cbIdx}&bcIdx=${bcIdx}&parentSeq=${parentSeq}`;

      results.push({
        source: "smba",
        source_id: bcIdx,
        title: cleanText(title),
        agency: "\uC911\uC18C\uBCA4\uCC98\uAE30\uC5C5\uBD80",
        announcement_date: dates.length > 0 ? parseKoreanDate(dates[0]) : undefined,
        url: viewUrl,
        raw_data: {},
      });
    });

    // 상위 10건 상세 페이지에서 description 수집
    const enriched = await Promise.allSettled(
      results.slice(0, 10).map(async (grant) => {
        try {
          const detail = await fetchSmbaDetail(grant.url!);
          return { ...grant, ...detail };
        } catch {
          return grant;
        }
      }),
    );

    return enriched
      .map((r, i) => (r.status === "fulfilled" ? r.value : results[i]))
      .filter(Boolean);
  } catch (e) {
    console.error("[SMBA] Error:", e);
    return [];
  }
}

async function fetchSmbaDetail(url: string): Promise<Partial<ScrapedGrant>> {
  const res = await fetch(url, {
    headers: { "User-Agent": UA },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) return {};

  const html = await res.text();
  const $ = cheerio.load(html);

  // 본문 영역 찾기
  let description = "";

  // 가능한 본문 선택자들
  const selectors = [
    ".view_contents", ".board_view", ".bbs_view_con", ".view_con",
    ".board_view_con", ".view_cont", ".bbs_detail", ".detail_con",
    "#divViewConts", ".con_area", ".view_area",
  ];

  for (const sel of selectors) {
    const text = cleanText($(sel).text());
    if (text.length > description.length) {
      description = text;
    }
  }

  // 폴백: 본문 영역이 없으면 전체에서 추출
  if (description.length < 50) {
    const bodyText = cleanText($("body").text());
    description = bodyText.slice(0, 3000);
  }

  // 신청기간/마감일 추출
  let deadline: string | undefined;
  const bodyText = $("body").text();
  const periodMatch = bodyText.match(/(?:\uC2E0\uCCAD\uAE30\uAC04|\uC811\uC218\uAE30\uAC04|\uBAA8\uC9D1\uAE30\uAC04)[^\n]*?(\d{4}[.\-/]\d{1,2}[.\-/]\d{1,2})\s*[~\-]\s*(\d{4}[.\-/]\d{1,2}[.\-/]\d{1,2})/);
  if (periodMatch) {
    deadline = parseKoreanDate(periodMatch[2]);
  }

  return {
    description: description.slice(0, 3000),
    full_text: cleanText($("body").text()).slice(0, 5000),
    deadline,
  };
}
