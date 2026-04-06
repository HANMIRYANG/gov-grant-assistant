import { cn } from "@/lib/utils";

interface MatchScoreProps {
  score: number;
  size?: "sm" | "md" | "lg";
}

export default function MatchScore({ score, size = "md" }: MatchScoreProps) {
  const color =
    score >= 70
      ? "bg-green-100 text-green-700 ring-green-600/20"
      : score >= 40
        ? "bg-yellow-100 text-yellow-700 ring-yellow-600/20"
        : "bg-gray-100 text-gray-600 ring-gray-500/20";

  const sizeClasses = {
    sm: "text-xs px-2 py-0.5",
    md: "text-sm px-2.5 py-1",
    lg: "text-base px-3 py-1.5 font-bold",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full font-semibold ring-1 ring-inset",
        color,
        sizeClasses[size],
      )}
    >
      {score}{"\uC810"}
    </span>
  );
}
