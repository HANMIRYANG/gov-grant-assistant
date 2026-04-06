import { GoogleGenerativeAI } from "@google/generative-ai";
import type { GrantAnnouncement } from "@/lib/utils/types";

interface LlmMatchResult {
  score: number;       // 0-100
  reasoning: string;
}

export async function evaluateGrantWithLlm(
  grant: GrantAnnouncement,
  companyContext: string,
  matchedKeywords: string[],
): Promise<LlmMatchResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return { score: -1, reasoning: "GEMINI_API_KEY 환경변수가 설정되지 않았습니다." };
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const grantText = [
    `공고명: ${grant.title}`,
    grant.agency ? `주관기관: ${grant.agency}` : "",
    grant.managing_org ? `전문기관: ${grant.managing_org}` : "",
    grant.category ? `분야: ${grant.category}` : "",
    grant.budget_range ? `연구비 규모: ${grant.budget_range}` : "",
    grant.deadline ? `마감일: ${grant.deadline}` : "",
    grant.description ? `공고 요약:\n${grant.description}` : "",
    grant.full_text ? `공고 전문 (발췌):\n${grant.full_text.slice(0, 3000)}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const prompt = `당신은 한국 정부 R&D 과제 공고를 분석하여 기업과의 적합도를 평가하는 전문가입니다.

${companyContext}

## 평가 기준
1. 기술 적합성 (40점): 기업의 핵심 기술/제품과 공고 요구 기술의 일치도
2. 사업 적합성 (25점): 공고의 지원 자격, 기업 규모, 업종 등 조건 충족 여부
3. 전략적 가치 (20점): 기존 파트너/고객사와의 연계성, 사업화 가능성
4. 수행 역량 (15점): 기존 수행 실적, 인력, 인프라 관점에서의 수행 가능성

## 중요 가이드라인
- 공고 요약/전문이 없고 제목만 있는 경우, 제목의 키워드를 기반으로 잠재적 적합성을 평가하세요.
- 소재/부품/장비, 나노, 세라믹, 불연/난연/단열/방열, 이차전지, 화재안전, 열관리 관련 공고는 한미르의 핵심 분야입니다.
- "소부장(소재부품장비)", "R&D", "기술개발", "시제품", "양산" 등의 키워드가 포함된 공고는 적극 검토 대상입니다.
- 정보가 부족하더라도 관련성이 있어 보이면 20~40점 범위로 평가하세요 (0점을 남발하지 마세요).

## 출력 형식
반드시 아래 JSON 형식으로만 응답하세요. 다른 텍스트는 포함하지 마세요.
{"score": 0-100 정수, "reasoning": "2-3문장으로 핵심 적합 근거 또는 부적합 사유"}

---

다음 정부 R&D 과제 공고를 분석하여 한미르 주식회사와의 적합도를 평가해주세요.

${grantText}

${matchedKeywords.length > 0 ? `1차 키워드 매칭 결과: ${matchedKeywords.join(", ")}` : ""}`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();

    // JSON 파싱 (코드블록 감싸진 경우도 처리)
    const jsonMatch = text.match(/\{[\s\S]*?\}/);
    if (!jsonMatch) {
      console.error("[LLM/Gemini] Failed to parse response:", text);
      return { score: 0, reasoning: "LLM 응답 파싱 실패" };
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return {
      score: Math.max(0, Math.min(100, Number(parsed.score) || 0)),
      reasoning: String(parsed.reasoning || ""),
    };
  } catch (e) {
    const errMsg = String(e);
    console.error("[LLM/Gemini] Error:", errMsg);
    if (errMsg.includes("API_KEY") || errMsg.includes("api key")) {
      return { score: -1, reasoning: "GEMINI_API_KEY가 유효하지 않습니다." };
    }
    return { score: 0, reasoning: `LLM 호출 오류: ${errMsg.slice(0, 200)}` };
  }
}
