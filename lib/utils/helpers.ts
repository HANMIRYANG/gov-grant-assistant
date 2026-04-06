/** 천 단위 콤마 + '원' 표시 */
export function formatWon(amount: number): string {
  return amount.toLocaleString("ko-KR") + "\uC6D0";
}

/** 천 단위 콤마만 */
export function formatNumber(amount: number): string {
  return amount.toLocaleString("ko-KR");
}

/** 비율(%) 표시 */
export function formatPercent(value: number, total: number): string {
  if (total === 0) return "0%";
  return ((value / total) * 100).toFixed(1) + "%";
}

/** 날짜 형식 변환 YYYY-MM-DD → YYYY.MM.DD */
export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "-";
  return dateStr.replace(/-/g, ".");
}

/** D-day 계산 */
export function dDay(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  const target = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  const diff = Math.floor((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diff === 0) return "D-Day";
  if (diff > 0) return `D-${diff}`;
  return `D+${Math.abs(diff)}`;
}
