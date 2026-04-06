"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Tag, Users, Mail, Bell, Clock, Shield } from "lucide-react";
import { toast } from "sonner";

const settingsLinks = [
  {
    title: "매칭 키워드 관리",
    description: "한미르 제품별 기술 프로필 및 매칭 키워드 설정",
    href: "/settings/keywords",
    icon: Tag,
  },
  {
    title: "사용자 관리",
    description: "시스템 사용자 및 역할 관리",
    href: "/settings/users",
    icon: Users,
  },
];

export default function SettingsPage() {
  // 알림 설정 상태
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [deadlineAlerts, setDeadlineAlerts] = useState([30, 14, 7, 3]);
  const [budgetAlertThresholds, setBudgetAlertThresholds] = useState([80, 95]);
  const [grantAlertMinScore, setGrantAlertMinScore] = useState(60);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{"설정"}</h1>
        <p className="text-muted-foreground">{"시스템 설정 및 관리"}</p>
      </div>

      {/* 바로가기 카드 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {settingsLinks.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href}>
              <Card className="transition-shadow hover:shadow-md cursor-pointer">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{item.title}</CardTitle>
                      <CardDescription>{item.description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* 일반 설정 탭 */}
      <Tabs defaultValue="notifications">
        <TabsList>
          <TabsTrigger value="notifications">{"알림 설정"}</TabsTrigger>
          <TabsTrigger value="email">{"이메일 (SMTP)"}</TabsTrigger>
          <TabsTrigger value="system">{"시스템 정보"}</TabsTrigger>
        </TabsList>

        {/* 알림 설정 */}
        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-4 w-4" />{"알림 규칙"}
              </CardTitle>
              <CardDescription>{"과제 마감일, 예산 소진율, 추천 공고에 대한 알림 설정"}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <Label className="text-base font-medium">{"마감일 사전 알림"}</Label>
                <p className="text-sm text-muted-foreground">
                  {"마일스톤/과제 마감 전 지정된 일수에 알림을 발송합니다."}
                </p>
                <div className="flex flex-wrap gap-2">
                  {[3, 7, 14, 30, 60].map((d) => (
                    <Badge
                      key={d}
                      variant={deadlineAlerts.includes(d) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => {
                        setDeadlineAlerts((prev) =>
                          prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort((a, b) => b - a)
                        );
                      }}
                    >
                      {d}{"일 전"}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-base font-medium">{"예산 소진율 경고"}</Label>
                <p className="text-sm text-muted-foreground">
                  {"비목별 예산 소진율이 기준치에 도달하면 경고를 발송합니다."}
                </p>
                <div className="flex flex-wrap gap-2">
                  {[50, 70, 80, 90, 95].map((p) => (
                    <Badge
                      key={p}
                      variant={budgetAlertThresholds.includes(p) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => {
                        setBudgetAlertThresholds((prev) =>
                          prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p].sort()
                        );
                      }}
                    >
                      {p}%
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-base font-medium">{"추천 공고 알림 기준"}</Label>
                <p className="text-sm text-muted-foreground">
                  {"매칭 점수가 이 기준 이상인 공고만 알림으로 발송합니다."}
                </p>
                <div className="flex items-center gap-3">
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={grantAlertMinScore}
                    onChange={(e) => setGrantAlertMinScore(Number(e.target.value))}
                    className="w-24"
                  />
                  <span className="text-sm text-muted-foreground">{"점 이상"}</span>
                </div>
              </div>

              <Button onClick={() => toast.success("알림 설정이 저장되었습니다.")}>
                {"설정 저장"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 이메일 설정 */}
        <TabsContent value="email">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-4 w-4" />{"SMTP 설정"}
              </CardTitle>
              <CardDescription>{"하이웍스 SMTP를 통한 이메일 알림 설정 (환경변수로 관리)"}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg bg-muted p-4 space-y-2 font-mono text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">SMTP_HOST</span>
                  <span>smtp.hiworks.com</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">SMTP_PORT</span>
                  <span>587</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">SMTP_USER</span>
                  <span>{process.env.NEXT_PUBLIC_SMTP_USER || "••••••"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">SMTP_FROM</span>
                  <span>{process.env.NEXT_PUBLIC_SMTP_FROM || "••••••"}</span>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                {"SMTP 설정은 환경변수(.env.local)에서 관리됩니다. Vercel 대시보드에서 수정할 수 있습니다."}
              </p>

              <div className="flex items-center gap-3 rounded-lg border p-3">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={emailEnabled}
                    onChange={(e) => setEmailEnabled(e.target.checked)}
                    className="h-4 w-4 rounded"
                  />
                  {"이메일 알림 활성화"}
                </label>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 시스템 정보 */}
        <TabsContent value="system">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-4 w-4" />{"시스템 정보"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-lg border p-4">
                    <p className="text-sm text-muted-foreground">{"프레임워크"}</p>
                    <p className="font-medium">Next.js 16 (App Router)</p>
                  </div>
                  <div className="rounded-lg border p-4">
                    <p className="text-sm text-muted-foreground">{"데이터베이스"}</p>
                    <p className="font-medium">Supabase PostgreSQL</p>
                  </div>
                  <div className="rounded-lg border p-4">
                    <p className="text-sm text-muted-foreground">{"배포 환경"}</p>
                    <p className="font-medium">Vercel Pro</p>
                  </div>
                  <div className="rounded-lg border p-4">
                    <p className="text-sm text-muted-foreground">{"LLM 매칭"}</p>
                    <p className="font-medium">Google Gemini 2.5 Flash</p>
                  </div>
                </div>

                <div className="rounded-lg border p-4">
                  <p className="text-sm text-muted-foreground mb-2">{"Cron 스케줄"}</p>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="font-mono text-sm">0 21 * * *</span>
                    <span className="text-sm text-muted-foreground">{"(매일 KST 06:00 — 공고 수집 + 매칭 + 알림)"}</span>
                  </div>
                </div>

                <div className="rounded-lg border p-4">
                  <p className="text-sm text-muted-foreground mb-2">{"버전 정보"}</p>
                  <p className="text-sm">{"한미르 과제관리 시스템 v0.1.0"}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {"Phase 1~4 구현 완료: 인증, 공고추천, 과제관리, 일정/인력/성과물"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
