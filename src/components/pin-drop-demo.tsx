import { useEffect, useState } from "react";
import { MapPin, Sparkles, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Animated micro-demo showing the Pin Drop flow:
 * 1. Screenshot drops in
 * 2. AI shimmer/processing
 * 3. Transforms into a structured pin card
 * Loops every ~7 seconds.
 */

const DEMO_DATA = {
  title: "UCLA Undergraduate Research Fellows Program",
  tags: ["Research", "Fellowship", "Faculty Mentor"],
  deadline: "Nov 15",
  category: "Research",
};

type Phase = "idle" | "drop" | "processing" | "reveal" | "hold";

const TIMINGS = {
  idle: 800,
  drop: 600,
  processing: 1500,
  reveal: 500,
  hold: 3000,
};

export function PinDropDemo() {
  const [phase, setPhase] = useState<Phase>("idle");

  useEffect(() => {
    const sequence: Phase[] = ["idle", "drop", "processing", "reveal", "hold"];
    let idx = 0;
    let timeout: ReturnType<typeof setTimeout>;

    function next() {
      idx = (idx + 1) % sequence.length;
      setPhase(sequence[idx]);
      timeout = setTimeout(next, TIMINGS[sequence[idx]]);
    }

    timeout = setTimeout(next, TIMINGS[sequence[0]]);
    return () => clearTimeout(timeout);
  }, []);

  return (
    <div className="mx-auto w-full max-w-sm">
      <div className="relative flex h-[280px] items-center justify-center overflow-hidden rounded-2xl border bg-card/50 backdrop-blur-sm">
        {/* Screenshot dropping in */}
        <div
          className={cn(
            "absolute inset-0 flex items-center justify-center transition-all duration-500",
            phase === "drop" || phase === "processing"
              ? "translate-y-0 opacity-100"
              : phase === "reveal" || phase === "hold"
                ? "-translate-y-2 opacity-0 scale-95"
                : "translate-y-8 opacity-0",
          )}
        >
          <div className="relative">
            {/* Fake screenshot */}
            <div className="h-40 w-56 rounded-xl border-2 border-dashed border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10 p-4">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-primary/40" />
                <div className="h-2 w-16 rounded-full bg-primary/20" />
              </div>
              <div className="mt-3 space-y-2">
                <div className="h-2 w-full rounded-full bg-primary/15" />
                <div className="h-2 w-4/5 rounded-full bg-primary/15" />
                <div className="h-2 w-3/5 rounded-full bg-primary/15" />
              </div>
              <div className="mt-4 flex gap-2">
                <div className="h-5 w-14 rounded-full bg-primary/10" />
                <div className="h-5 w-10 rounded-full bg-primary/10" />
              </div>
            </div>

            {/* Processing shimmer overlay */}
            {phase === "processing" && (
              <div className="absolute inset-0 rounded-xl overflow-hidden">
                <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-transparent via-primary/10 to-transparent" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="flex items-center gap-2 rounded-full bg-card/90 px-3 py-1.5 shadow-sm">
                    <div className="h-3 w-3 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    <span className="text-[11px] font-medium text-primary">Reading...</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Structured pin card result */}
        <div
          className={cn(
            "absolute inset-0 flex items-center justify-center transition-all duration-500",
            phase === "reveal" || phase === "hold"
              ? "translate-y-0 opacity-100 scale-100"
              : "translate-y-4 opacity-0 scale-95",
          )}
        >
          <div className="w-64 rounded-xl border bg-card p-4 shadow-sm">
            {/* Pin icon + title */}
            <div className="flex items-start gap-2.5">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <MapPin className="h-3.5 w-3.5 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="text-sm font-semibold leading-tight tracking-tight">
                  {DEMO_DATA.title}
                </h4>
              </div>
            </div>

            {/* Tags */}
            <div className="mt-3 flex flex-wrap gap-1.5">
              {DEMO_DATA.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-primary/8 px-2 py-0.5 text-[10px] font-medium text-primary"
                >
                  {tag}
                </span>
              ))}
            </div>

            {/* Deadline + opportunity badge */}
            <div className="mt-3 flex items-center justify-between border-t pt-2.5">
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-600 dark:text-amber-400">
                <Clock className="h-3 w-3" />
                Due {DEMO_DATA.deadline}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">
                <Sparkles className="h-2.5 w-2.5" />
                Opportunity
              </span>
            </div>
          </div>
        </div>

        {/* Subtle label */}
        <div className="absolute bottom-3 left-0 right-0 text-center">
          <p className="text-[11px] font-medium text-muted-foreground/60">
            {phase === "drop" || phase === "processing"
              ? "Screenshot captured..."
              : phase === "reveal" || phase === "hold"
                ? "Pinned and structured."
                : ""}
          </p>
        </div>
      </div>
    </div>
  );
}
