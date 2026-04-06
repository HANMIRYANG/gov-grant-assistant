import { createAdminClient } from "@/lib/supabase/admin";
import type { CompanyProfile } from "@/lib/utils/types";

export async function loadActiveProfiles(): Promise<CompanyProfile[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("company_profiles")
    .select("*")
    .eq("is_active", true)
    .order("product_line");

  if (error) throw new Error(`Failed to load company profiles: ${error.message}`);
  return data as CompanyProfile[];
}

export function buildCompanyContext(profiles: CompanyProfile[]): string {
  const lines = profiles.map((p) => {
    const specs = Object.entries(p.specs)
      .map(([k, v]) => `${k}: ${v}`)
      .join(", ");
    return [
      `- ${p.product_name} (${p.product_line})`,
      `  설명: ${p.description ?? ""}`,
      `  핵심 키워드: ${p.keywords.join(", ")}`,
      specs ? `  스펙: ${specs}` : "",
      `  관심 기관: ${p.target_agencies.join(", ")}`,
    ]
      .filter(Boolean)
      .join("\n");
  });

  return `## 한미르 주식회사 기술 프로필

설립: 2009년
핵심 기술: 나노 세라믹 기반 불연/난연/단열/방열 소재
인증: ISO 9001, ISO 14001, Inno-Biz, 조달청 우수혁신제품
주요 파트너: 현대모비스, LG에너지솔루션, KCC, POSCO

### 제품 라인
${lines.join("\n\n")}`;
}
