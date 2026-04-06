import Link from "next/link";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import MatchScore from "./MatchScore";
import type { GrantMatch, MatchStatus } from "@/lib/utils/types";
import { MATCH_STATUS_LABELS, PRODUCT_LINE_LABELS } from "@/lib/utils/types";
import { CalendarDays, Building2, ExternalLink, FolderPlus, Info } from "lucide-react";

const statusVariant: Record<MatchStatus, "default" | "secondary" | "destructive" | "outline"> = {
  new: "default",
  reviewed: "secondary",
  applying: "outline",
  applied: "outline",
  rejected: "destructive",
  won: "default",
};

interface GrantCardProps {
  match: GrantMatch;
}

export default function GrantCard({ match }: GrantCardProps) {
  const grant = match.grant_announcements;
  const profile = match.company_profiles;
  if (!grant) return null;

  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 space-y-1">
            <CardTitle className="text-base leading-snug">
              {grant.title}
            </CardTitle>
            <CardDescription className="flex flex-wrap items-center gap-2 text-xs">
              {grant.agency && (
                <span className="flex items-center gap-1">
                  <Building2 className="h-3 w-3" />
                  {grant.agency}
                </span>
              )}
              {grant.deadline && (
                <span className="flex items-center gap-1">
                  <CalendarDays className="h-3 w-3" />
                  {format(new Date(grant.deadline), "yyyy.MM.dd")}{" "}
                  {"\uB9C8\uAC10"}
                </span>
              )}
            </CardDescription>
          </div>
          <MatchScore score={match.final_score} />
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={statusVariant[match.status]}>
            {MATCH_STATUS_LABELS[match.status]}
          </Badge>
          {profile && (
            <Badge variant="outline">
              {PRODUCT_LINE_LABELS[profile.product_line]} - {profile.product_name}
            </Badge>
          )}
          {grant.url && (
            <a
              href={grant.url}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <ExternalLink className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
            </a>
          )}
        </div>
        {match.llm_reasoning && (
          <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
            {match.llm_reasoning}
          </p>
        )}

        {/* \uC561\uC158 \uBC84\uD2BC */}
        <div className="mt-3 flex gap-2">
          <Link href={`/projects/new?grant_match_id=${match.id}`} className="flex-1">
            <Button className="w-full" size="sm">
              <FolderPlus className="mr-2 h-4 w-4" />
              {"\uACFC\uC81C \uB4F1\uB85D"}
            </Button>
          </Link>
          <Link href={`/grants/${match.id}`}>
            <Button variant="outline" size="sm">
              <Info className="mr-2 h-4 w-4" />
              {"\uC0C1\uC138"}
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
