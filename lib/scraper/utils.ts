import { parse, isValid, format } from "date-fns";

export interface ScrapedGrant {
  source: string;
  source_id: string;
  title: string;
  agency?: string;
  managing_org?: string;
  description?: string;
  full_text?: string;
  budget_range?: string;
  announcement_date?: string; // YYYY-MM-DD
  deadline?: string;          // YYYY-MM-DD
  url?: string;
  category?: string;
  raw_data?: Record<string, unknown>;
}

const DATE_FORMATS = [
  "yyyy-MM-dd",
  "yyyy.MM.dd",
  "yyyy/MM/dd",
  "yyyyMMdd",
  "yyyy-M-d",
  "yyyy.M.d",
];

export function parseKoreanDate(text: string | undefined | null): string | undefined {
  if (!text) return undefined;
  const cleaned = text.trim().replace(/\s+/g, "");

  for (const fmt of DATE_FORMATS) {
    const d = parse(cleaned, fmt, new Date());
    if (isValid(d)) return format(d, "yyyy-MM-dd");
  }

  // "2026년 4월 30일" 형태
  const match = cleaned.match(/(\d{4})\ub144(\d{1,2})\uc6d4(\d{1,2})\uc77c/);
  if (match) {
    const d = new Date(+match[1], +match[2] - 1, +match[3]);
    if (isValid(d)) return format(d, "yyyy-MM-dd");
  }

  return undefined;
}

export function cleanText(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

export function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen) + "...";
}
