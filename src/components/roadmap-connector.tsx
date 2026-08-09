import type { StepStatus } from "@/lib/wayfind-data";
import { cn } from "@/lib/utils";

/**
 * A thin, dotted, gently curved line drawn between two consecutive roadmap
 * steps. Purely decorative: it makes the sequence read as a journey rather
 * than a checklist. No layout or data meaning.
 *
 * Height reduced from h-9 to h-7 for tighter density. Stroke thickened
 * slightly for visual confidence.
 */
export function WavyConnector({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 36"
      preserveAspectRatio="none"
      className={cn("h-7 w-6 text-primary/40", className)}
    >
      <path
        d="M12 0 C 4 9, 20 20, 12 36"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeDasharray="2.5 4.5"
      />
    </svg>
  );
}

/* Warmer status tones: teal for done, deeper blue-purple for in-progress */
const ACCENT: Record<StepStatus, { bar: string; dot: string; label: string }> = {
  "not-started": {
    bar: "bg-foreground/12",
    dot: "bg-foreground/25",
    label: "Ahead",
  },
  "in-progress": {
    bar: "bg-[#4338a8]/60",
    dot: "bg-[#4338a8]",
    label: "In progress",
  },
  complete: {
    bar: "bg-[#0d7357]/70",
    dot: "bg-[#0d7357]",
    label: "Done",
  },
};

/** Left-edge status accent bar — scannable state without reading any text. */
export function StatusAccentBar({ status }: { status: StepStatus }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "absolute left-0 top-2 bottom-2 w-[3px] rounded-full transition-colors duration-200",
        ACCENT[status].bar,
      )}
    />
  );
}

/** Small dot + label pair keyed to the same status colours as the accent bar. */
export function StatusDot({ status, withLabel = false }: { status: StepStatus; withLabel?: boolean }) {
  const a = ACCENT[status];
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
      <span aria-hidden="true" className={cn("h-1.5 w-1.5 rounded-full", a.dot)} />
      {withLabel ? a.label : null}
    </span>
  );
}
