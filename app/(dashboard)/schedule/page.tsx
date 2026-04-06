"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import type { ProjectStatus, ProductLine, MilestoneType } from "@/lib/utils/types";
import { PRODUCT_LINE_LABELS, PROJECT_STATUS_LABELS, MILESTONE_TYPE_LABELS } from "@/lib/utils/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RefreshCw, ZoomIn, ZoomOut, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { differenceInDays, format, addMonths, startOfMonth, endOfMonth, eachMonthOfInterval, isAfter, isBefore } from "date-fns";

interface ScheduleMilestone {
  id: string;
  title: string;
  milestone_type: MilestoneType;
  due_date: string;
  completed_date: string | null;
  progress_pct: number;
}

interface ScheduleProject {
  id: string;
  project_name: string;
  project_code: string | null;
  start_date: string;
  end_date: string;
  status: ProjectStatus;
  product_line: ProductLine;
  milestones: ScheduleMilestone[];
}

const MILESTONE_COLORS: Record<MilestoneType, string> = {
  research_phase: "#3b82f6",
  mid_evaluation: "#f59e0b",
  annual_evaluation: "#8b5cf6",
  final_evaluation: "#ef4444",
  settlement: "#6b7280",
};

const PROJECT_COLORS = [
  "#3b82f6", "#10b981", "#8b5cf6", "#f59e0b", "#ef4444",
  "#06b6d4", "#ec4899", "#84cc16", "#f97316", "#6366f1",
];

type ViewMode = "month" | "quarter" | "year";

export default function SchedulePage() {
  const [projects, setProjects] = useState<ScheduleProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("quarter");
  const [filterLine, setFilterLine] = useState<string>("all");
  const scrollRef = useRef<HTMLDivElement>(null);

  async function loadSchedule() {
    setLoading(true);
    try {
      const res = await fetch("/api/schedule");
      const data = await res.json();
      setProjects(Array.isArray(data) ? data : []);
    } catch {
      setProjects([]);
    }
    setLoading(false);
  }

  useEffect(() => { loadSchedule(); }, []);

  const filtered = filterLine === "all"
    ? projects
    : projects.filter((p) => p.product_line === filterLine);

  // 타임라인 범위 계산
  const { timeStart, timeEnd, months } = useMemo(() => {
    if (filtered.length === 0) {
      const now = new Date();
      const s = startOfMonth(addMonths(now, -1));
      const e = endOfMonth(addMonths(now, 11));
      return { timeStart: s, timeEnd: e, months: eachMonthOfInterval({ start: s, end: e }) };
    }
    const allDates = filtered.flatMap((p) => [
      new Date(p.start_date),
      new Date(p.end_date),
      ...p.milestones.map((m) => new Date(m.due_date)),
    ]);
    const minDate = new Date(Math.min(...allDates.map((d) => d.getTime())));
    const maxDate = new Date(Math.max(...allDates.map((d) => d.getTime())));
    const s = startOfMonth(addMonths(minDate, -1));
    const e = endOfMonth(addMonths(maxDate, 1));
    return { timeStart: s, timeEnd: e, months: eachMonthOfInterval({ start: s, end: e }) };
  }, [filtered]);

  const totalDays = differenceInDays(timeEnd, timeStart) || 1;

  // 뷰 모드별 너비 설정
  const dayWidth = viewMode === "month" ? 12 : viewMode === "quarter" ? 4 : 1.5;
  const chartWidth = totalDays * dayWidth;
  const labelWidth = 260;
  const rowHeight = 48;
  const milestoneRowHeight = 28;
  const headerHeight = 50;

  function dateToX(date: Date): number {
    const days = differenceInDays(date, timeStart);
    return days * dayWidth;
  }

  const today = new Date();
  const todayX = dateToX(today);

  function scrollToToday() {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = Math.max(0, todayX - 300);
    }
  }

  useEffect(() => {
    if (!loading && filtered.length > 0) {
      setTimeout(scrollToToday, 100);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, filtered.length]);

  // 각 프로젝트의 행 수 계산
  const projectRows = filtered.map((p) => ({
    project: p,
    totalRows: 1 + p.milestones.length, // 프로젝트 바 + 마일스톤들
  }));

  const totalHeight = projectRows.reduce(
    (sum, pr) => sum + rowHeight + pr.project.milestones.length * milestoneRowHeight,
    0,
  ) + headerHeight;

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{"일정 관리"}</h1>
          <p className="text-muted-foreground">{"전체 과제 통합 간트차트"}</p>
        </div>
        <div className="flex gap-2">
          <Select value={filterLine} onValueChange={(v) => v && setFilterLine(v)}>
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{"전체"}</SelectItem>
              {Object.entries(PRODUCT_LINE_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={viewMode} onValueChange={(v) => v && setViewMode(v as ViewMode)}>
            <SelectTrigger className="w-[100px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="month">{"월간"}</SelectItem>
              <SelectItem value="quarter">{"분기"}</SelectItem>
              <SelectItem value="year">{"연간"}</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={scrollToToday} title="오늘로 이동">
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={loadSchedule} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* 범례 */}
      <div className="flex flex-wrap gap-4 text-sm">
        <span className="text-muted-foreground">{"마일스톤 유형:"}</span>
        {Object.entries(MILESTONE_TYPE_LABELS).map(([type, label]) => (
          <div key={type} className="flex items-center gap-1.5">
            <div
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: MILESTONE_COLORS[type as MilestoneType] }}
            />
            <span>{label}</span>
          </div>
        ))}
        <span className="ml-4 text-muted-foreground">{"| ◆ 지연"}</span>
      </div>

      {loading ? (
        <div className="py-12 text-center text-muted-foreground">{"불러오는 중..."}</div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            {"진행 중인 과제가 없습니다."}
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="flex">
            {/* 좌측 라벨 영역 */}
            <div className="shrink-0 border-r bg-muted/30" style={{ width: labelWidth }}>
              {/* 헤더 */}
              <div
                className="flex items-center border-b px-3 text-xs font-medium text-muted-foreground"
                style={{ height: headerHeight }}
              >
                {"과제 / 마일스톤"}
              </div>
              {/* 프로젝트별 라벨 */}
              {projectRows.map(({ project: p }, pi) => (
                <div key={p.id}>
                  {/* 프로젝트 행 */}
                  <Link href={`/projects/${p.id}`}>
                    <div
                      className="flex items-center gap-2 border-b px-3 hover:bg-muted/50 cursor-pointer"
                      style={{ height: rowHeight }}
                    >
                      <div
                        className="h-3 w-3 rounded-sm shrink-0"
                        style={{ backgroundColor: PROJECT_COLORS[pi % PROJECT_COLORS.length] }}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{p.project_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {PROJECT_STATUS_LABELS[p.status]}
                        </p>
                      </div>
                    </div>
                  </Link>
                  {/* 마일스톤 라벨 */}
                  {p.milestones.map((m) => {
                    const isLate = !m.completed_date && isAfter(today, new Date(m.due_date));
                    return (
                      <div
                        key={m.id}
                        className="flex items-center gap-2 border-b px-3 pl-8"
                        style={{ height: milestoneRowHeight }}
                      >
                        <div
                          className="h-2 w-2 rounded-full shrink-0"
                          style={{ backgroundColor: MILESTONE_COLORS[m.milestone_type] }}
                        />
                        <span className={`truncate text-xs ${isLate ? "text-red-600 font-medium" : "text-muted-foreground"}`}>
                          {m.title}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>

            {/* 우측 차트 영역 */}
            <div className="flex-1 overflow-x-auto" ref={scrollRef}>
              <svg width={chartWidth} height={totalHeight} className="select-none">
                {/* 월 헤더 */}
                {months.map((month) => {
                  const x = dateToX(month);
                  const nextMonth = addMonths(month, 1);
                  const w = dateToX(nextMonth) - x;
                  return (
                    <g key={month.toISOString()}>
                      <rect x={x} y={0} width={w} height={headerHeight} fill="transparent" stroke="#e5e7eb" strokeWidth={0.5} />
                      <text x={x + w / 2} y={headerHeight / 2 + 4} textAnchor="middle" fontSize={11} fill="#6b7280">
                        {format(month, "yyyy.MM")}
                      </text>
                    </g>
                  );
                })}

                {/* 오늘 라인 */}
                <line x1={todayX} y1={headerHeight} x2={todayX} y2={totalHeight} stroke="#ef4444" strokeWidth={1.5} strokeDasharray="4 2" />
                <rect x={todayX - 18} y={headerHeight - 16} width={36} height={14} rx={3} fill="#ef4444" />
                <text x={todayX} y={headerHeight - 6} textAnchor="middle" fontSize={9} fill="white" fontWeight="bold">
                  {"TODAY"}
                </text>

                {/* 프로젝트별 바 및 마일스톤 */}
                {(() => {
                  let currentY = headerHeight;
                  return projectRows.map(({ project: p }, pi) => {
                    const color = PROJECT_COLORS[pi % PROJECT_COLORS.length];
                    const startX = dateToX(new Date(p.start_date));
                    const endX = dateToX(new Date(p.end_date));
                    const barWidth = Math.max(endX - startX, 4);
                    const barY = currentY;

                    // 프로젝트 바
                    const projectBar = (
                      <g key={`p-${p.id}`}>
                        {/* 행 배경 줄무늬 */}
                        <rect x={0} y={barY} width={chartWidth} height={rowHeight} fill={pi % 2 === 0 ? "transparent" : "rgba(0,0,0,0.02)"} />
                        {/* 과제 기간 바 */}
                        <rect
                          x={startX}
                          y={barY + 10}
                          width={barWidth}
                          height={rowHeight - 20}
                          rx={4}
                          fill={color}
                          opacity={0.2}
                          stroke={color}
                          strokeWidth={1}
                        />
                        <rect
                          x={startX}
                          y={barY + 10}
                          width={barWidth}
                          height={rowHeight - 20}
                          rx={4}
                          fill={color}
                          opacity={0.15}
                        />
                        {/* 기간 텍스트 */}
                        <text x={startX + 6} y={barY + rowHeight / 2 + 4} fontSize={10} fill={color} fontWeight="600">
                          {format(new Date(p.start_date), "yy.MM")} ~ {format(new Date(p.end_date), "yy.MM")}
                        </text>
                      </g>
                    );

                    currentY += rowHeight;

                    // 마일스톤 다이아몬드
                    const milestoneElements = p.milestones.map((m) => {
                      const mx = dateToX(new Date(m.due_date));
                      const my = currentY + milestoneRowHeight / 2;
                      const mColor = MILESTONE_COLORS[m.milestone_type];
                      const isLate = !m.completed_date && isAfter(today, new Date(m.due_date));
                      const isCompleted = !!m.completed_date;

                      currentY += milestoneRowHeight;

                      return (
                        <g key={`m-${m.id}`}>
                          {/* 진행률 바 (마감일 왼쪽으로) */}
                          {m.progress_pct > 0 && (
                            <rect
                              x={mx - 60}
                              y={my - 4}
                              width={60 * (m.progress_pct / 100)}
                              height={8}
                              rx={2}
                              fill={mColor}
                              opacity={0.3}
                            />
                          )}
                          {/* 다이아몬드 마커 */}
                          <polygon
                            points={`${mx},${my - 7} ${mx + 7},${my} ${mx},${my + 7} ${mx - 7},${my}`}
                            fill={isCompleted ? mColor : isLate ? "#ef4444" : "white"}
                            stroke={isLate ? "#ef4444" : mColor}
                            strokeWidth={2}
                          />
                          {/* 완료 체크 */}
                          {isCompleted && (
                            <text x={mx} y={my + 3.5} textAnchor="middle" fontSize={9} fill="white" fontWeight="bold">
                              {"✓"}
                            </text>
                          )}
                          {/* 날짜 라벨 */}
                          <text x={mx + 12} y={my + 3.5} fontSize={9} fill={isLate ? "#ef4444" : "#6b7280"}>
                            {format(new Date(m.due_date), "MM.dd")}
                            {isLate && " ⚠"}
                          </text>
                        </g>
                      );
                    });

                    return (
                      <g key={p.id}>
                        {projectBar}
                        {milestoneElements}
                      </g>
                    );
                  });
                })()}

                {/* 월 구분선 */}
                {months.map((month) => {
                  const x = dateToX(month);
                  return (
                    <line
                      key={`line-${month.toISOString()}`}
                      x1={x}
                      y1={headerHeight}
                      x2={x}
                      y2={totalHeight}
                      stroke="#e5e7eb"
                      strokeWidth={0.5}
                    />
                  );
                })}
              </svg>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
