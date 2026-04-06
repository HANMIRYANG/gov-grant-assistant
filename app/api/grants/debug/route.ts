import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadActiveProfiles } from "@/lib/matcher/company-profile";
import { matchKeywords } from "@/lib/matcher/keyword";
import type { GrantAnnouncement } from "@/lib/utils/types";

export async function GET() {
  // 인증 확인
  const supabaseAuth = await createClient();
  const { data: { user } } = await supabaseAuth.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();

  // 최근 공고 10건
  const { data: grants } = await supabase
    .from("grant_announcements")
    .select("id, source, source_id, title, agency, description, deadline, is_processed")
    .order("created_at", { ascending: false })
    .limit(10);

  // 활성 프로필
  const profiles = await loadActiveProfiles();

  // 각 공고별 매칭 시뮬레이션
  const matchResults = (grants || []).map((grant) => {
    const matches = matchKeywords(grant as GrantAnnouncement, profiles);
    const bestMatch = matches.length > 0
      ? matches.reduce((a, b) => (a.score > b.score ? a : b))
      : null;

    return {
      grant_title: grant.title,
      grant_source: grant.source,
      grant_has_description: !!grant.description,
      is_processed: grant.is_processed,
      best_match: bestMatch
        ? {
            score: bestMatch.score,
            matched_keywords: bestMatch.matchedKeywords,
            profile: profiles.find((p) => p.id === bestMatch.profileId)?.product_name,
          }
        : null,
      all_scores: matches
        .filter((m) => m.score > 0)
        .map((m) => ({
          profile: profiles.find((p) => p.id === m.profileId)?.product_name,
          score: m.score,
          keywords: m.matchedKeywords,
        })),
    };
  });

  // DB에 저장된 매칭 결과 (LLM 점수 포함)
  const { data: dbMatches } = await supabase
    .from("grant_matches")
    .select("grant_id, profile_id, keyword_score, llm_score, final_score, llm_reasoning, matched_keywords, grant_announcements(title, source), company_profiles(product_name)")
    .order("final_score", { ascending: false })
    .limit(20);

  return NextResponse.json({
    grants_count: grants?.length || 0,
    profiles_count: profiles.length,
    profiles_summary: profiles.map((p) => ({
      name: p.product_name,
      keywords_count: p.keywords.length,
      keywords_sample: p.keywords.slice(0, 5),
    })),
    match_results: matchResults,
    db_matches: (dbMatches || []).map((m) => ({
      grant_title: (m.grant_announcements as unknown as Record<string, string>)?.title,
      source: (m.grant_announcements as unknown as Record<string, string>)?.source,
      product: (m.company_profiles as unknown as Record<string, string>)?.product_name,
      keyword_score: m.keyword_score,
      llm_score: m.llm_score,
      final_score: m.final_score,
      reasoning: m.llm_reasoning,
      matched_keywords: m.matched_keywords,
    })),
  });
}
