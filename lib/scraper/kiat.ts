import * as cheerio from "cheerio";
import { type ScrapedGrant, parseKoreanDate, cleanText } from "./utils";

// KIAT 사업공고 — board_id=90
const KIAT_AJAX_URL = "https://www.kiat.or.kr/front/board/boardContentsListAjax.do";
const KIAT_VIEW_URL = "https://www.kiat.or.kr/front/board/boardContentsView.do";
const BOARD_ID = "90";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36";

export async function scrapeKiat(): Promise<ScrapedGrant[]> {
  try {
    // AJAX로 사업공고 목록 가져오기
    const results = await fetchKiatList();
    if (results.length > 0) return results;

    // 폴백: 메인 페이지에서 공고 추출
    return await scrapeKiatMain();
  } catch (e) {
    console.error("[KIAT] Error:", e);
    return [];
  }
}

async function fetchKiatList(): Promise<ScrapedGrant[]> {
  const formData = new URLSearchParams({
    board_id: BOARD_ID,
    miv_pageNo: "1",
    miv_pageSize: "20",
    searchkey: "T",
    searchtxt: "",
  });

  const res = await fetch(KIAT_AJAX_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      "User-Agent": UA,
      "Referer": `https://www.kiat.or.kr/front/board/boardContentsListPage.do?board_id=${BOARD_ID}`,
      "X-Requested-With": "XMLHttpRequest",
    },
    body: formData.toString(),
    signal: AbortSignal.timeout(20000),
  });

  if (!res.ok) throw new Error(`KIAT AJAX ${res.status}`);
  const html = await res.text();

  if (html.length < 50) return [];

  const $ = cheerio.load(html);
  const results: ScrapedGrant[] = [];

  // AJAX 응답 HTML에서 공고 항목 추출
  $("tr, li, .list-item, .board-item, [onclick]").each((_, el) => {
    const $el = $(el);
    const text = cleanText($el.text());
    if (text.length < 10) return;

    // 제목 추출
    const link = $el.find("a").first();
    let title = cleanText(link.text());
    if (!title || title.length < 5) {
      // onclick이 있는 tr의 경우
      title = cleanText($el.find("td").eq(1).text() || $el.find(".title, .subject").text());
    }
    if (!title || title.length < 5) return;

    // "지원내역" 같은 비공고 항목 필터링
    if (/\uC9C0\uC6D0\uB0B4\uC5ED|\uD604\uD669|\uACB0\uACFC\uBCF4\uACE0|\uC2E4\uC801/.test(title)) return;

    // contents_id 추출
    const href = link.attr("href") || "";
    const onclick = link.attr("onclick") || $el.attr("onclick") || "";
    const combined = href + onclick;

    const idMatch = combined.match(/contents_id=(\d+)/) ||
                    combined.match(/contentsView\s*\(\s*'?(\d+)/) ||
                    combined.match(/fn_detail\s*\(\s*'?(\d+)/) ||
                    combined.match(/'(\d{4,})'/);

    const contentsId = idMatch?.[1];
    if (!contentsId) return;

    // 날짜 추출
    const datePattern = /(\d{4}[.\-/]\d{1,2}[.\-/]\d{1,2})/g;
    const dates = text.match(datePattern) || [];

    results.push({
      source: "kiat",
      source_id: contentsId,
      title,
      agency: "\uC0B0\uC5C5\uD1B5\uC0C1\uC790\uC6D0\uBD80",
      managing_org: "\uD55C\uAD6D\uC0B0\uC5C5\uAE30\uC220\uC9C4\uD765\uC6D0",
      announcement_date: dates[0] ? parseKoreanDate(dates[0]) : undefined,
      deadline: dates.length > 1 ? parseKoreanDate(dates[dates.length - 1]!) : undefined,
      url: `${KIAT_VIEW_URL}?board_id=${BOARD_ID}&contents_id=${contentsId}`,
      raw_data: {},
    });
  });

  return results.slice(0, 20);
}

async function scrapeKiatMain(): Promise<ScrapedGrant[]> {
  const res = await fetch("https://www.kiat.or.kr", {
    headers: { "User-Agent": UA },
    signal: AbortSignal.timeout(20000),
  });

  if (!res.ok) return [];
  const html = await res.text();
  const $ = cheerio.load(html);
  const results: ScrapedGrant[] = [];

  // 메인 페이지 "KIAT 공고" 섹션에서 사업공고 링크 추출
  $("a[href*='board_id=90'], a[href*='boardContents']").each((_, el) => {
    const href = $(el).attr("href") || "";
    const title = cleanText($(el).text());

    if (title.length > 10 && !title.includes("\uB354\uBCF4\uAE30") && !title.includes("\uC9C0\uC6D0\uB0B4\uC5ED")) {
      const idMatch = href.match(/contents_id=(\d+)/);
      if (idMatch) {
        results.push({
          source: "kiat",
          source_id: idMatch[1],
          title,
          agency: "\uC0B0\uC5C5\uD1B5\uC0C1\uC790\uC6D0\uBD80",
          managing_org: "\uD55C\uAD6D\uC0B0\uC5C5\uAE30\uC220\uC9C4\uD765\uC6D0",
          url: href.startsWith("http") ? href : `https://www.kiat.or.kr${href}`,
          raw_data: {},
        });
      }
    }
  });

  return results.slice(0, 10);
}
