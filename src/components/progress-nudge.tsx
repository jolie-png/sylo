import { useState } from "react";
import { Clock, X, CheckCircle2, ArrowRight } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import type { Step } from "@/lib/wayfind-store";
import type { Opportunity } from "@/lib/wayfind-data";

const STALE_DAYS = 14;

type StaleStep = {
  step: Step;
  op: Opportunity;
  daysStale: number;
};

/**
 * Detects steps marked "in-progress" that haven't been updated in 14+ days
 * and shows a gentle, non-intrusive nudge on the dashboard.
 */
export function ProgressNudge({
  steps,
  resolveOpportunity,
  onMarkComplete,
  onDismiss,
}: {
  steps: Step[];
  resolveOpportunity: (id: string) => Opportunity | undefined;
  onMarkComplete: (opportunityId: string) => void;
  onDismiss?: () => void;
}) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const now = Date.now();

  const staleSteps: StaleStep[] = steps
    .filter((s) => s.status === "in-progress" && s.statusChangedAt)
    .map((s) => {
      const changedAt = new Date(s.statusChangedAt!).getTime();
      const daysStale = Math.floor((now - changedAt) / (1000 * 60 * 60 * 24));
      const op = resolveOpportunity(s.opportunityId);
      return { step: s, op: op!, daysStale };
    })
    .filter((s) => s.op && s.daysStale >= STALE_DAYS && !dismissed.has(s.step.opportunityId))
    .sort((a, b) => b.daysStale - a.daysStale);

  if (staleSteps.length === 0) return null;

  const handleDismissOne = (opportunityId: string) => {
    setDismissed((prev) => new Set([...prev, opportunityId]));
  };

  const handleDismissAll = () => {
    setDismissed(new Set(staleSteps.map((s) => s.step.opportunityId)));
    onDismiss?.();
  };

  return (
    <section className="mt-6 rounded-2xl border border-amber-200/60 bg-amber-50/50 dark:border-amber-800/30 dark:bg-amber-950/20 p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/40">
            <Clock className="h-4 w-4 text-amber-700 dark:text-amber-400" />
          </div>
          <div>
            <p className="text-sm font-semibold tracking-tight text-foreground">Still on track?</p>
            <p className="text-[12px] text-muted-foreground">
              {staleSteps.length === 1
                ? "You have a step that's been in progress for a while."
                : `You have ${staleSteps.length} steps that have been in progress for a while.`}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleDismissAll}
          className="tap rounded-full p-1 text-muted-foreground hover:text-foreground"
          aria-label="Dismiss all nudges"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <ul className="mt-4 space-y-3">
        {staleSteps.map(({ step, op, daysStale }) => (
          <li
            key={step.opportunityId}
            className="flex items-center justify-between gap-3 rounded-xl bg-background/80 px-4 py-3"
          >
            <div className="min-w-0 flex-1">
              <Link
                to="/opportunity-details"
                search={{ id: op.id }}
                className="text-sm font-medium tracking-tight text-foreground hover:underline"
              >
                {op.name}
              </Link>
              <p className="mt-0.5 text-[12px] text-muted-foreground">
                Marked "in progress" {daysStale} days ago
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <button
                type="button"
                onClick={() => onMarkComplete(step.opportunityId)}
                className={cn(
                  "tap inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium",
                  "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100",
                  "dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400 dark:hover:bg-emerald-900/40",
                )}
                title="Mark as complete"
              >
                <CheckCircle2 className="h-3 w-3" />
                Done
              </button>
              <button
                type="button"
                onClick={() => handleDismissOne(step.opportunityId)}
                className="tap rounded-full p-1.5 text-muted-foreground hover:text-foreground"
                title="Dismiss this nudge"
                aria-label={`Dismiss nudge for ${op.name}`}
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          </li>
        ))}
      </ul>

      {staleSteps.length > 0 && (
        <p className="mt-3 text-[11px] text-muted-foreground/70">
          No pressure — just checking in. Dismiss to hide, or mark done if you&apos;ve finished.
        </p>
      )}
    </section>
  );
}

/**
 * For instant demos: simulates stale steps by backdating statusChangedAt.
 * Call this when loading a persona to make the nudge visible immediately.
 */
export function simulateStaleSteps(steps: Step[], count = 2): Step[] {
  const staleDate = new Date();
  staleDate.setDate(staleDate.getDate() - 21); // 3 weeks ago

  let marked = 0;
  return steps.map((s) => {
    if (marked < count && s.status === "not-started") {
      marked++;
      return { ...s, status: "in-progress" as const, statusChangedAt: staleDate.toISOString() };
    }
    return s;
  });
}
