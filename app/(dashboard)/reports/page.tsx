"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { FileText, Download, Loader2 } from "lucide-react";

interface ProjectOption {
  id: string;
  project_name: string;
  project_code: string | null;
  status: string;
}

const REPORT_TYPES = [
  { value: "mid", label: "중간보고서", description: "과제 중간 점검용 보고서" },
  { value: "final", label: "최종보고서", description: "과제 종료 시 제출용 보고서" },
  {
    value: "settlement",
    label: "정산보고서",
    description: "연구비 집행 상세 내역 포함",
  },
];

export default function ReportsPage() {
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [selectedProject, setSelectedProject] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/projects")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setProjects(data);
        }
      })
      .catch(console.error);
  }, []);

  async function handleGenerate() {
    if (!selectedProject || !selectedType) return;

    setGenerating(true);
    setError("");

    try {
      const res = await fetch("/api/reports/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: selectedProject,
          reportType: selectedType,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "보고서 생성에 실패했습니다.");
      }

      const blob = await res.blob();
      const contentDisposition = res.headers.get("Content-Disposition");
      let filename = "report.docx";
      if (contentDisposition) {
        const match = contentDisposition.match(/filename\*=UTF-8''(.+)/);
        if (match) {
          filename = decodeURIComponent(match[1]);
        }
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "오류가 발생했습니다.");
    } finally {
      setGenerating(false);
    }
  }

  const selectedProjectData = projects.find((p) => p.id === selectedProject);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">보고서 생성</h1>
        <p className="text-muted-foreground">
          과제별 중간/최종/정산 보고서를 자동 생성합니다.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* 보고서 설정 */}
        <Card>
          <CardHeader>
            <CardTitle>보고서 설정</CardTitle>
            <CardDescription>
              과제와 보고서 유형을 선택한 후 생성 버튼을 클릭하세요.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>과제 선택</Label>
              <Select value={selectedProject} onValueChange={(v) => setSelectedProject(v ?? "")}>
                <SelectTrigger>
                  <SelectValue placeholder="과제를 선택하세요">
                    {(value: string) => {
                      const p = projects.find((proj) => proj.id === value);
                      return p ? `${p.project_name}${p.project_code ? ` (${p.project_code})` : ""}` : value;
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.project_name}
                      {p.project_code ? ` (${p.project_code})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>보고서 유형</Label>
              <Select value={selectedType} onValueChange={(v) => setSelectedType(v ?? "")}>
                <SelectTrigger>
                  <SelectValue placeholder="보고서 유형을 선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  {REPORT_TYPES.map((rt) => (
                    <SelectItem key={rt.value} value={rt.value}>
                      {rt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedType && (
                <p className="text-xs text-muted-foreground">
                  {REPORT_TYPES.find((rt) => rt.value === selectedType)?.description}
                </p>
              )}
            </div>

            {error && (
              <p className="text-sm text-red-600">{error}</p>
            )}

            <Button
              onClick={handleGenerate}
              disabled={!selectedProject || !selectedType || generating}
              className="w-full"
            >
              {generating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  생성 중...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  보고서 생성 (DOCX)
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* 보고서 유형 안내 */}
        <div className="space-y-4">
          {REPORT_TYPES.map((rt) => (
            <Card
              key={rt.value}
              className={`transition-all ${selectedType === rt.value ? "ring-2 ring-blue-500" : ""}`}
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  {rt.label}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {rt.description}
                </p>
                <ul className="mt-2 text-xs text-muted-foreground space-y-1">
                  {rt.value === "mid" && (
                    <>
                      <li>- 과제 개요 및 연구 수행 내용</li>
                      <li>- 마일스톤 진행 현황</li>
                      <li>- KPI 달성 현황</li>
                      <li>- 참여 인력 현황</li>
                      <li>- 연구 성과물</li>
                    </>
                  )}
                  {rt.value === "final" && (
                    <>
                      <li>- 과제 개요 및 연구 수행 내용</li>
                      <li>- 마일스톤 최종 달성 현황</li>
                      <li>- KPI 최종 달성 현황</li>
                      <li>- 참여 인력 현황</li>
                      <li>- 연구비 집행 현황 (비목별)</li>
                      <li>- 연구 성과물</li>
                    </>
                  )}
                  {rt.value === "settlement" && (
                    <>
                      <li>- 과제 개요</li>
                      <li>- 연구비 집행 현황 (비목별)</li>
                      <li>- 집행 상세 내역 (건별)</li>
                      <li>- 마일스톤 및 KPI 달성 현황</li>
                      <li>- 참여 인력 현황</li>
                      <li>- 연구 성과물</li>
                    </>
                  )}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
