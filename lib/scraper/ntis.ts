import * as cheerio from "cheerio";
import { type ScrapedGrant, parseKoreanDate, cleanText } from "./utils";

const NTIS_LIST_URL = "https://www.ntis.go.kr/rndgate/eg/un/ra/list.do";
const NTIS_VIEW_URL = "https://www.ntis.go.kr/rndgate/eg/un/ra/view.do";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36";

export async function scrapeNtis(): Promise<ScrapedGrant[]> {
  const results: ScrapedGrant[] = [];

  // NTIS Open API 우선
  if (process.env.NTIS_API_KEY) {
    try {
      const apiResults = await scrapeNtisApi();
      if (apiResults.length > 0) return apiResults;
    } catch (e) {
      console.error("[NTIS API] Error:", e);
    }
  }

  // 웹 스크래핑 폴백
  try {
    const webResults = await scrapeNtisWeb();
    results.push(...webResults);
  } catch (e) {
    console.error("[NTIS Web] Error:", e);
  }

  return results;
}

async function scrapeNtisApi(): Promise<ScrapedGrant[]> {
  const apiKey = process.env.NTIS_API_KEY!;
  const url = `https://www.ntis.go.kr/rndopen/openApi/bsnsReqAnnoList?pageNo=1&numOfRows=30&ServiceKey=${encodeURIComponent(apiKey)}`;

  const res = await fetch(url, {
    headers: { "User-Agent": UA },
    signal: AbortSignal.timeout(30000),
  });
  if (!res.ok) throw new Error(`NTIS API ${res.status}`);

  const text = await res.text();
  const $ = cheerio.load(text, { xml: true });
  const results: ScrapedGrant[] = [];

  $("item").each((_, el) => {
    const $el = $(el);
    const sourceId = $el.find("bsnsReqAnnoId").text().trim() || $el.find("annoId").text().trim();
    const title = $el.find("bsnsReqAnnoNm").text().trim() || $el.find("annoNm").text().trim();
    if (!sourceId || !title) return;

    results.push({
      source: "ntis",
      source_id: sourceId,
      title,
      agency: $el.find("pjtMngtInstNm").text().trim() || undefined,
      managing_org: $el.find("dmnMngtInstNm").text().trim() || undefined,
      description: cleanText($el.find("bsnsReqAnnoCn").text()),
      budget_range: $el.find("totRschExpd").text().trim() || undefined,
      announcement_date: parseKoreanDate($el.find("rcptBgnDt").text()),
      deadline: parseKoreanDate($el.find("rcptEndDt").text()),
      url: $el.find("dtlPgUrl").text().trim() || undefined,
      category: $el.find("rschAreaNm").text().trim() || undefined,
      raw_data: {},
    });
  });

  return results;
}

async function scrapeNtisWeb(): Promise<ScrapedGrant[]> {
  // NTIS 목록 페이지: /rndgate/eg/un/ra/list.do
  const res = await fetch(NTIS_LIST_URL, {
    headers: { "User-Agent": UA },
    signal: AbortSignal.timeout(30000),
  });

  if (!res.ok) throw new Error(`NTIS Web ${res.status}`);
  const html = await res.text();
  const $ = cheerio.load(html);
  const results: ScrapedGrant[] = [];

  // 테이블 행 파싱: 순번 | 현황 | 형태 | 부처명 | 공고명 | 접수일 | 마감일
  $("table tbody tr, .list_table tbody tr, .board_list tbody tr").each((_, row) => {
    const cols = $(row).find("td");
    if (cols.length < 5) return;

    // 공고명이 있는 열에서 링크 추출
    let titleHref = "";
    let title = "";
    let agency = "";
    let announceDate = "";
    let deadline = "";

    // 공고명 링크 찾기 — view.do 링크가 있는 a 태그
    $(row).find("a").each((_, a) => {
      const href = $(a).attr("href") || $(a).attr("onclick") || "";
      if (href.includes("view.do") || href.includes("roRndUid") || href.includes("View")) {
        titleHref = href;
        title = cleanText($(a).text());
      }
    });

    if (!title) {
      // 링크가 없으면 가장 긴 텍스트를 제목으로
      cols.each((ci, col) => {
        const text = cleanText($(col).text());
        if (text.length > title.length) {
          title = text;
        }
      });
    }

    if (!title || title.length < 5) return;

    // 부처명: 보통 3-4번째 열
    for (let i = 0; i < cols.length; i++) {
      const text = $(cols[i]).text().trim();
      if (text.includes("부") || text.includes("청") || text.includes("원") || text.includes("처")) {
        if (text.length > 2 && text.length < 30 && !text.includes("20")) {
          agency = text;
          break;
        }
      }
    }

    // 날짜 추출 — YYYY.MM.DD 패턴
    const datePattern = /(\d{4}[.\-/]\d{1,2}[.\-/]\d{1,2})/g;
    const rowText = $(row).text();
    const dates = rowText.match(datePattern) || [];
    if (dates.length >= 2) {
      announceDate = dates[dates.length - 2];
      deadline = dates[dates.length - 1];
    } else if (dates.length === 1) {
      deadline = dates[0];
    }

    // 상세 링크에서 ID 추출
    const uidMatch = titleHref.match(/roRndUid=(\d+)/);
    const sourceId = uidMatch?.[1] || `ntis_web_${Date.now()}_${results.length}`;
    const detailUrl = uidMatch
      ? `${NTIS_VIEW_URL}?roRndUid=${uidMatch[1]}`
      : undefined;

    results.push({
      source: "ntis",
      source_id: sourceId,
      title,
      agency: agency || undefined,
      announcement_date: parseKoreanDate(announceDate),
      deadline: parseKoreanDate(deadline),
      url: detailUrl,
      raw_data: {},
    });
  });

  // 상위 15건에 대해 상세 페이지에서 description 수집
  const withDescription = await Promise.allSettled(
    results.slice(0, 15).map(async (grant) => {
      if (!grant.url) return grant;
      try {
        const desc = await fetchNtisDetail(grant.url);
        return { ...grant, ...desc };
      } catch {
        return grant;
      }
    }),
  );

  return withDescription.map((r) =>
    r.status === "fulfilled" ? r.value : results[0],
  ).filter(Boolean);
}

async function fetchNtisDetail(url: string): Promise<Partial<ScrapedGrant>> {
  const res = await fetch(url, {
    headers: { "User-Agent": UA },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) return {};

  const html = await res.text();
  const $ = cheerio.load(html);

  // 페이지 전체 텍스트에서 주요 정보 추출
  const bodyText = cleanText($("body").text());

  // 공고 내용 영역
  let description = "";
  $(".view_cont, .cont_area, .detail_content, #contents, .bbs_view").each((_, el) => {
    const text = cleanText($(el).text());
    if (text.length > description.length) {
      description = text;
    }
  });

  if (!description) {
    // 본문 텍스트에서 핵심 부분 추출
    description = bodyText.slice(0, 2000);
  }

  // 예산 규모 추출
  let budgetRange: string | undefined;
  const budgetMatch = bodyText.match(/(?:연구비|총사업비|지원규모|예산)[^\d]*?([\d,]+)\s*(?:천원|백만원|억원)/);
  if (budgetMatch) {
    budgetRange = budgetMatch[0];
  }

  return {
    description: description.slice(0, 3000),
    full_text: bodyText.slice(0, 5000),
    budget_range: budgetRange,
  };
}
