import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, Loader2, ChevronDown, ChevronRight } from "lucide-react";
import { useRoadmapGeneration, useSearchProgressLabel } from "@/lib/use-roadmap-generation";
import { useWayfind } from "@/lib/wayfind-store";
import { MAJORS, TRACKS, YEARS, opportunitiesForTrack } from "@/lib/wayfind-data";
import { SchoolCombobox } from "@/components/school-combobox";
import { ResumeUpload } from "@/components/resume-upload";
import { cn } from "@/lib/utils";

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
    const profile = {
      major,
      year,
      school,
      trackId,
      goalText,
      experience: experience.trim() || undefined,
      gpa: gpa.trim() || undefined,
      skills: skills.trim() || undefined,
      priorWork: priorWork.trim() || undefined,
      clubs: clubs.trim() || undefined,
      alreadyDone: alreadyDone.trim() || undefined,
    };
    setProfile(profile);
    try {
      const { roadmap, live } = await generate({ trackId, goalText, major, year, school, experience, gpa, skills, priorWork, clubs, alreadyDone });
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
          <span>←</span> Sylo
        </Link>
        <h1 className="mt-7 text-[40px] font-bold leading-[1.02] tracking-[-0.04em] sm:text-[56px]">Where do you want to go?</h1>
        <p className="mt-2.5 text-base text-muted-foreground">
          Pick a destination. Sylo handles the questions you didn&apos;t know to ask.
        </p>

        <div className="mt-8 space-y-3">
          {TRACKS.map((t, idx) => {
            const selected = trackId === t.id;
            const peeking = peek === t.id;
            const sample = opportunitiesForTrack(t.id)
              .slice()
              .sort((a, b) => a.deadline.localeCompare(b.deadline))
              .slice(0, 3);
            return (
              <div
                key={t.id}
                className={cn(
                  "rounded-xl border bg-card transition-colors",
                  selected
                    ? "border-primary/40 shadow-[var(--shadow-raise)]"
                    : "border-border hover:border-primary/25",
                )}
              >
                <button
                  type="button"
                  onClick={() => setTrackId(t.id)}
                  aria-pressed={selected}
                  className="tap group flex w-full items-start gap-4 rounded-2xl p-4 text-left"
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

                {idx === 0 && sample.length ? (
                <div className="px-4 pb-4">
                  <button
                    type="button"
                    onClick={() => setPeek(peeking ? "" : t.id)}
                    aria-expanded={peeking}
                    className="tap rounded-md text-[13px] font-medium text-primary hover:underline"
                  >
                    {peeking ? "Hide sample roadmap" : "Peek at a sample roadmap"}
                  </button>
                  <ul
                    aria-hidden={!peeking}
                    className={cn(
                      "mt-2.5 space-y-1.5 transition-all duration-300",
                      peeking ? "blur-0 opacity-100" : "select-none blur-[5px] opacity-60",
                    )}
                  >
                    {sample.map((op, i) => (
                      <li key={op.id} className="flex items-center gap-2 text-[13px] text-muted-foreground">
                        <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-[4px] bg-secondary text-[10px] tabular-nums">
                          {i + 1}
                        </span>
                        <span className="truncate">{op.name}</span>
                        <span className="shrink-0 text-muted-foreground/70">{op.timeframe}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                ) : null}
              </div>
            );
          })}
        </div>


        <p className="mt-4 text-[13px] leading-relaxed text-muted-foreground">
          Not an exact fit? Picking the closest track is an approximation — Sylo will show verified
          opportunities for that track, not a custom match for your exact goal. If none of them fit,
          choose <span className="font-medium text-foreground">Something else</span> and Sylo will
          say so honestly instead of guessing.
        </p>

        <label className="mt-8 block">
          <span className="text-sm font-medium text-muted-foreground">Or describe it in your own words (optional)</span>
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
              Maya · Biology @ UCLA
            </button>
            <button
              type="button"
              onClick={() => demo("alex")}
              className="tap tap-surface rounded-lg border bg-card px-4 py-1.5 text-sm"
            >
              Alex · CS @ Georgia Tech
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
