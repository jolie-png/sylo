import { useState } from "react";
import { Clock, Compass } from "lucide-react";
import { StatusAccentBar, StatusDot } from "@/components/roadmap-connector";
import { StatusTag, Tag } from "@/components/workspace";
import { cn } from "@/lib/utils";
import { termFor, termsFromDeadlines, type Term } from "@/lib/terms";
import {
  milestonesForTrack,
  YEARS,
  type Milestone,
  type Opportunity,
  type StepStatus,
} from "@/lib/wayfind-data";
import { useWayfind } from "@/lib/sylo-store";

type Selection =
  | { kind: "opportunity"; op: Opportunity; status: StepStatus; reasoning?: string }
  | { kind: "milestone"; milestone: Milestone };

type Step = { id: string; opportunityId: string; status: StepStatus; reasoning?: string };

/**
 * The Long View board: verified opportunities bucketed into the term that
 * contains their real deadline, then quieter Milestone columns for the years
 * that are genuinely beyond the verified data range.
 */
export function LongViewBoard({
  trackId,
  steps,
  studentYear,
  school,
}: {
  trackId: string;
  steps: Step[];
  studentYear: string;
  school: string;
}) {
  const { resolveOpportunity } = useWayfind();

  const resolved = steps
    .map((s) => ({ step: s, op: resolveOpportunity(s.opportunityId) }))
    .filter((r): r is { step: Step; op: Opportunity } => !!r.op)
    .sort((a, b) => {
      if (!a.op.deadline && !b.op.deadline) return 0;
      if (!a.op.deadline) return 1;
      if (!b.op.deadline) return -1;
      return a.op.deadline.localeCompare(b.op.deadline);
    });

  const verifiedTerms: Term[] = termsFromDeadlines(resolved.map((r) => r.op.deadline));

  const currentYearIndex = YEARS.indexOf(studentYear);
  const guidanceYears = (["Junior", "Senior"] as const).filter(
    (y) => currentYearIndex < 0 || YEARS.indexOf(y) > currentYearIndex,
  );
  const guidanceColumns = guidanceYears
    .map((year) => ({ year, items: milestonesForTrack(trackId as never).filter((m) => m.year === year) }))
    .filter((c) => c.items.length > 0);

  const first = resolved[0];
  const [selected, setSelected] = useState<Selection | null>(
    first
      ? { kind: "opportunity", op: first.op, status: first.step.status, reasoning: first.step.reasoning }
      : null,
  );

  const columnCount = verifiedTerms.length + guidanceColumns.length;

  return (
    <div className="mt-6 overflow-hidden rounded-2xl border bg-card">
      <div className="flex min-h-[420px] flex-col lg:flex-row">
        {/* Board */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2.5 border-b px-4 py-3">
            <Compass className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-sm font-medium tracking-tight">The Long View</span>
            <span className="tag bg-tag-gray text-tag-gray-foreground">
              {verifiedTerms.length} verified {verifiedTerms.length === 1 ? "term" : "terms"}
            </span>
          </div>

          <div className="overflow-x-auto bg-canvas">
            <div
              className="grid min-w-[720px] items-start"
              style={{ gridTemplateColumns: `repeat(${Math.max(1, columnCount)}, minmax(0, 1fr))` }}
            >
              {verifiedTerms.map((term, termIndex) => (
                <div key={term.key} className="min-h-[360px] border-r p-4 last:border-r-0">
                  <p className="px-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                    {termIndex === 0 ? "This term" : term.label}
                  </p>
                  {termIndex === 0 ? (
                    <p className="px-1 pb-3 text-xs text-muted-foreground">
                      Verified openings at your school.
                    </p>
                  ) : null}
                  <div className="space-y-3">
                    {resolved
                      .filter((r) => termFor(r.op.deadline)?.key === term.key)
                      .map(({ step, op }) => {
                        const active =
                          selected?.kind === "opportunity" && selected.op.id === op.id;
                        return (
                          <button
                            key={step.id}
                            type="button"
                            onClick={() =>
                              setSelected({
                                kind: "opportunity",
                                op,
                                status: step.status,
                                reasoning: step.reasoning,
                              })
                            }
                            className={cn(
                              "card-tonal tap relative w-full rounded-xl px-4 py-4 pl-4 text-left",
                              active && "ring-2 ring-primary/30",
                            )}
                          >
                            <StatusAccentBar status={step.status} />
                            <p className="text-sm font-semibold leading-snug tracking-tight">
                              {op.name}
                            </p>
                            <div className="mt-3 flex flex-wrap items-center justify-between gap-x-2 gap-y-1 border-t pt-2 text-[11px] text-muted-foreground">
                              <StatusDot status={step.status} withLabel />
                              <span className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap tabular-nums">
                                <Clock className="h-3.5 w-3.5" />
                                {op.deadline}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                  </div>
                </div>
              ))}

              {guidanceColumns.map((col) => (
                <div key={col.year} className="min-h-[360px] border-r bg-muted/25 p-4 last:border-r-0">
                  <p className="px-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
                    General guidance
                  </p>
                  <p className="px-1 pb-3 text-sm font-medium tracking-tight text-foreground/80">
                    {col.year} year
                  </p>
                  <div className="space-y-3">

                    {col.items.map((m) => {
                      const active =
                        selected?.kind === "milestone" && selected.milestone.focus === m.focus;
                      return (
                        <button
                          key={m.focus}
                          type="button"
                          onClick={() => setSelected({ kind: "milestone", milestone: m })}
                          className={cn(
                            "tap w-full rounded-xl border border-dashed border-foreground/20 bg-transparent px-4 py-4 text-left",
                            active && "border-primary/40 bg-primary/[0.04]",
                          )}
                        >
                          <p className="text-[13px] font-medium leading-snug tracking-tight text-foreground/75">
                            {m.focus}
                          </p>
                          <p className="mt-2 text-[11px] text-muted-foreground/70">
                            Milestone · no fixed date
                          </p>
                        </button>

                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Inspector */}
        <aside className="w-full shrink-0 border-t bg-card p-4 lg:w-64 lg:border-l lg:border-t-0">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            Inspector
          </p>
          {selected?.kind === "opportunity" ? (
            <>
              <p className="mt-2 text-sm font-semibold leading-snug tracking-tight">
                {selected.op.name}
              </p>
              <div className="mt-3 space-y-1.5">
                <InspectorField label="Status">
                  <StatusTag status={selected.status} />
                </InspectorField>
                <InspectorField label="Deadline">{selected.op.deadline}</InspectorField>
                <InspectorField label="Window">{selected.op.timeframe}</InspectorField>
                <InspectorField label="Category">
                  <Tag>{selected.op.category}</Tag>
                </InspectorField>
                <InspectorField label="Student">{studentYear}</InspectorField>
                <InspectorField label="School">{school}</InspectorField>
              </div>
              {selected.reasoning ? (
                <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                  {selected.reasoning}
                </p>
              ) : null}
            </>
          ) : selected?.kind === "milestone" ? (
            <>
              <p className="mt-2 text-sm font-medium leading-snug tracking-tight text-foreground/80">
                {selected.milestone.focus}
              </p>
              <p className="mt-2 text-[11px] uppercase tracking-wide text-muted-foreground/70">
                General guidance · {selected.milestone.year} year
              </p>
              <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                <span className="text-muted-foreground/70">What usually matters: </span>
                {selected.milestone.lookOutFor}
              </p>
            </>
          ) : (
            <p className="mt-2 text-xs text-muted-foreground">Select a card to see its detail.</p>
          )}
        </aside>
      </div>
    </div>
  );
}

function InspectorField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="field-tonal rounded-lg px-2.5 py-2">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-xs font-medium leading-snug">{children}</p>
    </div>
  );
}
