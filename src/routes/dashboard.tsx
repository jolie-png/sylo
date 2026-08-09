import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ChevronRight, ChevronDown, Map, Plus, Pencil, Trash2, AlertCircle, RefreshCw, Loader2, GripVertical, MessageCircle } from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Workspace,
  PageHeader,
  StatusTag,
  Tag,
  NotionCheckbox,
  OwnGoalBadge,
  FoundViaSearchBadge,
  CuratedBadge,
} from "@/components/workspace";
import { useWayfind } from "@/lib/sylo-store";
import { getTrack, milestonesForTrack, YEARS } from "@/lib/wayfind-data";
import { cn } from "@/lib/utils";
import { formatTargetDate } from "@/lib/terms";
import { useRoadmapGeneration, useSearchProgressLabel } from "@/lib/use-roadmap-generation";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

import { AcademicTermSelector } from "@/components/academic-term-selector";
import { CascadePanel } from "@/components/cascade-panel";
import { WavyConnector, StatusAccentBar } from "@/components/roadmap-connector";
import { InlineNoteEditor } from "@/components/inline-note-editor";
import { NoteIndicator } from "@/components/note-indicator";
import { DeadlinePill } from "@/components/deadline-badges";
import { SUCCESS_STORIES } from "@/lib/success-stories";



export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Your Roadmap — Sylo" },
      {
        name: "description",
        content:
          "Your sequenced roadmap: the one highest-leverage next move, deadlines to watch, and what's ahead.",
      },
      { property: "og:title", content: "Your Roadmap — Sylo" },
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
    setStatus,
    hydrated,
    customSteps,
    addCustomStep,
    updateCustomStep,
    removeCustomStep,
    resolveOpportunity,
    browsableOpportunities,
    liveOpportunities,
    reorderSteps,
    stepNotes,
    setStepNote,
    stepReasoningOverrides,
  } = useWayfind();
  const navigate = useNavigate();
  const [showAlternates, setShowAlternates] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingStepId, setEditingStepId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [targetDate, setTargetDate] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id && roadmap) {
      const oldIndex = roadmap.steps.findIndex((s) => s.id === active.id);
      const newIndex = roadmap.steps.findIndex((s) => s.id === over.id);
      if (oldIndex !== -1 && newIndex !== -1) {
        reorderSteps(oldIndex, newIndex);
      }
    }
  }

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
  const futureYears = (["Sophomore", "Junior", "Senior"] as const).filter(
    (y) => currentYearIndex < 0 || YEARS.indexOf(y) > currentYearIndex,
  );

  return (
    <Workspace wide>
      <PageHeader
        icon={<Map className="h-5 w-5" />}
        title="Your Roadmap"
        subtitle={`${profile.major} Major → ${track?.label ?? "Your goal"}`}
        meta={[profile.major, profile.year, profile.school]}
      />

      <p className="mt-6 text-sm leading-relaxed text-muted-foreground">{roadmap.summary}</p>

      {roadmap.gapAnalysis ? (
        <section className="mt-6 rounded-2xl border border-primary/15 bg-gradient-to-br from-primary/[0.05] to-transparent p-5 sm:p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-primary/80">Where you stand</h2>
          
          <div className="mt-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">What you&apos;ve got</p>
            <ul className="mt-2 space-y-1.5">
              {roadmap.gapAnalysis.strengths.map((s, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-green-500/15 text-[10px] text-green-700 dark:text-green-400">✓</span>
                  {s}
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Gaps to close</p>
            <div className="mt-2 space-y-3">
              {roadmap.gapAnalysis.gaps.map((g, i) => (
                <div key={i} className="rounded-xl border bg-card p-3.5">
                  <p className="text-sm font-semibold tracking-tight">{g.gap}</p>
                  <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">{g.why}</p>
                  <p className="mt-1.5 text-[13px] font-medium text-primary">→ {g.action}</p>
                </div>
              ))}
            </div>
          </div>

          <p className="mt-5 rounded-lg bg-primary/10 px-3 py-2 text-[13px] font-medium leading-relaxed text-primary">
            {roadmap.gapAnalysis.bottomLine}
          </p>
        </section>
      ) : null}

      {noDataset ? (
        <NoDatasetState profile={profile} track={track} />
      ) : (() => {
        const curatedCount = roadmap.steps.filter((s) => {
          const o = resolveOpportunity(s.opportunityId);
          return o && o.origin !== "live";
        }).length;
        const liveCount = roadmap.steps.filter((s) => {
          const o = resolveOpportunity(s.opportunityId);
          return o && o.origin === "live";
        }).length;
        const totalCount = roadmap.steps.length;

        // Only show the data source banner when there's a mix or all-live results
        if (liveCount === 0) return null;

        return (
          <div className="mt-4 rounded-xl border bg-muted/50 px-4 py-3">
            <div className="flex flex-wrap items-center gap-3 text-[13px]">
              <span className="font-semibold text-foreground">
                {totalCount} step{totalCount !== 1 ? "s" : ""} in your roadmap
              </span>
              <span className="text-muted-foreground/50">&middot;</span>
              {curatedCount > 0 ? (
                <span className="inline-flex items-center gap-1.5 text-green-700 dark:text-green-400">
                  <span className="inline-block h-2 w-2 rounded-full bg-green-500/60" />
                  {curatedCount} verified
                </span>
              ) : null}
              {liveCount > 0 ? (
                <span className="inline-flex items-center gap-1.5 text-primary/80">
                  <span className="inline-block h-2 w-2 rounded-full bg-primary/50" />
                  {liveCount} found via search
                </span>
              ) : null}
            </div>
            <p className="mt-1.5 text-[12px] leading-relaxed text-muted-foreground">
              {curatedCount > 0
                ? "Verified steps come from Sylo\u2019s curated dataset. Search results were looked up live and cross-checked where possible."
                : "Steps were searched live for your goal and school, then checked against a second source where one existed."}
            </p>
          </div>
        );
      })()}


      {/* <ProgressStrip
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
      /> */}


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

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={roadmap.steps.map((s) => s.id)} strategy={verticalListSortingStrategy}>
          <ol className="mt-5">
            {roadmap.steps.map((step, i) => (
              <SortableStep
                key={step.id}
                step={step}
                index={i}
                resolveOpportunity={resolveOpportunity}
                toggleComplete={toggleComplete}
                setStatus={setStatus}
                stepNotes={stepNotes}
                stepReasoningOverrides={stepReasoningOverrides}
                editingStepId={editingStepId}
                setEditingStepId={setEditingStepId}
                topOpId={topOp?.id}
              />
            ))}
          </ol>
        </SortableContext>
      </DndContext>

      {!noDataset && (
        <button
          type="button"
          onClick={() => window.dispatchEvent(new Event("open-ask-sylo"))}
          className="tap mt-4 inline-flex items-center gap-2 rounded-full border border-primary/25 px-4 py-2 text-sm font-medium text-primary hover:bg-primary/5"
        >
          <MessageCircle className="h-4 w-4" />
          Ask Sylo for more opportunities
        </button>
      )}

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
            <AcademicTermSelector
              value={targetDate}
              currentYear={profile.year}
              onChange={setTargetDate}
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
                  <AcademicTermSelector
                    value={s.targetDate ?? ""}
                    currentYear={profile.year}
                    onChange={(term) => updateCustomStep(s.id, { targetDate: term || undefined })}
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
                        <StatusTag status={s.status} onChange={(st) => updateCustomStep(s.id, { status: st })} />
                        {s.targetDate ? (
                          <span className="text-xs text-muted-foreground">{formatTargetDate(s.targetDate)}</span>
                        ) : null}
                        {s.note ? (
                          <NoteIndicator note={s.note} />
                        ) : null}
                      </div>
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

        {(() => {
          const futureCards = futureYears.filter(
            (y) => milestonesForTrack(profile.trackId).filter((m) => m.year === y).length > 0,
          ).length;
          const totalCards = 1 + futureCards;
          const gridCols =
            totalCards >= 3
              ? "md:grid-cols-3"
              : totalCards === 2
                ? "md:grid-cols-2"
                : "md:grid-cols-1";
          return (
        <div className={cn("mt-5 grid gap-5", gridCols)}>
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
                  What to do
                </p>
                <p className="mt-1 text-sm font-semibold tracking-tight">{year} year</p>
                <ul className="mt-4 space-y-6">
                  {items.map((m) => (
                    <li key={m.focus}>
                      <p className="text-[14px] font-semibold tracking-tight text-foreground">
                        {m.focus}
                      </p>
                      <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
                        {m.lookOutFor}
                      </p>
                      <ol className="mt-3 space-y-2 pl-4">
                        {m.actions.map((action, i) => (
                          <li key={i} className="flex gap-2 text-[13px] leading-relaxed text-foreground/80">
                            <span className="mt-px flex h-4 w-4 shrink-0 items-center justify-center rounded bg-secondary text-[10px] font-medium tabular-nums text-muted-foreground">
                              {i + 1}
                            </span>
                            <span>{action}</span>
                          </li>
                        ))}
                      </ol>
                      <div className="mt-3 rounded-lg border border-primary/10 bg-primary/5 px-3 py-2">
                        <p className="text-[12px] font-medium text-primary/90">
                          Done when: <span className="font-normal text-foreground/70">{m.doneWhen}</span>
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
          );
        })()}
      </section>


      {/* What's ahead — commented out, redundant with roadmap steps above
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
      */}

      <section className="mt-10 border-t pt-5">
        <h2 className="text-sm font-semibold tracking-tight">More opportunities available to you</h2>
        <div className="mt-3 space-y-2">
          {browsableOpportunities(profile.trackId)
            .slice(0, 3)
            .map((op) => (
              <Link
                key={op.id}
                to="/opportunity-details"
                search={{ id: op.id }}
                className="tap flex items-center justify-between rounded-xl border bg-card p-3 text-sm hover:border-primary/30"
              >
                <div className="min-w-0">
                  <p className="font-medium tracking-tight truncate">{op.name}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{op.category} · {op.timeframe}</p>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </Link>
            ))}
        </div>
        <Link
          to="/opportunity-details"
          search={{ id: undefined }}
          className="tap mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          See all opportunities <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </section>

      <section className="mt-8 border-t pt-5">
        <h2 className="text-sm font-semibold tracking-tight">See the roadmaps that lead others to success</h2>
        <div className="mt-3 space-y-2">
          {SUCCESS_STORIES.slice(0, 2).map((story) => (
            <Link
              key={story.id}
              to="/paths"
              className="tap flex items-center justify-between rounded-xl border bg-card p-3 text-sm hover:border-primary/30"
            >
              <div className="min-w-0">
                <p className="font-medium tracking-tight">{story.name} · {story.school}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{story.outcome} · {story.steps.length} steps</p>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </Link>
          ))}
        </div>
        <Link
          to="/paths"
          className="tap mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          See all success maps <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </section>
    </Workspace>
  );
}

function SortableStep({
  step,
  index,
  resolveOpportunity,
  toggleComplete,
  setStatus,
  stepNotes,
  stepReasoningOverrides,
  editingStepId,
  setEditingStepId,
  topOpId,
}: {
  step: any;
  index: number;
  resolveOpportunity: (id: string) => any;
  toggleComplete: (id: string) => void;
  setStatus: (id: string, s: any) => void;
  stepNotes: Record<string, string>;
  stepReasoningOverrides: Record<string, string>;
  editingStepId: string | null;
  setEditingStepId: (id: string | null) => void;
  topOpId: string | undefined;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: step.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  const op = resolveOpportunity(step.opportunityId);
  if (!op) return null;
  const done = step.status === "complete";

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={cn("transition-opacity", isDragging && "opacity-50 z-50")}
    >
      {index > 0 ? (
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
        <span
          className="flex w-5 shrink-0 cursor-grab flex-col items-center gap-0.5 pt-1 active:cursor-grabbing"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-3 w-3 text-muted-foreground/50" />
          <span className="text-sm tabular-nums text-muted-foreground">{index + 1}</span>
        </span>
        <NotionCheckbox
          checked={done}
          onChange={() => toggleComplete(step.opportunityId)}
          label={`Mark ${op.name} complete`}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-2">
            <div className="flex flex-1 flex-wrap items-center gap-2">
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
              <DeadlinePill deadline={op.deadline} recurring={false} />
              <StatusTag status={step.status} onChange={(s) => setStatus(step.opportunityId, s)} />
              {op.origin === "live" ? <FoundViaSearchBadge /> : null}
              {op.access === "translated" ? <Tag tone="amber">Local equivalent</Tag> : null}
              {stepNotes[step.opportunityId] ? (
                <NoteIndicator note={stepNotes[step.opportunityId]} />
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => setEditingStepId(step.id)}
              aria-label={`Edit note for ${op.name}`}
              className="tap tap-surface shrink-0 rounded-lg border p-1.5 text-muted-foreground"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          </div>
          {editingStepId === step.id ? (
            <div className="mt-2">
              <InlineNoteEditor
                opportunityId={step.opportunityId}
                existingNote={stepNotes[step.opportunityId]}
                existingReasoningOverride={stepReasoningOverrides[step.opportunityId]}
                reasoning={step.reasoning}
                onClose={() => setEditingStepId(null)}
              />
            </div>
          ) : (
            <>
              <div className="mt-2 flex items-start gap-2 rounded-lg bg-muted/60 px-3 py-2">
                <span className="mt-0.5 shrink-0 text-[11px] text-primary/70" aria-hidden="true">💡</span>
                <p className="text-[13px] leading-relaxed text-foreground/80">
                  {stepReasoningOverrides[step.opportunityId] || step.reasoning}
                </p>
              </div>
              {stepReasoningOverrides[step.opportunityId] ? (
                <p className="mt-1 pl-7 text-[11px] text-muted-foreground/50 italic">
                  Sylo&apos;s original: {step.reasoning}
                </p>
              ) : null}
              {stepNotes[step.opportunityId] ? (
                <CollapsibleNote note={stepNotes[step.opportunityId]} />
              ) : null}
            </>
          )}
          {op.id !== topOpId && op.unlocks?.length ? (
            <p className="mt-1 text-[13px] text-muted-foreground/80">
              → Unlocks {op.unlocks[0]}
            </p>
          ) : null}
        </div>
      </div>
    </li>
  );
}

function CollapsibleNote({ note }: { note: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="tap flex items-center gap-1 text-[12px] font-medium text-primary/80 hover:text-primary"
      >
        {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        {open ? "Hide note" : "View note"}
      </button>
      {open ? (
        <p className="mt-1.5 rounded-lg bg-muted/50 px-3 py-2 text-[13px] leading-relaxed text-muted-foreground whitespace-pre-wrap">
          {note}
        </p>
      ) : null}
    </div>
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
