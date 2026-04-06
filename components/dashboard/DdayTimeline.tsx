"use client";

import { differenceInDays, format, parseISO } from "date-fns";
import { ko } from "date-fns/locale";
import { CalendarClock, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface TimelineItem {
  id: string;
  title: string;
  due_date: string;
  type: "milestone" | "grant";
  project_name?: string;
  agency?: string;
}

interface DdayTimelineProps {
  items: TimelineItem[];
}

export function DdayTimeline({ items }: DdayTimelineProps) {
  const today = new Date();

  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4 text-center">
        30일 이내 마감 항목이 없습니다.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item) => {
        const dueDate = parseISO(item.due_date);
        const dday = differenceInDays(dueDate, today);
        const ddayText =
          dday === 0 ? "D-Day" : dday > 0 ? `D-${dday}` : `D+${Math.abs(dday)}`;
        const ddayColor =
          dday <= 3
            ? "text-red-600 bg-red-50"
            : dday <= 7
              ? "text-amber-600 bg-amber-50"
              : dday <= 14
                ? "text-yellow-600 bg-yellow-50"
                : "text-blue-600 bg-blue-50";

        return (
          <div
            key={`${item.type}-${item.id}`}
            className="flex items-start gap-3 rounded-lg border p-3"
          >
            <div className="mt-0.5">
              {item.type === "milestone" ? (
                <CalendarClock className="h-4 w-4 text-muted-foreground" />
              ) : (
                <FileText className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{item.title}</p>
              <p className="text-xs text-muted-foreground">
                {item.project_name ?? item.agency ?? ""} &middot;{" "}
                {format(dueDate, "M월 d일 (EEE)", { locale: ko })}
              </p>
            </div>
            <Badge variant="outline" className={`shrink-0 text-xs font-bold ${ddayColor}`}>
              {ddayText}
            </Badge>
          </div>
        );
      })}
    </div>
  );
}
