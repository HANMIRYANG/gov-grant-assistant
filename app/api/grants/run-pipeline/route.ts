import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { runAllScrapers } from "@/lib/scraper";
import { loadActiveProfiles, buildCompanyContext } from "@/lib/matcher/company-profile";
import { rankMatches } from "@/lib/matcher/keyword";
import { evaluateGrantWithLlm } from "@/lib/matcher/llm";
import { sendEmail } from "@/lib/email/sender";
import { buildGrantRecommendationEmail } from "@/lib/email/templates/grant-recommendation";
import type { GrantAnnouncement } from "@/lib/utils/types";

export const maxDuration = 300;

export async function POST(request: Request) {
  // 인증 확인
  const supabaseAuth = await createClient();
  const { data: { user } } = await supabaseAuth.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const skipEmail = body.skipEmail ?? true; // 수동 실행 시 기본적으로 이메일 스킵
  const skipLlm = body.skipLlm ?? false;
  const reprocessAll = body.reprocessAll ?? false; // 전체 재평가

  const supabase = createAdminClient();
  const log: string[] = [];

  try {
    // 0. 전체 재평가 모드: 기존 공고 리셋
    if (reprocessAll) {
      const { data: resetData } = await supabase
        .from("grant_announcements")
        .update({ is_processed: false })
        .eq("is_processed", true)
        .select("id");
      log.push(`[0] 전체 재평가 모드: ${resetData?.length ?? 0}건 리셋`);

      // 기존 매칭 결과 삭제 (재평가이므로)
      await supabase.from("grant_matches").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      log.push("  기존 매칭 결과 초기화 완료");
    }

    // 1. 스크래핑
    log.push("[1/4] 공고 수집 시작...");
    const scrapeResult = await runAllScrapers();
    for (const d of scrapeResult.details) {
      log.push(`  ${d}`);
    }
    log.push(`수집 완료: ${scrapeResult.total}건 발견, ${scrapeResult.inserted}건 신규 저장`);
    if (scrapeResult.errors.length > 0) {
      log.push(`수집 오류: ${scrapeResult.errors.join("; ")}`);
    }

    // 2. 미처리 공고 조회 (마감일 지나지 않은 것만)
    const today = new Date().toISOString().slice(0, 10);
    const { data: unprocessed } = await supabase
      .from("grant_announcements")
      .select("*")
      .eq("is_processed", false)
      .or(`deadline.is.null,deadline.gte.${today}`)
      .order("created_at", { ascending: false })
      .limit(100);

    if (!unprocessed || unprocessed.length === 0) {
      log.push("[2/4] 미처리 공고 없음. 완료.");
      return NextResponse.json({ ok: true, log, matchCount: 0 });
    }

    log.push(`[2/4] 미처리 공고 ${unprocessed.length}건 매칭 시작`);
    // 디버그: 공고 제목 표시
    for (const g of unprocessed) {
      log.push(`  📄 ${g.title.slice(0, 60)}${g.title.length > 60 ? "..." : ""}`);
    }

    // 3. 키워드 매칭
    const profiles = await loadActiveProfiles();
    if (profiles.length === 0) {
      log.push("활성 제품 프로필이 없습니다. 설정 > 매칭 키워드에서 추가해주세요.");
      return NextResponse.json({ ok: true, log, matchCount: 0 });
    }
    log.push(`  프로필 ${profiles.length}개 로드됨: ${profiles.map((p) => p.product_name).join(", ")}`);

    const grants = unprocessed as GrantAnnouncement[];
    // 상위 20건은 LLM 대상, 나머지는 관심 공고
    const topMatches = rankMatches(grants, profiles, 20);
    const allKeywordMatches = rankMatches(grants, profiles, 100);
    const topGrantIds = new Set(topMatches.map((m) => m.grantId));
    const potentialMatches = allKeywordMatches.filter(
      (m) => !topGrantIds.has(m.grantId) && m.score >= 5,
    );
    log.push(`[3/4] 키워드 매칭 완료: 상위 ${topMatches.length}건 + 관심 ${potentialMatches.length}건`);
    if (topMatches.length === 0) {
      log.push("  ⚠ 키워드 매칭 0건 — 공고 텍스트와 프로필 키워드 간 겹치는 단어가 없습니다.");
      log.push(`  공고 예시: "${grants[0]?.title}"`);
      log.push(`  키워드 예시: ${profiles[0]?.keywords.slice(0, 5).join(", ")}`);
    }

    // 4. LLM 정밀 매칭
    let matchCount = 0;

    if (skipLlm) {
      log.push("[4/4] LLM 매칭 건너뜀 (skipLlm=true)");
      // 키워드 매칭 결과만 저장 (상위 + 관심)
      for (const match of [...topMatches, ...potentialMatches]) {
        await supabase.from("grant_matches").upsert(
          {
            grant_id: match.grantId,
            profile_id: match.profileId,
            keyword_score: match.score,
            llm_score: null,
            final_score: match.score,
            llm_reasoning: null,
            matched_keywords: match.matchedKeywords,
            status: "new",
          },
          { onConflict: "grant_id,profile_id" },
        );
        matchCount++;
      }
    } else {
      log.push("[4/4] LLM 정밀 매칭 시작...");
      const companyContext = buildCompanyContext(profiles);
      const recommendedEmail: Array<{
        grantTitle: string;
        agency: string;
        score: number;
        reasoning: string;
        deadline: string | null;
        url: string | null;
        matchedKeywords: string[];
        productName: string;
      }> = [];

      for (let i = 0; i < topMatches.length; i++) {
        const match = topMatches[i];
        const grant = grants.find((g) => g.id === match.grantId);
        const profile = profiles.find((p) => p.id === match.profileId);
        if (!grant || !profile) continue;

        log.push(`  LLM 분석 중 (${i + 1}/${topMatches.length}): ${grant.title.slice(0, 40)}...`);
        log.push(`    키워드점수=${match.score}, 매칭키워드=[${match.matchedKeywords.join(",")}], description=${grant.description ? grant.description.length + "자" : "없음"}`);

        const llmResult = await evaluateGrantWithLlm(
          grant,
          companyContext,
          match.matchedKeywords,
        );

        const llmFailed = llmResult.score < 0;
        const finalScore = llmFailed
          ? Math.round(match.score)
          : Math.round(match.score * 0.3 + llmResult.score * 0.7);
        log.push(`    → LLM점수=${llmFailed ? "실패(크레딧)" : llmResult.score}, 최종점수=${finalScore}, 근거: ${llmResult.reasoning.slice(0, 150)}`);

        await supabase.from("grant_matches").upsert(
          {
            grant_id: match.grantId,
            profile_id: match.profileId,
            keyword_score: match.score,
            llm_score: llmResult.score,
            final_score: finalScore,
            llm_reasoning: llmResult.reasoning,
            matched_keywords: match.matchedKeywords,
            status: "new",
          },
          { onConflict: "grant_id,profile_id" },
        );

        matchCount++;

        if (finalScore >= 30) {
          recommendedEmail.push({
            grantTitle: grant.title,
            agency: grant.agency || "-",
            score: finalScore,
            reasoning: llmResult.reasoning,
            deadline: grant.deadline,
            url: grant.url,
            matchedKeywords: match.matchedKeywords,
            productName: profile.product_name,
          });
        }
      }

      // 관심 공고도 DB 저장
      for (const match of potentialMatches) {
        const profile = profiles.find((p) => p.id === match.profileId);
        if (!profile) continue;

        await supabase.from("grant_matches").upsert(
          {
            grant_id: match.grantId,
            profile_id: match.profileId,
            keyword_score: match.score,
            llm_score: null,
            final_score: Math.round(match.score),
            llm_reasoning: null,
            matched_keywords: match.matchedKeywords,
            status: "new",
          },
          { onConflict: "grant_id,profile_id" },
        );
        matchCount++;
      }

      log.push(`LLM 매칭 완료: ${matchCount}건 처리 (추천 ${recommendedEmail.length}건, 관심 ${potentialMatches.length}건)`);

      // 이메일 발송
      if (!skipEmail) {
        const potentialEmail = potentialMatches.slice(0, 20).map((m) => {
          const grant = grants.find((g) => g.id === m.grantId);
          const profile = profiles.find((p) => p.id === m.profileId);
          return {
            grantTitle: grant?.title || "-",
            agency: grant?.agency || "-",
            score: Math.round(m.score),
            reasoning: `키워드 매칭: ${m.matchedKeywords.join(", ")}`,
            deadline: grant?.deadline ?? null,
            url: grant?.url ?? null,
            matchedKeywords: m.matchedKeywords,
            productName: profile?.product_name || "-",
          };
        });

        if (recommendedEmail.length > 0 || potentialEmail.length > 0) {
          const { subject, html } = buildGrantRecommendationEmail(
            recommendedEmail,
            potentialEmail,
          );
          const { data: recipients } = await supabase
            .from("user_profiles")
            .select("email")
            .in("role", ["admin", "executive", "pm"])
            .eq("is_active", true);

          if (recipients && recipients.length > 0) {
            try {
              await sendEmail({ to: recipients.map((r) => r.email), subject, html });
              log.push(`이메일 발송 완료: ${recipients.length}명`);
            } catch (e) {
              log.push(`이메일 발송 실패: ${e}`);
            }
          }
        }
      } else {
        log.push("이메일 발송 건너뜀 (수동 실행)");
      }
    }

    // 처리 완료 표시
    await supabase
      .from("grant_announcements")
      .update({ is_processed: true })
      .in("id", grants.map((g) => g.id));

    log.push(`완료! 총 ${matchCount}건 매칭 저장됨`);
    return NextResponse.json({ ok: true, log, matchCount });
  } catch (e) {
    log.push(`오류 발생: ${e}`);
    console.error("[Pipeline] Error:", e);
    return NextResponse.json({ ok: false, log, error: String(e) }, { status: 500 });
  }
}
