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
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useVaultStore } from "@/store/vaultStore";
import { toast } from "sonner";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/vault", label: "Vault", icon: Vault },
  { href: "/policy", label: "Policy", icon: ShieldCheck, managerOnly: true },
];

interface SidebarProps {
  role: string;
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ role, open, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { derivedKey, lockVault } = useVaultStore();

  const handleLock = () => {
    lockVault();
    toast.info("Vault locked", { description: "Master key cleared from memory." });
  };

  const visibleItems = NAV_ITEMS.filter(
    (item) => !item.managerOnly || role === "SUPER_ADMIN" || role === "MANAGER"
  );

  return (
    <aside
      className={cn(
        "flex flex-col bg-sidebar border-r border-sidebar-border",
        // Mobile: fixed overlay that slides in/out
        "fixed inset-y-0 left-0 z-40 w-72",
        // Desktop (md+): static sidebar, always visible, narrower
        "md:sticky md:top-0 md:h-screen md:z-auto md:w-60 md:shrink-0",
        // Slide transition — md:translate-x-0 overrides on desktop so it's always shown
        "transition-transform duration-200 ease-in-out",
        open ? "translate-x-0" : "-translate-x-full",
        "md:translate-x-0"
      )}
    >
      {/* Logo */}
      <div className="h-14 flex items-center gap-2.5 px-4 border-b border-sidebar-border">
        <div className="w-7 h-7 rounded-lg bg-primary/20 flex items-center justify-center ring-1 ring-primary/30 shrink-0">
          <ShieldCheck className="w-4 h-4 text-primary" />
        </div>
        <span className="text-sm font-semibold tracking-tight">SafePass</span>
        {derivedKey && (
          <span className="text-[10px] font-medium text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 rounded-full whitespace-nowrap">
            UNLOCKED
          </span>
        )}
        <div className="flex-1" />
        {/* Close button — only visible on mobile */}
        <button
          onClick={onClose}
          className="md:hidden w-7 h-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors shrink-0"
          aria-label="Close menu"
        >
          <X className="w-4 h-4" />
        </button>
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
        <Dialog>
          <DialogTrigger className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer">
            <LogOut className="w-4 h-4 shrink-0" />
            Sign Out
          </DialogTrigger>
          <DialogContent showCloseButton={false} className="sm:max-w-xs">
            <DialogHeader>
              <div className="flex items-center gap-3 mb-1">
                <div className="w-9 h-9 rounded-lg bg-destructive/10 flex items-center justify-center ring-1 ring-destructive/20 shrink-0">
                  <LogOut className="w-4 h-4 text-destructive" />
                </div>
                <DialogTitle>Sign out of SafePass?</DialogTitle>
              </div>
              <DialogDescription>
                Your session will end and the vault key will be cleared from memory. You&apos;ll need your Master Password when you return.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose render={<Button variant="outline" className="flex-1 sm:flex-none" />}>
                Stay signed in
              </DialogClose>
              <DialogClose
                render={
                  <Button className="flex-1 sm:flex-none bg-destructive hover:bg-destructive/90 text-destructive-foreground" />
                }
                onClick={() => signOut({ callbackUrl: "/login" })}
              >
                Sign out
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </aside>
  );
}
