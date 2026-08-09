import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, Loader2, ChevronDown, ChevronRight, Heart, Briefcase, Code, TrendingUp, Microscope } from "lucide-react";
import { useRoadmapGeneration, useSearchProgressLabel } from "@/lib/use-roadmap-generation";
import { useWayfind } from "@/lib/wayfind-store";
import { MAJORS, TRACKS, YEARS, opportunitiesForTrack, type TrackId } from "@/lib/wayfind-data";
import { SchoolCombobox } from "@/components/school-combobox";
import { ResumeUpload } from "@/components/resume-upload";
import { cn } from "@/lib/utils";

/**
 * General categories → specific roles within each.
 * Users pick a category first, then drill into the specific role.
 */
const TRACK_CATEGORIES = [
  {
    id: "healthcare",
    label: "Healthcare",
    description: "Clinical care, biomedical research, and health systems.",
    icon: Heart,
    trackIds: ["physician-scientist", "nursing", "public-health"] as TrackId[],
  },
  {
    id: "business",
    label: "Business",
    description: "Product, operations, strategy, and leadership roles.",
    icon: Briefcase,
    trackIds: ["product-manager", "management-consulting", "marketing"] as TrackId[],
  },
  {
    id: "engineering",
    label: "Engineering",
    description: "Building systems, products, and infrastructure at scale.",
    icon: Code,
    trackIds: ["software-engineer", "data-science", "cybersecurity"] as TrackId[],
  },
  {
    id: "finance",
    label: "Finance",
    description: "Markets, deals, investments, and capital allocation.",
    icon: TrendingUp,
    trackIds: ["investment-banking", "private-equity", "financial-planning"] as TrackId[],
  },
  {
    id: "science",
    label: "Science",
    description: "Research-driven discovery across disciplines.",
    icon: Microscope,
    trackIds: ["research-phd", "biotech-research", "environmental-science"] as TrackId[],
  },
] as const;

export const Route = createFileRoute("/roadmap-builder")({
  head: () => ({
    meta: [
      { title: "Build your roadmap — Sylo" },
      {
        name: "description",
        content:
          "Pick a destination, your major, year, and school. Sylo sequences the next move from verified opportunities.",
      },
      { property: "og:title", content: "Build your roadmap — Sylo" },
      {
        property: "og:description",
        content: "A guided intake — no chat box. Sylo tells you what you didn't know to ask.",
      },
    ],
  }),
  component: Builder,
});

function Builder() {
  const navigate = useNavigate();
  const generate = useRoadmapGeneration();
  const { setProfile, setRoadmap, loadPersona } = useWayfind();

  const [trackId, setTrackId] = useState("");
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [customRole, setCustomRole] = useState("");
  const [customCategory, setCustomCategory] = useState<string | null>(null);
  const [peek, setPeek] = useState("");

  const [goalText, setGoalText] = useState("");
  const [major, setMajor] = useState("");
  const [year, setYear] = useState("");
  const [school, setSchool] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [demoPulse, setDemoPulse] = useState(false);

  // "Tell Sylo more" context fields
  const [moreOpen, setMoreOpen] = useState(false);
  const [experience, setExperience] = useState("");
  const [gpa, setGpa] = useState("");
  const [skills, setSkills] = useState("");
  const [priorWork, setPriorWork] = useState("");
  const [clubs, setClubs] = useState("");
  const [alreadyDone, setAlreadyDone] = useState("");

  const ready = trackId && major && year && school;
  const busyLabel = useSearchProgressLabel(busy);

  async function submit() {
    if (!ready || busy) return;
    setBusy(true);
    setError("");
    setDemoPulse(false);

    // If the user selected "Other in [Category]", prepend their custom role + field to goalText
    const effectiveGoalText = customCategory && customRole.trim()
      ? `I want to become a ${customRole.trim()} (field: ${TRACK_CATEGORIES.find((c) => c.id === customCategory)?.label ?? customCategory}). ${goalText}`.trim()
      : customCategory
        ? `My goal is in the ${TRACK_CATEGORIES.find((c) => c.id === customCategory)?.label ?? customCategory} field. ${goalText}`.trim()
        : goalText;

    const profile = {
      major,
      year,
      school,
      trackId,
      goalText: effectiveGoalText,
      experience: experience.trim() || undefined,
      gpa: gpa.trim() || undefined,
      skills: skills.trim() || undefined,
      priorWork: priorWork.trim() || undefined,
      clubs: clubs.trim() || undefined,
      alreadyDone: alreadyDone.trim() || undefined,
    };
    setProfile(profile);
    try {
      const { roadmap, live } = await generate({ trackId, goalText: effectiveGoalText, major, year, school, experience, gpa, skills, priorWork, clubs, alreadyDone });
      setRoadmap(roadmap, live);
      navigate({ to: "/dashboard" });
    } catch {
      setError("Roadmap generation didn't come back. Try again, or open a demo roadmap below.");
      document.getElementById("instant-demo")?.scrollIntoView({ behavior: "smooth", block: "center" });
      setDemoPulse(true);
      window.setTimeout(() => setDemoPulse(false), 2200);
    } finally {
      setBusy(false);
    }
  }

  function demo(id: string) {
    loadPersona(id);
    navigate({ to: "/dashboard" });
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-16">
      <div className="glass px-6 py-8 sm:px-10 sm:py-12">
        <Link
          to="/"
          className="tap inline-flex items-center gap-1 rounded-full px-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <span>←</span> Home
        </Link>
        <h1 className="mt-7 text-[40px] font-bold leading-[1.02] tracking-[-0.04em] sm:text-[56px]">Where do you want to go?</h1>
        <p className="mt-2.5 text-base text-muted-foreground">
          Pick a destination. Sylo handles the questions you didn&apos;t know to ask.
        </p>

        <div className="mt-8 space-y-3">
          {TRACK_CATEGORIES.map((cat) => {
            const isExpanded = expandedCategory === cat.id;
            const tracks = TRACKS.filter((t) => (cat.trackIds as readonly string[]).includes(t.id));
            const hasSelectedTrack = tracks.some((t) => t.id === trackId) || (trackId === "something-else" && customCategory === cat.id);

            return (
              <div
                key={cat.id}
                className={cn(
                  "rounded-xl border bg-card transition-colors",
                  hasSelectedTrack
                    ? "border-primary/40 shadow-[var(--shadow-raise)]"
                    : isExpanded
                      ? "border-primary/25"
                      : "border-border hover:border-primary/25",
                )}
              >
                {/* Category header */}
                <button
                  type="button"
                  onClick={() => setExpandedCategory(isExpanded ? null : cat.id)}
                  aria-expanded={isExpanded}
                  className="tap group flex w-full items-center gap-4 rounded-xl p-4 text-left"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-xl shadow-sm">
                    <cat.icon className="h-5 w-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[15px] font-semibold tracking-tight">{cat.label}</span>
                    <span className="mt-0.5 block text-[13px] leading-relaxed text-muted-foreground">
                      {cat.description}
                    </span>
                  </span>
                  {hasSelectedTrack && (
                    <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                      {trackId === "something-else" && customCategory === cat.id
                        ? customRole.trim() || `Other in ${cat.label}`
                        : tracks.find((t) => t.id === trackId)?.label}
                    </span>
                  )}
                  <ChevronRight
                    className={cn(
                      "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200",
                      isExpanded && "rotate-90",
                    )}
                  />
                </button>

                {/* Expanded: specific roles within this category */}
                {isExpanded && (
                  <div className="border-t px-4 pb-4 pt-3 space-y-2">
                    {tracks.map((t) => {
                      const selected = trackId === t.id;
                      const sample = opportunitiesForTrack(t.id)
                        .slice()
                        .sort((a, b) => a.deadline.localeCompare(b.deadline))
                        .slice(0, 3);
                      const peeking = peek === t.id;
                      return (
                        <div
                          key={t.id}
                          className={cn(
                            "rounded-lg border transition-colors",
                            selected
                              ? "border-primary/40 bg-primary/5"
                              : "border-border/50 hover:border-primary/25",
                          )}
                        >
                          <button
                            type="button"
                            onClick={() => { setTrackId(t.id); setCustomCategory(null); setCustomRole(""); }}
                            aria-pressed={selected}
                            className="tap group flex w-full items-start gap-3 rounded-lg p-3 text-left"
                          >
                            <span className="min-w-0 flex-1">
                              <span className="block text-[14px] font-semibold tracking-tight">{t.label}</span>
                              <span className="mt-0.5 block text-[13px] leading-snug text-muted-foreground">
                                {t.identity}
                              </span>
                              <span className="mt-0.5 block text-[12px] leading-relaxed text-muted-foreground/80">
                                {t.blurb}
                              </span>
                            </span>
                            <span
                              className={cn(
                                "mt-1.5 h-4.5 w-4.5 shrink-0 rounded-full border-2 transition-colors",
                                selected ? "border-primary bg-primary" : "border-border",
                              )}
                            >
                              {selected ? (
                                <svg viewBox="0 0 12 12" className="m-auto h-full w-full p-0.5 text-primary-foreground">
                                  <path d="M2.5 6.3 4.7 8.5 9.5 3.7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                              ) : null}
                            </span>
                          </button>

                          {/* Sample roadmap peek */}
                          {sample.length > 0 && (
                            <div className="px-3 pb-3">
                              <button
                                type="button"
                                onClick={() => setPeek(peeking ? "" : t.id)}
                                aria-expanded={peeking}
                                className="tap rounded-md text-[12px] font-medium text-primary hover:underline"
                              >
                                {peeking ? "Hide sample" : "Peek at a sample roadmap"}
                              </button>
                              {peeking && (
                                <ul className="mt-2 space-y-1.5">
                                  {sample.map((op, i) => (
                                    <li key={op.id} className="flex items-center gap-2 text-[12px] text-muted-foreground">
                                      <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-[4px] bg-secondary text-[10px] tabular-nums">
                                        {i + 1}
                                      </span>
                                      <span className="truncate">{op.name}</span>
                                      <span className="shrink-0 text-muted-foreground/70">{op.timeframe}</span>
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {/* "Other in [Category]" option */}
                    {(() => {
                      const isOtherSelected = trackId === "something-else" && customCategory === cat.id;
                      return (
                        <div
                          className={cn(
                            "rounded-lg border transition-colors",
                            isOtherSelected
                              ? "border-primary/40 bg-primary/5"
                              : "border-border/50 hover:border-primary/25",
                          )}
                        >
                          <button
                            type="button"
                            onClick={() => { setTrackId("something-else"); setCustomCategory(cat.id); }}
                            aria-pressed={isOtherSelected}
                            className="tap group flex w-full items-start gap-3 rounded-lg p-3 text-left"
                          >
                            <span className="min-w-0 flex-1">
                              <span className="block text-[14px] font-semibold tracking-tight">
                                Other in {cat.label}
                              </span>
                              <span className="mt-0.5 block text-[13px] leading-snug text-muted-foreground">
                                Your goal is in this field but doesn't match the roles above.
                              </span>
                            </span>
                            <span
                              className={cn(
                                "mt-1.5 h-4.5 w-4.5 shrink-0 rounded-full border-2 transition-colors",
                                isOtherSelected ? "border-primary bg-primary" : "border-border",
                              )}
                            >
                              {isOtherSelected ? (
                                <svg viewBox="0 0 12 12" className="m-auto h-full w-full p-0.5 text-primary-foreground">
                                  <path d="M2.5 6.3 4.7 8.5 9.5 3.7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                              ) : null}
                            </span>
                          </button>
                          {isOtherSelected && (
                            <div className="px-3 pb-3">
                              <input
                                value={customRole}
                                onChange={(e) => setCustomRole(e.target.value)}
                                placeholder={`e.g. Occupational Therapist, UX Researcher...`}
                                className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none transition-all focus:border-primary/40 focus:ring-2 focus:ring-primary/15"
                                autoFocus
                              />
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            );
          })}

          {/* "Something else" — standalone option */}
          {(() => {
            const t = TRACKS.find((t) => t.id === "something-else")!;
            const selected = trackId === t.id;
            return (
              <div
                className={cn(
                  "rounded-xl border bg-card transition-colors",
                  selected
                    ? "border-primary/40 shadow-[var(--shadow-raise)]"
                    : "border-border hover:border-primary/25",
                )}
              >
                <button
                  type="button"
                  onClick={() => { setTrackId(t.id); setExpandedCategory(null); }}
                  aria-pressed={selected}
                  className="tap group flex w-full items-start gap-4 rounded-xl p-4 text-left"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-xl shadow-sm">
                    {t.icon}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[15px] font-semibold tracking-tight">{t.label}</span>
                    <span className="mt-1 block text-sm font-medium leading-snug text-foreground/75">
                      {t.identity}
                    </span>
                    <span className="mt-1 block text-[13px] leading-relaxed text-muted-foreground">
                      {t.blurb}
                    </span>
                  </span>
                  <span
                    className={cn(
                      "mt-2.5 h-5 w-5 shrink-0 rounded-full border-2 transition-colors",
                      selected ? "border-primary bg-primary" : "border-border",
                    )}
                  >
                    {selected ? (
                      <svg viewBox="0 0 12 12" className="m-auto h-full w-full p-0.5 text-primary-foreground">
                        <path d="M2.5 6.3 4.7 8.5 9.5 3.7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    ) : null}
                  </span>
                </button>
              </div>
            );
          })()}
        </div>


        <label className="mt-8 block">
          <span className="text-sm font-medium text-muted-foreground">In your own words</span>
          <input
            value={goalText}
            onChange={(e) => setGoalText(e.target.value)}
            placeholder="e.g. clinical research at a teaching hospital"
            className="mt-2 w-full rounded-2xl border bg-background px-4 py-3 text-sm outline-none transition-all focus:border-primary/40 focus:ring-2 focus:ring-primary/15"
          />
        </label>

        <Field label="Major" value={major} onChange={setMajor} options={MAJORS} />
        <Field label="Year in school" value={year} onChange={setYear} options={YEARS} />
        <div className="mt-6">
          <p className="text-sm font-medium text-muted-foreground">University</p>
          <div className="mt-2.5">
            <SchoolCombobox value={school} onChange={setSchool} />
          </div>
          <p className="mt-2 text-[13px] text-muted-foreground">US universities, for now.</p>
        </div>

        {/* Tell Sylo more — optional context for better personalization */}
        <div className="mt-8 rounded-2xl border border-dashed border-foreground/20 bg-muted/30 p-5">
          <button
            type="button"
            onClick={() => setMoreOpen((v) => !v)}
            className="tap flex w-full items-center gap-2 text-left"
          >
            {moreOpen ? <ChevronDown className="h-4 w-4 text-primary" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
            <span className="text-sm font-semibold tracking-tight">Tell Sylo more about you</span>
            <span className="ml-auto text-[11px] font-medium text-muted-foreground">Optional</span>
          </button>
          {!moreOpen ? (
            <p className="mt-2 pl-6 text-[13px] leading-relaxed text-muted-foreground">
              The more Sylo knows, the better it can match you to what&apos;s actually relevant — and skip what isn&apos;t.
            </p>
          ) : null}

          {/* Resume upload is always visible */}
          <div className="mt-4">
            <ResumeUpload
              onParsed={(data) => {
                if (data.experience?.trim()) setExperience(data.experience);
                if (data.skills?.trim()) setSkills(data.skills);
                if (data.priorWork?.trim()) setPriorWork(data.priorWork);
                if (data.clubs?.trim()) setClubs(data.clubs);
                if (data.alreadyDone?.trim()) setAlreadyDone(data.alreadyDone);
                setMoreOpen(true);
              }}
            />
          </div>

          {moreOpen ? (
            <div className="mt-4 space-y-4 pl-0">
              <ContextField
                label="Experience & background"
                placeholder="e.g. Built a React app for a class project, tutored intro CS for two semesters…"
                value={experience}
                onChange={setExperience}
                multiline
              />
              <ContextField
                label="GPA (approximate is fine)"
                placeholder="e.g. 3.6"
                value={gpa}
                onChange={setGpa}
              />
              <ContextField
                label="Skills & tools you know"
                placeholder="e.g. Python, JavaScript, React, SQL, Figma…"
                value={skills}
                onChange={setSkills}
              />
              <ContextField
                label="Prior internships or jobs"
                placeholder="e.g. Summer intern at a startup, campus IT help desk…"
                value={priorWork}
                onChange={setPriorWork}
                multiline
              />
              <ContextField
                label="Clubs & organizations"
                placeholder="e.g. ACM chapter, hackathon team, research lab…"
                value={clubs}
                onChange={setClubs}
              />
              <ContextField
                label="What you've already tried toward this goal"
                placeholder="e.g. Applied to Google STEP but didn't get it, took an online ML course…"
                value={alreadyDone}
                onChange={setAlreadyDone}
                multiline
              />
            </div>
          ) : null}
        </div>


        {error ? <p className="mt-6 text-sm text-destructive">{error}</p> : null}

        <button
          type="button"
          onClick={submit}
          disabled={!ready || busy}
          className="tap mt-10 inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-6 py-3.5 text-[15px] font-semibold text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/95 hover:shadow-xl hover:shadow-primary/25 disabled:opacity-40 disabled:active:scale-100 sm:w-auto"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {busy ? busyLabel : "Build my roadmap"}
          {!busy ? <ArrowRight className="h-4 w-4" /> : null}
        </button>

        <div
          id="instant-demo"
          className={cn(
            "mt-12 -mx-6 rounded-2xl border-t px-6 pt-6 transition-all duration-500 sm:-mx-10 sm:px-10",
            demoPulse ? "bg-primary/[0.08] ring-1 ring-primary/30" : "ring-0",
          )}
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Instant demo</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => demo("maya")}
              className="tap tap-surface rounded-lg border bg-card px-4 py-1.5 text-sm"
            >
              Maya · CS @ Georgia Tech
            </button>
            <button
              type="button"
              onClick={() => demo("alex")}
              className="tap tap-surface rounded-lg border bg-card px-4 py-1.5 text-sm"
            >
              Alex · Biology @ UCLA
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: readonly string[];
}) {
  const [other, setOther] = useState(false);
  const isOther = other || (value !== "" && !options.includes(value));

  return (
    <div className="mt-6">
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <div className="mt-2.5 flex flex-wrap gap-2">
        {options.map((o) => (
          <button
            key={o}
            type="button"
            onClick={() => {
              setOther(false);
              onChange(o);
            }}
            className={cn(
              "tap rounded-full border px-4 py-1.5 text-sm",
              !isOther && value === o
                ? "border-primary bg-primary/10 font-medium text-primary"
                : "tap-surface bg-card",
            )}
          >
            {o}
          </button>
        ))}
        <button
          type="button"
          onClick={() => {
            setOther(true);
            if (options.includes(value)) onChange("");
          }}
          className={cn(
            "tap rounded-full border px-4 py-1.5 text-sm",
            isOther
              ? "border-primary bg-primary/10 font-medium text-primary"
              : "tap-surface bg-card",
          )}
        >
          Other
        </button>
      </div>
      {isOther ? (
        <input
          value={options.includes(value) ? "" : value}
          autoFocus
          onChange={(e) => onChange(e.target.value)}
          placeholder={`Type your ${label.toLowerCase()}`}
          aria-label={`Custom ${label}`}
          className="mt-2.5 w-full rounded-2xl border bg-background px-4 py-3 text-sm outline-none transition-all focus:border-primary/40 focus:ring-2 focus:ring-primary/15"
        />
      ) : null}
    </div>
  );
}

function ContextField({
  label,
  placeholder,
  value,
  onChange,
  multiline,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
}) {
  const shared =
    "w-full rounded-xl border bg-background px-3.5 py-2.5 text-sm outline-none transition-all focus:border-primary/40 focus:ring-2 focus:ring-primary/10";
  return (
    <label className="block">
      <span className="text-[13px] font-medium text-muted-foreground">{label}</span>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={2}
          className={cn(shared, "mt-1.5 resize-none")}
        />
      ) : (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={cn(shared, "mt-1.5")}
        />
      )}
    </label>
  );
}
