"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface MonthlyExpenseChartProps {
  data: Record<string, number>;
}

function formatAmount(value: number): string {
  if (value >= 100_000_000) return `${(value / 100_000_000).toFixed(1)}억`;
  if (value >= 10_000) return `${(value / 10_000).toFixed(0)}만`;
  return value.toLocaleString();
}

export function MonthlyExpenseChart({ data }: MonthlyExpenseChartProps) {
  // 최근 6개월 데이터 채우기
  const months: string[] = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
    );
  }

  const chartData = months.map((m) => ({
    month: m.substring(5) + "월",
    금액: data[m] ?? 0,
  }));

  if (Object.keys(data).length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4 text-center">
        집행 데이터가 없습니다.
      </p>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
        <XAxis dataKey="month" fontSize={12} />
        <YAxis fontSize={12} tickFormatter={formatAmount} />
        <Tooltip
          formatter={(value) => [Number(value).toLocaleString() + "원", "집행액"]}
        />
        <Area
          type="monotone"
          dataKey="금액"
          stroke="#8b5cf6"
          fill="#c4b5fd"
          strokeWidth={2}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
