"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { OUTPUT_TYPE_LABELS, type OutputType } from "@/lib/utils/types";

interface OutputSummaryChartProps {
  data: Record<string, number>;
}

export function OutputSummaryChart({ data }: OutputSummaryChartProps) {
  const chartData = Object.entries(data).map(([key, value]) => ({
    name: OUTPUT_TYPE_LABELS[key as OutputType] ?? key,
    건수: value,
  }));

  if (chartData.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4 text-center">
        성과물 데이터가 없습니다.
      </p>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={250}>
      <BarChart data={chartData} layout="vertical" margin={{ left: 50 }}>
        <XAxis type="number" fontSize={12} />
        <YAxis dataKey="name" type="category" fontSize={12} width={60} />
        <Tooltip />
        <Bar dataKey="건수" fill="#10b981" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
