"use client";

import { useEffect, useState, useMemo } from "react";
import type { UserProfile } from "@/lib/utils/types";
import { PERSONNEL_ROLE_LABELS } from "@/lib/utils/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { RefreshCw, AlertTriangle, Save, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { format, startOfWeek, addWeeks, addMonths, subMonths, eachWeekOfInterval, startOfMonth, endOfMonth } from "date-fns";
import { ko } from "date-fns/locale";

interface WorkloadEntry {
  user: { id: string; name: string; department: string | null; position: string | null };
  assignments: Array<{
    project_id: string;
    project_name: string;
    project_status: string;
    role: string;
    participation_rate: number;
  }>;
  total_rate: number;
}

interface TimesheetEntry {
  id: string;
  user_id: string;
  project_id: string;
  week_start: string;
  hours: number;
  activities: string | null;
  project?: { id: string; project_name: string; project_code: string | null };
}

export default function PersonnelPage() {
  const [workload, setWorkload] = useState<WorkloadEntry[]>([]);
  const [timesheets, setTimesheets] = useState<TimesheetEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [tsMonth, setTsMonth] = useState(format(new Date(), "yyyy-MM"));
  const [tsEditing, setTsEditing] = useState(false);

  // 타임시트 입력용
  const [tsProject, setTsProject] = useState("");
  const [tsWeek, setTsWeek] = useState("");
  const [tsHours, setTsHours] = useState(0);
  const [tsActivities, setTsActivities] = useState("");
  const [tsDialogOpen, setTsDialogOpen] = useState(false);

  // 프로젝트 목록 (타임시트 입력용)
  const [projects, setProjects] = useState<Array<{ id: string; project_name: string }>>([]);

  async function loadWorkload() {
    setLoading(true);
    try {
      const [wRes, pRes] = await Promise.all([
        fetch("/api/personnel/workload").then((r) => r.json()),
        fetch("/api/projects?limit=100").then((r) => r.ok ? r.json() : []).catch(() => []),
      ]);
      setWorkload(Array.isArray(wRes) ? wRes : []);
      setProjects(Array.isArray(pRes) ? pRes.map((p: { id: string; project_name: string }) => ({ id: p.id, project_name: p.project_name })) : []);
    } catch {
      setWorkload([]);
    }
    setLoading(false);
  }

  async function loadTimesheets() {
    try {
      const res = await fetch(`/api/timesheets?month=${tsMonth}`);
      const data = await res.json();
      setTimesheets(Array.isArray(data) ? data : []);
    } catch {
      setTimesheets([]);
    }
  }

  useEffect(() => { loadWorkload(); }, []);
  useEffect(() => { loadTimesheets(); }, [tsMonth]);

  // 해당 월의 주차 계산
  const weeks = useMemo(() => {
    const [y, m] = tsMonth.split("-").map(Number);
    const monthStart = startOfMonth(new Date(y, m - 1));
    const monthEnd = endOfMonth(new Date(y, m - 1));
    return eachWeekOfInterval({ start: monthStart, end: monthEnd }, { weekStartsOn: 1 });
  }, [tsMonth]);

  // 타임시트 저장
  async function saveTimesheet() {
    if (!tsProject || !tsWeek) {
      toast.error("과제와 주차를 선택해주세요.");
      return;
    }
    const res = await fetch("/api/timesheets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        project_id: tsProject,
        week_start: tsWeek,
        hours: tsHours,
        activities: tsActivities,
      }),
    });
    if (res.ok) {
      toast.success("저장되었습니다.");
      setTsDialogOpen(false);
      loadTimesheets();
    } else {
      const err = await res.json();
      toast.error(err.error || "저장 실패");
    }
  }

  function prevMonth() {
    const [y, m] = tsMonth.split("-").map(Number);
    setTsMonth(format(subMonths(new Date(y, m - 1), 1), "yyyy-MM"));
  }
  function nextMonth() {
    const [y, m] = tsMonth.split("-").map(Number);
    setTsMonth(format(addMonths(new Date(y, m - 1), 1), "yyyy-MM"));
  }

  // 월별 합계
  const monthlyTotal = timesheets.reduce((sum, t) => sum + Number(t.hours), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{"인력 관리"}</h1>
          <p className="text-muted-foreground">{"참여율 현황 및 타임시트"}</p>
        </div>
        <Button variant="outline" size="sm" onClick={loadWorkload} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />{"새로고침"}
        </Button>
      </div>

      <Tabs defaultValue="workload">
        <TabsList>
          <TabsTrigger value="workload">{"참여율 현황"}</TabsTrigger>
          <TabsTrigger value="timesheet">{"타임시트"}</TabsTrigger>
        </TabsList>

        {/* ═══ 참여율 현황 탭 ═══ */}
        <TabsContent value="workload">
          <Card>
            <CardHeader><CardTitle>{"연구원별 과제 참여율"}</CardTitle></CardHeader>
            <CardContent>
              {loading ? (
                <div className="py-8 text-center text-muted-foreground">{"불러오는 중..."}</div>
              ) : workload.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">{"배정된 인력이 없습니다."}</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{"성명"}</TableHead>
                      <TableHead>{"부서"}</TableHead>
                      <TableHead>{"참여 과제"}</TableHead>
                      <TableHead className="text-right">{"총 참여율"}</TableHead>
                      <TableHead>{"상태"}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {workload.map((w) => {
                      const overload = w.total_rate > 100;
                      return (
                        <TableRow key={w.user.id} className={overload ? "bg-red-50" : ""}>
                          <TableCell className="font-medium">{w.user.name}</TableCell>
                          <TableCell>{w.user.department || "-"}</TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              {w.assignments.map((a) => (
                                <div key={a.project_id} className="flex items-center gap-2 text-xs">
                                  <span className="truncate max-w-[200px]">{a.project_name}</span>
                                  <Badge variant="outline" className="text-xs">
                                    {PERSONNEL_ROLE_LABELS[a.role] || a.role}
                                  </Badge>
                                  <span className="font-medium">{a.participation_rate}%</span>
                                </div>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <div className="h-2 w-16 rounded-full bg-muted">
                                <div
                                  className={`h-2 rounded-full ${overload ? "bg-red-500" : w.total_rate > 80 ? "bg-amber-500" : "bg-green-500"}`}
                                  style={{ width: `${Math.min(w.total_rate, 100)}%` }}
                                />
                              </div>
                              <span className={`font-medium ${overload ? "text-red-600" : ""}`}>
                                {w.total_rate}%
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {overload ? (
                              <Badge variant="destructive" className="gap-1">
                                <AlertTriangle className="h-3 w-3" />{"초과"}
                              </Badge>
                            ) : w.total_rate > 80 ? (
                              <Badge className="bg-amber-100 text-amber-800">{"주의"}</Badge>
                            ) : (
                              <Badge className="bg-green-100 text-green-800">{"정상"}</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══ 타임시트 탭 ═══ */}
        <TabsContent value="timesheet" className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={prevMonth}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-lg font-semibold w-32 text-center">{tsMonth}</span>
              <Button variant="outline" size="icon" onClick={nextMonth}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">
                {"월 합계:"} <strong>{monthlyTotal}{"시간"}</strong>
              </span>
              <Button size="sm" onClick={() => {
                setTsProject("");
                setTsWeek(format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd"));
                setTsHours(0);
                setTsActivities("");
                setTsDialogOpen(true);
              }}>{"타임시트 입력"}</Button>
            </div>
          </div>

          <Card>
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{"주차"}</TableHead>
                    <TableHead>{"과제"}</TableHead>
                    <TableHead className="text-right">{"시간"}</TableHead>
                    <TableHead>{"활동 내역"}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {weeks.map((weekStart) => {
                    const weekStr = format(weekStart, "yyyy-MM-dd");
                    const weekEntries = timesheets.filter((t) => t.week_start === weekStr);
                    const weekTotal = weekEntries.reduce((s, t) => s + Number(t.hours), 0);

                    if (weekEntries.length === 0) {
                      return (
                        <TableRow key={weekStr}>
                          <TableCell className="text-sm font-medium">
                            {format(weekStart, "MM.dd", { locale: ko })} ~
                          </TableCell>
                          <TableCell colSpan={3} className="text-muted-foreground text-sm">
                            {"기록 없음"}
                          </TableCell>
                        </TableRow>
                      );
                    }

                    return weekEntries.map((entry, i) => (
                      <TableRow key={entry.id}>
                        {i === 0 && (
                          <TableCell rowSpan={weekEntries.length} className="text-sm font-medium align-top">
                            {format(weekStart, "MM.dd", { locale: ko })} ~
                            <div className="text-xs text-muted-foreground mt-0.5">{weekTotal}{"h"}</div>
                          </TableCell>
                        )}
                        <TableCell className="text-sm">
                          {(entry.project as { project_name: string })?.project_name || "-"}
                        </TableCell>
                        <TableCell className="text-right font-medium">{entry.hours}{"h"}</TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-[300px] truncate">
                          {entry.activities || "-"}
                        </TableCell>
                      </TableRow>
                    ));
                  })}
                  {timesheets.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                        {"이 달의 타임시트 기록이 없습니다."}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* 타임시트 입력 다이얼로그 */}
          <Dialog open={tsDialogOpen} onOpenChange={setTsDialogOpen}>
            <DialogContent>
              <DialogHeader><DialogTitle>{"타임시트 입력"}</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>{"과제"} *</Label>
                  <Select value={tsProject} onValueChange={(v) => v && setTsProject(v)}>
                    <SelectTrigger>
                      <SelectValue placeholder={"과제 선택"}>
                        {(value: string) => {
                          const p = projects.find((proj) => proj.id === value);
                          return p?.project_name || value;
                        }}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {projects.map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.project_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{"주차 (시작일)"} *</Label>
                  <Select value={tsWeek} onValueChange={(v) => v && setTsWeek(v)}>
                    <SelectTrigger><SelectValue placeholder={"주차 선택"} /></SelectTrigger>
                    <SelectContent>
                      {weeks.map((w) => {
                        const ws = format(w, "yyyy-MM-dd");
                        const we = format(addWeeks(w, 1), "MM.dd");
                        return (
                          <SelectItem key={ws} value={ws}>
                            {format(w, "MM.dd")} ~ {we}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{"투입 시간"}</Label>
                  <Input type="number" min={0} max={80} step={0.5} value={tsHours || ""} onChange={(e) => setTsHours(Number(e.target.value))} placeholder={"40"} />
                </div>
                <div>
                  <Label>{"활동 내역"}</Label>
                  <Textarea value={tsActivities} onChange={(e) => setTsActivities(e.target.value)} rows={3} placeholder={"주요 수행 내용을 기록해주세요"} />
                </div>
                <Button onClick={saveTimesheet} className="w-full">
                  <Save className="mr-2 h-4 w-4" />{"저장"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </TabsContent>
      </Tabs>
    </div>
  );
}
