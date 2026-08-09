import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import { useRoadmapGeneration, useSearchProgressLabel } from "@/lib/use-roadmap-generation";
import { useWayfind } from "@/lib/wayfind-store";
import { MAJORS, TRACKS, YEARS, opportunitiesForTrack } from "@/lib/wayfind-data";
import { SchoolCombobox } from "@/components/school-combobox";
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
    };
    setProfile(profile);
    try {
      const { roadmap, live } = await generate({ trackId, goalText, major, year, school });
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
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 sm:py-16">
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
          {TRACKS.map((t) => {
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

                {sample.length ? (
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
              Maya · Biology
            </button>
            <button
              type="button"
              onClick={() => demo("alex")}
              className="tap tap-surface rounded-lg border bg-card px-4 py-1.5 text-sm"
            >
              Alex · Computer Science
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
