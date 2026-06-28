"use client";

import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  Vault,
  ShieldCheck,
  LogOut,
  ChevronRight,
  Lock,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useVaultStore } from "@/store/vaultStore";
import { toast } from "sonner";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/vault", label: "Vault", icon: Vault },
  { href: "/policy", label: "Policy", icon: ShieldCheck, managerOnly: true },
];

export function Sidebar({ role }: { role: string }) {
  const pathname = usePathname();
  const { derivedKey, lockVault } = useVaultStore();

  const handleLock = () => {
    lockVault();
    toast.info("Vault locked", { description: "Master key cleared from memory." });
  };

  const handleSignOut = () => signOut({ callbackUrl: "/login" });

  const visibleItems = NAV_ITEMS.filter(
    (item) => !item.managerOnly || role === "SUPER_ADMIN" || role === "MANAGER"
  );

  return (
    <aside className="w-60 flex flex-col h-screen bg-sidebar border-r border-sidebar-border sticky top-0 shrink-0">
      {/* Logo */}
      <div className="h-14 flex items-center gap-2.5 px-4 border-b border-sidebar-border">
        <div className="w-7 h-7 rounded-lg bg-primary/20 flex items-center justify-center ring-1 ring-primary/30">
          <ShieldCheck className="w-4 h-4 text-primary" />
        </div>
        <span className="text-sm font-semibold tracking-tight">SafePass</span>
        {derivedKey && (
          <span className="ml-auto text-[10px] font-medium text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 rounded-full">
            UNLOCKED
          </span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2 space-y-0.5">
        <p className="text-[10px] font-medium text-muted-foreground/60 uppercase tracking-widest px-3 py-2">
          Navigation
        </p>
        {visibleItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link key={href} href={href} className="relative block">
              <AnimatePresence>
                {isActive && (
                  <motion.div
                    layoutId="sidebar-pill"
                    className="absolute inset-0 bg-accent rounded-md"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
              </AnimatePresence>
              <span
                className={cn(
                  "relative flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors group",
                  isActive
                    ? "text-accent-foreground font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                )}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {label}
                {isActive && (
                  <ChevronRight className="w-3 h-3 ml-auto text-muted-foreground/60" />
                )}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom actions */}
      <div className="p-2 border-t border-sidebar-border space-y-0.5">
        {derivedKey && (
          <button
            onClick={handleLock}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
          >
            <Lock className="w-4 h-4" />
            Lock Vault
          </button>
        )}
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
