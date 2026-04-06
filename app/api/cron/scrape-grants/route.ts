import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { runAllScrapers } from "@/lib/scraper";
import { loadActiveProfiles, buildCompanyContext } from "@/lib/matcher/company-profile";
import { rankMatches } from "@/lib/matcher/keyword";
import { evaluateGrantWithLlm } from "@/lib/matcher/llm";
import { sendEmail } from "@/lib/email/sender";
import { buildGrantRecommendationEmail } from "@/lib/email/templates/grant-recommendation";
import type { GrantEmailData } from "@/lib/email/templates/grant-recommendation";
import type { GrantAnnouncement } from "@/lib/utils/types";

export const maxDuration = 300; // Vercel Pro: 최대 5분

export async function GET(request: Request) {
  // CRON_SECRET 검증 (Vercel Cron이 Authorization 헤더로 전송)
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const log: string[] = [];
  const supabase = createAdminClient();

  try {
    // 1. 스크래핑
    log.push("[1/4] Scraping grants...");
    const scrapeResult = await runAllScrapers();
    log.push(
      `Scraped ${scrapeResult.total} grants, inserted ${scrapeResult.inserted} new`,
    );
    if (scrapeResult.errors.length > 0) {
      log.push(`Scrape errors: ${scrapeResult.errors.join("; ")}`);
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
      log.push("[2/4] No unprocessed grants found. Done.");
      return NextResponse.json({ ok: true, log });
    }

    log.push(`[2/4] ${unprocessed.length} unprocessed grants to match`);

    // 3. 키워드 매칭
    const profiles = await loadActiveProfiles();
    if (profiles.length === 0) {
      log.push("No active company profiles. Skipping matching.");
      return NextResponse.json({ ok: true, log });
    }

    const grants = unprocessed as GrantAnnouncement[];
    // 상위 20건은 LLM 대상, 나머지는 관심 공고
    const topMatches = rankMatches(grants, profiles, 20);
    const allKeywordMatches = rankMatches(grants, profiles, 100);
    const topGrantIds = new Set(topMatches.map((m) => m.grantId));
    const potentialMatches = allKeywordMatches.filter(
      (m) => !topGrantIds.has(m.grantId) && m.score >= 5,
    );
    log.push(
      `[3/4] Keyword matching: ${topMatches.length} top + ${potentialMatches.length} potential`,
    );

    // 4. LLM 정밀 매칭 (상위 20건만)
    const companyContext = buildCompanyContext(profiles);
    const recommendedEmail: GrantEmailData[] = [];

    for (const match of topMatches) {
      const grant = grants.find((g) => g.id === match.grantId);
      const profile = profiles.find((p) => p.id === match.profileId);
      if (!grant || !profile) continue;

      const llmResult = await evaluateGrantWithLlm(
        grant,
        companyContext,
        match.matchedKeywords,
      );

      const llmFailed = llmResult.score < 0;
      const finalScore = llmFailed
        ? Math.round(match.score)
        : Math.round(match.score * 0.3 + llmResult.score * 0.7);

      // grant_matches 테이블에 저장
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
    }

    // 처리 완료 표시
    const processedIds = grants.map((g) => g.id);
    await supabase
      .from("grant_announcements")
      .update({ is_processed: true })
      .in("id", processedIds);

    log.push(`[4/4] LLM matching done. ${recommendedEmail.length} recommended, ${potentialMatches.length} potential`);

    // 5. 이메일 알림 (추천 + 관심 공고)
    const potentialEmail: GrantEmailData[] = potentialMatches
      .slice(0, 20)
      .map((m) => {
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

      // admin/executive/pm 역할 사용자에게 발송
      const { data: recipients } = await supabase
        .from("user_profiles")
        .select("email")
        .in("role", ["admin", "executive", "pm"])
        .eq("is_active", true);

      if (recipients && recipients.length > 0) {
        const emails = recipients.map((r) => r.email);
        try {
          await sendEmail({ to: emails, subject, html });
          log.push(`Email sent to ${emails.length} recipients`);

          const totalCount = recommendedEmail.length + potentialEmail.length;
          for (const recipient of recipients) {
            const { data: user } = await supabase
              .from("user_profiles")
              .select("id")
              .eq("email", recipient.email)
              .single();

            if (user) {
              await supabase.from("notifications").insert({
                user_id: user.id,
                title: subject,
                message: `추천 ${recommendedEmail.length}건, 관심 ${potentialEmail.length}건의 신규 공고가 있습니다.`,
                notification_type: "grant_match",
                is_email_sent: true,
              });
            }
          }
        } catch (e) {
          log.push(`Email error: ${e}`);
        }
      }
    }

    return NextResponse.json({ ok: true, log });
  } catch (e) {
    log.push(`Fatal error: ${e}`);
    console.error("[Cron] Fatal error:", e);
    return NextResponse.json({ ok: false, log, error: String(e) }, { status: 500 });
  }
}
