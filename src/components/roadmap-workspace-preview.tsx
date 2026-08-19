import { useEffect, useState } from "react";
import { Map, ChevronRight, ChevronDown, GripVertical, Lightbulb, StickyNote } from "lucide-react";
import { SyloMark } from "@/components/SyloMark";
import { TRACKS, PERSONAS } from "@/lib/wayfind-data";
import { OPPORTUNITIES } from "@/lib/opportunities-db";

/**
 * Static, presentational mock of the Sylo roadmap dashboard — matching the
 * real UI: vertical step list with numbered items, status accent bars,
 * wavy dotted connectors between steps, gap alert, and highest-leverage
 * highlight. Derived from seed data — no hardcoded demo copy.
 */

const alex = PERSONAS.find((p) => p.id === "alex");

type MockStep = {
  name: string;
  timeframe: string;
  status: "complete" | "in-progress" | "not-started";
  reasoning?: string;
  gapLabel?: string;
  hasNote?: boolean;
};

const PREVIEW_OPS = OPPORTUNITIES.filter((o) => o.track === "physician-scientist")
  .slice()
  .sort((a, b) => {
    if (!a.deadline && !b.deadline) return 0;
    if (!a.deadline) return 1;
    if (!b.deadline) return -1;
    return a.deadline.localeCompare(b.deadline);
  })
  .slice(0, 5);

const STEPS: MockStep[] = PREVIEW_OPS.map((o, i) => ({
  name: o.name,
  timeframe: o.timeframe,
  status: i >= 3 ? "complete" : i === 0 ? "in-progress" : "not-started",
  reasoning: o.leverage,
  gapLabel: i === 0 ? (o as any).gapLabel : undefined,
  hasNote: i === 3, // show note indicator on fourth step only
}));

const topOp = PREVIEW_OPS[0]; // the in-progress one is the "highest leverage next move"
const completed = STEPS.filter((s) => s.status === "complete").length;
const totalSteps = STEPS.length;

const STATUS_BAR: Record<MockStep["status"], string> = {
  complete: "bg-tag-green-foreground/70",
  "in-progress": "bg-tag-blue-foreground/60",
  "not-started": "bg-foreground/15",
};

const STATUS_TAG: Record<MockStep["status"], { label: string; cls: string }> = {
  complete: { label: "Complete", cls: "bg-tag-green text-tag-green-foreground" },
  "in-progress": { label: "In progress", cls: "bg-tag-blue text-tag-blue-foreground" },
  "not-started": { label: "Not started", cls: "bg-tag-gray text-tag-gray-foreground" },
};

function MiniWavyConnector() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 32"
      preserveAspectRatio="none"
      className="h-7 w-5 text-primary/40"
    >
      <path
        d="M12 0 C 4 8, 20 18, 12 32"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeDasharray="2.5 4.5"
      />
    </svg>
  );
}

export function RoadmapWorkspacePreview() {
  // Animate the "Email Dr. Bhatt" step: check off → type a note → reset
  const [checked, setChecked] = useState(false);
  const [showNote, setShowNote] = useState(false);
  const [noteText, setNoteText] = useState("");

  const FULL_NOTE = "Sent email — following up next Tuesday if no reply.";

  useEffect(() => {
    let timeouts: ReturnType<typeof setTimeout>[] = [];

    function cycle() {
      // Step 1: Check the box
      setChecked(true);

      // Step 2: Show note area after a beat
      timeouts.push(setTimeout(() => setShowNote(true), 700));

      // Step 3: Type the note character by character
      timeouts.push(setTimeout(() => {
        let i = 0;
        function typeChar() {
          if (i <= FULL_NOTE.length) {
            setNoteText(FULL_NOTE.slice(0, i));
            i++;
            timeouts.push(setTimeout(typeChar, 40));
          }
        }
        typeChar();
      }, 1000));

      // Step 4: Hold the completed state
      timeouts.push(setTimeout(() => {
        setShowNote(false);
        setNoteText("");
        setChecked(false);
      }, 6500));

      // Step 5: Restart the cycle
      timeouts.push(setTimeout(cycle, 8000));
    }

    timeouts.push(setTimeout(cycle, 2000));
    return () => timeouts.forEach(clearTimeout);
  }, []);

  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-[0_4px_24px_-6px_rgba(26,26,26,0.1),0_0_0_1px_rgba(26,26,26,0.03)]">
      <div className="flex min-h-[460px]">
        {/* Left sidebar — navigation */}
        <aside className="hidden w-52 shrink-0 flex-col border-r bg-card py-4 lg:flex">
          <div className="flex items-center gap-2.5 px-4 pb-4">
            <SyloMark className="h-5 w-5 text-primary" />
            <span className="text-sm font-semibold tracking-tight">Sylo</span>
          </div>
          <nav className="space-y-0.5 px-3">
            {[
              { label: "Success Maps", active: false },
              { label: "Roadmap", active: true },
              { label: "Pin Drop", active: false },
              { label: "Progress Board", active: false },
              { label: "Profile", active: false },
              { label: "About", active: false },
            ].map((item) => (
              <div
                key={item.label}
                className={
                  item.active
                    ? "flex items-center gap-2 rounded-lg bg-secondary px-2.5 py-2 text-sm font-medium"
                    : "flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-muted-foreground"
                }
              >
                {item.label === "Roadmap" && <Map className="h-3.5 w-3.5" />}
                <span>{item.label}</span>
              </div>
            ))}
          </nav>
        </aside>

        {/* Main content — roadmap */}
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          {/* Page header */}
          <div className="shrink-0 border-b px-4 py-3 sm:px-5">
            <div className="flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-secondary">
                <Map className="h-4 w-4" />
              </span>
              <div>
                <h2 className="text-sm font-bold tracking-tight">Your Roadmap</h2>
                <p className="text-[11px] text-muted-foreground">
                  {alex?.major ?? "Biology"} Major → Physician-Scientist
                </p>
              </div>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {[alex?.major ?? "Biology", alex?.year ?? "Sophomore", alex?.school ?? "UCLA"].map((m) => (
                <span key={m} className="rounded-md bg-tag-gray px-1.5 py-0.5 text-[10px] font-medium text-tag-gray-foreground">
                  {m}
                </span>
              ))}
            </div>
          </div>

          {/* Scrollable content area */}
          <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-5">
            {/* Highest-leverage move */}
            {topOp ? (
              <div className="mt-3 rounded-xl border border-primary/10 bg-primary/5 p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-primary/80">
                  Your highest-leverage next move
                </p>
                <p className="mt-1 text-[12px] font-semibold tracking-tight sm:text-[13px]">{topOp.name}</p>
                <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground line-clamp-2">
                  {topOp.leverage}
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <span className="rounded-md bg-tag-amber px-1.5 py-0.5 text-[10px] font-medium text-tag-amber-foreground">
                    {topOp.timeframe}
                  </span>
                  <span className="inline-flex items-center gap-0.5 text-[11px] font-medium text-primary">
                    Open details <ChevronRight className="h-3 w-3" />
                  </span>
                </div>
              </div>
            ) : null}

            {/* Step list header */}
            <h3 className="mt-4 text-[12px] font-semibold tracking-tight sm:text-[13px]">
              Here&apos;s your roadmap
            </h3>
            <p className="mt-0.5 text-[10px] text-muted-foreground">
              {checked ? completed + 1 : completed}/{totalSteps} steps complete
            </p>

            {/* Vertical step list */}
            <ol className="mt-3 space-y-0">
              {STEPS.map((step, i) => (
                <li key={step.name}>
                  {i > 0 && (
                    <div className="flex justify-start pl-5" aria-hidden="true">
                      <MiniWavyConnector />
                    </div>
                  )}
                  <div className="relative flex items-start gap-2.5 rounded-xl bg-muted/40 py-2.5 pl-3.5 pr-3">
                    {/* Status accent bar */}
                    <span
                      aria-hidden="true"
                      className={`absolute left-0 top-2 bottom-2 w-[3px] rounded-full ${
                        i === 0 && checked ? STATUS_BAR["complete"] : STATUS_BAR[step.status]
                      }`}
                    />
                    {/* Drag handle + number */}
                    <span className="flex w-4 shrink-0 flex-col items-center gap-0.5 pt-0.5">
                      <GripVertical className="h-2.5 w-2.5 text-muted-foreground/40" />
                      <span className="text-[10px] tabular-nums text-muted-foreground">{i + 1}</span>
                    </span>
                    {/* Checkbox */}
                    <span
                      className={`mt-0.5 flex h-[14px] w-[14px] shrink-0 items-center justify-center rounded-[4px] border transition-all duration-300 ${
                        (i === 0 && checked) || step.status === "complete"
                          ? "border-primary bg-primary"
                          : "border-border bg-background"
                      } ${i === 0 && checked ? "scale-110" : ""}`}
                    >
                      {((i === 0 && checked) || step.status === "complete") && (
                        <svg viewBox="0 0 12 12" className="h-2.5 w-2.5 text-primary-foreground" aria-hidden="true">
                          <path d="M2.5 6.3 4.7 8.5 9.5 3.7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </span>
                    {/* Content */}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span
                          className={`text-[12px] font-semibold tracking-tight transition-all duration-300 ${
                            (i === 0 && checked) || step.status === "complete" ? "text-muted-foreground line-through" : ""
                          }`}
                        >
                          {step.name}
                        </span>
                        <span className={`rounded-md px-1.5 py-0.5 text-[9px] font-medium ${
                          i === 0 && checked ? STATUS_TAG["complete"].cls : STATUS_TAG[step.status].cls
                        }`}>
                          {i === 0 && checked ? STATUS_TAG["complete"].label : STATUS_TAG[step.status].label}
                        </span>
                        {step.hasNote && step.status !== "complete" && !(i === 0 && checked) ? (
                          <span className="text-amber-500"><StickyNote className="h-3 w-3" /></span>
                        ) : null}
                      </div>
                      <p className="mt-0.5 text-[10px] text-muted-foreground">{step.timeframe}</p>
                      {/* Animated note typing on first step */}
                      {i === 0 && showNote && (
                        <div className="mt-1.5 transition-opacity duration-300">
                          <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-primary/80">
                            <ChevronDown className="h-2.5 w-2.5" /> Note
                          </span>
                          <p className="mt-1 rounded-md bg-muted/80 px-2 py-1.5 text-[10px] leading-relaxed text-muted-foreground">
                            {noteText}
                            <span className="ml-0.5 inline-block h-[1em] w-[1.5px] translate-y-[0.1em] rounded-full bg-primary/60 animate-pulse" />
                          </p>
                        </div>
                      )}
                      {/* Static reasoning (non-animated steps) */}
                      {step.reasoning && step.status !== "complete" && !(i === 0 && showNote) && (
                        <p className="mt-1 flex items-start gap-1 text-[10px] leading-relaxed text-muted-foreground/80">
                          <Lightbulb className="mt-0.5 h-2.5 w-2.5 shrink-0 text-primary/60" />
                          <span className="line-clamp-1">{step.reasoning}</span>
                        </p>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>

        {/* Right panel — gap analysis */}
        <aside className="hidden w-56 shrink-0 flex-col border-l bg-card p-4 xl:flex">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-primary/70">Where you stand</p>

          <div className="mt-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">What you&apos;ve got</p>
            <ul className="mt-1.5 space-y-1">
              {["Strong GPA in sciences", "Clinical exposure (1 semester)"].map((s) => (
                <li key={s} className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
                  <span className="mt-0.5 flex h-3 w-3 shrink-0 items-center justify-center rounded-full bg-green-500/15 text-[8px] text-green-700 dark:text-green-400">✓</span>
                  {s}
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Gaps to close</p>
            <div className="mt-1.5 space-y-2">
              {[
                { gap: "No faculty mentor", action: "Reach out to MCDB faculty" },
                { gap: "No sustained research", action: "Apply to BISEP or MCDB lab" },
              ].map((g) => (
                <div key={g.gap} className="rounded-lg border bg-card p-2">
                  <p className="text-[11px] font-semibold tracking-tight">{g.gap}</p>
                  <p className="mt-0.5 text-[10px] font-medium text-primary">→ {g.action}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-auto pt-4">
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg font-bold tabular-nums text-foreground">
                {checked ? completed + 1 : completed}<span className="text-muted-foreground/50">/{totalSteps}</span>
              </span>
              <span className="text-[10px] text-muted-foreground">steps done</span>
            </div>
            <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${((checked ? completed + 1 : completed) / totalSteps) * 100}%` }}
              />
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
