import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ChevronRight, ChevronDown, Compass, Plus, Pencil, Trash2, AlertCircle, RefreshCw, Loader2 } from "lucide-react";
import {
  Workspace,
  PageHeader,
  StatusTag,
  Tag,
  NotionCheckbox,
  OwnGoalBadge,
  FoundViaSearchBadge,
} from "@/components/workspace";
import { useWayfind } from "@/lib/sylo-store";
import { getTrack, milestonesForTrack, YEARS } from "@/lib/wayfind-data";
import { cn } from "@/lib/utils";
import { useRoadmapGeneration, useSearchProgressLabel } from "@/lib/use-roadmap-generation";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

import { CascadePanel } from "@/components/cascade-panel";
import { WavyConnector, StatusAccentBar } from "@/components/roadmap-connector";



export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Your Sylo Roadmap — Dashboard" },
      {
        name: "description",
        content:
          "Your sequenced roadmap: the one highest-leverage next move, deadlines to watch, and what's ahead.",
      },
      { property: "og:title", content: "Your Sylo Roadmap — Dashboard" },
      {
        property: "og:description",
        content: "One ranked next move, grounded in verified opportunities at your school.",
      },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const {
    profile,
    roadmap,
    toggleComplete,
    hydrated,
    customSteps,
    addCustomStep,
    updateCustomStep,
    removeCustomStep,
    resolveOpportunity,
    browsableOpportunities,
    liveOpportunities,
  } = useWayfind();
  const navigate = useNavigate();
  const [showAlternates, setShowAlternates] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [targetDate, setTargetDate] = useState("");

  useEffect(() => {
    if (hydrated && (!profile || !roadmap)) navigate({ to: "/roadmap-builder" });
  }, [hydrated, profile, roadmap, navigate]);

  if (!profile || !roadmap) return null;

  const track = getTrack(profile.trackId);
  const top = roadmap.steps.find((s) => s.opportunityId === roadmap.topOpportunityId) ?? roadmap.steps[0];
  const topOp = top ? resolveOpportunity(top.opportunityId) : undefined;
  // No verified opportunity dataset for this goal (e.g. the "Something else" track).
  const noDataset = roadmap.steps.length === 0;
  const completed = roadmap.steps.filter((s) => s.status === "complete");
  const ahead = roadmap.steps.filter((s) => s.status !== "complete");

  // The Long View: verified openings now, then general patterns for the years still ahead.
  const termOps = browsableOpportunities(profile.trackId)
    .slice()
    .sort((a, b) => a.deadline.localeCompare(b.deadline))
    .slice(0, 3);
  const currentYearIndex = YEARS.indexOf(profile.year);
  const futureYears = (["Junior", "Senior"] as const).filter(
    (y) => currentYearIndex < 0 || YEARS.indexOf(y) > currentYearIndex,
  );

  return (
    <Workspace>
      <PageHeader
        icon={<Compass className="h-5 w-5" />}
        title="Your Sylo Roadmap"
        subtitle={`${profile.major} Major → ${track?.label ?? "Your goal"}`}
        meta={[profile.major, profile.year, profile.school]}
      />

      <p className="mt-6 text-sm leading-relaxed text-muted-foreground">{roadmap.summary}</p>

      {noDataset ? (
        <NoDatasetState profile={profile} track={track} />
      ) : (
        <p className="mt-4 rounded-xl border bg-muted/50 px-3 py-2 text-[13px] leading-relaxed text-muted-foreground">
          {liveOpportunities.length
            ? "Steps tagged “Found via search” were looked up for your goal and school just now, then checked against a second source where one existed. Open any of them to see what Sylo checked."
            : "Sylo matched you to opportunities open to any student at your stage — not listings scraped specifically for your school."}
        </p>
      )}


      <ProgressStrip
        tiles={[
          ...roadmap.steps.map((s) => ({
            id: s.id,
            opportunityId: s.opportunityId,
            done: s.status === "complete",
            label: resolveOpportunity(s.opportunityId)?.name ?? "Step",
            own: false,
          })),
          ...customSteps.map((s) => ({
            id: s.id,
            done: s.status === "complete",
            label: s.title,
            note: s.note,
            own: true,
          })),
        ]}
      />


      {topOp?.gapLabel ? (
        <div className="mt-6 overflow-hidden rounded-2xl border-2 border-amber-500/35 bg-gradient-to-br from-amber-500/[0.14] to-amber-500/[0.04] p-6 shadow-sm shadow-amber-500/10">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-500/20 text-amber-700">
              <AlertCircle className="h-3.5 w-3.5" />
            </span>
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-700/90">
              Your biggest gap
            </p>
          </div>
          <p className="mt-3 text-[15px] font-semibold leading-snug tracking-tight sm:text-[17px]">
            {topOp.gapLabel}
          </p>
        </div>
      ) : null}


      {topOp ? (
        <div className="mt-6 rounded-2xl border border-primary/10 bg-primary/5 p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary/80">
            Your highest-leverage next move
          </p>
          <p className="mt-2 text-[15px] font-semibold tracking-tight">{topOp.name}</p>
          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{top.reasoning}</p>
          <CascadePanel upstream={topOp.upstream} unlocks={topOp.unlocks} window={topOp.window} />
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Tag tone="amber">{topOp.timeframe}</Tag>
            <Link
              to="/opportunity-details"
              search={{ id: topOp.id }}
              className="tap inline-flex items-center gap-0.5 rounded-md text-sm font-medium text-primary hover:underline"
            >
              Open details <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      ) : null}


      {!noDataset ? (
      <h2 className="mt-12 text-lg font-semibold tracking-tight">
        Here&apos;s your roadmap
      </h2>
      ) : null}
      {!noDataset ? (
      <p className="mt-1 text-sm text-muted-foreground">
        Every high-leverage move available to you, given where you are.
      </p>
      ) : null}

      <ol className="mt-5">
        {roadmap.steps.map((step, i) => {
          const op = resolveOpportunity(step.opportunityId);
          if (!op) return null;
          const done = step.status === "complete";
          return (
            <li key={step.id}>
              {i > 0 ? (
                <div className="flex justify-start pl-7" aria-hidden="true">
                  <WavyConnector />
                </div>
              ) : null}
              <div
                className={cn(
                  "card-tonal relative flex items-start gap-3.5 rounded-2xl pl-5 pr-4 py-4",
                  done && "bg-primary/[0.07] ring-1 ring-inset ring-primary/15",
                )}
              >
                <StatusAccentBar status={step.status} />
                <span className="w-5 shrink-0 pt-1 text-sm tabular-nums text-muted-foreground">{i + 1}</span>
                <NotionCheckbox
                  checked={done}
                  onChange={() => toggleComplete(step.opportunityId)}
                  label={`Mark ${op.name} complete`}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      to="/opportunity-details"
                      search={{ id: op.id }}
                      className={cn(
                        "text-sm font-semibold tracking-tight",
                        done ? "text-muted-foreground line-through" : "hover:underline",
                      )}
                    >
                      {op.name}
                    </Link>
                    <span className="text-xs text-muted-foreground">{op.timeframe}</span>
                    <StatusTag status={step.status} />
                    {op.origin === "live" ? <FoundViaSearchBadge /> : null}
                    {op.access === "translated" ? <Tag tone="amber">Local equivalent</Tag> : null}
                    {op.courseCode ? <Tag tone="blue">Course</Tag> : null}
                  </div>
                  <p className="mt-1.5 pl-0 text-sm leading-relaxed text-muted-foreground">{step.reasoning}</p>
                  {op.id !== topOp?.id && op.unlocks?.length ? (
                    <p className="mt-1 text-[13px] text-muted-foreground/80">
                      → Unlocks {op.unlocks[0]}
                    </p>
                  ) : null}

                  {op.courseCode ? (
                    <p className="mt-2 text-[13px] text-muted-foreground">
                      <span className="font-medium text-foreground">Course: {op.courseCode}</span>
                      {op.leverage ? <> · {op.leverage}</> : null}
                    </p>
                  ) : null}
                </div>
              </div>
            </li>
          );
        })}
      </ol>

      <section className="mt-12 rounded-3xl border border-primary/15 bg-gradient-to-br from-primary/[0.07] to-transparent p-5 sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-primary/10 pb-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-primary/70">
              Your collection
            </p>
            <h2 className="mt-1 text-lg font-semibold tracking-tight">Your own goals</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              The part of this board you wrote. Sylo doesn&apos;t have verified data on these, so it
              won&apos;t add deadlines or contacts.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowForm((v) => !v)}
            className="tap tap-surface inline-flex items-center gap-1.5 rounded-full border border-dashed border-foreground/25 px-3 py-1.5 text-sm font-medium"
          >
            <Plus className="h-4 w-4" /> Add your own step
          </button>
        </div>

        {showForm ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!title.trim()) return;
              addCustomStep({ title: title.trim(), note, targetDate });
              setTitle("");
              setNote("");
              setTargetDate("");
              setShowForm(false);
            }}
            className="mt-4 space-y-3 rounded-2xl border border-dashed border-foreground/25 bg-muted/60 p-4"
          >
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Step title (required)"
              aria-label="Step title"
              className="w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
            />
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Note (optional)"
              aria-label="Note"
              rows={2}
              className="w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
            />
            <input
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              aria-label="Target date (optional)"
              className="rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
            />
            <div className="flex gap-2">
              <button
                type="submit"
                className="tap rounded-full bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground"
              >
                Add step
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="tap tap-surface rounded-full border px-4 py-1.5 text-sm font-medium"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : null}

        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {customSteps.length === 0 ? (
            <li className="text-sm text-muted-foreground">
              Nothing of your own on the board yet — add a step and it lands here.
            </li>
          ) : null}
          {customSteps.map((s) => (
            <li
              key={s.id}
              className={cn(
                "rounded-2xl border border-primary/20 bg-card p-4 shadow-sm transition-colors duration-300",
                s.status === "complete" && "bg-primary/[0.09] ring-1 ring-inset ring-primary/15",
              )}
            >

              {editingId === s.id ? (
                <div className="space-y-2">
                  <input
                    value={s.title}
                    onChange={(e) => updateCustomStep(s.id, { title: e.target.value })}
                    aria-label="Edit title"
                    className="w-full rounded-xl border bg-background px-3 py-1.5 text-sm outline-none focus:border-primary/40"
                  />
                  <textarea
                    value={s.note ?? ""}
                    onChange={(e) => updateCustomStep(s.id, { note: e.target.value })}
                    aria-label="Edit note"
                    rows={2}
                    className="w-full rounded-xl border bg-background px-3 py-1.5 text-sm outline-none focus:border-primary/40"
                  />
                  <input
                    type="date"
                    value={s.targetDate ?? ""}
                    onChange={(e) => updateCustomStep(s.id, { targetDate: e.target.value })}
                    aria-label="Edit target date"
                    className="rounded-xl border bg-background px-3 py-1.5 text-sm outline-none focus:border-primary/40"
                  />
                  <button
                    type="button"
                    onClick={() => setEditingId(null)}
                    className="tap rounded-full bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground"
                  >
                    Done
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex items-start gap-3">
                    <NotionCheckbox
                      checked={s.status === "complete"}
                      onChange={() =>
                        updateCustomStep(s.id, {
                          status: s.status === "complete" ? "not-started" : "complete",
                        })
                      }
                      label={`Mark ${s.title} complete`}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={cn(
                            "text-sm font-semibold tracking-tight",
                            s.status === "complete" && "text-muted-foreground line-through",
                          )}
                        >
                          {s.title}
                        </span>
                        <OwnGoalBadge />
                        <StatusTag status={s.status} />
                        {s.targetDate ? (
                          <span className="text-xs text-muted-foreground">Target {s.targetDate}</span>
                        ) : null}
                      </div>
                      {s.note ? (
                        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{s.note}</p>
                      ) : null}
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <button
                        type="button"
                        onClick={() => setEditingId(s.id)}
                        aria-label={`Edit ${s.title}`}
                        className="tap tap-surface rounded-lg border p-1.5 text-muted-foreground"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeCustomStep(s.id)}
                        aria-label={`Delete ${s.title}`}
                        className="tap tap-surface rounded-lg border p-1.5 text-muted-foreground"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-12">
        <h2 className="text-lg font-semibold tracking-tight">The Long View</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          What to expect over the next two to three years, beside what&apos;s actually open now.
        </p>

        <div className="mt-5 grid gap-5 md:grid-cols-3">
          <div className="rounded-2xl border border-primary/15 bg-primary/5 p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary/80">This term</p>
            <p className="mt-1 text-[13px] text-muted-foreground">Verified openings at your school.</p>
            <ul className="mt-4 space-y-3.5">
              {termOps.length ? (
                termOps.map((op) => (
                  <li key={op.id}>
                    <Link
                      to="/opportunity-details"
                      search={{ id: op.id }}
                      className="tap text-sm font-semibold tracking-tight hover:underline"
                    >
                      {op.name}
                    </Link>
                    <div className="mt-1.5">
                      <Tag tone="amber">{op.timeframe}</Tag>
                    </div>
                  </li>
                ))
              ) : (
                <li className="text-sm text-muted-foreground">Nothing open right now.</li>
              )}
            </ul>
          </div>

          {futureYears.map((year) => {
            const items = milestonesForTrack(profile.trackId).filter((m) => m.year === year);
            if (!items.length) return null;
            return (
              <div key={year} className="card-tonal rounded-2xl p-5">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground/80">
                  General guidance
                </p>
                <p className="mt-1 text-sm font-medium text-muted-foreground">{year} year</p>
                <ul className="mt-4 space-y-3.5">
                  {items.map((m) => (
                    <li key={m.focus}>
                      <p className="text-[13px] font-semibold tracking-tight text-foreground/80">
                        {m.focus}
                      </p>
                      <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
                        <span className="text-muted-foreground/70">What usually matters: </span>
                        {m.lookOutFor}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </section>


      <section className="mt-12">
        <h2 className="border-b pb-3 text-lg font-semibold tracking-tight">What&apos;s ahead</h2>
        <div className="mt-5 grid gap-8 sm:grid-cols-2">
          <div className="card-tonal rounded-2xl p-5">
            <p className="text-sm font-semibold tracking-tight">Completed</p>
            <ul className="mt-3 space-y-2">
              {completed.length ? (
                completed.map((s) => (
                  <li key={s.id} className="text-sm text-muted-foreground line-through">
                    {resolveOpportunity(s.opportunityId)?.name}
                  </li>
                ))
              ) : (
                <li className="text-sm text-muted-foreground">Nothing checked off yet.</li>
              )}
            </ul>
          </div>
          <div className="card-tonal rounded-2xl p-5">
            <p className="text-sm font-semibold tracking-tight">Up next</p>
            <ul className="mt-3 space-y-2">
              {ahead.map((s) => (
                <li key={s.id} className="text-sm text-muted-foreground">
                  {resolveOpportunity(s.opportunityId)?.name}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="mt-5 flex items-baseline gap-2.5">
          <span className="field-xl text-foreground">
            {completed.length}<span className="text-muted-foreground/50"> / {roadmap.steps.length}</span>
          </span>
          <span className="pb-1 text-sm text-muted-foreground">steps complete</span>
        </div>
      </section>

      <section className="mt-10 border-t pt-5">
        <button
          type="button"
          onClick={() => setShowAlternates((v) => !v)}
          className="tap flex items-center gap-1.5 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          {showAlternates ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
          Explore more paths
        </button>
        {showAlternates ? (
          <div className="mt-4 space-y-4 pl-6">
            {roadmap.alternates.map((a) => (
              <div key={a.title} className="card-tonal rounded-2xl p-4">
                <p className="text-sm font-semibold tracking-tight">{a.title}</p>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{a.detail}</p>
              </div>
            ))}
          </div>
        ) : null}
      </section>
    </Workspace>
  );
}

type ProgressTile = {
  id: string;
  opportunityId?: string;
  done: boolean;
  label: string;
  note?: string;
  own: boolean;
};

/**
 * A filling-in picture, not a fraction: every step is a tile, and finished
 * ones fill in. No score, no percentage — just density you can see. The
 * popover adds rationale on demand; the grid itself stays a texture.
 */
function ProgressStrip({ tiles }: { tiles: ProgressTile[] }) {
  if (!tiles.length) return null;
  const built = tiles.filter((t) => t.done).length;
  const [openTileId, setOpenTileId] = useState<string | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scheduledCloseId = useRef<string | null>(null);

  const cancelClose = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = null;
    scheduledCloseId.current = null;
  };

  const openTile = (id: string) => {
    cancelClose();
    setOpenTileId(id);
  };

  const scheduleClose = (id: string) => {
    cancelClose();
    scheduledCloseId.current = id;
    closeTimer.current = setTimeout(() => {
      if (scheduledCloseId.current === id) {
        setOpenTileId((current) => (current === id ? null : current));
      }
      scheduledCloseId.current = null;
      closeTimer.current = null;
    }, 220);
  };

  useEffect(() => () => cancelClose(), []);

  return (
    <div className="card-tonal mt-6 rounded-2xl p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          What you&apos;ve built
        </p>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {tiles.map((t) => (
          <ProgressTileButton
            key={t.id}
            tile={t}
            open={openTileId === t.id}
            onOpen={() => openTile(t.id)}
            onClose={() => scheduleClose(t.id)}
            onToggle={() =>
              openTileId === t.id ? scheduleClose(t.id) : openTile(t.id)
            }
          />
        ))}
      </div>
      <p className="mt-3 text-[13px] text-muted-foreground">
        {built === 0
          ? "Nothing filled in yet — the first tile is the seminar below."
          : "Filled tiles are moves you've already made. The empty ones are still yours to take."}
      </p>
    </div>
  );
}

function ProgressTileButton({
  tile,
  open,
  onOpen,
  onClose,
  onToggle,
}: {
  tile: ProgressTile;
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
  onToggle: () => void;
}) {
  const navigate = useNavigate();
  const { resolveOpportunity } = useWayfind();
  const op = tile.opportunityId ? resolveOpportunity(tile.opportunityId) : undefined;
  const canOpen = Boolean(op);

  const isTouch = () =>
    typeof window !== "undefined" && window.matchMedia("(hover: none)").matches;

  const go = () => {
    if (!op) return;
    navigate({ to: "/opportunity-details", search: { id: op.id } });
  };

  return (
    <Popover open={open} onOpenChange={(v) => (v ? onOpen() : onClose())}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`${tile.label}${tile.done ? " — done" : ""}`}
          onMouseEnter={onOpen}
          onMouseLeave={onClose}
          onFocus={onOpen}
          onBlur={onClose}
          onClick={(e) => {
            // Touch: first tap reveals the rationale, the popover's link opens
            // the detail view. Pointer devices navigate straight through.
            if (isTouch()) {
              onToggle();
              return;
            }
            e.preventDefault();
            go();
          }}
          className={cn(
            "tap h-8 w-8 rounded-[9px] outline-none transition-all duration-300 focus-visible:ring-2 focus-visible:ring-primary/40",
            canOpen && "cursor-pointer hover:scale-105",
            tile.done
              ? "bg-primary/80 shadow-sm shadow-primary/25"
              : "border border-dashed border-foreground/20 bg-card",
            tile.own && !tile.done && "border-primary/30",
            tile.own && tile.done && "bg-primary/45",
          )}
        />
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="start"
        className="w-72 p-3.5"
        onOpenAutoFocus={(e) => e.preventDefault()}
        onMouseEnter={onOpen}
        onMouseLeave={onClose}
      >
        {tile.own ? (
          <>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-primary/80">
              Your own goal
            </p>
            <p className="mt-1.5 text-sm font-semibold tracking-tight">{tile.label}</p>
            <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
              {tile.note ?? "No note yet — add one from your roadmap."}
            </p>
          </>
        ) : (
          <>
            <p className="text-sm font-semibold tracking-tight">{op?.name ?? tile.label}</p>
            {op ? (
              <>
                <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
                  {op.leverage}
                </p>
                <p className="mt-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground/80">
                  {op.timeframe}
                </p>
                <button
                  type="button"
                  onClick={go}
                  className="tap mt-2.5 inline-flex items-center gap-0.5 rounded-md text-[13px] font-medium text-primary hover:underline"
                >
                  Open details <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </>
            ) : null}
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}




function NoDatasetState({ profile, track }: { profile: NonNullable<ReturnType<typeof useWayfind>["profile"]>; track: ReturnType<typeof getTrack> }) {
  const generate = useRoadmapGeneration();
  const { setRoadmap } = useWayfind();
  const [searching, setSearching] = useState(false);
  const [failed, setFailed] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const busyLabel = useSearchProgressLabel(searching);
  const hasGoal = Boolean(profile.goalText?.trim());

  async function retrySearch() {
    setSearching(true);
    setFailed(false);
    try {
      const { roadmap, live } = await generate({
        trackId: profile.trackId,
        goalText: profile.goalText,
        major: profile.major,
        year: profile.year,
        school: profile.school,
      });
      if (roadmap.steps.length > 0) {
        setRoadmap(roadmap, live);
      } else {
        setFailed(true);
        setAttempts((a) => a + 1);
      }
    } catch {
      setFailed(true);
      setAttempts((a) => a + 1);
    } finally {
      setSearching(false);
    }
  }

  // Auto-trigger the search on mount when a goal is present, so the user
  // doesn't land on a blank page and have to click manually.
  const autoTriggered = useRef(false);
  useEffect(() => {
    if (hasGoal && !autoTriggered.current) {
      autoTriggered.current = true;
      retrySearch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (searching) {
    return (
      <div className="mt-6 rounded-2xl border border-primary/20 bg-primary/5 p-6">
        <div className="flex items-center gap-3">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <div>
            <p className="text-sm font-semibold tracking-tight">{busyLabel}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Searching for &ldquo;{profile.goalText || "opportunities"}&rdquo; at {profile.school}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-6 rounded-2xl border border-dashed border-foreground/25 bg-muted/50 p-6">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Your goal, in your words
      </p>
      <p className="mt-2 text-[15px] font-semibold leading-snug tracking-tight">
        {profile.goalText || track?.label || "Something else"}
      </p>
      {failed ? (
        <>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Sylo searched for &ldquo;{profile.goalText}&rdquo; opportunities at {profile.school} but
            didn&apos;t find verified results{attempts > 1 ? ` (tried ${attempts} times)` : ""}.
            This can happen when the search APIs are slow, rate-limited, or when results don&apos;t
            pass verification.
          </p>
          <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
            You can try again, or add your own steps below and Sylo will track them.
          </p>
        </>
      ) : (
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Sylo can search for real opportunities at {profile.school} for this goal. Hit the button below to find programs, internships, and next steps with verified links.
        </p>
      )}
      <button
        onClick={retrySearch}
        className="tap mt-4 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
      >
        <RefreshCw className="h-4 w-4" />
        {failed ? "Try again" : "Search for opportunities"}
      </button>
    </div>
  );
}
