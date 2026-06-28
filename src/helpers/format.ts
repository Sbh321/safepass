/**
 * Text formatting, date, and parsing utilities for SafePass UI.
 */

/**
 * Truncates a string to `maxLen` characters, appending "…" if truncated.
 */
export function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 1) + "…";
}

/**
 * Masks all but the last `visibleChars` characters of a secret with bullet points.
 * Used for password preview display in vault table rows.
 */
export function maskSecret(secret: string, visibleChars = 0): string {
  if (visibleChars === 0) return "•".repeat(Math.min(secret.length, 12));
  const visible = secret.slice(-visibleChars);
  const masked = "•".repeat(Math.max(0, secret.length - visibleChars));
  return masked + visible;
}

/**
 * Formats a Date into a human-readable relative time string (e.g., "2 days ago").
 */
export function timeAgo(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSec = Math.floor(diffMs / 1000);

  if (diffSec < 60) return "just now";
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  if (diffSec < 2592000) return `${Math.floor(diffSec / 86400)}d ago`;
  if (diffSec < 31536000) return `${Math.floor(diffSec / 2592000)}mo ago`;
  return `${Math.floor(diffSec / 31536000)}y ago`;
}

/**
 * Formats a Date into a short locale date string (e.g., "Jun 28, 2026").
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

/**
 * Capitalizes the first letter of each word in a string.
 */
export function titleCase(str: string): string {
  return str
    .toLowerCase()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * Converts a Role enum value into a display-friendly label with badge styling class.
 */
export function roleLabel(role: string): { label: string; className: string } {
  switch (role) {
    case "SUPER_ADMIN":
      return { label: "Super Admin", className: "text-violet-400 bg-violet-400/10" };
    case "MANAGER":
      return { label: "Manager", className: "text-blue-400 bg-blue-400/10" };
    default:
      return { label: "Employee", className: "text-zinc-400 bg-zinc-400/10" };
  }
}

/**
 * Converts a category string to an emoji icon for vault entry display.
 */
export function categoryIcon(category: string | null | undefined): string {
  switch (category?.toLowerCase()) {
    case "social": return "💬";
    case "finance": return "💳";
    case "work": return "🏢";
    case "email": return "📧";
    case "cloud": return "☁️";
    case "developer": return "⚙️";
    case "vpn": return "🔐";
    default: return "🔑";
  }
}
