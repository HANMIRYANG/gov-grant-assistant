import { type ScrapedGrant, parseKoreanDate, cleanText } from "./utils";

// KEIT 산업기술R&D정보포털 — 지원사업공고 JSON API
const KEIT_API_URL = "https://itech.keit.re.kr/bsnsancm/retrieveSprtBsnsAncmListJson.do";
const KEIT_DETAIL_URL = "https://itech.keit.re.kr/bsnsancm/retrieveSprtBsnsAncmDetail.do";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36";

interface KeitApiItem {
  ancmId: string;
  ancmTl: string;
  ancmDe: string;
  rcveStat: string;
  rcveStatNm: string;
  rcveTpSe: string;
}

interface KeitApiResponse {
  paginationInfo: { totalRecordCount: number };
  list: KeitApiItem[];
}

export async function scrapeMotie(): Promise<ScrapedGrant[]> {
  const results: ScrapedGrant[] = [];

  // 올해 공고만 수집 (작년 공고는 대부분 마감됨)
  const currentYear = new Date().getFullYear();
  const years = [currentYear];

  for (const year of years) {
    try {
      const yearResults = await fetchKeitYear(year);
      results.push(...yearResults);
    } catch (e) {
      console.error(`[KEIT] ${year}년 수집 오류:`, e);
    }
  }

  return results;
}

async function fetchKeitYear(year: number): Promise<ScrapedGrant[]> {
  const res = await fetch(KEIT_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      "User-Agent": UA,
      "X-Requested-With": "XMLHttpRequest",
      "Referer": "https://itech.keit.re.kr/bsnsancm/retrieveSprtBsnsAncmList.do",
    },
    body: `pageIndex=1&bsnsYy=${year}&searchKeyword=&orderBySe=default`,
    signal: AbortSignal.timeout(20000),
  });

  if (!res.ok) throw new Error(`KEIT API ${res.status}`);

  const data: KeitApiResponse = await res.json();
  if (!data.list || data.list.length === 0) return [];

  return data.list.map((item) => ({
    source: "keit",
    source_id: item.ancmId,
    title: item.ancmTl,
    agency: "\uC0B0\uC5C5\uD1B5\uC0C1\uC790\uC6D0\uBD80",
    managing_org: "\uD55C\uAD6D\uC0B0\uC5C5\uAE30\uC220\uD3C9\uAC00\uAD00\uB9AC\uC6D0",
    announcement_date: parseKoreanDate(item.ancmDe),
    url: `${KEIT_DETAIL_URL}?ancmId=${item.ancmId}`,
    raw_data: { rcveStat: item.rcveStatNm, rcveTpSe: item.rcveTpSe },
  }));
}
