import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { User } from "lucide-react";
import { Workspace, PageHeader } from "@/components/workspace";
import { useWayfind } from "@/lib/wayfind-store";
import { useRoadmapGeneration, useSearchProgressLabel } from "@/lib/use-roadmap-generation";
import { SchoolCombobox } from "@/components/school-combobox";
import { MAJORS, TRACKS, YEARS } from "@/lib/wayfind-data";
import { ResumeUpload } from "@/components/resume-upload";
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
  const [hasChanges, setHasChanges] = useState(false);
  const busyLabel = useSearchProgressLabel(busy);

  // Local draft state — edits happen here, only saved on explicit "Save"
  const [draft, setDraft] = useState<NonNullable<typeof profile> | null>(null);

  useEffect(() => {
    if (hydrated && (!profile || !roadmap)) navigate({ to: "/roadmap-builder" });
  }, [hydrated, profile, roadmap, navigate]);

  // Initialize draft from profile
  useEffect(() => {
    if (profile && !draft) setDraft({ ...profile });
  }, [profile]);

  if (!profile || !draft) return null;

  function updateDraft(patch: Partial<NonNullable<typeof profile>>) {
    setDraft((prev) => prev ? { ...prev, ...patch } : prev);
    setHasChanges(true);
  }

  function cancelChanges() {
    setDraft({ ...profile! });
    setHasChanges(false);
  }

  async function saveChanges() {
    if (!draft) return;
    setBusy(true);
    setRegenFailed(false);
    setProfile(draft);
    try {
      const { roadmap: nextRoadmap, live } = await generate({
        trackId: draft.trackId,
        goalText: draft.goalText,
        major: draft.major,
        year: draft.year,
        school: draft.school,
        experience: draft.experience,
        gpa: draft.gpa,
        skills: draft.skills,
        priorWork: draft.priorWork,
        clubs: draft.clubs,
        alreadyDone: draft.alreadyDone,
        diversitySelfId: draft.diversitySelfId,
      });
      setRoadmap(nextRoadmap, live);
      setHasChanges(false);
    } catch {
      setRegenFailed(true);
      setHasChanges(false);
    } finally {
      setBusy(false);
    }
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
    { label: "Career goal", key: "trackId", options: TRACKS.filter((t) => t.id !== "something-else").map((t) => t.id), allowOther: true },
  ];

  return (
    <Workspace wide>
      <PageHeader
        icon={<User className="h-5 w-5" />}
        title={draft.name || draft.personaName ? `${draft.name || draft.personaName}'s Profile` : "My Profile"}
        subtitle="Edit your info below, then save to update your roadmap."
      />

      {/* Save / Cancel bar */}
      {hasChanges && !busy && (
        <div className="mt-4 flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
          <p className="flex-1 text-[13px] text-foreground">
            You have unsaved changes. Save to regenerate your roadmap.
          </p>
          <button
            type="button"
            onClick={cancelChanges}
            className="tap rounded-full border px-4 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={saveChanges}
            className="tap rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground shadow-sm hover:bg-primary/90"
          >
            Save & update roadmap
          </button>
        </div>
      )}

      {busy ? <p className="mt-4 text-sm text-muted-foreground">{busyLabel}</p> : null}
      {!busy && regenFailed ? (
        <p className="mt-4 rounded-xl border border-tag-amber bg-tag-amber/20 px-3 py-2 text-sm text-foreground">
          Couldn&apos;t update your roadmap for that change — your profile info was saved, but the
          roadmap below reflects your previous answers.
        </p>
      ) : null}

      <div className="mt-6 divide-y rounded-2xl border bg-card p-5">
        <div className="flex items-start justify-between gap-6 py-3 text-sm first:pt-0">
          <span className="w-36 shrink-0 pt-1.5 text-muted-foreground">Name</span>
          <input
            value={draft.name ?? ""}
            onChange={(e) => updateDraft({ name: e.target.value })}
            placeholder="Your name"
            className="flex-1 rounded-xl border bg-background px-3 py-1.5 text-right text-sm outline-none transition-colors focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
          />
        </div>
        {rows.map((row) => {
          const value = draft[row.key];
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
                    onChange={(next) => updateDraft({ school: next })}
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
                        onClick={() => updateDraft({ [row.key]: o } as never)}
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
                      onClick={() => updateDraft({ [row.key]: isOther ? value : "" } as never)}
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
                    onChange={(e) => updateDraft({ [row.key]: e.target.value } as never)}
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
            value={draft.goalText}
            onChange={(e) => updateDraft({ goalText: e.target.value })}
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
          <ResumeUpload
            onParsed={(data) => {
              updateDraft({
                name: data.name?.trim() || draft!.name,
                school: data.school?.trim() || draft!.school,
                year: data.year?.trim() || draft!.year,
                experience: data.experience?.trim() || draft!.experience,
                skills: data.skills?.trim() || draft!.skills,
                priorWork: data.priorWork?.trim() || draft!.priorWork,
                clubs: data.clubs?.trim() || draft!.clubs,
                alreadyDone: data.alreadyDone?.trim() || draft!.alreadyDone,
              });
            }}
          />
          <ProfileContextField
            label="Experience & background"
            placeholder="e.g. Built a React app for a class project, tutored intro CS for two semesters…"
            value={draft.experience ?? ""}
            onChange={(v) => updateDraft({ experience: v || undefined })}
          />
          <ProfileContextField
            label="GPA (approximate is fine)"
            placeholder="e.g. 3.6"
            value={draft.gpa ?? ""}
            onChange={(v) => updateDraft({ gpa: v || undefined })}
          />
          <ProfileContextField
            label="Skills & tools you know"
            placeholder="e.g. Python, JavaScript, React, SQL, Figma…"
            value={draft.skills ?? ""}
            onChange={(v) => updateDraft({ skills: v || undefined })}
          />
          <ProfileContextField
            label="Prior internships or jobs"
            placeholder="e.g. Summer intern at a startup, campus IT help desk…"
            value={draft.priorWork ?? ""}
            onChange={(v) => updateDraft({ priorWork: v || undefined })}
            multiline
          />
          <ProfileContextField
            label="Clubs & organizations"
            placeholder="e.g. ACM chapter, hackathon team, research lab…"
            value={draft.clubs ?? ""}
            onChange={(v) => updateDraft({ clubs: v || undefined })}
          />
          <ProfileContextField
            label="What you've already tried toward this goal"
            placeholder="e.g. Applied to Google STEP but didn't get it, took an online ML course…"
            value={draft.alreadyDone ?? ""}
            onChange={(v) => updateDraft({ alreadyDone: v || undefined })}
            multiline
          />

          {/* Diversity & identity program opt-in */}
          <label className="flex items-start gap-3 rounded-xl border bg-background p-3.5 cursor-pointer">
            <input
              type="checkbox"
              checked={draft.diversitySelfId ?? false}
              onChange={(e) => updateDraft({ diversitySelfId: e.target.checked })}
              className="mt-0.5 h-4 w-4 rounded border-muted-foreground/40 accent-primary"
            />
            <div>
              <span className="text-[13px] font-medium text-foreground">
                Include diversity and identity-based programs
              </span>
              <p className="mt-0.5 text-[12px] text-muted-foreground">
                Show programs for women, underrepresented minorities, first-gen students, LGBTQ+, and other identity-based groups (e.g. BOLD, MLT, SEO, SHPE, Women in Finance, Grace Hopper).
              </p>
            </div>
          </label>
        </div>
      </div>
    </Workspace>
  );
}


function ProfileContextField({
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
    "w-full rounded-xl border bg-background px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-primary/40 focus:ring-2 focus:ring-primary/10";
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
