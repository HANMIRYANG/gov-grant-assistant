"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { BUDGET_CATEGORY_LABELS, type BudgetCategory } from "@/lib/utils/types";

interface BudgetCategoryChartProps {
  data: Record<string, { planned: number; spent: number }>;
}

function formatAmount(value: number): string {
  if (value >= 100_000_000) return `${(value / 100_000_000).toFixed(1)}억`;
  if (value >= 10_000) return `${(value / 10_000).toFixed(0)}만`;
  return value.toLocaleString();
}

export function BudgetCategoryChart({ data }: BudgetCategoryChartProps) {
  const chartData = Object.entries(data).map(([category, values]) => ({
    name: BUDGET_CATEGORY_LABELS[category as BudgetCategory] ?? category,
    편성: values.planned,
    집행: values.spent,
  }));

  if (chartData.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4 text-center">
        예산 데이터가 없습니다.
      </p>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
        <XAxis dataKey="name" fontSize={12} />
        <YAxis fontSize={12} tickFormatter={formatAmount} />
        <Tooltip
          formatter={(value) => Number(value).toLocaleString() + "원"}
        />
        <Legend />
        <Bar dataKey="편성" fill="#93c5fd" radius={[4, 4, 0, 0]} />
        <Bar dataKey="집행" fill="#3b82f6" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
