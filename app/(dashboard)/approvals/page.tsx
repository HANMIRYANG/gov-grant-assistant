"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { ApprovalFlow, ApprovalStatus } from "@/lib/utils/types";
import { APPROVAL_STATUS_LABELS, BUDGET_CATEGORY_LABELS } from "@/lib/utils/types";
import { formatWon, formatDate } from "@/lib/utils/helpers";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Card, CardContent, CardHeader, CardTitle,
} from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Check, X, FileText } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
};

interface ApprovalWithExpense extends Omit<ApprovalFlow, "expenses"> {
  expenses: {
    id: string;
    amount: number;
    expense_date: string;
    vendor: string;
    description: string;
    budget_item_id: string;
    budget_items?: {
      project_id: string;
      category: string;
      projects?: { project_name: string };
    };
    submitted_by_user?: { name: string };
  };
}

export default function ApprovalsPage() {
  const [approvals, setApprovals] = useState<ApprovalWithExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("pending");
  const [selectedApproval, setSelectedApproval] = useState<ApprovalWithExpense | null>(null);
  const [comment, setComment] = useState("");
  const [acting, setActing] = useState(false);

  useEffect(() => {
    loadApprovals();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadApprovals() {
    setLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("approval_flows")
      .select("*, expenses(id, amount, expense_date, vendor, description, budget_item_id, budget_items(project_id, category, projects(project_name)), submitted_by_user:user_profiles!expenses_submitted_by_fkey(name))")
      .eq("approver_id", user.id)
      .order("created_at", { ascending: false });

    setApprovals((data as unknown as ApprovalWithExpense[]) || []);
    setLoading(false);
  }

  async function handleAction(action: "approved" | "rejected") {
    if (!selectedApproval) return;
    setActing(true);

    try {
      const res = await fetch(`/api/approvals/${selectedApproval.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, comment }),
      });

      if (!res.ok) throw new Error(await res.text());

      toast.success(action === "approved" ? "\uC2B9\uC778\uB418\uC5C8\uC2B5\uB2C8\uB2E4." : "\uBC18\uB824\uB418\uC5C8\uC2B5\uB2C8\uB2E4.");
      setSelectedApproval(null);
      setComment("");
      loadApprovals();
    } catch (e) {
      toast.error(`\uC624\uB958: ${e}`);
    } finally {
      setActing(false);
    }
  }

  const filtered = approvals.filter((a) => filter === "all" || a.status === filter);
  const pendingCount = approvals.filter((a) => a.status === "pending").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{"\uC804\uC790\uACB0\uC7AC"}</h1>
        <p className="text-muted-foreground">
          {"\uC5F0\uAD6C\uBE44 \uC9D1\uD589 \uC2B9\uC778/\uBC18\uB824"}
          {pendingCount > 0 && (
            <Badge className="ml-2 bg-yellow-100 text-yellow-800">{pendingCount}{"\uAC74 \uB300\uAE30\uC911"}</Badge>
          )}
        </p>
      </div>

      <Tabs value={filter} onValueChange={setFilter}>
        <TabsList>
          <TabsTrigger value="all">{"\uC804\uCCB4"} ({approvals.length})</TabsTrigger>
          <TabsTrigger value="pending">{"\uB300\uAE30"} ({approvals.filter((a) => a.status === "pending").length})</TabsTrigger>
          <TabsTrigger value="approved">{"\uC2B9\uC778"} ({approvals.filter((a) => a.status === "approved").length})</TabsTrigger>
          <TabsTrigger value="rejected">{"\uBC18\uB824"} ({approvals.filter((a) => a.status === "rejected").length})</TabsTrigger>
        </TabsList>
      </Tabs>

      {loading ? (
        <div className="py-12 text-center text-muted-foreground">{"\uBD88\uB7EC\uC624\uB294 \uC911..."}</div>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{"\uC0C1\uD0DC"}</TableHead>
                  <TableHead>{"\uACFC\uC81C\uBA85"}</TableHead>
                  <TableHead>{"\uC9D1\uD589 \uD56D\uBAA9"}</TableHead>
                  <TableHead>{"\uBE44\uBAA9"}</TableHead>
                  <TableHead className="text-right">{"\uAE08\uC561"}</TableHead>
                  <TableHead>{"\uC9D1\uD589\uC77C"}</TableHead>
                  <TableHead>{"\uC2E0\uCCAD\uC790"}</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell>
                      <Badge className={STATUS_COLORS[a.status]}>
                        {APPROVAL_STATUS_LABELS[a.status as ApprovalStatus]}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {(a.expenses?.budget_items?.projects as unknown as { project_name: string })?.project_name || "-"}
                    </TableCell>
                    <TableCell className="font-medium">{a.expenses?.description}</TableCell>
                    <TableCell>
                      {a.expenses?.budget_items?.category ? BUDGET_CATEGORY_LABELS[a.expenses.budget_items.category as keyof typeof BUDGET_CATEGORY_LABELS] : "-"}
                    </TableCell>
                    <TableCell className="text-right">{formatWon(a.expenses?.amount || 0)}</TableCell>
                    <TableCell>{formatDate(a.expenses?.expense_date)}</TableCell>
                    <TableCell>{(a.expenses?.submitted_by_user as unknown as { name: string })?.name || "-"}</TableCell>
                    <TableCell>
                      {a.status === "pending" ? (
                        <Button size="sm" variant="outline" onClick={() => { setSelectedApproval(a); setComment(""); }}>
                          <FileText className="mr-1 h-3 w-3" />{"\uACB0\uC7AC"}
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          {a.decided_at ? formatDate(a.decided_at) : ""}
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                      {filter === "pending" ? "\uB300\uAE30 \uC911\uC778 \uACB0\uC7AC\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4." : "\uACB0\uC7AC \uB0B4\uC5ED\uC774 \uC5C6\uC2B5\uB2C8\uB2E4."}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* \uACB0\uC7AC \uB2E4\uC774\uC5BC\uB85C\uADF8 */}
      <Dialog open={!!selectedApproval} onOpenChange={(open) => !open && setSelectedApproval(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{"\uACB0\uC7AC \uCC98\uB9AC"}</DialogTitle></DialogHeader>
          {selectedApproval && (
            <div className="space-y-4">
              <dl className="grid gap-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">{"\uC124\uBA85"}</dt>
                  <dd className="font-medium">{selectedApproval.expenses?.description}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">{"\uAE08\uC561"}</dt>
                  <dd className="font-medium">{formatWon(selectedApproval.expenses?.amount || 0)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">{"\uACF5\uAE09\uC5C5\uCCB4"}</dt>
                  <dd>{selectedApproval.expenses?.vendor || "-"}</dd>
                </div>
              </dl>

              <div>
                <label className="text-sm font-medium">{"\uCF54\uBA58\uD2B8"}</label>
                <Textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder={"\uC2B9\uC778/\uBC18\uB824 \uC0AC\uC720 (\uC120\uD0DD)"}
                  rows={2}
                />
              </div>

              <div className="flex gap-3">
                <Button
                  className="flex-1"
                  variant="destructive"
                  onClick={() => handleAction("rejected")}
                  disabled={acting}
                >
                  <X className="mr-2 h-4 w-4" />{"\uBC18\uB824"}
                </Button>
                <Button
                  className="flex-1"
                  onClick={() => handleAction("approved")}
                  disabled={acting}
                >
                  <Check className="mr-2 h-4 w-4" />{"\uC2B9\uC778"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
