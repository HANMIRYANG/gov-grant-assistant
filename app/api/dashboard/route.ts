import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 1. 과제 현황 (상태별 개수)
    const { data: projects } = await supabase
      .from("projects")
      .select("id, project_name, status, product_line, start_date, end_date, total_budget, pi_id");

    const projectCounts = {
      total: projects?.length ?? 0,
      active: projects?.filter((p) => p.status === "active").length ?? 0,
      preparing: projects?.filter((p) => p.status === "preparing").length ?? 0,
      completed: projects?.filter((p) => p.status === "completed").length ?? 0,
      suspended: projects?.filter((p) => p.status === "suspended").length ?? 0,
      follow_up: projects?.filter((p) => p.status === "follow_up").length ?? 0,
    };

    // 2. 신규 추천 공고 수
    const { count: newMatchCount } = await supabase
      .from("grant_matches")
      .select("id", { count: "exact", head: true })
      .eq("status", "new");

    const { count: totalMatchCount } = await supabase
      .from("grant_matches")
      .select("id", { count: "exact", head: true })
      .gte("final_score", 20);

    // 3. 30일 이내 마감 (마일스톤 + 공고)
    const today = new Date().toISOString().split("T")[0];
    const thirtyDaysLater = new Date(Date.now() + 30 * 86400000)
      .toISOString()
      .split("T")[0];

    const { data: upcomingMilestones } = await supabase
      .from("milestones")
      .select("id, title, due_date, progress_pct, milestone_type, project_id, projects(project_name)")
      .gte("due_date", today)
      .lte("due_date", thirtyDaysLater)
      .is("completed_date", null)
      .order("due_date", { ascending: true })
      .limit(10);

    const { data: upcomingGrants } = await supabase
      .from("grant_announcements")
      .select("id, title, deadline, agency")
      .gte("deadline", today)
      .lte("deadline", thirtyDaysLater)
      .order("deadline", { ascending: true })
      .limit(5);

    // 4. 예산 소진율
    const activeProjectIds =
      projects
        ?.filter((p) => p.status === "active" || p.status === "preparing")
        .map((p) => p.id) ?? [];

    let budgetSummary = {
      totalPlanned: 0,
      totalSpent: 0,
      avgUtilization: 0,
      byProject: [] as {
        project_id: string;
        project_name: string;
        planned: number;
        spent: number;
        rate: number;
      }[],
    };

    if (activeProjectIds.length > 0) {
      const { data: budgetItems } = await supabase
        .from("budget_items")
        .select("project_id, planned_amount, spent_amount")
        .in("project_id", activeProjectIds);

      if (budgetItems && budgetItems.length > 0) {
        const byProject = new Map<string, { planned: number; spent: number }>();
        for (const item of budgetItems) {
          const entry = byProject.get(item.project_id) ?? {
            planned: 0,
            spent: 0,
          };
          entry.planned += Number(item.planned_amount);
          entry.spent += Number(item.spent_amount);
          byProject.set(item.project_id, entry);
        }

        budgetSummary.totalPlanned = Array.from(byProject.values()).reduce(
          (sum, v) => sum + v.planned,
          0,
        );
        budgetSummary.totalSpent = Array.from(byProject.values()).reduce(
          (sum, v) => sum + v.spent,
          0,
        );
        budgetSummary.avgUtilization =
          budgetSummary.totalPlanned > 0
            ? Math.round(
                (budgetSummary.totalSpent / budgetSummary.totalPlanned) * 100,
              )
            : 0;

        budgetSummary.byProject = Array.from(byProject.entries()).map(
          ([pid, val]) => {
            const proj = projects?.find((p) => p.id === pid);
            return {
              project_id: pid,
              project_name: proj?.project_name ?? "",
              planned: val.planned,
              spent: val.spent,
              rate: val.planned > 0 ? Math.round((val.spent / val.planned) * 100) : 0,
            };
          },
        );
      }
    }

    // 5. 비목별 예산 집행 현황 (차트용)
    const { data: allBudgetItems } = await supabase
      .from("budget_items")
      .select("category, planned_amount, spent_amount")
      .in("project_id", activeProjectIds);

    const budgetByCategory: Record<string, { planned: number; spent: number }> = {};
    if (allBudgetItems) {
      for (const item of allBudgetItems) {
        const cat = item.category;
        if (!budgetByCategory[cat]) {
          budgetByCategory[cat] = { planned: 0, spent: 0 };
        }
        budgetByCategory[cat].planned += Number(item.planned_amount);
        budgetByCategory[cat].spent += Number(item.spent_amount);
      }
    }

    // 6. 최근 결재 대기
    const { data: pendingApprovals } = await supabase
      .from("approval_flows")
      .select(
        "id, status, created_at, expenses(id, amount, description, vendor, expense_date, budget_items(project_id, category, projects(project_name)))",
      )
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(5);

    // 7. 최근 알림
    const { data: recentNotifications } = await supabase
      .from("notifications")
      .select("id, title, message, notification_type, is_read, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5);

    // 8. 제품라인별 과제 분포 (차트용)
    const productLineDistribution = {
      fire_safety: projects?.filter((p) => p.product_line === "fire_safety").length ?? 0,
      battery: projects?.filter((p) => p.product_line === "battery").length ?? 0,
      thermal: projects?.filter((p) => p.product_line === "thermal").length ?? 0,
      other: projects?.filter((p) => p.product_line === "other").length ?? 0,
    };

    // 9. 성과물 현황
    const { data: outputs } = await supabase
      .from("outputs")
      .select("output_type, status");

    const outputSummary: Record<string, number> = {};
    if (outputs) {
      for (const o of outputs) {
        outputSummary[o.output_type] = (outputSummary[o.output_type] ?? 0) + 1;
      }
    }

    // 10. 월별 집행 추이 (최근 6개월)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const sixMonthsAgoStr = sixMonthsAgo.toISOString().split("T")[0];

    const { data: recentExpenses } = await supabase
      .from("expenses")
      .select("expense_date, amount, approval_status")
      .gte("expense_date", sixMonthsAgoStr)
      .eq("approval_status", "approved");

    const monthlyExpenses: Record<string, number> = {};
    if (recentExpenses) {
      for (const e of recentExpenses) {
        const month = e.expense_date.substring(0, 7); // YYYY-MM
        monthlyExpenses[month] = (monthlyExpenses[month] ?? 0) + Number(e.amount);
      }
    }

    return NextResponse.json({
      projectCounts,
      newMatchCount: newMatchCount ?? 0,
      totalMatchCount: totalMatchCount ?? 0,
      upcomingMilestones: upcomingMilestones ?? [],
      upcomingGrants: upcomingGrants ?? [],
      budgetSummary,
      budgetByCategory,
      pendingApprovals: pendingApprovals ?? [],
      recentNotifications: recentNotifications ?? [],
      productLineDistribution,
      outputSummary,
      monthlyExpenses,
    });
  } catch (error) {
    console.error("Dashboard API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
