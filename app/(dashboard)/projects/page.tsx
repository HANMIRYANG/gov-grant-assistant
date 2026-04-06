"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { Project, ProjectStatus, ProductLine } from "@/lib/utils/types";
import { PROJECT_STATUS_LABELS, PRODUCT_LINE_LABELS } from "@/lib/utils/types";
import { formatWon, formatDate, dDay } from "@/lib/utils/helpers";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Plus, FolderOpen } from "lucide-react";

const STATUS_COLORS: Record<ProjectStatus, string> = {
  preparing: "bg-yellow-100 text-yellow-800",
  active: "bg-green-100 text-green-800",
  suspended: "bg-red-100 text-red-800",
  completed: "bg-blue-100 text-blue-800",
  follow_up: "bg-purple-100 text-purple-800",
};

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [lineFilter, setLineFilter] = useState("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadProjects();
  }, []);

  async function loadProjects() {
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("projects")
      .select("*, pi:user_profiles!projects_pi_id_fkey(id, name)")
      .order("created_at", { ascending: false });

    setProjects((data as Project[]) || []);
    setLoading(false);
  }

  const filtered = projects.filter((p) => {
    if (statusFilter !== "all" && p.status !== statusFilter) return false;
    if (lineFilter !== "all" && p.product_line !== lineFilter) return false;
    if (search && !p.project_name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{"\uACFC\uC81C \uAD00\uB9AC"}</h1>
          <p className="text-muted-foreground">
            {"\uC218\uC8FC \uACFC\uC81C \uBAA9\uB85D \uBC0F \uAD00\uB9AC"}
          </p>
        </div>
        <Link href="/projects/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            {"\uACFC\uC81C \uB4F1\uB85D"}
          </Button>
        </Link>
      </div>

      {/* \uD544\uD130 */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <Tabs value={statusFilter} onValueChange={setStatusFilter}>
          <TabsList>
            <TabsTrigger value="all">{"\uC804\uCCB4"}</TabsTrigger>
            {Object.entries(PROJECT_STATUS_LABELS).map(([k, v]) => (
              <TabsTrigger key={k} value={k}>{v}</TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <Select value={lineFilter} onValueChange={(v) => setLineFilter(v ?? "all")}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder={"\uC81C\uD488\uB77C\uC778"} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{"\uC804\uCCB4"}</SelectItem>
            {Object.entries(PRODUCT_LINE_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={"\uACFC\uC81C\uBA85 \uAC80\uC0C9..."}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* \uACB0\uACFC */}
      {loading ? (
        <div className="py-12 text-center text-muted-foreground">{"\uBD88\uB7EC\uC624\uB294 \uC911..."}</div>
      ) : filtered.length === 0 ? (
        <Card className="p-12 text-center text-muted-foreground">
          <FolderOpen className="mx-auto mb-4 h-12 w-12 opacity-30" />
          <p>{projects.length === 0 ? "\uB4F1\uB85D\uB41C \uACFC\uC81C\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4." : "\uAC80\uC0C9 \uACB0\uACFC\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4."}</p>
          {projects.length === 0 && (
            <Link href="/projects/new" className="mt-4 inline-block">
              <Button variant="outline">{"\uACFC\uC81C \uB4F1\uB85D\uD558\uAE30"}</Button>
            </Link>
          )}
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {filtered.map((project) => (
            <Link key={project.id} href={`/projects/${project.id}`}>
              <Card className="transition-shadow hover:shadow-md cursor-pointer">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base leading-snug">{project.project_name}</CardTitle>
                    <Badge className={STATUS_COLORS[project.status]}>
                      {PROJECT_STATUS_LABELS[project.status]}
                    </Badge>
                  </div>
                  <div className="flex gap-2 text-sm text-muted-foreground">
                    {project.funding_agency && <span>{project.funding_agency}</span>}
                    {project.project_code && (
                      <span className="text-xs font-mono">{project.project_code}</span>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">{"\uCD1D \uC608\uC0B0"}</p>
                      <p className="font-medium">{formatWon(project.total_budget)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">{"\uAE30\uAC04"}</p>
                      <p className="font-medium">
                        {formatDate(project.start_date)} ~ {formatDate(project.end_date)}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">{"\uB9C8\uAC10"}</p>
                      <p className="font-medium">{project.end_date ? dDay(project.end_date) : "-"}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <Badge variant="outline">
                      {PRODUCT_LINE_LABELS[project.product_line]}
                    </Badge>
                    {project.pi && (
                      <span className="text-xs text-muted-foreground">
                        {"PM: "}{(project.pi as unknown as { name: string }).name}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
