import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useCallback, useRef, useState } from "react";
import { ChevronRight, ChevronDown, Map, Plus, Pencil, Trash2, AlertCircle, RefreshCw, Loader2, GripVertical, MessageCircle, ArrowUp, ArrowDown, GitBranch } from "lucide-react";
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
import { getTrack, milestonesForTrack, POST_GRAD_YEARS, YEARS } from "@/lib/wayfind-data";
import { cn } from "@/lib/utils";
import { formatTargetDate } from "@/lib/terms";
import { useRoadmapGeneration, useSearchProgressLabel } from "@/lib/use-roadmap-generation";
import { usePostGradProjections } from "@/lib/use-postgrad-projections";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

import { AcademicTermSelector } from "@/components/academic-term-selector";
import { CascadePanel } from "@/components/cascade-panel";
import { WavyConnector, StatusAccentBar } from "@/components/roadmap-connector";
import { InlineNoteEditor } from "@/components/inline-note-editor";
import { NoteIndicator } from "@/components/note-indicator";
import { LinkifyText } from "@/components/linkify-text";
import { DeadlinePill } from "@/components/deadline-badges";
import { CalendarButton } from "@/components/calendar-button";
import { ProgressNudge } from "@/components/progress-nudge";
import { useConfettiBurst } from "@/components/confetti-burst";
import { LinkExtractor } from "@/components/link-extractor";



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
    promoteCustomStep,
    resolveOpportunity,
    browsableOpportunities,
    liveOpportunities,
    reorderSteps,
    removeStep,
    demoteStep,
    stepNotes,
    setStepNote,
    stepReasoningOverrides,
  } = useWayfind();
  const navigate = useNavigate();
  const postGrad = usePostGradProjections(profile);
  const [showAlternates, setShowAlternates] = useState(false);
  const [showForm, setShowForm] = useState(() => {
    try { return sessionStorage.getItem("sylo:draft:open") === "true"; } catch { return false; }
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingStepId, setEditingStepId] = useState<string | null>(null);
  const [expandedNotes, setExpandedNotes] = useState<Record<string, boolean>>({});
  const [title, setTitle] = useState(() => {
    try { return sessionStorage.getItem("sylo:draft:title") ?? ""; } catch { return ""; }
  });
  const [note, setNote] = useState(() => {
    try { return sessionStorage.getItem("sylo:draft:note") ?? ""; } catch { return ""; }
  });
  const [targetDate, setTargetDate] = useState(() => {
    try { return sessionStorage.getItem("sylo:draft:date") ?? ""; } catch { return ""; }
  });

  // Persist draft state so navigation doesn't lose in-progress steps
  useEffect(() => {
    try {
      sessionStorage.setItem("sylo:draft:open", String(showForm));
      sessionStorage.setItem("sylo:draft:title", title);
      sessionStorage.setItem("sylo:draft:note", note);
      sessionStorage.setItem("sylo:draft:date", targetDate);
    } catch { /* sessionStorage unavailable */ }
  }, [showForm, title, note, targetDate]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const { burst, ConfettiContainer } = useConfettiBurst();

  const handleToggleComplete = useCallback((opportunityId: string, e?: React.MouseEvent) => {
    // Only burst when completing (not un-completing)
    const step = roadmap?.steps.find((s) => s.opportunityId === opportunityId);
    if (step && step.status !== "complete") {
      // Fire confetti from the click position (checkbox location)
      if (e) {
        const x = (e.clientX / window.innerWidth) * 100;
        const y = (e.clientY / window.innerHeight) * 100;
        burst({ x, y });
      } else {
        burst({ x: 50, y: 30 });
      }
    }
    toggleComplete(opportunityId);
  }, [roadmap, toggleComplete, burst]);

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
    .sort((a, b) => {
      // Empty deadlines (rolling) sort after real deadlines
      if (!a.deadline && !b.deadline) return 0;
      if (!a.deadline) return 1;
      if (!b.deadline) return -1;
      return a.deadline.localeCompare(b.deadline);
    })
    .slice(0, 3);
  const currentYearIndex = YEARS.indexOf(profile.year);
  const futureYears = (["Sophomore", "Junior", "Senior"] as const).filter(
    (y) => currentYearIndex < 0 || YEARS.indexOf(y) > currentYearIndex,
  );
  const postGradItems = postGrad.projections;

  return (
    <Workspace wide>
      {ConfettiContainer}
      <PageHeader
        icon={<Map className="h-5 w-5" />}
        title="Your Roadmap"
        subtitle={`${profile.major} Major → ${track?.label ?? "Your goal"}`}
        meta={[profile.major, profile.year, profile.school]}
      />

      <p className="animate-reveal mt-6 text-sm leading-relaxed text-muted-foreground">{roadmap.summary}</p>

      {roadmap.gapAnalysis ? (
        <section className="animate-reveal mt-6 rounded-2xl border border-primary/12 bg-primary/[0.04] p-5 sm:p-6" style={{ animationDelay: "100ms" }}>
          <h2 className="text-[11px] font-semibold uppercase tracking-widest text-primary/70">Where you stand</h2>
          
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
                ? "Curated steps come from Sylo\u2019s verified database. Live results were searched in real time and cross-checked before appearing here."
                : "Searched live for your goal and school, then cross-checked each result before showing it to you."}
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
        <div className="animate-reveal mt-6 overflow-hidden rounded-2xl border-2 border-amber-500/30 bg-amber-500/[0.06] p-6" style={{ animationDelay: "200ms" }}>
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
        <div className="animate-reveal mt-8" style={{ animationDelay: "300ms" }}>
        <div className="animate-pulse-glow rounded-2xl border border-primary/20 bg-primary/[0.03] p-4 sm:p-6">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-primary/70">
            Your highest-leverage next move
          </p>
          <p className="mt-3 text-[20px] font-bold leading-tight tracking-tight sm:text-[26px]">{topOp.name}</p>
          <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">{top.reasoning}</p>
          <CascadePanel upstream={topOp.upstream} unlocks={topOp.unlocks} window={topOp.window} />
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Tag tone="amber">{topOp.timeframe}</Tag>
            <DeadlinePill deadline={topOp.deadline} recurring={false} />
            <CalendarButton name={topOp.name} deadline={topOp.deadline} description={topOp.leverage} url={topOp.link} compact />
            <Link
              to="/opportunity-details"
              search={{ id: topOp.id }}
              className="tap inline-flex items-center gap-0.5 rounded-md text-sm font-medium text-primary hover:underline"
            >
              Open details <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
        </div>
      ) : null}


      {!noDataset && roadmap && (
        <ProgressNudge
          steps={roadmap.steps}
          resolveOpportunity={resolveOpportunity}
          onMarkComplete={(id) => setStatus(id, "complete")}
        />
      )}

      {!noDataset ? (
      <h2 className="animate-reveal mt-10 text-lg font-semibold tracking-tight" style={{ animationDelay: "400ms" }}>
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
                toggleComplete={handleToggleComplete}
                setStatus={(id, s) => {
                  if (s === "complete" && step.status !== "complete") {
                    // Get checkbox position from the SortableStep's ref
                    const el = document.querySelector(`[data-step-id="${step.id}"] [role="checkbox"]`);
                    if (el) {
                      const rect = el.getBoundingClientRect();
                      burst({ x: (rect.left + rect.width / 2) / window.innerWidth * 100, y: (rect.top + rect.height / 2) / window.innerHeight * 100 });
                    } else {
                      burst({ x: 15, y: 30 });
                    }
                  }
                  setStatus(id, s);
                }}
                removeStep={removeStep}
                demoteStep={demoteStep}
                stepNotes={stepNotes}
                stepReasoningOverrides={stepReasoningOverrides}
                editingStepId={editingStepId}
                setEditingStepId={setEditingStepId}
                topOpId={topOp?.id}
                burst={burst}
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

      <section className="mt-10 rounded-2xl border border-primary/12 bg-primary/[0.04] p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-primary/10 pb-3">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Your additions</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Steps you added yourself — things you found, heard about, or want to track.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowForm((v) => !v)}
            className="tap tap-surface inline-flex items-center gap-1.5 rounded-full border border-dashed border-foreground/25 px-3 py-1.5 text-sm font-medium"
          >
            <Plus className="h-4 w-4" /> Add a step
          </button>
        </div>

        {showForm ? (
          <div className="mt-4 space-y-4">
            {/* Link extractor */}
            <LinkExtractor
              onExtracted={(details) => {
                const noteLines = [details.description];
                if (details.requirements.length > 0) noteLines.push(`Requirements: ${details.requirements.join(", ")}`);
                if (details.contact) noteLines.push(`Contact: ${details.contact}`);
                addCustomStep({
                  title: details.name,
                  note: noteLines.join("\n"),
                  targetDate: details.deadline || undefined,
                });
                setShowForm(false);
              }}
              onFallback={(failedUrl) => {
                setNote(`Link: ${failedUrl}`);
                setTitle("");
              }}
            />

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-border" />
              <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">or add manually</span>
              <div className="h-px flex-1 bg-border" />
            </div>

            {/* Manual form */}
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
              className="space-y-3 rounded-2xl border border-dashed border-foreground/25 bg-muted/60 p-4"
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
          </div>
        ) : null}

        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {customSteps.length === 0 ? (
            <li className="text-sm text-muted-foreground">
              Nothing here yet — add a step to get started.
            </li>
          ) : null}
          {customSteps.map((s) => (
            <li
              key={s.id}
              className={cn(
                "rounded-2xl border border-primary/20 bg-card p-4 shadow-sm transition-colors duration-200",
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
                      onChange={(e) => {
                        if (s.status !== "complete") {
                          const x = e ? (e.clientX / window.innerWidth) * 100 : 50;
                          const y = e ? (e.clientY / window.innerHeight) * 100 : 30;
                          burst({ x, y });
                        }
                        updateCustomStep(s.id, {
                          status: s.status === "complete" ? "not-started" : "complete",
                        });
                      }}
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
                        <StatusTag status={s.status} onChange={(st) => updateCustomStep(s.id, { status: st })} />
                        {s.targetDate ? (
                          <span className="text-xs text-muted-foreground">{formatTargetDate(s.targetDate)}</span>
                        ) : null}
                        {s.targetDate ? (
                          <CalendarButton name={s.title} deadline={s.targetDate} description={s.note || ""} compact />
                        ) : null}
                      </div>
                      {s.note && expandedNotes[s.id] ? (
                        <p className="mt-2 break-words text-xs leading-relaxed text-muted-foreground whitespace-pre-wrap">
                          <LinkifyText text={s.note} />
                        </p>
                      ) : null}
                      {s.note ? (
                        <button
                          type="button"
                          onClick={() => setExpandedNotes((prev) => ({ ...prev, [s.id]: !prev[s.id] }))}
                          className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80"
                        >
                          {expandedNotes[s.id] ? (
                            <ChevronDown className="h-3.5 w-3.5" />
                          ) : (
                            <ChevronRight className="h-3.5 w-3.5" />
                          )}
                          {expandedNotes[s.id] ? "Hide note" : "View note"}
                        </button>
                      ) : null}
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <button
                        type="button"
                        onClick={() => promoteCustomStep(s.id)}
                        aria-label={`Move ${s.title} to roadmap`}
                        title="Move to roadmap"
                        className="tap tap-surface rounded-lg border p-1.5 text-muted-foreground hover:text-primary"
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingId(s.id)}
                        aria-label={`Edit ${s.title}`}
                        title="Edit"
                        className="tap tap-surface rounded-lg border p-1.5 text-muted-foreground"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeCustomStep(s.id)}
                        aria-label={`Delete ${s.title}`}
                        title="Delete"
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

      <section className="mt-10">
        <h2 className="text-lg font-semibold tracking-tight">The Long View</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          What to expect over the next two to three years, beside what&apos;s actually open now.
        </p>

        {(() => {
          const futureCards = futureYears.filter(
            (y) => milestonesForTrack(profile.trackId).filter((m) => m.year === y).length > 0,
          ).length;
          const postGradCards = postGradItems.length > 0 || postGrad.loading ? POST_GRAD_YEARS.filter(
            (y) => postGradItems.some((m) => m.year === y) || postGrad.loading,
          ).length : 0;
          const totalCards = 1 + futureCards + postGradCards;
          const gridCols =
            totalCards >= 3
              ? "md:grid-cols-3"
              : totalCards === 2
                ? "md:grid-cols-2"
                : "md:grid-cols-1";
          return (
        <div className={cn("mt-5 grid gap-5", gridCols)}>
          <div className="rounded-2xl border border-primary/12 bg-primary/[0.04] p-5">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-primary/70">This term</p>
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

          {POST_GRAD_YEARS.map((year) => {
            const items = postGradItems.filter((m) => m.year === year);
            if (!items.length && !postGrad.loading) return null;
            return (
              <div key={year} className="card-tonal rounded-2xl p-5">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground/80">
                  What to do
                </p>
                <p className="mt-1 text-sm font-semibold tracking-tight">{year}</p>
                {items.length > 0 ? (
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
                ) : postGrad.loading ? (
                  <div className="mt-4 space-y-3">
                    <div className="h-4 w-3/4 animate-pulse rounded bg-secondary" />
                    <div className="h-3 w-full animate-pulse rounded bg-secondary/60" />
                    <div className="h-3 w-5/6 animate-pulse rounded bg-secondary/60" />
                  </div>
                ) : null}
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
        <Link
          to="/opportunity-details"
          search={{ id: undefined }}
          className="tap inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          See more opportunities available to you <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </section>

      <section className="mt-8 border-t pt-5">
        <Link
          to="/paths"
          className="tap inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          See the roadmaps that led others to success <ChevronRight className="h-3.5 w-3.5" />
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
  removeStep,
  demoteStep,
  stepNotes,
  stepReasoningOverrides,
  editingStepId,
  setEditingStepId,
  topOpId,
  burst,
}: {
  step: any;
  index: number;
  resolveOpportunity: (id: string) => any;
  toggleComplete: (id: string, e?: React.MouseEvent) => void;
  setStatus: (id: string, s: any) => void;
  removeStep: (id: string) => void;
  demoteStep: (id: string) => void;
  stepNotes: Record<string, string>;
  stepReasoningOverrides: Record<string, string>;
  editingStepId: string | null;
  setEditingStepId: (id: string | null) => void;
  topOpId: string | undefined;
  burst: (origin: { x: number; y: number }) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: step.id });
  const checkboxRef = useRef<HTMLSpanElement>(null);
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
      data-step-id={step.id}
      style={{ ...style, animationDelay: `${500 + index * 80}ms` }}
      className={cn("animate-reveal transition-opacity duration-200", isDragging && "opacity-50 z-50")}
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
          aria-label={`Reorder step ${index + 1}`}
          title="Drag to reorder"
        >
          <GripVertical className="h-3 w-3 text-muted-foreground/50" aria-hidden="true" />
          <span className="text-sm tabular-nums text-muted-foreground">{index + 1}</span>
        </span>
        <span ref={checkboxRef}>
          <NotionCheckbox
            checked={done}
            onChange={(e) => toggleComplete(step.opportunityId, e)}
            label={`Mark ${op.name} complete`}
          />
        </span>
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
              <CalendarButton name={op.name} deadline={op.deadline} description={step.reasoning} url={op.link} compact />
              <StatusTag status={step.status} onChange={(s) => setStatus(step.opportunityId, s)} />
              {op.origin === "live" ? <FoundViaSearchBadge /> : null}
              {op.access === "translated" ? <Tag tone="amber">Local equivalent</Tag> : null}
            </div>
            <button
              type="button"
              onClick={() => setEditingStepId(step.id)}
              aria-label={`Edit note for ${op.name}`}
              title="Edit"
              className="tap tap-surface shrink-0 rounded-lg border p-1.5 text-muted-foreground"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => demoteStep(step.opportunityId)}
              aria-label={`Move ${op.name} to additions`}
              title="Move to additions"
              className="tap tap-surface hidden shrink-0 rounded-lg border p-1.5 text-muted-foreground hover:text-primary sm:block"
            >
              <ArrowDown className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => removeStep(step.opportunityId)}
              aria-label={`Remove ${op.name} from roadmap`}
              title="Remove from roadmap"
              className="tap tap-surface hidden shrink-0 rounded-lg border p-1.5 text-muted-foreground sm:block"
            >
              <Trash2 className="h-3.5 w-3.5" />
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
          {op.id !== topOpId && (op.upstream || op.unlocks?.length) ? (
            <DependencyChain upstream={op.upstream} unlocks={op.unlocks} window={op.window} />
          ) : null}
        </div>
      </div>
    </li>
  );
}

/**
 * Compact dependency chain shown on every step (except hero which uses CascadePanel).
 * Makes the sequencing engine visible: what this step requires, what it enables.
 */
function DependencyChain({
  upstream,
  unlocks,
  window: windowText,
}: {
  upstream?: string;
  unlocks?: string[];
  window?: string;
}) {
  const [expanded, setExpanded] = useState(false);

  if (!upstream && !unlocks?.length) return null;

  return (
    <div className="mt-2 rounded-lg border border-primary/10 bg-primary/[0.03] px-3 py-2">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="tap flex w-full items-center gap-2 text-left"
      >
        <GitBranch className="h-3 w-3 shrink-0 text-primary/60" aria-hidden="true" />
        <span className="flex-1 text-[12px] font-medium text-primary/80">
          {unlocks?.length
            ? `Opens doors to ${unlocks.length} opportunity${unlocks.length > 1 ? " pathways" : " pathway"}`
            : "Context"}
        </span>
        {expanded ? (
          <ChevronDown className="h-3 w-3 text-primary/50" />
        ) : (
          <ChevronRight className="h-3 w-3 text-primary/50" />
        )}
      </button>
      {expanded ? (
        <div className="mt-2 space-y-1.5 border-t border-primary/8 pt-2">
          {upstream ? (
            <div className="flex items-start gap-2">
              <span className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/70 w-16 shrink-0">Builds on</span>
              <p className="text-[12px] leading-relaxed text-muted-foreground">{upstream}</p>
            </div>
          ) : null}
          {unlocks?.length ? (
            <div className="flex items-start gap-2">
              <span className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/70 w-16 shrink-0">Opens</span>
              <p className="text-[12px] leading-relaxed text-foreground/80">{unlocks.join(" · ")}</p>
            </div>
          ) : null}
          {windowText ? (
            <div className="flex items-start gap-2">
              <span className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/70 w-16 shrink-0">Timing</span>
              <p className="text-[12px] leading-relaxed text-amber-700 dark:text-amber-400">{windowText}</p>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
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
        <p className="mt-1.5 rounded-lg bg-muted/50 px-3 py-2 text-[13px] leading-relaxed text-muted-foreground whitespace-pre-wrap break-words">
          <LinkifyText text={note} />
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
          ? "The first tile is the seminar below — everything starts there."
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
            "tap h-8 w-8 rounded-[9px] outline-none transition-all duration-200 focus-visible:ring-2 focus-visible:ring-primary/40",
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
              Added by you
            </p>
            <p className="mt-1.5 text-sm font-semibold tracking-tight">{tile.label}</p>
            <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
              {tile.note ?? "Add a note from your roadmap."}
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
            Sylo searched for &ldquo;{profile.goalText}&rdquo; at {profile.school} and only shows
            results it can verify. Nothing passed the bar this time{attempts > 1 ? ` (${attempts} attempts)` : ""}
            &mdash; try again or add your own steps below.
          </p>
          <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
            You can try again, or add steps yourself and Sylo will track them.
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
