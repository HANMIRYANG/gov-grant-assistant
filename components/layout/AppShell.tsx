"use client";

import type { UserProfile } from "@/lib/utils/types";
import Sidebar from "./Sidebar";
import Header from "./Header";

interface AppShellProps {
  user: UserProfile;
  children: React.ReactNode;
}

export default function AppShell({ user, children }: AppShellProps) {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar userRole={user.role} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header user={user} />
        <main className="flex-1 overflow-y-auto bg-muted/40 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
