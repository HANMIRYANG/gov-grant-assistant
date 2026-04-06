import type { CompanyProfile, GrantAnnouncement } from "@/lib/utils/types";

interface KeywordMatchResult {
  profileId: string;
  grantId: string;
  score: number;          // 0-100
  matchedKeywords: string[];
}

// 한미르 사업 영역 공통 키워드 — 모든 프로필에 적용
// 공고에서 자주 사용되는 산업 수준 용어
const COMPANY_COMMON_KEYWORDS = [
  // 산업 분야
  "소재", "부품", "장비", "소부장", "소재부품장비",
  "나노", "세라믹", "코팅", "도료", "페인트",
  // 기술 분야
  "불연", "난연", "단열", "방열", "차열", "내화",
  "이차전지", "배터리", "열폭주", "열관리",
  "에어로겔", "실리콘 음극재", "음극재",
  // 사업 유형
  "화재안전", "방화", "건축안전",
  "전기차", "모빌리티", "EV",
  // R&D 관련
  "기술개발", "양산", "시제품", "실증",
  "뿌리산업", "제조혁신",
];

/**
 * TF-IDF 기반 키워드 매칭
 * 공고 텍스트(title + description + full_text) 내에서
 * 회사 프로필 키워드의 등장 빈도 및 가중치 기반 점수 산출
 */
export function matchKeywords(
  grant: GrantAnnouncement,
  profiles: CompanyProfile[],
): KeywordMatchResult[] {
  const grantText = buildGrantText(grant).toLowerCase();
  if (!grantText) return [];

  const titleLower = grant.title.toLowerCase();

  return profiles.map((profile) => {
    const matched: string[] = [];
    let weightedScore = 0;

    // 1) 프로필 고유 키워드 매칭 (높은 가중치)
    for (const keyword of profile.keywords) {
      const kw = keyword.toLowerCase();
      const count = countOccurrences(grantText, kw);
      if (count > 0) {
        matched.push(keyword);
        const lengthBonus = Math.min(kw.length / 4, 2);
        const titleBonus = titleLower.includes(kw) ? 2 : 1;
        weightedScore += (1 + Math.log(count)) * lengthBonus * titleBonus;
      }
    }

    // 2) 회사 공통 키워드 매칭 (낮은 가중치 — 관련성 신호)
    const commonMatched: string[] = [];
    for (const keyword of COMPANY_COMMON_KEYWORDS) {
      if (profile.keywords.some((k) => k.toLowerCase() === keyword.toLowerCase())) continue;
      const kw = keyword.toLowerCase();
      const count = countOccurrences(grantText, kw);
      if (count > 0) {
        commonMatched.push(keyword);
        const titleBonus = titleLower.includes(kw) ? 1.5 : 0.5;
        weightedScore += titleBonus;
      }
    }
    matched.push(...commonMatched);

    // 기관 매칭 보너스
    if (grant.agency) {
      const agencyMatch = profile.target_agencies.some((a) =>
        grant.agency!.includes(a) || a.includes(grant.agency!),
      );
      if (agencyMatch) weightedScore *= 1.3;
    }

    // 0-100 정규화
    const profileKeywordCount = profile.keywords.length;
    const coverageRatio = matched.length / Math.max(profileKeywordCount, 1);
    const rawScore = coverageRatio * 40 + Math.min(weightedScore, 60);
    const score = Math.round(Math.min(rawScore, 100) * 100) / 100;

    return {
      profileId: profile.id,
      grantId: grant.id,
      score,
      matchedKeywords: matched,
    };
  });
}

function buildGrantText(grant: GrantAnnouncement): string {
  return [grant.title, grant.description, grant.full_text]
    .filter(Boolean)
    .join(" ");
}

function countOccurrences(text: string, keyword: string): number {
  // 짧은 키워드(3자 이하)는 단어 경계 매칭으로 오탐 방지
  // 예: "ESS"가 "process", "business"에 매칭되는 것 방지
  if (keyword.length <= 3) {
    // 한글 키워드는 그대로 매칭 (한글은 부분문자열 문제가 적음)
    if (/[가-힣]/.test(keyword)) {
      return simpleCount(text, keyword);
    }
    // 영문 짧은 키워드: 단어 경계 매칭
    const regex = new RegExp(`\\b${escapeRegex(keyword)}\\b`, "gi");
    return (text.match(regex) || []).length;
  }
  return simpleCount(text, keyword);
}

function simpleCount(text: string, keyword: string): number {
  let count = 0;
  let pos = 0;
  while ((pos = text.indexOf(keyword, pos)) !== -1) {
    count++;
    pos += keyword.length;
  }
  return count;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * 여러 프로필에 대해 가장 높은 매칭 결과만 반환
 * 상위 N건 필터링
 */
export function rankMatches(
  grants: GrantAnnouncement[],
  profiles: CompanyProfile[],
  topN = 20,
): KeywordMatchResult[] {
  const allResults: KeywordMatchResult[] = [];

  for (const grant of grants) {
    const matches = matchKeywords(grant, profiles);
    // 각 공고에 대해 가장 높은 프로필 매칭만 추가
    const best = matches.reduce(
      (a, b) => (a.score > b.score ? a : b),
      matches[0],
    );
    if (best && best.score > 0) {
      allResults.push(best);
    }
  }

  return allResults
    .sort((a, b) => b.score - a.score)
    .slice(0, topN);
}
