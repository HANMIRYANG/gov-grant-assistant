"use client";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { PRODUCT_LINE_LABELS, type ProductLine } from "@/lib/utils/types";

interface ProductLineChartProps {
  data: Record<string, number>;
}

const COLORS: Record<string, string> = {
  fire_safety: "#ef4444",
  battery: "#3b82f6",
  thermal: "#f59e0b",
  other: "#6b7280",
};

export function ProductLineChart({ data }: ProductLineChartProps) {
  const chartData = Object.entries(data)
    .filter(([, v]) => v > 0)
    .map(([key, value]) => ({
      name: PRODUCT_LINE_LABELS[key as ProductLine] ?? key,
      value,
      color: COLORS[key] ?? "#6b7280",
    }));

  if (chartData.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4 text-center">
        과제 데이터가 없습니다.
      </p>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={250}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          innerRadius={50}
          outerRadius={80}
          dataKey="value"
          label={({ name, value }) => `${name} ${value}`}
          strokeWidth={2}
        >
          {chartData.map((entry, index) => (
            <Cell key={index} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}
