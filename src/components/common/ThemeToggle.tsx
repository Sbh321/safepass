"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTheme } from "@/components/common/ThemeProvider";
import { cn } from "@/lib/utils";
import type { ThemePreference } from "@/lib/theme";

const OPTIONS: { value: ThemePreference; label: string; Icon: React.ElementType }[] = [
  { value: "light", label: "Light", Icon: Sun },
  { value: "dark",  label: "Dark",  Icon: Moon },
  { value: "system", label: "System", Icon: Monitor },
];

const RESOLVED_ICON: Record<"light" | "dark", React.ElementType> = {
  light: Sun,
  dark: Moon,
};

export function ThemeToggle() {
  const { theme, resolvedTheme, setTheme, mounted } = useTheme();

  // Render a static placeholder before mount to avoid hydration mismatch
  if (!mounted) {
    return (
      <div className="w-8 h-8 flex items-center justify-center rounded-md text-muted-foreground">
        <Monitor className="w-4 h-4 opacity-50" />
      </div>
    );
  }

  const ActiveIcon = RESOLVED_ICON[resolvedTheme];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="w-8 h-8 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        aria-label="Switch theme"
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={resolvedTheme}
            initial={{ scale: 0.7, opacity: 0, rotate: -20 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            exit={{ scale: 0.7, opacity: 0, rotate: 20 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="flex items-center justify-center"
          >
            <ActiveIcon className="w-4 h-4" />
          </motion.span>
        </AnimatePresence>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="min-w-[9rem]">
        {OPTIONS.map(({ value, label, Icon }) => (
          <DropdownMenuItem
            key={value}
            onClick={() => setTheme(value)}
            className={cn(
              "flex items-center gap-2.5 text-xs cursor-pointer",
              theme === value
                ? "text-primary"
                : "text-muted-foreground"
            )}
          >
            <Icon className="w-3.5 h-3.5 shrink-0" />
            <span>{label}</span>
            {theme === value && (
              <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
