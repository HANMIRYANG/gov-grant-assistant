"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/lib/utils/types";
import {
  LayoutDashboard,
  Search,
  FolderKanban,
  CalendarRange,
  ClipboardCheck,
  Users,
  Settings,
  ChevronLeft,
  ChevronRight,
  Shield,
  FileText,
  ScrollText,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  roles?: UserRole[]; // 비어있으면 모든 역할 접근 가능
}

const navItems: NavItem[] = [
  { label: "대시보드", href: "/", icon: LayoutDashboard },
  { label: "과제 공고", href: "/grants", icon: Search },
  { label: "과제 관리", href: "/projects", icon: FolderKanban },
  { label: "일정 관리", href: "/schedule", icon: CalendarRange },
  { label: "인력 관리", href: "/personnel", icon: Users },
  {
    label: "전자결재",
    href: "/approvals",
    icon: ClipboardCheck,
    roles: ["admin", "executive", "pm", "finance"],
  },
  {
    label: "보고서",
    href: "/reports",
    icon: FileText,
    roles: ["admin", "executive", "pm"],
  },
  {
    label: "감사 로그",
    href: "/audit-logs",
    icon: ScrollText,
    roles: ["admin", "executive"],
  },
  {
    label: "설정",
    href: "/settings",
    icon: Settings,
    roles: ["admin", "executive", "pm"],
  },
];

interface SidebarProps {
  userRole: UserRole;
}

export default function Sidebar({ userRole }: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  const filteredItems = navItems.filter(
    (item) => !item.roles || item.roles.includes(userRole),
  );

  return (
    <aside
      className={cn(
        "flex h-screen flex-col border-r bg-sidebar transition-all duration-200",
        collapsed ? "w-16" : "w-60",
      )}
    >
      {/* 로고 영역 */}
      <div className="flex h-14 items-center border-b px-4">
        <Link href="/" className="flex items-center gap-2 overflow-hidden">
          <Shield className="h-6 w-6 shrink-0 text-primary" />
          {!collapsed && (
            <span className="truncate font-semibold text-sm">
              한미르 과제관리
            </span>
          )}
        </Link>
      </div>

      {/* 네비게이션 */}
      <nav className="flex-1 space-y-1 px-2 py-3">
        {filteredItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
                collapsed && "justify-center px-2",
              )}
              title={collapsed ? item.label : undefined}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* 접기/펼치기 버튼 */}
      <div className="border-t p-2">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-center"
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>
    </aside>
  );
}
