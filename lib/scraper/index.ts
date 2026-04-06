import { createAdminClient } from "@/lib/supabase/admin";
import { scrapeNtis } from "./ntis";
import { scrapeSmba } from "./smba";
import { scrapeMotie } from "./motie";
import { scrapeKiat } from "./kiat";
import { scrapeIris } from "./iris";
import type { ScrapedGrant } from "./utils";

interface ScrapeResult {
  total: number;
  inserted: number;
  errors: string[];
  details: string[];
}

export async function runAllScrapers(): Promise<ScrapeResult> {
  const errors: string[] = [];
  const details: string[] = [];
  const allGrants: ScrapedGrant[] = [];

  const scrapers = [
    { name: "NTIS", fn: scrapeNtis },
    { name: "\uC911\uAE30\uBD80", fn: scrapeSmba },
    { name: "KEIT", fn: scrapeMotie },
    { name: "KIAT", fn: scrapeKiat },
    { name: "IRIS", fn: scrapeIris },
  ];

  const results = await Promise.allSettled(scrapers.map((s) => s.fn()));

  results.forEach((result, i) => {
    if (result.status === "fulfilled") {
      const count = result.value.length;
      details.push(`[${scrapers[i].name}] ${count}\uAC74 \uC218\uC9D1`);
      console.log(`[${scrapers[i].name}] ${count} grants scraped`);
      allGrants.push(...result.value);
    } else {
      const msg = `[${scrapers[i].name}] \uC2E4\uD328: ${result.reason}`;
      details.push(msg);
      console.error(msg);
      errors.push(msg);
    }
  });

  const supabase = createAdminClient();
  let inserted = 0;
  let skippedExpired = 0;

  // 마감일 지난 공고 제외
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  for (const grant of allGrants) {
    // 마감일이 있고 이미 지난 공고는 저장하지 않음
    if (grant.deadline && grant.deadline < today) {
      skippedExpired++;
      continue;
    }

    // 중복 체크
    const { data: existing } = await supabase
      .from("grant_announcements")
      .select("id")
      .eq("source", grant.source)
      .eq("source_id", grant.source_id)
      .maybeSingle();

    if (existing) continue;

    const { error } = await supabase.from("grant_announcements").insert({
      source: grant.source,
      source_id: grant.source_id,
      title: grant.title,
      agency: grant.agency,
      managing_org: grant.managing_org,
      description: grant.description,
      full_text: grant.full_text,
      budget_range: grant.budget_range,
      announcement_date: grant.announcement_date,
      deadline: grant.deadline,
      url: grant.url,
      category: grant.category,
      raw_data: grant.raw_data ?? {},
      is_processed: false,
    });

    if (error) {
      if (error.code === "23505") continue;
      errors.push(`[DB] ${grant.source}/${grant.source_id}: ${error.message}`);
    } else {
      inserted++;
    }
  }

  if (skippedExpired > 0) {
    details.push(`[필터] 마감일 지난 공고 ${skippedExpired}건 제외`);
  }

  return { total: allGrants.length, inserted, errors, details };
}
