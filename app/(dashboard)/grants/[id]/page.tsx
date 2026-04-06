"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import type { GrantMatch, MatchStatus } from "@/lib/utils/types";
import {
  MATCH_STATUS_LABELS,
  PRODUCT_LINE_LABELS,
} from "@/lib/utils/types";
import MatchScore from "@/components/grants/MatchScore";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  Building2,
  CalendarDays,
  ExternalLink,
  Tag,
  Brain,
  Save,
  Trophy,
} from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { toast } from "sonner";

export default function GrantDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [match, setMatch] = useState<GrantMatch | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<MatchStatus>("new");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/grants/${id}`);
        if (res.ok) {
          const m = (await res.json()) as GrantMatch;
          setMatch(m);
          setStatus(m.status);
          setNotes(m.notes || "");
        }
      } catch { /* ignore */ }
      setLoading(false);
    }
    load();
  }, [id]);

  async function handleSave() {
    setSaving(true);
    const res = await fetch(`/api/grants/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, notes }),
    });
    if (res.ok) {
      toast.success("\uC800\uC7A5\uB418\uC5C8\uC2B5\uB2C8\uB2E4.");
      const updated = await res.json();
      setMatch((prev) => (prev ? { ...prev, ...updated } : prev));
    } else {
      toast.error("\uC800\uC7A5 \uC2E4\uD328");
    }
    setSaving(false);
  }

  if (loading) {
    return <div className="py-12 text-center text-muted-foreground">{"\uBD88\uB7EC\uC624\uB294 \uC911..."}</div>;
  }

  if (!match || !match.grant_announcements) {
    return <div className="py-12 text-center text-muted-foreground">{"\uACF5\uACE0\uB97C \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4."}</div>;
  }

  const grant = match.grant_announcements;
  const profile = match.company_profiles;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* \uB4A4\uB85C\uAC00\uAE30 */}
      <Button variant="ghost" size="sm" onClick={() => router.back()}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        {"\uBAA9\uB85D\uC73C\uB85C"}
      </Button>

      {/* \uD5E4\uB354 */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-xl font-bold leading-snug">{grant.title}</h1>
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            {grant.agency && (
              <span className="flex items-center gap-1">
                <Building2 className="h-4 w-4" />
                {grant.agency}
              </span>
            )}
            {grant.managing_org && (
              <span className="flex items-center gap-1">
                <Building2 className="h-4 w-4" />
                {grant.managing_org}
              </span>
            )}
            {grant.deadline && (
              <span className="flex items-center gap-1">
                <CalendarDays className="h-4 w-4" />
                {format(new Date(grant.deadline), "yyyy.MM.dd")} {"\uB9C8\uAC10"}
              </span>
            )}
          </div>
        </div>
        <MatchScore score={match.final_score} size="lg" />
      </div>

      <Separator />

      <div className="grid gap-6 md:grid-cols-3">
        {/* \uC88C\uCE21: \uC0C1\uC138 \uC815\uBCF4 */}
        <div className="space-y-4 md:col-span-2">
          {/* \uB9E4\uCE6D \uBD84\uC11D */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Brain className="h-4 w-4" />
                {"AI \uB9E4\uCE6D \uBD84\uC11D"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">{"\uD0A4\uC6CC\uB4DC \uC810\uC218:"}</span>{" "}
                  <strong>{match.keyword_score}{"\uC810"}</strong>
                </div>
                <div>
                  <span className="text-muted-foreground">{"LLM \uC810\uC218:"}</span>{" "}
                  <strong>{match.llm_score ?? "-"}{"\uC810"}</strong>
                </div>
                <div>
                  <span className="text-muted-foreground">{"\uCD5C\uC885 \uC810\uC218:"}</span>{" "}
                  <strong>{match.final_score}{"\uC810"}</strong>
                </div>
              </div>
              {match.llm_reasoning && (
                <p className="text-sm leading-relaxed">{match.llm_reasoning}</p>
              )}
              {match.matched_keywords.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  <Tag className="mr-1 h-4 w-4 text-muted-foreground" />
                  {match.matched_keywords.map((kw) => (
                    <Badge key={kw} variant="secondary" className="text-xs">
                      {kw}
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* \uACF5\uACE0 \uC0C1\uC138 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{"\uACF5\uACE0 \uC0C1\uC138"}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {grant.description && <p>{grant.description}</p>}
              {grant.budget_range && (
                <p>
                  <span className="text-muted-foreground">{"\uC5F0\uAD6C\uBE44 \uADDC\uBAA8:"}</span>{" "}
                  {grant.budget_range}
                </p>
              )}
              {grant.category && (
                <p>
                  <span className="text-muted-foreground">{"\uBD84\uC57C:"}</span>{" "}
                  {grant.category}
                </p>
              )}
              {grant.announcement_date && (
                <p>
                  <span className="text-muted-foreground">{"\uACF5\uACE0\uC77C:"}</span>{" "}
                  {format(new Date(grant.announcement_date), "yyyy.MM.dd")}
                </p>
              )}
              {grant.url && (
                <a
                  href={grant.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-blue-600 hover:underline"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  {"\uC6D0\uBB38 \uBCF4\uAE30"}
                </a>
              )}
            </CardContent>
          </Card>
        </div>

        {/* \uC6B0\uCE21: \uC0C1\uD0DC \uAD00\uB9AC */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{"\uC0C1\uD0DC \uAD00\uB9AC"}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {profile && (
                <div className="text-sm">
                  <span className="text-muted-foreground">{"\uB9E4\uCE6D \uC81C\uD488:"}</span>
                  <p className="font-medium">
                    {PRODUCT_LINE_LABELS[profile.product_line]} -{" "}
                    {profile.product_name}
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">{"\uC0C1\uD0DC"}</label>
                <Select value={status} onValueChange={(v) => setStatus(v as MatchStatus)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(MATCH_STATUS_LABELS).map(([val, label]) => (
                      <SelectItem key={val} value={val}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">{"\uBA54\uBAA8"}</label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={"\uAC80\uD1A0 \uBA54\uBAA8\uB97C \uC785\uB825\uD558\uC138\uC694..."}
                  rows={4}
                />
              </div>

              <Button
                className="w-full"
                onClick={handleSave}
                disabled={saving}
              >
                <Save className="mr-2 h-4 w-4" />
                {saving ? "\uC800\uC7A5 \uC911..." : "\uC800\uC7A5"}
              </Button>

              {/* \uACFC\uC81C \uB4F1\uB85D \uC804\uD658 */}
              <Link href={`/projects/new?grant_match_id=${match.id}`} className="block w-full">
                <Button className="w-full">
                  <Trophy className="mr-2 h-4 w-4" />
                  {"\uACFC\uC81C \uB4F1\uB85D"}
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
