import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useConfettiBurst } from "@/components/confetti-burst";
import {
  KanbanSquare,
  Clock,
  ChevronDown,
  ChevronRight,
  ChevronsDownUp,
  ChevronsUpDown,
  Plus,
  Pencil,
  Trash2,
  X,
} from "lucide-react";
import { StatusAccentBar, StatusDot } from "@/components/roadmap-connector";
import { LinkifyText } from "@/components/linkify-text";
import {
  Workspace,
  PageHeader,
  StatusTag,
  NotionCheckbox,
  Tag,
  OwnGoalBadge,
  PinDropBadge,
  FoundViaSearchBadge,
} from "@/components/workspace";
import { LongViewBoard } from "@/components/long-view-board";
import { useWayfind } from "@/lib/sylo-store";
import { type StepStatus } from "@/lib/wayfind-data";
import { cn } from "@/lib/utils";
import { LinkExtractor } from "@/components/link-extractor";
import { AcademicTermSelector } from "@/components/academic-term-selector";
import { InlineNoteEditor } from "@/components/inline-note-editor";
import { NoteIndicator } from "@/components/note-indicator";
import { CalendarButton } from "@/components/calendar-button";
import { usePin, type PinItem } from "@/lib/pin-store";
import { MapPin, Sparkles } from "lucide-react";

export const Route = createFileRoute("/progress")({
  head: () => ({
    meta: [
      { title: "Progress Board — Sylo" },
      {
        name: "description",
        content:
          "Board and list views of your roadmap steps. Drag a step between Not started, In progress, and Complete.",
      },
      { property: "og:title", content: "Progress Board — Sylo" },
      {
        property: "og:description",
        content: "Honest counts, never a score. Your roadmap steps as a live database view.",
      },
    ],
  }),
  component: Progress,
});

const COLUMNS: { key: StepStatus; label: string }[] = [
  { key: "not-started", label: "Not Started" },
  { key: "in-progress", label: "In Progress" },
  { key: "complete", label: "Complete" },
];

/** "Due in 3 days" reads faster than a raw date. Derived from data we already have. */
function relativeDue(iso?: string) {
  if (!iso) return null;
  const target = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(target.getTime())) return null;
  const today = new Date();
  const days = Math.round(
    (target.getTime() - new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()) /
      86_400_000,
  );
  if (days < 0) return { text: "Window closed", urgent: false };
  if (days === 0) return { text: "Due today", urgent: true };
  if (days === 1) return { text: "Due tomorrow", urgent: true };
  if (days <= 14) return { text: `Due in ${days} days`, urgent: days <= 7 };
  if (days <= 60) return { text: `Due in ${Math.round(days / 7)} weeks`, urgent: false };
  return { text: `Due in ${Math.round(days / 30)} months`, urgent: false };
}

function Progress() {
  const {
    profile,
    roadmap,
    setStatus,
    toggleComplete,
    hydrated,
    customSteps,
    addCustomStep,
    updateCustomStep,
    removeCustomStep,
    removeStep,
    resolveOpportunity,
    stepNotes,
    stepReasoningOverrides,
  } = useWayfind();
  const { items: pinItems, linkToRoadmap } = usePin();
  const navigate = useNavigate();
  const { burst, ConfettiContainer } = useConfettiBurst();
  const [view, setView] = useState<"board" | "list" | "long view">("board");
  const [drag, setDrag] = useState<{ id: string; custom: boolean } | null>(null);
  const [overCol, setOverCol] = useState<StepStatus | null>(null);
  const [collapsedCols, setCollapsedCols] = useState<Record<string, boolean>>({});
  const [openCards, setOpenCards] = useState<Record<string, boolean>>({});
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newNote, setNewNote] = useState("");
  const [newDate, setNewDate] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingStepId, setEditingStepId] = useState<string | null>(null);

  // Session storage draft persistence disabled

  useEffect(() => {
    if (hydrated && (!profile || !roadmap)) navigate({ to: "/roadmap-builder" });
  }, [hydrated, profile, roadmap, navigate]);

  if (!profile || !roadmap) return null;

  const done =
    roadmap.steps.filter((s) => s.status === "complete").length +
    customSteps.filter((s) => s.status === "complete").length;
  const total = roadmap.steps.length + customSteps.length;

  return (
    <Workspace wide>
      {ConfettiContainer}
      <PageHeader
        icon={<KanbanSquare className="h-5 w-5" />}
        title="Progress Board"
        subtitle="Drag steps between Not Started, In Progress, and Complete. Add notes, set deadlines, and see exactly where you stand."
      />

      <div className="mt-6 flex items-baseline gap-2.5">
        <span className="field-xl text-foreground">
          {done}
          <span className="text-muted-foreground/50"> / {total}</span>
        </span>
        <span className="pb-1 text-sm text-muted-foreground">steps complete</span>
      </div>

      {/* Progress bar + nav row */}
      <div className="mt-3 space-y-4">
        {/* Visual progress timeline (moved from dashboard) */}
        {roadmap.steps.length > 0 && (
          <div className="mt-1">
            <div className="flex items-center gap-1">
              {roadmap.steps.map((step, i) => {
                const isComplete = step.status === "complete";
                const isInProgress = step.status === "in-progress";
                const isTop = step.opportunityId === roadmap.topOpportunityId;
                return (
                  <div key={step.id ?? i} className="group relative flex flex-1 flex-col items-center">
                    <div className="flex w-full items-center">
                      {i > 0 && (
                        <div
                          className={cn(
                            "h-[3px] flex-1 rounded-full transition-colors",
                            isComplete ? "bg-green-500/60" : "bg-border",
                          )}
                        />
                      )}
                      <div
                        className={cn(
                          "relative z-10 h-3 w-3 shrink-0 rounded-full border-2 transition-all",
                          isComplete && "border-green-500 bg-green-500",
                          isInProgress && "border-primary bg-primary/30",
                          !isComplete && !isInProgress && "border-muted-foreground/30 bg-background",
                          isTop && !isComplete && "border-primary ring-2 ring-primary/20",
                        )}
                      >
                        {isComplete && (
                          <span className="absolute inset-0 flex items-center justify-center text-[7px] font-bold text-white">✓</span>
                        )}
                      </div>
                      {i < roadmap.steps.length - 1 && (
                        <div
                          className={cn(
                            "h-[3px] flex-1 rounded-full transition-colors",
                            roadmap.steps[i + 1]?.status === "complete" ? "bg-green-500/60" : "bg-border",
                          )}
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground">
              <span>{done} of {total} complete</span>
              {done > 0 && (
                <span className="font-medium text-green-600 dark:text-green-400">
                  {Math.round((done / total) * 100)}%
                </span>
              )}
            </div>
          </div>
        )}

        {/* Old simple progress bar — kept for future use
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-primary/10">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500"
            style={{ width: total > 0 ? `${(done / total) * 100}%` : "0%" }}
          />
        </div>
        */}

        <div className="flex items-center gap-3">
        <div className="inline-flex gap-1 rounded-full border bg-card p-1">
          {(["board", "list", "long view"] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              className={cn(
                "tap rounded-full px-4 py-1.5 text-sm font-medium capitalize",
                view === v
                  ? "bg-secondary text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {v}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setShowAddForm((v) => !v)}
          className="tap inline-flex items-center gap-1.5 rounded-full border border-dashed border-foreground/25 px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <Plus className="h-4 w-4" /> Add a step
        </button>
        </div>
      </div>

      {showAddForm && (
        <div className="mt-3 space-y-4">
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
              setShowAddForm(false);
            }}
            onFallback={(failedUrl) => {
              setNewNote(`Link: ${failedUrl}`);
              setNewTitle("");
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
              if (!newTitle.trim()) return;
              addCustomStep({ title: newTitle.trim(), note: newNote.trim() || undefined, targetDate: newDate.trim() || undefined });
              setNewTitle("");
              setNewNote("");
              setNewDate("");
              setShowAddForm(false);
            }}
            className="space-y-3 rounded-2xl border border-dashed border-foreground/25 bg-muted/60 p-4"
          >
            <input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Step title (required)"
              aria-label="Step title"
              className="w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
            />
            <textarea
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="Note (optional)"
              aria-label="Note"
              rows={2}
              className="w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
            />
            <AcademicTermSelector
              value={newDate}
              currentYear={profile?.year ?? "Freshman"}
              onChange={setNewDate}
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
                onClick={() => setShowAddForm(false)}
                className="tap rounded-full border px-4 py-1.5 text-sm font-medium text-muted-foreground"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {view === "long view" ? (
        <LongViewBoard
          trackId={profile.trackId}
          steps={roadmap.steps}
          studentYear={profile.year}
          school={profile.school}
        />
      ) : view === "board" ? (
        <div className="mt-6 grid items-start gap-4 sm:grid-cols-4">

          {/* Pinned column — unlinked Pin Drop items */}
          <div className="column-tray flex min-h-[220px] flex-col p-2">
            <div className="flex items-center justify-between gap-2 px-1 pb-2.5">
              <span className="flex items-center gap-2">
                
                <span className="text-sm font-semibold tracking-tight">From Pin Drop</span>
                <span className="tag bg-tag-gray text-tag-gray-foreground tabular-nums">
                  {pinItems.filter((p) => !p.linkedStepId).length}
                </span>
              </span>
            </div>
            <div className="space-y-2">
              {pinItems.filter((p) => !p.linkedStepId).map((pin) => (
                <div
                  key={pin.id}
                  draggable
                  onDragStart={() => setDrag({ id: pin.id, custom: false })}
                  onDragEnd={() => { setDrag(null); setOverCol(null); }}
                  title="Drag to Not Started to add to your roadmap"
                  className="relative cursor-grab rounded-xl px-3 py-3 pl-4 active:cursor-grabbing card-tonal"
                >
                  <div className="absolute inset-y-0 left-0 w-1 rounded-l-xl bg-primary/60" />
                  <p className="text-sm font-semibold leading-snug tracking-tight">
                    {pin.opportunityDetails?.name || pin.title}
                  </p>
                  {pin.detectedDate && (
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {relativeDue(pin.detectedDate)?.text}
                    </p>
                  )}
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {pin.tags.slice(0, 2).map((t) => (
                      <span key={t} className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">{t}</span>
                    ))}
                  </div>
                </div>
              ))}
              {pinItems.filter((p) => !p.linkedStepId).length === 0 && (
                <p className="px-2 py-4 text-center text-xs text-muted-foreground">
                  Drop a pin to see it here
                </p>
              )}
            </div>
          </div>

          {COLUMNS.map((col) => {
            const items = roadmap.steps.filter((s) => s.status === col.key);
            const mine = customSteps.filter((s) => s.status === col.key);
            const count = items.length + mine.length;
            const dense = !!collapsedCols[col.key];
            return (
              <div
                key={col.key}
                onDragOver={(e) => {
                  e.preventDefault();
                  setOverCol(col.key);
                }}
                onDragLeave={() => setOverCol((c) => (c === col.key ? null : c))}
                onDrop={(e) => {
                  e.preventDefault();
                  if (drag) {
                    // Check if a pinned item is being promoted to the board
                    const pinnedItem = pinItems.find((p) => p.id === drag.id && !p.linkedStepId);
                    if (pinnedItem) {
                      const title = pinnedItem.opportunityDetails?.name || pinnedItem.title;
                      const noteLines: string[] = [];
                      if (pinnedItem.opportunityDetails) {
                        if (pinnedItem.opportunityDetails.description) noteLines.push(pinnedItem.opportunityDetails.description);
                        if (pinnedItem.opportunityDetails.requirements.length > 0) noteLines.push("Requirements: " + pinnedItem.opportunityDetails.requirements.join(", "));
                      }
                      addCustomStep({ title, note: noteLines.join("\n") || undefined, targetDate: pinnedItem.detectedDate || undefined });
                      linkToRoadmap(pinnedItem.id, "custom-" + Date.now());
                    } else {
                      if (col.key === "complete") {
                        burst({ x: 85, y: 30 });
                      }
                      if (drag.custom) updateCustomStep(drag.id, { status: col.key });
                      else setStatus(drag.id, col.key);
                    }
                  }
                  setDrag(null);
                  setOverCol(null);
                }}
                className={cn(
                  "column-tray flex min-h-[220px] flex-col p-2",
                  overCol === col.key && "border-primary/40 bg-primary/[0.05]",
                )}
              >
                <div className="flex items-center justify-between gap-2 px-1 pb-2.5">
                  <span className="flex items-center gap-2">
                    <StatusDot status={col.key} />
                    <span className="text-sm font-semibold tracking-tight">{col.label}</span>
                    <span className="tag bg-tag-gray text-tag-gray-foreground tabular-nums">
                      {count}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setCollapsedCols((c) => ({ ...c, [col.key]: !c[col.key] }))
                    }
                    aria-label={
                      dense ? `Expand cards in ${col.label}` : `Collapse cards in ${col.label}`
                    }
                    className="tap rounded-md p-1 text-muted-foreground hover:text-foreground"
                  >
                    {dense ? (
                      <ChevronsUpDown className="h-3.5 w-3.5" />
                    ) : (
                      <ChevronsDownUp className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
                <div className="space-y-2">
                  {items.map((s) => {
                    const op = resolveOpportunity(s.opportunityId);
                    if (!op) return null;
                    const due = relativeDue(op.deadline);
                    const expanded = !dense && !!openCards[s.id];
                    const isDragging = drag?.id === s.opportunityId;
                    return (
                      <div
                        key={s.id}
                        draggable
                        onDragStart={() => setDrag({ id: s.opportunityId, custom: false })}
                        onDragEnd={() => {
                          setDrag(null);
                          setOverCol(null);
                        }}
                        title="Drag to another column"
                        className={cn(
                          "relative cursor-grab rounded-xl px-3 py-3 pl-4 active:cursor-grabbing",
                          "card-tonal",
                          isDragging && "drag-lift drop-placeholder",
                        )}
                      >
                        <StatusAccentBar status={s.status} />
                        <p className="text-sm font-semibold leading-snug tracking-tight">
                          <Link
                            to="/opportunity-details"
                            search={{ id: op.id }}
                            className="hover:underline"
                          >
                            {op.name}
                          </Link>
                        </p>
                        {op.origin === "live" ? (
                          <div className="mt-2">
                            <FoundViaSearchBadge />
                          </div>
                        ) : null}
                        <div className="mt-2 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setOpenCards((o) => ({ ...o, [s.id]: !o[s.id] }))}
                            className="tap inline-flex items-center gap-1 rounded-md text-xs font-medium text-muted-foreground hover:text-foreground"
                          >
                            {expanded ? (
                              <ChevronDown className="h-3.5 w-3.5" />
                            ) : (
                              <ChevronRight className="h-3.5 w-3.5" />
                            )}
                            {expanded ? "Hide detail" : "Detail"}
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              const order: StepStatus[] = [
                                "not-started",
                                "in-progress",
                                "complete",
                              ];
                              if (s.status === "complete") {
                                setStatus(s.opportunityId, "in-progress");
                              } else {
                                const next = order[(order.indexOf(s.status) + 1) % 3];
                                if (next === "complete") {
                                  const x = (e.clientX / window.innerWidth) * 100;
                                  const y = (e.clientY / window.innerHeight) * 100;
                                  burst({ x, y });
                                }
                                setStatus(s.opportunityId, next);
                              }
                            }}
                            className={cn(
                              "tap inline-flex rounded-md text-xs font-medium hover:underline",
                              s.status === "complete" ? "text-muted-foreground" : "text-primary"
                            )}
                          >
                            {s.status === "complete" ? "Back" : "Advance"}
                          </button>
                          {s.status === "in-progress" ? (
                            <button
                              type="button"
                              onClick={() => setStatus(s.opportunityId, "not-started")}
                              className="tap inline-flex rounded-md text-xs font-medium text-muted-foreground hover:underline"
                            >
                              Back
                            </button>
                          ) : null}
                          <button
                            type="button"
                            onClick={() => setEditingStepId(editingStepId === s.id ? null : s.id)}
                            aria-label={`Edit note for ${op.name}`}
                            title="Edit note"
                            className="tap ml-auto rounded-md p-1 text-muted-foreground hover:text-foreground"
                          >
                            <Pencil className="h-3 w-3" />
                          </button>
                          {stepNotes[s.opportunityId] ? (
                            <NoteIndicator note={stepNotes[s.opportunityId]} />
                          ) : null}
                        </div>
                        {editingStepId === s.id ? (
                          <div className="mt-2">
                            <InlineNoteEditor
                              opportunityId={s.opportunityId}
                              existingNote={stepNotes[s.opportunityId]}
                              existingReasoningOverride={stepReasoningOverrides[s.opportunityId]}
                              reasoning={s.reasoning}
                              onClose={() => setEditingStepId(null)}
                            />
                          </div>
                        ) : null}
                        {expanded && editingStepId !== s.id ? (
                          <p className="mt-2 break-words text-xs leading-relaxed text-muted-foreground whitespace-pre-wrap">
                            <LinkifyText text={s.reasoning} />
                          </p>
                        ) : null}
                        <div className="mt-3 flex flex-wrap items-center justify-between gap-x-2 gap-y-1 border-t pt-2 text-[11px] text-muted-foreground">
                          <StatusDot status={s.status} withLabel />
                          {due ? (
                            <span
                              className={cn(
                                "inline-flex shrink-0 items-center gap-1 whitespace-nowrap tabular-nums",
                                due.urgent && "text-tag-amber-foreground",
                              )}
                            >
                              <Clock className="h-3.5 w-3.5" />
                              {due.text}
                            </span>
                          ) : null}
                          <CalendarButton name={op.name} deadline={op.deadline} description={s.reasoning} url={op.link} compact />
                        </div>
                      </div>
                    );
                  })}
                  {mine.map((s) => {
                    const expanded = !dense && !!openCards[s.id];
                    const due = relativeDue(s.targetDate);
                    return (
                      <div
                        key={s.id}
                        draggable={editingId !== s.id}
                        onDragStart={() => { if (editingId !== s.id) setDrag({ id: s.id, custom: true }); }}
                        onDragEnd={() => {
                          setDrag(null);
                          setOverCol(null);
                        }}
                        title="Added by you — drag to another column"
                        className={cn(
                          "relative cursor-grab rounded-xl border border-dashed border-foreground/25 bg-card px-3 py-3 pl-4 transition-colors duration-150 hover:bg-accent active:cursor-grabbing",
                          drag?.id === s.id && "drag-lift drop-placeholder",
                          editingId === s.id && "cursor-default",
                        )}
                      >
                        <StatusAccentBar status={s.status} />

                        {editingId === s.id ? (
                          <div className="space-y-2">
                            <input
                              value={s.title}
                              onChange={(e) => updateCustomStep(s.id, { title: e.target.value })}
                              aria-label="Edit title"
                              autoFocus
                              className="w-full rounded-lg border bg-background px-2.5 py-1.5 text-sm outline-none focus:border-primary/40"
                            />
                            <textarea
                              value={s.note ?? ""}
                              onChange={(e) => updateCustomStep(s.id, { note: e.target.value })}
                              aria-label="Edit note"
                              rows={2}
                              className="w-full rounded-lg border bg-background px-2.5 py-1.5 text-sm outline-none focus:border-primary/40"
                            />
                            <input
                              type="date"
                              value={s.targetDate ?? ""}
                              onChange={(e) => updateCustomStep(s.id, { targetDate: e.target.value })}
                              aria-label="Edit target date"
                              className="rounded-lg border bg-background px-2.5 py-1.5 text-sm outline-none focus:border-primary/40"
                            />
                            <button
                              type="button"
                              onClick={() => setEditingId(null)}
                              className="tap rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground"
                            >
                              Done
                            </button>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-sm font-semibold leading-snug tracking-tight">{s.title}</p>
                              <div className="flex shrink-0 gap-1">
                                <button
                                  type="button"
                                  onClick={() => setEditingId(s.id)}
                                  aria-label={`Edit ${s.title}`}
                                  title="Edit"
                                  className="tap rounded-md p-1 text-muted-foreground hover:text-foreground"
                                >
                                  <Pencil className="h-3 w-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => removeCustomStep(s.id)}
                                  aria-label={`Delete ${s.title}`}
                                  title="Delete"
                                  className="tap rounded-md p-1 text-muted-foreground hover:text-destructive"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </div>
                            </div>
                            <div className="mt-2">
                              {s.source === "pin-drop" ? <PinDropBadge /> : <OwnGoalBadge />}
                            </div>
                            <div className="mt-2 flex items-center gap-2">
                              {s.note ? (
                                <button
                                  type="button"
                                  onClick={() => setOpenCards((o) => ({ ...o, [s.id]: !o[s.id] }))}
                                  className="tap inline-flex items-center gap-1 rounded-md text-xs font-medium text-muted-foreground hover:text-foreground"
                                >
                                  {expanded ? (
                                    <ChevronDown className="h-3.5 w-3.5" />
                                  ) : (
                                    <ChevronRight className="h-3.5 w-3.5" />
                                  )}
                                  {expanded ? "Hide detail" : "Detail"}
                                </button>
                              ) : null}
                              <button
                                type="button"
                                onClick={() => {
                                  const order: StepStatus[] = [
                                    "not-started",
                                    "in-progress",
                                    "complete",
                                  ];
                                  updateCustomStep(s.id, {
                                    status: order[(order.indexOf(s.status) + 1) % 3],
                                  });
                                }}
                                className="tap inline-flex rounded-md text-xs font-medium text-primary hover:underline"
                              >
                                Advance
                              </button>
                            </div>
                            {expanded && s.note ? (
                              <p className="mt-2 break-words text-xs leading-relaxed text-muted-foreground whitespace-pre-wrap">
                                <LinkifyText text={s.note} />
                              </p>
                            ) : null}
                            <div className="mt-3 flex flex-wrap items-center justify-between gap-x-2 gap-y-1 border-t pt-2 text-[11px] text-muted-foreground">
                              <StatusDot status={s.status} withLabel />
                              {due ? (
                                <span
                                  className={cn(
                                    "inline-flex shrink-0 items-center gap-1 whitespace-nowrap tabular-nums",
                                    due.urgent && "text-tag-amber-foreground",
                                  )}
                                >
                                  <Clock className="h-3.5 w-3.5" />
                                  {due.text}
                                </span>
                              ) : null}
                              <CalendarButton name={s.title} deadline={s.targetDate || ""} description={s.note || ""} compact />
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                  {count === 0 ? (
                    <p className="drop-placeholder px-2 py-4 text-center text-xs text-muted-foreground">
                      Drop a step here.
                    </p>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="mt-6 rounded-2xl border bg-card p-4">
          <div className="flex items-center gap-3 border-b pb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <span className="w-4" />
            <span className="min-w-0 flex-1">Step</span>
            <span className="w-28">Status</span>
            <span className="hidden w-32 sm:block">Timeframe</span>
            <span className="hidden w-24 sm:block">Category</span>
          </div>
          {roadmap.steps.map((s) => {
            const op = resolveOpportunity(s.opportunityId);
            if (!op) return null;
            return (
              <div key={s.id} className="tap flex items-center gap-3 border-b py-3 last:border-b-0 hover:bg-accent">
                <NotionCheckbox
                  checked={s.status === "complete"}
                  onChange={() => toggleComplete(s.opportunityId)}
                  label={`Mark ${op.name} complete`}
                />
                <span className="flex min-w-0 flex-1 items-center gap-2">
                  <Link
                    to="/opportunity-details"
                    search={{ id: op.id }}
                    className={cn(
                      "min-w-0 truncate text-sm font-medium hover:underline",
                      s.status === "complete" && "text-muted-foreground line-through",
                    )}
                  >
                    {op.name}
                  </Link>
                  {op.origin === "live" ? <FoundViaSearchBadge /> : null}
                </span>
                <span className="w-28">
                  <StatusTag status={s.status} />
                </span>
                <span className="hidden w-32 text-xs text-muted-foreground sm:block">
                  {op.timeframe}
                </span>
                <span className="hidden w-24 sm:block">
                  <Tag>{op.category}</Tag>
                </span>
              </div>
            );
          })}
          {customSteps.map((s) => (
            <div
              key={s.id}
              className="tap flex items-center gap-3 border-b border-dashed py-3 last:border-b-0 hover:bg-accent"
            >
              <NotionCheckbox
                checked={s.status === "complete"}
                onChange={() =>
                  updateCustomStep(s.id, {
                    status: s.status === "complete" ? "not-started" : "complete",
                  })
                }
                label={`Mark ${s.title} complete`}
              />
              <span
                className={cn(
                  "flex min-w-0 flex-1 items-center gap-2 truncate text-sm font-medium",
                  s.status === "complete" && "text-muted-foreground line-through",
                )}
              >
                <span className="truncate">{s.title}</span>
                {s.source === "pin-drop" ? <PinDropBadge /> : <OwnGoalBadge />}
              </span>
              <span className="w-28">
                <StatusTag status={s.status} />
              </span>
              <span className="hidden w-32 text-xs text-muted-foreground sm:block">
                {s.targetDate ?? "—"}
              </span>
              <span className="hidden w-24 text-xs text-muted-foreground sm:block">—</span>
            </div>
          ))}
        </div>
      )}

    </Workspace>
  );
}
