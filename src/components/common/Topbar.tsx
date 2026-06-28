"use client";

import { Bell, Search } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { roleLabel } from "@/helpers/format";
import { Badge } from "@/components/ui/badge";

interface TopbarProps {
  title: string;
  userName?: string | null;
  userEmail: string;
  userRole: string;
}

export function Topbar({ title, userName, userEmail, userRole }: TopbarProps) {
  const initials = userName
    ? userName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : userEmail.slice(0, 2).toUpperCase();

  const role = roleLabel(userRole);

  return (
    <header className="h-14 flex items-center gap-4 px-6 border-b border-border/50 bg-background/80 backdrop-blur-sm sticky top-0 z-20">
      <h1 className="text-sm font-semibold tracking-tight flex-1">{title}</h1>

      <div className="flex items-center gap-3">
        <button className="w-8 h-8 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors">
          <Bell className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2.5">
          <Avatar className="w-7 h-7">
            <AvatarFallback className="text-xs bg-primary/20 text-primary font-medium">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="hidden sm:block">
            <p className="text-xs font-medium leading-none">
              {userName ?? userEmail.split("@")[0]}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{userEmail}</p>
          </div>
          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${role.className}`}>
            {role.label}
          </Badge>
        </div>
      </div>
    </header>
  );
}
