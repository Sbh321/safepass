"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/common/Sidebar";
import { Topbar } from "@/components/common/Topbar";

interface Props {
  role: string;
  title: string;
  userName?: string | null;
  userEmail: string;
  userRole: string;
  children: React.ReactNode;
}

export function DashboardShell({ role, title, userName, userEmail, userRole, children }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  // Close the mobile sidebar whenever the route changes
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Mobile backdrop — tapping it closes the sidebar */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <Sidebar role={role} open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Topbar
          title={title}
          userName={userName}
          userEmail={userEmail}
          userRole={userRole}
          onMenuToggle={() => setSidebarOpen((v) => !v)}
        />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
