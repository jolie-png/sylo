import { Clock, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Deadline status logic
// ---------------------------------------------------------------------------

export type DeadlineState = "urgent" | "soon" | "open" | "expired" | "recurring";

export function getDeadlineStatus(deadline: string, recurring = false) {
  if (!deadline) return { label: "Rolling", state: "open" as const };
  // Parse a date-only string ("YYYY-MM-DD") as LOCAL midnight. `new Date("YYYY-MM-DD")`
  // parses as UTC, so in most timezones the displayed day lands one day off. Compare
  // against today's local midnight so the day count reflects calendar days.
  const dl = /^\d{4}-\d{2}-\d{2}$/.test(deadline)
    ? new Date(`${deadline}T00:00:00`)
    : new Date(deadline);
  const nowExact = new Date();
  const now = new Date(nowExact.getFullYear(), nowExact.getMonth(), nowExact.getDate());
  if (dl < now) {
    if (recurring) {
      const next = new Date(dl);
      next.setFullYear(next.getFullYear() + 1);
      return {
        label: `Next cycle ~${next.toLocaleDateString("en-US", { month: "short", year: "numeric" })}`,
        state: "recurring" as const,
      };
    }
    return { label: "Deadline passed", state: "expired" as const };
  }
  const days = Math.round((dl.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (days <= 14) return { label: `Due in ${days}d`, state: "urgent" as const };
  if (days <= 30) return { label: `Due in ${days}d`, state: "soon" as const };
  // Show month and day only — the year is implicit from context
  const formatted = dl.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return {
    label: `Due by ${formatted}`,
    state: "open" as const,
  };
}

// ---------------------------------------------------------------------------
// DeadlinePill — colored badge showing deadline state
// ---------------------------------------------------------------------------

export function DeadlinePill({ deadline, recurring = false }: { deadline: string; recurring?: boolean }) {
  if (!deadline) return null;
  const { label, state } = getDeadlineStatus(deadline, recurring);
  const colors: Record<DeadlineState, string> = {
    urgent: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
    soon: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
    open: "bg-muted text-muted-foreground",
    expired: "bg-muted/50 text-muted-foreground line-through",
    recurring: "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
        colors[state],
      )}
    >
      <Clock className="h-2.5 w-2.5" />
      {label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// StalenessIndicator — warns when data may be outdated
// ---------------------------------------------------------------------------

export function StalenessIndicator({ lastVerified }: { lastVerified?: string }) {
  if (!lastVerified) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400">
        <AlertTriangle className="h-2.5 w-2.5" /> May be outdated
      </span>
    );
  }
  const verified = new Date(lastVerified);
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  if (verified < sixMonthsAgo) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400">
        <AlertTriangle className="h-2.5 w-2.5" /> May be outdated
      </span>
    );
  }
  return null;
}
