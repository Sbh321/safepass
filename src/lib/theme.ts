/**
 * Theme system utilities — pure functions, no React dependencies.
 *
 * Architecture:
 *   - `:root` CSS block  → light theme (fallback, no class needed on <html>)
 *   - `.dark` CSS class  → dark theme  (added to <html> when active)
 *   - localStorage key   → stores the user's explicit preference
 *
 * On first visit (no localStorage entry) the system OS preference is used.
 */

export const THEME_STORAGE_KEY = "safepass-theme" as const;

export type ThemePreference = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

/** Read the stored preference; returns "system" if nothing is saved. */
export function getStoredPreference(): ThemePreference {
  if (typeof window === "undefined") return "system";
  try {
    const v = localStorage.getItem(THEME_STORAGE_KEY);
    if (v === "light" || v === "dark" || v === "system") return v;
  } catch {
    // localStorage blocked (private browsing, etc.)
  }
  return "system";
}

/** Resolve a preference to an actual "light" | "dark" value. */
export function resolvePreference(pref: ThemePreference): ResolvedTheme {
  if (pref !== "system") return pref;
  if (typeof window === "undefined") return "dark"; // SSR default
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/**
 * Apply the theme by toggling the `dark` class on `<html>`.
 * Light mode needs NO class — `:root` provides the fallback.
 */
export function applyTheme(pref: ThemePreference): void {
  const resolved = resolvePreference(pref);
  document.documentElement.classList.toggle("dark", resolved === "dark");
}

/** Persist the user's explicit choice to localStorage. */
export function persistTheme(pref: ThemePreference): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, pref);
  } catch {
    // ignore
  }
}

/**
 * Inline blocking script injected into <body> BEFORE any React content.
 *
 * Runs synchronously before the browser paints, reading the stored preference
 * and immediately adding the `dark` class if needed. This prevents any
 * flash-of-light-mode (FOUC) on dark-preferring users.
 *
 * Must be 100% self-contained — no imports, no closures over module scope.
 */
export const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem('safepass-theme');var d=window.matchMedia('(prefers-color-scheme: dark)').matches;if(t==='dark'||(t!=='light'&&d)){document.documentElement.classList.add('dark');}}catch(e){}})();`;
