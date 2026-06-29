"use client";

import { Bell, Menu } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/common/ThemeToggle";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
} from "@/components/ui/dropdown-menu";
import { roleLabel } from "@/helpers/format";

interface TopbarProps {
  title: string;
  userName?: string | null;
  userEmail: string;
  userRole: string;
  onMenuToggle?: () => void;
}

export function Topbar({ title, userName, userEmail, userRole, onMenuToggle }: TopbarProps) {
  const initials = userName
    ? userName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : userEmail.slice(0, 2).toUpperCase();

  const role = roleLabel(userRole);

  return (
    <header className="h-14 flex items-center gap-2 sm:gap-4 px-3 sm:px-6 border-b border-border/50 bg-background/80 backdrop-blur-sm sticky top-0 z-20">
      {/* Hamburger — mobile only */}
      <button
        onClick={onMenuToggle}
        className="md:hidden w-8 h-8 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors shrink-0"
        aria-label="Open navigation"
      >
        <Menu className="w-4 h-4" />
      </button>

      <h1 className="text-sm font-semibold tracking-tight flex-1 truncate">{title}</h1>

      <div className="flex items-center gap-1 sm:gap-1.5">
        {/* Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger className="w-8 h-8 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors cursor-pointer">
            <Bell className="w-4 h-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" sideOffset={8} className="w-72 p-0">
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-2.5 border-b border-border/50">
              <p className="text-sm font-medium">Notifications</p>
              <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
                0 new
              </span>
            </div>

            {/* Empty state */}
            <div className="flex flex-col items-center gap-3 py-8 px-6 text-center">
              <div className="relative">
                <div className="w-12 h-12 rounded-xl bg-muted/60 flex items-center justify-center">
                  <Bell className="w-5 h-5 text-muted-foreground/40" />
                </div>
                {/* All-clear badge */}
                <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-400/15 border border-emerald-400/30 flex items-center justify-center">
                  <svg className="w-2.5 h-2.5 text-emerald-400" viewBox="0 0 10 10" fill="none">
                    <path
                      d="M1.5 5l2.5 2.5 4.5-4.5"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-sm font-medium">All caught up</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  No new notifications right now.
                  <br />
                  We&apos;ll alert you when something needs attention.
                </p>
              </div>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Theme switcher */}
        <ThemeToggle />

        <div className="w-px h-5 bg-border/60 mx-0.5 sm:mx-1" />

        {/* User identity */}
        <div className="flex items-center gap-2">
          <Avatar className="w-7 h-7 shrink-0">
            <AvatarFallback className="text-xs bg-primary/20 text-primary font-medium">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="hidden sm:block min-w-0">
            <p className="text-xs font-medium leading-none truncate max-w-30">
              {userName ?? userEmail.split("@")[0]}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5 truncate max-w-30">{userEmail}</p>
          </div>
          <Badge
            variant="outline"
            className={`hidden sm:inline-flex text-[10px] px-1.5 py-0 shrink-0 ${role.className}`}
          >
            {role.label}
          </Badge>
        </div>
      </div>
    </header>
  );
}
