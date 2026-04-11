// ─────────────────────────────────────
// VOLTV — Utility Formatters
// ─────────────────────────────────────

// "142 min" → "2h 22m"
export function formatRuntime(minutes: number | null | undefined): string {
  if (!minutes) return "—";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

// Total hours watched
export function formatWatchHours(totalMinutes: number): string {
  if (totalMinutes < 60) return `${totalMinutes}m`;
  const h = Math.round(totalMinutes / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  return `${d}d ${h % 24}h`;
}

// "2023-07-14" → "Jul 14, 2023"
export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric", month: "short", day: "numeric",
  });
}

// "2023-07-14" → "2023"
export function extractYear(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  return new Date(dateStr).getFullYear().toString();
}

// Relative time — "3 hours ago"
export function timeAgo(dateStr: string | Date): string {
  const date = typeof dateStr === "string" ? new Date(dateStr) : dateStr;
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

  if (seconds < 60)   return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400)return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800)return `${Math.floor(seconds / 86400)}d ago`;
  return formatDate(date.toISOString());
}

// 7500 → "7.5K"
export function formatCount(n: number): string {
  if (n < 1000) return String(n);
  if (n < 1000000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}K`;
  return `${(n / 1000000).toFixed(1).replace(/\.0$/, "")}M`;
}

// 8.5 → "8.5" (for score display)
export function formatScore(score: number | null | undefined): string {
  if (score === null || score === undefined) return "—";
  return score.toFixed(1);
}

// 0.87 → "87%"
export function formatPct(value: number): string {
  return `${Math.round(value * 100)}%`;
}

// Clamp a number between min and max
export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

// Generate a slug from a title
export function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

// Truncate text at word boundary
export function truncate(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  return text.slice(0, text.lastIndexOf(" ", maxChars)) + "…";
}

// Score color — red/gold/green
export function scoreColor(score: number | null): string {
  if (!score) return "text-text-muted";
  if (score >= 8)  return "text-accent-green";
  if (score >= 6)  return "text-accent-gold";
  if (score >= 4)  return "text-orange-500";
  return "text-accent-red";
}

// Verdict label
export function verdictLabel(verdict: "skip" | "timepass" | "watchit" | "masterpiece"): string {
  const labels = {
    skip:        "💀 Skip It",
    timepass:    "😐 Timepass",
    watchit:     "✅ Watch It",
    masterpiece: "🔥 Masterpiece",
  };
  return labels[verdict];
}

// Tier badge styles
export function tierStyles(tier: "free" | "pro" | "legend"): {
  label: string;
  className: string;
  icon: string;
} {
  switch (tier) {
    case "legend":
      return { label: "Legend", className: "bg-pro text-white", icon: "👑" };
    case "pro":
      return { label: "Pro", className: "bg-verified text-white", icon: "💎" };
    default:
      return { label: "", className: "", icon: "" };
  }
}

// cn — class name merge utility
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
