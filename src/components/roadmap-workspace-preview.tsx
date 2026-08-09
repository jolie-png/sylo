import { LayoutGrid, List, Plus, PanelsTopLeft, ChevronDown, Route as RouteIcon } from "lucide-react";
import { OPPORTUNITIES, TRACKS, PERSONAS } from "@/lib/wayfind-data";
import { termFor, termsFromDeadlines, padTerms } from "@/lib/terms";

/**
 * Static, presentational mock of the Sylo guidance workspace, styled after a
 * project-roadmap tool: left rail of tracks, thin toolbar with a progress bar,
 * a term-gridded timeline canvas of status-coloured cards, and an inspector.
 * Content is derived from the seed dataset — no hardcoded demo copy.
 */

const maya = PERSONAS.find((p) => p.id === "maya");

type Lane = { label: string; meta: string; status: "complete" | "in-progress" | "planned"; col: number };

const PREVIEW_OPS = OPPORTUNITIES.filter((o) => o.track === "physician-scientist")
  .slice()
  .sort((a, b) => a.deadline.localeCompare(b.deadline))
  .slice(0, 5);

// Columns come from the deadlines actually present in the data, so every card
// lands in the term that contains its real deadline.
const TERMS = padTerms(termsFromDeadlines(PREVIEW_OPS.map((o) => o.deadline)), 4);
const QUARTERS = TERMS.map((t) => t.label);

const STEPS: Lane[] = PREVIEW_OPS.map((o, i) => ({
  label: o.name,
  meta: o.timeframe,
  status: i === 0 ? "complete" : i === 1 ? "in-progress" : "planned",
  col: Math.max(0, TERMS.findIndex((t) => t.key === termFor(o.deadline)?.key)),
}));


const STATUS_BAR: Record<Lane["status"], string> = {
  complete: "bg-tag-green-foreground",
  "in-progress": "bg-tag-amber-foreground",
  planned: "bg-foreground/25",
};

const STATUS_LABEL: Record<Lane["status"], string> = {
  complete: "Complete",
  "in-progress": "In progress",
  planned: "Planned",
};

const completed = STEPS.filter((s) => s.status === "complete").length;

export function RoadmapWorkspacePreview() {
  const active = STEPS[1] ?? STEPS[0];

  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-[var(--shadow-card)]">
      <div className="flex min-h-[420px]">
        {/* Left rail — tracks */}
        <aside className="hidden w-44 shrink-0 flex-col border-r bg-card py-3 sm:flex">
          <div className="flex items-center gap-2 px-3 pb-3">
            <RouteIcon className="h-4 w-4" />
            <span className="text-sm font-semibold tracking-tight">Sylo</span>
          </div>
          <div className="flex items-center justify-between px-3 pb-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Tracks
            </span>
            <ChevronDown className="h-3 w-3 text-muted-foreground" />
          </div>
          <ul className="space-y-0.5 px-2">
            {TRACKS.map((t, i) => (
              <li
                key={t.id}
                className={
                  i === 0
                    ? "flex items-center gap-2 rounded-lg bg-secondary px-2 py-1.5 text-sm font-medium"
                    : "flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-muted-foreground"
                }
              >
                <span className="truncate">{t.label}</span>
              </li>
            ))}
            <li className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-muted-foreground">
              <Plus className="h-3.5 w-3.5" />
              New track
            </li>
          </ul>
        </aside>

        {/* Main column */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Toolbar */}
          <div className="flex h-11 shrink-0 items-center justify-between gap-3 border-b px-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <PanelsTopLeft className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="truncate text-sm font-medium tracking-tight">Physician-scientist track</span>
              <span className="hidden items-center gap-2 sm:flex">
                <span className="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
                  <span
                    className="block h-full rounded-full bg-primary"
                    style={{ width: `${(completed / STEPS.length) * 100}%` }}
                  />
                </span>
                <span className="text-xs tabular-nums text-muted-foreground">
                  {completed}/{STEPS.length}
                </span>
              </span>
            </div>
            <div className="flex items-center gap-1">
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-secondary">
                <LayoutGrid className="h-3.5 w-3.5" />
              </span>
              <span className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground">
                <List className="h-3.5 w-3.5" />
              </span>
              <span className="ml-1 hidden items-center gap-1.5 rounded-md bg-secondary px-2.5 py-1.5 text-xs font-medium sm:flex">
                <Plus className="h-3.5 w-3.5" />
                Add step
              </span>
            </div>
          </div>

          {/* Timeline canvas */}
          <div className="relative flex-1 bg-canvas">
            <div className="grid grid-cols-4 border-b bg-card text-[10px] uppercase tracking-widest text-muted-foreground">
              {QUARTERS.map((q) => (
                <div key={q} className="truncate border-r px-2 py-2 last:border-r-0">
                  {q}
                </div>
              ))}
            </div>

            {/* Column grid lines */}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 top-[29px] grid grid-cols-4">
              {QUARTERS.map((q) => (
                <div key={q} className="border-r last:border-r-0" />
              ))}
            </div>

            <div className="relative space-y-2 p-3">
              {STEPS.map((s) => (
                <div key={s.label} className="grid grid-cols-4 gap-2">
                  <div className="col-span-2" style={{ gridColumnStart: s.col + 1 }}>
                    <div className="relative overflow-hidden rounded-lg border bg-card p-2.5 pl-3 shadow-[var(--shadow-card)]">
                      <span aria-hidden="true" className={`absolute inset-y-0 left-0 w-[3px] ${STATUS_BAR[s.status]}`} />
                      <p className="truncate text-[13px] font-medium tracking-tight">{s.label}</p>
                      <p className="mt-1 truncate text-[11px] text-muted-foreground">
                        {STATUS_LABEL[s.status]} · {s.meta}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Inspector */}
        <aside className="hidden w-56 shrink-0 flex-col border-l bg-card p-3 lg:flex">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Inspector</p>
          <p className="mt-2 text-sm font-medium leading-snug tracking-tight">{active?.label}</p>
          <div className="mt-3 space-y-1.5">
            {[
              ["Status", active ? STATUS_LABEL[active.status] : "—"],
              ["Window", active?.meta ?? "—"],
              ["Student", maya ? `${maya.year} · ${maya.major}` : "—"],
              ["School", maya?.school ?? "—"],
            ].map(([k, v]) => (
              <div key={k} className="field-tonal rounded-lg px-2.5 py-2">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{k}</p>
                <p className="mt-0.5 text-xs font-medium leading-snug">{v}</p>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}
