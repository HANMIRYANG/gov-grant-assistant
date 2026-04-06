"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  Search,
  Eye,
} from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

interface AuditLog {
  id: string;
  user_id: string | null;
  action: string;
  table_name: string;
  record_id: string | null;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
  user_profiles: { name: string; email: string } | null;
}

const TABLE_LABELS: Record<string, string> = {
  projects: "과제",
  budget_items: "예산",
  expenses: "집행",
  milestones: "마일스톤",
  project_personnel: "인력",
  outputs: "성과물",
  approval_flows: "결재",
  grant_matches: "공고매칭",
  company_profiles: "기업프로필",
  user_profiles: "사용자",
};

const ACTION_COLORS: Record<string, string> = {
  INSERT: "bg-green-100 text-green-800",
  UPDATE: "bg-blue-100 text-blue-800",
  DELETE: "bg-red-100 text-red-800",
};

const ACTION_LABELS: Record<string, string> = {
  INSERT: "생성",
  UPDATE: "수정",
  DELETE: "삭제",
};

const TABLES = [
  "projects",
  "budget_items",
  "expenses",
  "milestones",
  "project_personnel",
  "outputs",
  "approval_flows",
  "grant_matches",
  "company_profiles",
  "user_profiles",
];

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // 필터
  const [filterTable, setFilterTable] = useState("");
  const [filterAction, setFilterAction] = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");

  // 상세 보기
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  async function fetchLogs(p = page) {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("page", p.toString());
    params.set("limit", "30");
    if (filterTable) params.set("table", filterTable);
    if (filterAction) params.set("action", filterAction);
    if (filterDateFrom) params.set("dateFrom", filterDateFrom);
    if (filterDateTo) params.set("dateTo", filterDateTo);

    try {
      const res = await fetch(`/api/audit-logs?${params}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs);
        setTotalPages(data.totalPages);
        setTotal(data.total);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchLogs(1);
    setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterTable, filterAction, filterDateFrom, filterDateTo]);

  function handlePageChange(newPage: number) {
    setPage(newPage);
    fetchLogs(newPage);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">감사 로그</h1>
        <p className="text-muted-foreground">
          시스템 변경 이력을 조회합니다.
        </p>
      </div>

      {/* 필터 */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <div className="space-y-1">
              <Label className="text-xs">테이블</Label>
              <Select value={filterTable} onValueChange={(v) => setFilterTable(v ?? "")}>
                <SelectTrigger>
                  <SelectValue placeholder="전체" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  {TABLES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {TABLE_LABELS[t] ?? t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">작업 유형</Label>
              <Select value={filterAction} onValueChange={(v) => setFilterAction(v ?? "")}>
                <SelectTrigger>
                  <SelectValue placeholder="전체" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  <SelectItem value="INSERT">생성</SelectItem>
                  <SelectItem value="UPDATE">수정</SelectItem>
                  <SelectItem value="DELETE">삭제</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">시작일</Label>
              <Input
                type="date"
                value={filterDateFrom}
                onChange={(e) => setFilterDateFrom(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">종료일</Label>
              <Input
                type="date"
                value={filterDateTo}
                onChange={(e) => setFilterDateTo(e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setFilterTable("");
                  setFilterAction("");
                  setFilterDateFrom("");
                  setFilterDateTo("");
                }}
              >
                필터 초기화
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 로그 테이블 */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">
              변경 이력 ({total.toLocaleString()}건)
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : logs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-10">
              감사 로그가 없습니다.
            </p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[160px]">일시</TableHead>
                    <TableHead className="w-[100px]">사용자</TableHead>
                    <TableHead className="w-[70px]">작업</TableHead>
                    <TableHead className="w-[90px]">테이블</TableHead>
                    <TableHead>변경 내용</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-xs">
                        {format(new Date(log.created_at), "yyyy.MM.dd HH:mm:ss", {
                          locale: ko,
                        })}
                      </TableCell>
                      <TableCell className="text-sm">
                        {log.user_profiles?.name ?? "-"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={`text-xs ${ACTION_COLORS[log.action] ?? ""}`}
                        >
                          {ACTION_LABELS[log.action] ?? log.action}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {TABLE_LABELS[log.table_name] ?? log.table_name}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[300px] truncate">
                        {summarizeChange(log)}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => setSelectedLog(log)}
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* 페이지네이션 */}
              <div className="flex items-center justify-between mt-4">
                <p className="text-xs text-muted-foreground">
                  {page} / {totalPages} 페이지
                </p>
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    disabled={page <= 1}
                    onClick={() => handlePageChange(page - 1)}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    disabled={page >= totalPages}
                    onClick={() => handlePageChange(page + 1)}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* 상세 다이얼로그 */}
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>감사 로그 상세</DialogTitle>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">일시</p>
                  <p className="font-medium">
                    {format(
                      new Date(selectedLog.created_at),
                      "yyyy.MM.dd HH:mm:ss",
                      { locale: ko },
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">사용자</p>
                  <p className="font-medium">
                    {selectedLog.user_profiles?.name ?? "-"}{" "}
                    {selectedLog.user_profiles?.email
                      ? `(${selectedLog.user_profiles.email})`
                      : ""}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">작업</p>
                  <Badge
                    variant="secondary"
                    className={ACTION_COLORS[selectedLog.action] ?? ""}
                  >
                    {ACTION_LABELS[selectedLog.action] ?? selectedLog.action}
                  </Badge>
                </div>
                <div>
                  <p className="text-muted-foreground">테이블</p>
                  <p className="font-medium">
                    {TABLE_LABELS[selectedLog.table_name] ?? selectedLog.table_name}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">레코드 ID</p>
                  <p className="font-mono text-xs">
                    {selectedLog.record_id ?? "-"}
                  </p>
                </div>
                {selectedLog.ip_address && (
                  <div>
                    <p className="text-muted-foreground">IP 주소</p>
                    <p className="font-mono text-xs">{selectedLog.ip_address}</p>
                  </div>
                )}
              </div>

              {selectedLog.action === "UPDATE" &&
                selectedLog.old_data &&
                selectedLog.new_data && (
                  <div>
                    <p className="text-sm font-medium mb-2">변경 사항</p>
                    <div className="bg-muted rounded-lg p-3 text-xs font-mono space-y-1 max-h-60 overflow-y-auto">
                      {renderDiff(selectedLog.old_data, selectedLog.new_data)}
                    </div>
                  </div>
                )}

              {selectedLog.action === "INSERT" && selectedLog.new_data && (
                <div>
                  <p className="text-sm font-medium mb-2">생성된 데이터</p>
                  <pre className="bg-muted rounded-lg p-3 text-xs font-mono max-h-60 overflow-y-auto whitespace-pre-wrap">
                    {JSON.stringify(selectedLog.new_data, null, 2)}
                  </pre>
                </div>
              )}

              {selectedLog.action === "DELETE" && selectedLog.old_data && (
                <div>
                  <p className="text-sm font-medium mb-2">삭제된 데이터</p>
                  <pre className="bg-muted rounded-lg p-3 text-xs font-mono max-h-60 overflow-y-auto whitespace-pre-wrap">
                    {JSON.stringify(selectedLog.old_data, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function summarizeChange(log: AuditLog): string {
  if (log.action === "INSERT" && log.new_data) {
    const name =
      (log.new_data.project_name as string) ??
      (log.new_data.title as string) ??
      (log.new_data.name as string) ??
      (log.new_data.description as string);
    return name ? `"${name}" 생성` : "새 레코드 생성";
  }
  if (log.action === "DELETE" && log.old_data) {
    const name =
      (log.old_data.project_name as string) ??
      (log.old_data.title as string) ??
      (log.old_data.name as string);
    return name ? `"${name}" 삭제` : "레코드 삭제";
  }
  if (log.action === "UPDATE" && log.old_data && log.new_data) {
    const changed = Object.keys(log.new_data).filter(
      (k) =>
        JSON.stringify(log.old_data![k]) !== JSON.stringify(log.new_data![k]),
    );
    if (changed.length === 0) return "변경 없음";
    return `${changed.slice(0, 3).join(", ")} 변경${changed.length > 3 ? ` 외 ${changed.length - 3}건` : ""}`;
  }
  return "-";
}

function renderDiff(
  oldData: Record<string, unknown>,
  newData: Record<string, unknown>,
): React.ReactNode[] {
  const allKeys = new Set([...Object.keys(oldData), ...Object.keys(newData)]);
  const diffs: React.ReactNode[] = [];

  allKeys.forEach((key) => {
    const oldVal = JSON.stringify(oldData[key]);
    const newVal = JSON.stringify(newData[key]);
    if (oldVal !== newVal) {
      diffs.push(
        <div key={key} className="border-b border-border pb-1 mb-1 last:border-0">
          <span className="text-muted-foreground">{key}:</span>
          <div className="ml-4">
            <span className="text-red-600">- {oldVal ?? "null"}</span>
          </div>
          <div className="ml-4">
            <span className="text-green-600">+ {newVal ?? "null"}</span>
          </div>
        </div>,
      );
    }
  });

  if (diffs.length === 0) {
    return [<span key="none">변경 사항 없음</span>];
  }

  return diffs;
}
