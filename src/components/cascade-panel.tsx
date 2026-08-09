import type { Opportunity } from "@/lib/wayfind-data";

/**
 * The hero step's upstream → unlocks → window chain.
 * Rendered identically on the dashboard and in the Course Advisor so a student
 * recognises the same information one step earlier. No other step gets this.
 */
export function CascadePanel({
  upstream,
  unlocks,
  window: windowText,
}: Pick<Opportunity, "upstream" | "unlocks" | "window">) {
  if (!upstream && !unlocks?.length && !windowText) return null;

  return (
    <div className="card-tonal mt-3 space-y-2.5 rounded-xl p-4">
      {upstream ? (
        <Row label="Upstream">{upstream}</Row>
      ) : null}
      {unlocks?.length ? (
        <Row label="Unlocks">
          <span className="font-medium text-foreground/80">{unlocks.join(" → ")}</span>
        </Row>
      ) : null}
      {windowText ? (
        <Row label="Window">
          <span className="text-amber-700">{windowText}</span>
        </Row>
      ) : null}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-0.5 sm:grid-cols-[6rem_1fr] sm:gap-3">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/80 sm:pt-0.5">
        {label}
      </span>
      <p className="text-[13px] leading-relaxed text-muted-foreground">{children}</p>
    </div>
  );
}
