"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import {
  applyTheme,
  getStoredPreference,
  persistTheme,
  resolvePreference,
  type ResolvedTheme,
  type ThemePreference,
} from "@/lib/theme";

interface ThemeContextValue {
  /** The stored preference — "light", "dark", or "system" */
  theme: ThemePreference;
  /** The actual theme being rendered right now */
  resolvedTheme: ResolvedTheme;
  /** Change + persist the theme */
  setTheme: (theme: ThemePreference) => void;
  /** True once the component has mounted and read localStorage */
  mounted: boolean;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "system",
  resolvedTheme: "dark",
  setTheme: () => {},
  mounted: false,
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemePreference>("system");
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>("dark");
  const [mounted, setMounted] = useState(false);

  // Sync from localStorage after hydration
  useEffect(() => {
    const stored = getStoredPreference();
    setThemeState(stored);
    setResolvedTheme(resolvePreference(stored));
    setMounted(true);
  }, []);

  // React to OS preference changes while in "system" mode
  useEffect(() => {
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => {
      const next: ResolvedTheme = e.matches ? "dark" : "light";
      setResolvedTheme(next);
      // Update the DOM immediately without changing the stored preference
      document.documentElement.classList.toggle("dark", next === "dark");
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [theme]);

  const setTheme = useCallback((newTheme: ThemePreference) => {
    setThemeState(newTheme);
    setResolvedTheme(resolvePreference(newTheme));
    applyTheme(newTheme);
    persistTheme(newTheme);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme, mounted }}>
      {children}
    </ThemeContext.Provider>
  );
}

/** Hook to consume the theme context from any client component. */
export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
