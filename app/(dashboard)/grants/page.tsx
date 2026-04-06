"use client";

import { useEffect, useState, useRef } from "react";
import type { GrantMatch } from "@/lib/utils/types";
import { MATCH_STATUS_LABELS } from "@/lib/utils/types";
import GrantCard from "@/components/grants/GrantCard";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search, RefreshCw, Play, X, Zap, RotateCcw } from "lucide-react";
import { toast } from "sonner";

const STATUS_FILTERS: Array<{ value: string; label: string }> = [
  { value: "all", label: "\uC804\uCCB4" },
  ...Object.entries(MATCH_STATUS_LABELS).map(([value, label]) => ({
    value,
    label,
  })),
];

export default function GrantsPage() {
  const [matches, setMatches] = useState<GrantMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // 수동 실행 상태
  const [running, setRunning] = useState(false);
  const [pipelineLog, setPipelineLog] = useState<string[]>([]);
  const [showLog, setShowLog] = useState(false);
  const logEndRef = useRef<HTMLDivElement>(null);

  async function loadMatches() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "100" });
      if (statusFilter !== "all") params.set("status", statusFilter);
      const res = await fetch(`/api/grants?${params}`);
      const data = await res.json();
      setMatches(Array.isArray(data) ? (data as GrantMatch[]) : []);
    } catch {
      setMatches([]);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadMatches();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [pipelineLog]);

  async function runPipeline(skipLlm: boolean, reprocessAll = false) {
    setRunning(true);
    setShowLog(true);
    setPipelineLog([
      reprocessAll
        ? "\u25B6 \uC804\uCCB4 \uC7AC\uD3C9\uAC00 \uC2DC\uC791 (\uBAA8\uB4E0 \uACF5\uACE0 \uB9AC\uC14B + LLM \uB9E4\uCE6D)..."
        : skipLlm
          ? "\u25B6 \uC218\uB3D9 \uC2E4\uD589 \uC2DC\uC791 (\uD0A4\uC6CC\uB4DC \uB9E4\uCE6D\uB9CC)..."
          : "\u25B6 \uC218\uB3D9 \uC2E4\uD589 \uC2DC\uC791 (\uD0A4\uC6CC\uB4DC + LLM \uC815\uBC00 \uB9E4\uCE6D)...",
    ]);

    try {
      const res = await fetch("/api/grants/run-pipeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skipEmail: true, skipLlm, reprocessAll }),
      });

      const result = await res.json();

      if (result.log) {
        setPipelineLog((prev) => [...prev, ...result.log]);
      }

      if (result.ok) {
        setPipelineLog((prev) => [
          ...prev,
          "",
          `\u2705 \uC644\uB8CC! ${result.matchCount || 0}\uAC74 \uB9E4\uCE6D \uC800\uC7A5\uB428`,
        ]);
        toast.success(`\uD30C\uC774\uD504\uB77C\uC778 \uC644\uB8CC: ${result.matchCount || 0}\uAC74 \uB9E4\uCE6D`);
        loadMatches();
      } else {
        setPipelineLog((prev) => [
          ...prev,
          "",
          `\u274C \uC624\uB958 \uBC1C\uC0DD: ${result.error || "unknown"}`,
        ]);
        toast.error("\uD30C\uC774\uD504\uB77C\uC778 \uC2E4\uD589 \uC2E4\uD328");
      }
    } catch (e) {
      setPipelineLog((prev) => [...prev, `\u274C \uB124\uD2B8\uC6CC\uD06C \uC624\uB958: ${e}`]);
      toast.error("\uC694\uCCAD \uC2E4\uD328");
    } finally {
      setRunning(false);
    }
  }

  const filtered = searchQuery
    ? matches.filter(
        (m) =>
          m.grant_announcements?.title
            ?.toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          m.grant_announcements?.agency
            ?.toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          m.llm_reasoning
            ?.toLowerCase()
            .includes(searchQuery.toLowerCase()),
      )
    : matches;

  return (
    <div className="space-y-6">
      {/* \uD5E4\uB354 */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{"\uACFC\uC81C \uACF5\uACE0 \uCD94\uCC9C"}</h1>
          <p className="text-muted-foreground">
            {"\uD55C\uBBF8\uB974 \uAE30\uC220 \uD504\uB85C\uD544\uACFC \uB9E4\uCE6D\uB41C \uC815\uBD80 R&D \uACF5\uACE0"}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => runPipeline(true)}
            disabled={running}
          >
            <Zap className="mr-2 h-4 w-4" />
            {"\uBE60\uB978 \uC2E4\uD589"}
          </Button>
          <Button
            size="sm"
            onClick={() => runPipeline(false)}
            disabled={running}
          >
            <Play className={`mr-2 h-4 w-4 ${running ? "animate-pulse" : ""}`} />
            {running ? "\uC2E4\uD589 \uC911..." : "\uC218\uB3D9 \uC2E4\uD589"}
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => {
              if (confirm("\uBAA8\uB4E0 \uACF5\uACE0\uB97C \uC7AC\uD3C9\uAC00\uD569\uB2C8\uB2E4. LLM API \uBE44\uC6A9\uC774 \uBC1C\uC0DD\uD569\uB2C8\uB2E4. \uACC4\uC18D\uD558\uC2DC\uACA0\uC2B5\uB2C8\uAE4C?")) {
                runPipeline(false, true);
              }
            }}
            disabled={running}
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            {"\uC804\uCCB4 \uC7AC\uD3C9\uAC00"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={loadMatches}
            disabled={loading}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            {"\uC0C8\uB85C\uACE0\uCE68"}
          </Button>
        </div>
      </div>

      {/* \uC2E4\uD589 \uB85C\uADF8 \uD328\uB110 */}
      {showLog && (
        <Card className="border-blue-200 bg-blue-50/50 dark:border-blue-900 dark:bg-blue-950/20">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">
                {running ? "\u23F3 \uD30C\uC774\uD504\uB77C\uC778 \uC2E4\uD589 \uC911..." : "\uD30C\uC774\uD504\uB77C\uC778 \uC2E4\uD589 \uACB0\uACFC"}
              </CardTitle>
              {!running && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => setShowLog(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="max-h-60 overflow-y-auto rounded bg-gray-900 p-3 font-mono text-xs text-green-400">
              {pipelineLog.map((line, i) => (
                <div key={i} className={line.startsWith("\u274C") ? "text-red-400" : line.startsWith("\u2705") ? "text-green-300 font-bold" : ""}>
                  {line || "\u00A0"}
                </div>
              ))}
              {running && (
                <div className="animate-pulse text-yellow-400">
                  \u2588
                </div>
              )}
              <div ref={logEndRef} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* \uD544\uD130 */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <Tabs
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v)}
        >
          <TabsList>
            {STATUS_FILTERS.slice(0, 5).map((f) => (
              <TabsTrigger key={f.value} value={f.value}>
                {f.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={"\uACF5\uACE0\uBA85, \uAE30\uAD00\uBA85 \uAC80\uC0C9..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* \uACB0\uACFC */}
      {loading ? (
        <div className="py-12 text-center text-muted-foreground">
          {"\uBD88\uB7EC\uC624\uB294 \uC911..."}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-lg border bg-card p-12 text-center text-muted-foreground">
          <p>
            {matches.length === 0
              ? "\uCD94\uCC9C \uACF5\uACE0\uAC00 \uC544\uC9C1 \uC5C6\uC2B5\uB2C8\uB2E4."
              : "\uAC80\uC0C9 \uACB0\uACFC\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4."}
          </p>
          {matches.length === 0 && (
            <p className="mt-2 text-sm">
              {"\uC704\uC758 \"\uC218\uB3D9 \uC2E4\uD589\" \uBC84\uD2BC\uC744 \uB20C\uB7EC \uACF5\uACE0 \uC218\uC9D1 \uBC0F \uB9E4\uCE6D\uC744 \uC2DC\uC791\uD558\uC138\uC694."}
            </p>
          )}
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {filtered.map((match) => (
            <GrantCard key={match.id} match={match} />
          ))}
        </div>
      )}
    </div>
  );
}
