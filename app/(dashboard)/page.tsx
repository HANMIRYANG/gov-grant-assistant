"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  FolderKanban,
  Search,
  CalendarRange,
  TrendingUp,
  ClipboardCheck,
  Bell,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { BudgetGauge } from "@/components/dashboard/BudgetGauge";
import { DdayTimeline } from "@/components/dashboard/DdayTimeline";
import { BudgetCategoryChart } from "@/components/dashboard/BudgetCategoryChart";
import { MonthlyExpenseChart } from "@/components/dashboard/MonthlyExpenseChart";
import { ProductLineChart } from "@/components/dashboard/ProductLineChart";
import { OutputSummaryChart } from "@/components/dashboard/OutputSummaryChart";
import { APPROVAL_STATUS_LABELS, BUDGET_CATEGORY_LABELS, type BudgetCategory } from "@/lib/utils/types";

interface DashboardData {
  projectCounts: {
    total: number;
    active: number;
    preparing: number;
    completed: number;
    suspended: number;
    follow_up: number;
  };
  newMatchCount: number;
  totalMatchCount: number;
  upcomingMilestones: {
    id: string;
    title: string;
    due_date: string;
    progress_pct: number;
    milestone_type: string;
    project_id: string;
    projects: { project_name: string } | null;
  }[];
  upcomingGrants: {
    id: string;
    title: string;
    deadline: string;
    agency: string | null;
  }[];
  budgetSummary: {
    totalPlanned: number;
    totalSpent: number;
    avgUtilization: number;
    byProject: {
      project_id: string;
      project_name: string;
      planned: number;
      spent: number;
      rate: number;
    }[];
  };
  budgetByCategory: Record<string, { planned: number; spent: number }>;
  pendingApprovals: {
    id: string;
    status: string;
    created_at: string;
    expenses: {
      id: string;
      amount: number;
      description: string;
      vendor: string;
      expense_date: string;
      budget_items: {
        project_id: string;
        category: string;
        projects: { project_name: string } | null;
      } | null;
    } | null;
  }[];
  recentNotifications: {
    id: string;
    title: string;
    message: string;
    notification_type: string;
    is_read: boolean;
    created_at: string;
  }[];
  productLineDistribution: Record<string, number>;
  outputSummary: Record<string, number>;
  monthlyExpenses: Record<string, number>;
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((res) => res.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="py-20 text-center text-muted-foreground">
        데이터를 불러올 수 없습니다.
      </div>
    );
  }

  // D-day 타임라인 데이터 합성
  const timelineItems = [
    ...data.upcomingMilestones.map((m) => ({
      id: m.id,
      title: m.title,
      due_date: m.due_date,
      type: "milestone" as const,
      project_name: m.projects?.project_name,
    })),
    ...data.upcomingGrants.map((g) => ({
      id: g.id,
      title: g.title,
      due_date: g.deadline,
      type: "grant" as const,
      agency: g.agency ?? undefined,
    })),
  ].sort(
    (a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime(),
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">대시보드</h1>
        <p className="text-muted-foreground">
          한미르 정부 R&D 과제 현황 요약
        </p>
      </div>

      {/* 요약 카드 4개 */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link href="/projects">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">수행중 과제</CardTitle>
              <FolderKanban className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.projectCounts.active}</div>
              <CardDescription>
                전체 {data.projectCounts.total}개 &middot; 준비{" "}
                {data.projectCounts.preparing} &middot; 완료{" "}
                {data.projectCounts.completed}
              </CardDescription>
            </CardContent>
          </Card>
        </Link>

        <Link href="/grants">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">추천 공고</CardTitle>
              <Search className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {data.newMatchCount}
                <span className="text-sm font-normal text-muted-foreground ml-1">
                  신규
                </span>
              </div>
              <CardDescription>
                전체 매칭 {data.totalMatchCount}건
              </CardDescription>
            </CardContent>
          </Card>
        </Link>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">다가오는 마감</CardTitle>
            <CalendarRange className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{timelineItems.length}</div>
            <CardDescription>30일 이내 마감</CardDescription>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">예산 소진율</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.budgetSummary.avgUtilization}%
            </div>
            <CardDescription>수행중 과제 전체 평균</CardDescription>
          </CardContent>
        </Card>
      </div>

      {/* 2열 레이아웃: 마감 타임라인 + 과제별 예산 게이지 */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">마감 임박 항목</CardTitle>
              <Link
                href="/schedule"
                className="text-xs text-muted-foreground hover:underline flex items-center gap-1"
              >
                전체보기 <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <DdayTimeline items={timelineItems.slice(0, 8)} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">과제별 예산 소진율</CardTitle>
          </CardHeader>
          <CardContent>
            {data.budgetSummary.byProject.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                수행중인 과제가 없습니다.
              </p>
            ) : (
              <div className="flex flex-wrap gap-6 justify-center">
                {data.budgetSummary.byProject.map((proj) => (
                  <BudgetGauge
                    key={proj.project_id}
                    planned={proj.planned}
                    spent={proj.spent}
                    label={proj.project_name}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 2열 레이아웃: 비목별 예산 차트 + 월별 집행 추이 */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">비목별 예산 편성/집행</CardTitle>
          </CardHeader>
          <CardContent>
            <BudgetCategoryChart data={data.budgetByCategory} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">월별 집행 추이 (6개월)</CardTitle>
          </CardHeader>
          <CardContent>
            <MonthlyExpenseChart data={data.monthlyExpenses} />
          </CardContent>
        </Card>
      </div>

      {/* 3열 레이아웃: 제품라인 분포 + 성과물 현황 + 결재/알림 */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">제품라인별 과제 분포</CardTitle>
          </CardHeader>
          <CardContent>
            <ProductLineChart data={data.productLineDistribution} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">성과물 현황</CardTitle>
          </CardHeader>
          <CardContent>
            <OutputSummaryChart data={data.outputSummary} />
          </CardContent>
        </Card>

        <div className="space-y-6">
          {/* 결재 대기 */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <ClipboardCheck className="h-4 w-4" />
                  결재 대기
                </CardTitle>
                <Link
                  href="/approvals"
                  className="text-xs text-muted-foreground hover:underline"
                >
                  전체보기
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {data.pendingApprovals.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-2">
                  대기중인 결재가 없습니다.
                </p>
              ) : (
                <div className="space-y-2">
                  {data.pendingApprovals.map((a) => (
                    <div
                      key={a.id}
                      className="flex items-center justify-between text-sm border-b last:border-0 pb-2 last:pb-0"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium">
                          {a.expenses?.description ?? "-"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {a.expenses?.budget_items?.projects?.project_name ?? ""}{" "}
                          &middot;{" "}
                          {BUDGET_CATEGORY_LABELS[a.expenses?.budget_items?.category as BudgetCategory] ?? ""}
                        </p>
                      </div>
                      <span className="shrink-0 font-medium">
                        {a.expenses?.amount?.toLocaleString()}원
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* 최근 알림 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Bell className="h-4 w-4" />
                최근 알림
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data.recentNotifications.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-2">
                  알림이 없습니다.
                </p>
              ) : (
                <div className="space-y-2">
                  {data.recentNotifications.map((n) => (
                    <div
                      key={n.id}
                      className="flex items-start gap-2 text-sm border-b last:border-0 pb-2 last:pb-0"
                    >
                      {!n.is_read && (
                        <span className="mt-1.5 h-2 w-2 rounded-full bg-blue-500 shrink-0" />
                      )}
                      <div className="min-w-0">
                        <p className={`truncate ${n.is_read ? "text-muted-foreground" : "font-medium"}`}>
                          {n.title}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(n.created_at).toLocaleDateString("ko-KR")}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
