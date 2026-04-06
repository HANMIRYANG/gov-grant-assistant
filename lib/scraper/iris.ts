import { type ScrapedGrant, parseKoreanDate, cleanText } from "./utils";

/**
 * IRIS (범부처통합연구지원시스템) 사업공고 스크래퍼
 *
 * IRIS는 내부 AJAX API를 제공하며, JSON 응답을 반환합니다.
 *
 * API Endpoint:
 *   POST https://www.iris.go.kr/contents/retrieveBsnsAncmBtinSituList.do
 *
 * Request body (form-urlencoded):
 *   - ancmPrg: "ancmPre" (접수예정) | "ancmIng" (접수중) | "ancmEnd" (마감)
 *   - pageIndex: 페이지 번호 (1-based)
 *   - bsnsTl: 공고명 검색어
 *   - blngGovdSeArr: 소관부처 코드 ("|" 구분, 예: "AR4001|AR4002")
 *   - sorgnIdArr: 전문기관 코드 ("|" 구분, 예: "10000|10001")
 *   - techFildArr: 기술분야 코드 ("|" 구분, 예: "EB|EC")
 *   - ancmSttArr: 공고상태 ("|" 구분)
 *   - pbofrTpArr: 공모유형 ("|" 구분)
 *   - qualCndtArr: 자격조건 ("|" 구분)
 *   - shBsnsYy: 사업연도
 *
 * JSON Response:
 *   {
 *     paginationInfo: { currentPageNo, recordCountPerPage (10), totalRecordCount, totalPageCount, ... },
 *     listBsnsAncmBtinSitu: [{
 *       ancmId, ancmTl, ancmNo, ancmDe,
 *       blngGovdSeNm, blngGovdSe, budJuriGovdSe,
 *       sorgnId, sorgnNm,
 *       rcveStrDe, rcveEndDe, dDay,
 *       rcveStt ("예정"|"진행중"|"완료"),
 *       rcveSttSeNmLst, pbofrTpSeNmLst, pbofrTpSeLst,
 *     }, ...]
 *   }
 *
 * Detail page (HTML):
 *   POST https://www.iris.go.kr/contents/retrieveBsnsAncmView.do
 *   body: ancmId=XXXXXX&ancmPrg=ancmIng
 */

const IRIS_API_URL =
  "https://www.iris.go.kr/contents/retrieveBsnsAncmBtinSituList.do";
const IRIS_DETAIL_URL =
  "https://www.iris.go.kr/contents/retrieveBsnsAncmView.do";
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36";

// 한미르 관련 부처 코드 (산업통상부, 중소벤처기업부, 과기정통부 등)
const RELEVANT_MINISTRIES = [
  "AR4001", // 과학기술정보통신부
  "AR4002", // 산업통상부
  "AR4003", // 중소벤처기업부
  "AR4004", // 국토교통부
  "AR4018", // 기후에너지환경부
];

interface IrisAnnouncement {
  ancmId: string;
  ancmTl: string;
  ancmNo: string;
  ancmDe: string;
  blngGovdSeNm: string;
  blngGovdSe: string;
  budJuriGovdSe: string;
  sorgnId: string;
  sorgnNm: string;
  rcveStrDe: string;
  rcveEndDe: string;
  dDay: number;
  rcveStt: string;
  rcveSttSeNmLst: string;
  pbofrTpSeNmLst: string;
  pbofrTpSeLst: string;
}

interface IrisPaginationInfo {
  currentPageNo: number;
  recordCountPerPage: number;
  totalRecordCount: number;
  totalPageCount: number;
  firstPageNoOnPageList: number;
  lastPageNoOnPageList: number;
}

interface IrisListResponse {
  paginationInfo: IrisPaginationInfo;
  listBsnsAncmBtinSitu: IrisAnnouncement[];
}

/**
 * IRIS 사업공고 스크래핑 (접수중 + 접수예정)
 */
export async function scrapeIris(): Promise<ScrapedGrant[]> {
  const results: ScrapedGrant[] = [];

  // 접수중과 접수예정 모두 수집
  const tabs: Array<{ prg: string; label: string }> = [
    { prg: "ancmIng", label: "접수중" },
    { prg: "ancmPre", label: "접수예정" },
  ];

  for (const tab of tabs) {
    try {
      const tabResults = await fetchIrisTab(tab.prg);
      console.log(`[IRIS] ${tab.label}: ${tabResults.length}건`);
      results.push(...tabResults);
    } catch (e) {
      console.error(`[IRIS] ${tab.label} 스크래핑 실패:`, e);
    }
  }

  return results;
}

/**
 * 특정 탭(접수상태)의 모든 페이지 수집
 */
async function fetchIrisTab(ancmPrg: string): Promise<ScrapedGrant[]> {
  const results: ScrapedGrant[] = [];

  // 첫 페이지 가져오기 (총 페이지 수 확인)
  const firstPage = await fetchIrisPage(ancmPrg, 1);
  if (!firstPage) return results;

  results.push(...firstPage.grants);

  const totalPages = firstPage.totalPages;
  const maxPages = Math.min(totalPages, 10); // 최대 10페이지(100건)

  // 나머지 페이지 순차 수집 (서버 부하 방지)
  for (let page = 2; page <= maxPages; page++) {
    try {
      const pageData = await fetchIrisPage(ancmPrg, page);
      if (pageData) {
        results.push(...pageData.grants);
      }
    } catch (e) {
      console.error(`[IRIS] Page ${page} error:`, e);
    }
  }

  return results;
}

/**
 * 단일 페이지 AJAX 요청
 */
async function fetchIrisPage(
  ancmPrg: string,
  pageIndex: number,
): Promise<{ grants: ScrapedGrant[]; totalPages: number } | null> {
  const formData = new URLSearchParams({
    ancmPrg,
    pageIndex: String(pageIndex),
    bsnsTl: "",
    sorgnIdArr: "",
    ancmSttArr: "",
    pbofrTpArr: "",
    qualCndtArr: "",
    blngGovdSeArr: "",
    techFildArr: "",
    shBsnsYy: "",
  });

  const res = await fetch(IRIS_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": UA,
      "X-Requested-With": "XMLHttpRequest",
      Accept: "application/json, text/javascript, */*; q=0.01",
      Referer:
        "https://www.iris.go.kr/contents/retrieveBsnsAncmBtinSituListView.do",
    },
    body: formData.toString(),
    signal: AbortSignal.timeout(30000),
  });

  if (!res.ok) {
    console.error(`[IRIS] HTTP ${res.status} for page ${pageIndex}`);
    return null;
  }

  const data = (await res.json()) as IrisListResponse;

  if (!data.listBsnsAncmBtinSitu || data.listBsnsAncmBtinSitu.length === 0) {
    return { grants: [], totalPages: 0 };
  }

  const grants: ScrapedGrant[] = data.listBsnsAncmBtinSitu.map((item) =>
    convertToScrapedGrant(item),
  );

  return {
    grants,
    totalPages: data.paginationInfo.totalPageCount,
  };
}

/**
 * IRIS 공고 데이터 -> ScrapedGrant 변환
 */
function convertToScrapedGrant(item: IrisAnnouncement): ScrapedGrant {
  // 접수 마감일 파싱 (형식: "2026.04.30")
  const deadline = parseKoreanDate(item.rcveEndDe);
  const announcementDate = parseKoreanDate(item.ancmDe);

  // 상세 페이지 URL 구성 (참고용, 실제로는 POST 요청 필요)
  const detailUrl = `https://www.iris.go.kr/contents/retrieveBsnsAncmBtinSituListView.do#${item.ancmId}`;

  return {
    source: "iris",
    source_id: item.ancmId,
    title: item.ancmTl,
    agency: item.blngGovdSeNm,
    managing_org: item.sorgnNm,
    description: buildDescription(item),
    announcement_date: announcementDate,
    deadline,
    url: detailUrl,
    category: item.pbofrTpSeNmLst, // 자유공모, 지정공모, 품목지정공모, 분야공모 등
    raw_data: {
      ancmId: item.ancmId,
      ancmNo: item.ancmNo,
      blngGovdSe: item.blngGovdSe,
      budJuriGovdSe: item.budJuriGovdSe,
      sorgnId: item.sorgnId,
      rcveStrDe: item.rcveStrDe,
      rcveEndDe: item.rcveEndDe,
      dDay: item.dDay,
      rcveStt: item.rcveStt,
      rcveSttSeNmLst: item.rcveSttSeNmLst,
      pbofrTpSeLst: item.pbofrTpSeLst,
    },
  };
}

/**
 * 공고 설명 문자열 생성
 */
function buildDescription(item: IrisAnnouncement): string {
  const parts: string[] = [];

  parts.push(`[${item.blngGovdSeNm}] ${item.ancmTl}`);

  if (item.ancmNo) {
    parts.push(`공고번호: ${item.ancmNo}`);
  }

  parts.push(`전문기관: ${item.sorgnNm}`);
  parts.push(`공모유형: ${item.pbofrTpSeNmLst}`);
  parts.push(`접수기간: ${item.rcveStrDe} ~ ${item.rcveEndDe}`);
  parts.push(`상태: ${item.rcveSttSeNmLst}`);

  if (item.dDay > 0) {
    parts.push(`D-${item.dDay}`);
  }

  return parts.join(" | ");
}

/**
 * IRIS 공고 상세 페이지 HTML 가져오기 (선택적 사용)
 *
 * 상세 페이지는 HTML 응답이며, 다음 정보를 포함:
 * - 공고문 전문 (HTML)
 * - 사업담당자 연락처
 * - 첨부파일 목록
 * - 접수 개시 여부
 *
 * 참고: 상세 페이지는 POST 요청으로만 접근 가능
 */
export async function fetchIrisDetail(
  ancmId: string,
  ancmPrg: string = "ancmIng",
): Promise<string | null> {
  const formData = new URLSearchParams({
    ancmId,
    ancmPrg,
  });

  const res = await fetch(IRIS_DETAIL_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": UA,
      Referer:
        "https://www.iris.go.kr/contents/retrieveBsnsAncmBtinSituListView.do",
    },
    body: formData.toString(),
    signal: AbortSignal.timeout(30000),
  });

  if (!res.ok) return null;

  const html = await res.text();

  // 공고문 본문 추출 (se-contents div)
  const contentMatch = html.match(
    /<div class="se-contents"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/,
  );

  if (contentMatch) {
    return cleanText(contentMatch[1]);
  }

  return null;
}
