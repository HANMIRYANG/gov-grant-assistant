"use client";

import { useEffect, useState, useCallback } from "react";
import type { UserProfile, UserRole } from "@/lib/utils/types";
import { USER_ROLE_LABELS } from "@/lib/utils/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card, CardContent, CardHeader, CardTitle,
} from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Pencil, UserPlus, Shield, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils/helpers";

interface UserForm {
  name: string;
  email: string;
  department: string;
  position: string;
  role: UserRole;
  phone: string;
  is_active: boolean;
}

const emptyForm: UserForm = {
  name: "",
  email: "",
  department: "",
  position: "",
  role: "researcher",
  phone: "",
  is_active: true,
};

const ROLE_COLORS: Record<UserRole, string> = {
  admin: "bg-red-100 text-red-800",
  executive: "bg-purple-100 text-purple-800",
  pm: "bg-blue-100 text-blue-800",
  researcher: "bg-green-100 text-green-800",
  finance: "bg-amber-100 text-amber-800",
};

export default function UsersPage() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<UserForm>(emptyForm);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/users?all=true");
      const data = await res.json();
      setUsers(Array.isArray(data) ? data : []);
    } catch {
      setUsers([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  function openEdit(user: UserProfile) {
    setEditingId(user.id);
    setForm({
      name: user.name,
      email: user.email,
      department: user.department || "",
      position: user.position || "",
      role: user.role,
      phone: user.phone || "",
      is_active: user.is_active,
    });
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!form.name) {
      toast.error("이름을 입력해주세요.");
      return;
    }

    if (!editingId) {
      toast.error("사용자 수정만 지원됩니다. 새 사용자는 Supabase Auth에서 생성 후 프로필을 수정해주세요.");
      return;
    }

    const res = await fetch(`/api/users/${editingId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    if (res.ok) {
      toast.success("수정되었습니다.");
      setDialogOpen(false);
      loadUsers();
    } else {
      const err = await res.json();
      toast.error(err.error || "저장 실패");
    }
  }

  async function toggleActive(user: UserProfile) {
    const newActive = !user.is_active;
    const res = await fetch(`/api/users/${user.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: newActive }),
    });
    if (res.ok) {
      toast.success(newActive ? "활성화되었습니다." : "비활성화되었습니다.");
      loadUsers();
    }
  }

  const activeUsers = users.filter((u) => u.is_active);
  const inactiveUsers = users.filter((u) => !u.is_active);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{"사용자 관리"}</h1>
          <p className="text-muted-foreground">
            {"시스템 사용자 역할 및 프로필 관리"}
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <Card><CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">{"전체 사용자"}</p>
          <p className="text-2xl font-bold">{users.length}{"명"}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">{"활성 사용자"}</p>
          <p className="text-2xl font-bold text-green-600">{activeUsers.length}{"명"}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">{"관리자"}</p>
          <p className="text-2xl font-bold">{users.filter((u) => u.role === "admin").length}{"명"}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">{"연구원"}</p>
          <p className="text-2xl font-bold">{users.filter((u) => u.role === "researcher" || u.role === "pm").length}{"명"}</p>
        </CardContent></Card>
      </div>

      {loading ? (
        <div className="py-12 text-center text-muted-foreground">{"불러오는 중..."}</div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>{"사용자 목록"}</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{"이름"}</TableHead>
                  <TableHead>{"이메일"}</TableHead>
                  <TableHead>{"부서"}</TableHead>
                  <TableHead>{"직위"}</TableHead>
                  <TableHead>{"역할"}</TableHead>
                  <TableHead>{"상태"}</TableHead>
                  <TableHead>{"가입일"}</TableHead>
                  <TableHead className="w-20" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                      {"등록된 사용자가 없습니다."}
                      <p className="mt-2 text-sm">
                        {"Supabase Auth에서 사용자를 생성하면 자동으로 표시됩니다."}
                      </p>
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((user) => (
                    <TableRow key={user.id} className={!user.is_active ? "opacity-50" : ""}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {user.role === "admin" && <ShieldCheck className="h-4 w-4 text-red-500" />}
                          {user.name}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{user.email}</TableCell>
                      <TableCell>{user.department || "-"}</TableCell>
                      <TableCell>{user.position || "-"}</TableCell>
                      <TableCell>
                        <Badge className={ROLE_COLORS[user.role]}>
                          {USER_ROLE_LABELS[user.role]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {user.is_active ? (
                          <Badge className="bg-green-100 text-green-800">{"활성"}</Badge>
                        ) : (
                          <Badge variant="destructive">{"비활성"}</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(user.created_at?.slice(0, 10))}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(user)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* 수정 다이얼로그 */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{"사용자 정보 수정"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>{"이름"} *</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>{"이메일"}</Label>
                <Input value={form.email} disabled className="bg-muted" />
              </div>
              <div className="space-y-2">
                <Label>{"부서"}</Label>
                <Input
                  value={form.department}
                  onChange={(e) => setForm({ ...form, department: e.target.value })}
                  placeholder={"예: 연구소"}
                />
              </div>
              <div className="space-y-2">
                <Label>{"직위"}</Label>
                <Input
                  value={form.position}
                  onChange={(e) => setForm({ ...form, position: e.target.value })}
                  placeholder={"예: 책임연구원"}
                />
              </div>
              <div className="space-y-2">
                <Label>{"역할"}</Label>
                <Select value={form.role} onValueChange={(v) => v && setForm({ ...form, role: v as UserRole })}>
                  <SelectTrigger>
                    <span>{USER_ROLE_LABELS[form.role]}</span>
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(USER_ROLE_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{"연락처"}</Label>
                <Input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder={"010-0000-0000"}
                />
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-lg border p-3">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                  className="h-4 w-4 rounded"
                />
                {"활성 상태"}
              </label>
              <span className="text-xs text-muted-foreground">
                {"비활성화하면 로그인은 가능하지만 시스템 접근이 제한됩니다."}
              </span>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                {"취소"}
              </Button>
              <Button onClick={handleSave}>{"저장"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
