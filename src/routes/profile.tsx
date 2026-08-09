import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { User } from "lucide-react";
import { Workspace, PageHeader } from "@/components/workspace";
import { useWayfind } from "@/lib/wayfind-store";
import { useRoadmapGeneration, useSearchProgressLabel } from "@/lib/use-roadmap-generation";
import { SchoolCombobox } from "@/components/school-combobox";
import { MAJORS, TRACKS, YEARS } from "@/lib/wayfind-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "My Profile — Sylo" },
      {
        name: "description",
        content:
          "Edit your major, year, university, and goal. Changes regenerate your roadmap live.",
      },
      { property: "og:title", content: "My Profile — Sylo" },
      {
        property: "og:description",
        content: "Your Sylo profile — major, year, university, and goal in one editable page.",
      },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { profile, roadmap, setProfile, setRoadmap, hydrated } = useWayfind();
  const navigate = useNavigate();
  const generate = useRoadmapGeneration();
  const [busy, setBusy] = useState(false);
  const [regenFailed, setRegenFailed] = useState(false);
  const busyLabel = useSearchProgressLabel(busy);

  useEffect(() => {
    if (hydrated && (!profile || !roadmap)) navigate({ to: "/roadmap-builder" });
  }, [hydrated, profile, roadmap, navigate]);

  if (!profile) return null;

  async function regenerate(next: NonNullable<typeof profile>) {
    setBusy(true);
    setRegenFailed(false);
    try {
      const { roadmap: nextRoadmap, live } = await generate({
        trackId: next.trackId,
        goalText: next.goalText,
        major: next.major,
        year: next.year,
        school: next.school,
        experience: next.experience,
        gpa: next.gpa,
        skills: next.skills,
        priorWork: next.priorWork,
        clubs: next.clubs,
        alreadyDone: next.alreadyDone,
      });
      setRoadmap(nextRoadmap, live);
    } catch {
      /* keep the existing roadmap if regeneration fails */
      setRegenFailed(true);
    } finally {
      setBusy(false);
    }
  }

  function update(patch: Partial<NonNullable<typeof profile>>, regen = false) {
    const next = { ...profile!, ...patch };
    setProfile(next);
    if (regen) void regenerate(next);
  }

  const rows: {
    label: string;
    key: "major" | "year" | "school" | "trackId";
    options: readonly string[];
    allowOther: boolean;
    /** University is too big a set for pills — it renders as a search box instead. */
    combobox?: boolean;
  }[] = [
    { label: "Major", key: "major", options: MAJORS, allowOther: true },
    { label: "Year", key: "year", options: YEARS, allowOther: true },
    { label: "University", key: "school", options: [], allowOther: true, combobox: true },
    { label: "Career goal", key: "trackId", options: TRACKS.map((t) => t.id), allowOther: true },
  ];

  return (
    <Workspace>
      <PageHeader
        icon={<User className="h-5 w-5" />}
        title={profile.personaName ? `${profile.personaName}'s Profile` : "My Profile"}
        subtitle="Changes here propagate to your dashboard and progress tracker."
      />

      {busy ? <p className="mt-4 text-sm text-muted-foreground">{busyLabel}</p> : null}
      {!busy && regenFailed ? (
        <p className="mt-4 rounded-xl border border-tag-amber bg-tag-amber/20 px-3 py-2 text-sm text-foreground">
          Couldn&apos;t update your roadmap for that change — your profile info was saved, but the
          roadmap below reflects your previous answers.
        </p>
      ) : null}

      <div className="mt-6 divide-y rounded-2xl border bg-card p-5">
        {rows.map((row) => {
          const value = profile[row.key];
          const isOther = row.allowOther && !row.options.includes(value);

          if (row.combobox) {
            return (
              <div
                key={row.key}
                className="flex items-start justify-between gap-6 py-3 text-sm first:pt-0 last:pb-0"
              >
                <span className="w-36 shrink-0 pt-1.5 text-muted-foreground">{row.label}</span>
                <div className="flex flex-1 flex-col items-end">
                  <SchoolCombobox
                    value={value}
                    onChange={(next) => update({ school: next }, true)}
                    label={row.label}
                    className="max-w-xs rounded-xl px-3 py-1.5"
                  />
                  <p className="mt-1.5 text-[12px] text-muted-foreground">
                    US universities, for now.
                  </p>
                </div>

              </div>
            );
          }

          return (
            <div key={row.key} className="flex items-start justify-between gap-6 py-3 text-sm first:pt-0 last:pb-0">
              <span className="w-36 shrink-0 pt-1.5 text-muted-foreground">{row.label}</span>
              <div className="flex flex-1 flex-col items-end gap-2">
                <div className="flex flex-wrap justify-end gap-2">
                  {row.options.map((o) => {
                    const label = row.key === "trackId" ? TRACKS.find((t) => t.id === o)?.label ?? o : o;
                    return (
                      <button
                        key={o}
                        type="button"
                        onClick={() => update({ [row.key]: o } as never, true)}
                        className={cn(
                          "tap rounded-full border px-3 py-1 text-xs",
                          value === o
                            ? "border-primary bg-primary/10 font-medium text-primary"
                            : "tap-surface bg-card",
                        )}
                      >
                        {label}
                      </button>
                    );
                  })}
                  {row.allowOther ? (
                    <button
                      type="button"
                      onClick={() => update({ [row.key]: isOther ? value : "" } as never)}
                      className={cn(
                        "tap rounded-full border px-3 py-1 text-xs",
                        isOther
                          ? "border-primary bg-primary/10 font-medium text-primary"
                          : "tap-surface bg-card",
                      )}
                    >
                      Other
                    </button>
                  ) : null}
                </div>
                {isOther ? (
                  <input
                    value={value}
                    autoFocus
                    onChange={(e) => update({ [row.key]: e.target.value } as never)}
                    onBlur={() => {
                      if (profile![row.key].trim()) void regenerate(profile!);
                    }}
                    placeholder={`Type your ${row.label.toLowerCase()}`}
                    aria-label={`Custom ${row.label}`}
                    className="w-full max-w-xs rounded-xl border bg-background px-3 py-1.5 text-right text-sm outline-none transition-colors focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
                  />
                ) : null}
              </div>
            </div>
          );
        })}
        <div className="flex items-start justify-between gap-6 py-3 text-sm first:pt-0 last:pb-0">
          <span className="w-36 shrink-0 pt-1.5 text-muted-foreground">In your own words</span>
          <input
            value={profile.goalText}
            onChange={(e) => update({ goalText: e.target.value })}
            onBlur={() => void regenerate(profile!)}
            placeholder="Optional"
            className="flex-1 rounded-xl border bg-background px-3 py-1.5 text-right text-sm outline-none transition-colors focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
          />
        </div>
      </div>

      {/* Tell Sylo more — context for better personalization */}
      <div className="mt-6 rounded-2xl border bg-card p-5">
        <h2 className="text-sm font-semibold tracking-tight">Tell Sylo more about you</h2>
        <p className="mt-1 text-[13px] text-muted-foreground">
          The more context Sylo has, the better it can find what&apos;s actually relevant to where you are right now.
        </p>

        <div className="mt-4 space-y-4">
          <ProfileContextField
            label="Experience & background"
            placeholder="e.g. Built a React app for a class project, tutored intro CS for two semesters…"
            value={profile.experience ?? ""}
            onBlur={(v) => update({ experience: v || undefined }, true)}
          />
          <ProfileContextField
            label="GPA (approximate is fine)"
            placeholder="e.g. 3.6"
            value={profile.gpa ?? ""}
            onBlur={(v) => update({ gpa: v || undefined })}
          />
          <ProfileContextField
            label="Skills & tools you know"
            placeholder="e.g. Python, JavaScript, React, SQL, Figma…"
            value={profile.skills ?? ""}
            onBlur={(v) => update({ skills: v || undefined }, true)}
          />
          <ProfileContextField
            label="Prior internships or jobs"
            placeholder="e.g. Summer intern at a startup, campus IT help desk…"
            value={profile.priorWork ?? ""}
            onBlur={(v) => update({ priorWork: v || undefined }, true)}
            multiline
          />
          <ProfileContextField
            label="Clubs & organizations"
            placeholder="e.g. ACM chapter, hackathon team, research lab…"
            value={profile.clubs ?? ""}
            onBlur={(v) => update({ clubs: v || undefined }, true)}
          />
          <ProfileContextField
            label="What you've already tried toward this goal"
            placeholder="e.g. Applied to Google STEP but didn't get it, took an online ML course…"
            value={profile.alreadyDone ?? ""}
            onBlur={(v) => update({ alreadyDone: v || undefined }, true)}
            multiline
          />
        </div>
      </div>
    </Workspace>
  );
}


function ProfileContextField({
  label,
  placeholder,
  value,
  onBlur,
  multiline,
}: {
  label: string;
  placeholder: string;
  value: string;
  onBlur: (v: string) => void;
  multiline?: boolean;
}) {
  const [local, setLocal] = useState(value);

  // Sync from parent when profile changes externally
  useEffect(() => { setLocal(value); }, [value]);

  const shared =
    "w-full rounded-xl border bg-background px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-primary/40 focus:ring-2 focus:ring-primary/10";
  return (
    <label className="block">
      <span className="text-[13px] font-medium text-muted-foreground">{label}</span>
      {multiline ? (
        <textarea
          value={local}
          onChange={(e) => setLocal(e.target.value)}
          onBlur={() => onBlur(local.trim())}
          placeholder={placeholder}
          rows={2}
          className={cn(shared, "mt-1.5 resize-none")}
        />
      ) : (
        <input
          value={local}
          onChange={(e) => setLocal(e.target.value)}
          onBlur={() => onBlur(local.trim())}
          placeholder={placeholder}
          className={cn(shared, "mt-1.5")}
        />
      )}
    </label>
  );
}
