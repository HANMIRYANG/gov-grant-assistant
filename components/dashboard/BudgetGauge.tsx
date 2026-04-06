"use client";

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

interface BudgetGaugeProps {
  planned: number;
  spent: number;
  label?: string;
}

export function BudgetGauge({ planned, spent, label }: BudgetGaugeProps) {
  const rate = planned > 0 ? Math.round((spent / planned) * 100) : 0;
  const remaining = Math.max(0, 100 - rate);

  const data = [
    { name: "소진", value: rate },
    { name: "잔여", value: remaining },
  ];

  const getColor = (r: number) => {
    if (r >= 95) return "#ef4444";
    if (r >= 80) return "#f59e0b";
    return "#22c55e";
  };

  const color = getColor(rate);

  return (
    <div className="flex flex-col items-center">
      <div className="relative h-28 w-28">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={35}
              outerRadius={50}
              startAngle={90}
              endAngle={-270}
              dataKey="value"
              strokeWidth={0}
            >
              <Cell fill={color} />
              <Cell fill="#e5e7eb" />
            </Pie>
            <Tooltip
              formatter={(value, name) => [`${value}%`, String(name)]}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-lg font-bold">{rate}%</span>
        </div>
      </div>
      {label && (
        <p className="mt-1 text-xs text-muted-foreground truncate max-w-[120px] text-center">
          {label}
        </p>
      )}
    </div>
  );
}
