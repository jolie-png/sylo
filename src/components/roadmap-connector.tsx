import type { StepStatus } from "@/lib/wayfind-data";
import { cn } from "@/lib/utils";

/**
 * A thin, dotted, gently curved line drawn between two consecutive roadmap
 * steps. Purely decorative: it makes the sequence read as a journey rather
 * than a checklist. No layout or data meaning.
 */
export function WavyConnector({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 40"
      preserveAspectRatio="none"
      className={cn("h-9 w-6 text-primary/30", className)}
    >
      <path
        d="M12 0 C 4 10, 20 22, 12 40"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeDasharray="2 5"
      />
    </svg>
  );
}

const ACCENT: Record<StepStatus, { bar: string; dot: string; label: string }> = {
  "not-started": {
    bar: "bg-foreground/15",
    dot: "bg-foreground/30",
    label: "Ahead",
  },
  "in-progress": {
    bar: "bg-tag-blue-foreground/60",
    dot: "bg-tag-blue-foreground",
    label: "In progress",
  },
  complete: {
    bar: "bg-tag-green-foreground/70",
    dot: "bg-tag-green-foreground",
    label: "Done",
  },
};

/** Left-edge status accent bar — scannable state without reading any text. */
export function StatusAccentBar({ status }: { status: StepStatus }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "absolute left-0 top-2 bottom-2 w-[3px] rounded-full transition-colors duration-300",
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
