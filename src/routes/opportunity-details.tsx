import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, FileText } from "lucide-react";
import {
  Workspace,
  PageHeader,
  PropertyRow,
  StatusTag,
  Tag,
  OwnGoalBadge,
  FoundViaSearchBadge,
} from "@/components/workspace";
import { useWayfind } from "@/lib/sylo-store";
import { getTrack } from "@/lib/wayfind-data";
import { OpportunityBrowser } from "@/components/opportunity-browser";

export const Route = createFileRoute("/opportunity-details")({
  validateSearch: (search: Record<string, unknown>) => ({
    id: typeof search.id === "string" ? search.id : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Opportunity Details — Sylo" },
      {
        name: "description",
        content:
          "Requirements, timeline, contacts, and why Sylo put this opportunity in your sequence.",
      },
      { property: "og:title", content: "Opportunity Details — Sylo" },
      {
        property: "og:description",
        content: "The full detail view for one opportunity on your roadmap.",
      },
    ],
  }),
  component: Details,
});

function Details() {
  const { id } = Route.useSearch();
  const {
    profile,
    roadmap,
    setStatus,
    hydrated,
    customSteps,
    updateCustomStep,
    removeCustomStep,
    resolveOpportunity,
    browsableOpportunities,
    liveOpportunities,
  } = useWayfind();
  const navigate = useNavigate();
  const [showReasons, setShowReasons] = useState(true);

  useEffect(() => {
    // Only redirect if there's no id — viewing a specific opportunity should always work
    if (hydrated && !id && (!profile || !roadmap)) navigate({ to: "/roadmap-builder" });
  }, [hydrated, id, profile, roadmap, navigate]);

  // No-id browse mode requires profile+roadmap
  if (!id && (!profile || !roadmap)) return null;

  // When id is present, allow viewing even without roadmap

  // No id in the URL → browse every opportunity on the student's own track.
  if (!id) {
    return (
      <Workspace wide>
        <PageHeader
          icon={<FileText className="h-5 w-5" />}
          title="Opportunities"
          subtitle="Fellowships, insight days, diversity cohorts, scholarships, and early-ID deadlines you don't want to miss. Pin the ones that matter to you."
        />
        {browsableOpportunities(profile!.trackId).length ? (
          <p className="mt-4 rounded-xl border bg-muted/50 px-3 py-2 text-[13px] leading-relaxed text-muted-foreground">
            {liveOpportunities.length
              ? "Cards tagged “Found via search” were looked up for your goal and school just now. Everything else is from Sylo’s curated dataset and is open to any student at your stage."
              : "Sylo matched you to opportunities open to any student at your stage — not listings scraped specifically for your school."}
          </p>
        ) : null}
        <OpportunityBrowser trackId={profile!.trackId} />
      </Workspace>
    );
  }

  const targetId = id;
  const custom = customSteps.find((s) => s.id === targetId);
  const op = resolveOpportunity(targetId);
  const step = roadmap?.steps.find((s) => s.opportunityId === targetId);
  const track = profile ? getTrack(profile.trackId) : null;

  if (custom) {
    return (
      <Workspace wide>
        <PageHeader
          icon={<FileText className="h-5 w-5" />}
          title={custom.title}
          subtitle="A goal you added yourself. Sylo has no verified data about this one."
        />
        <div className="mt-6 space-y-3 rounded-2xl border border-dashed border-foreground/25 bg-muted/60 p-5">
          <div className="flex flex-wrap items-center gap-2">
            <OwnGoalBadge />
            <StatusTag status={custom.status} />
          </div>
          <label className="block text-xs text-muted-foreground" htmlFor="custom-title">
            Title
          </label>
          <input
            id="custom-title"
            value={custom.title}
            onChange={(e) => updateCustomStep(custom.id, { title: e.target.value })}
            className="w-full rounded-xl border bg-background px-3 py-1.5 text-sm outline-none focus:border-primary/40"
          />
          <label className="block text-xs text-muted-foreground" htmlFor="custom-note">
            Note
          </label>
          <textarea
            id="custom-note"
            rows={3}
            value={custom.note ?? ""}
            onChange={(e) => updateCustomStep(custom.id, { note: e.target.value })}
            className="w-full rounded-xl border bg-background px-3 py-1.5 text-sm outline-none focus:border-primary/40"
          />
          <label className="block text-xs text-muted-foreground" htmlFor="custom-date">
            Target date
          </label>
          <input
            id="custom-date"
            type="date"
            value={custom.targetDate ?? ""}
            onChange={(e) => updateCustomStep(custom.id, { targetDate: e.target.value })}
            className="rounded-xl border bg-background px-3 py-1.5 text-sm outline-none focus:border-primary/40"
          />
          <div className="flex items-center gap-2 pt-1">
            <select
              value={custom.status}
              onChange={(e) =>
                updateCustomStep(custom.id, { status: e.target.value as typeof custom.status })
              }
              aria-label="Change status"
              className="tap rounded-xl border bg-background px-2 py-1 text-xs"
            >
              <option value="not-started">Not started</option>
              <option value="in-progress">In progress</option>
              <option value="complete">Complete</option>
            </select>
            <button
              type="button"
              onClick={() => {
                removeCustomStep(custom.id);
                navigate({ to: "/dashboard" });
              }}
              className="tap tap-surface rounded-full border px-3 py-1 text-xs font-medium text-muted-foreground"
            >
              Delete this goal
            </button>
          </div>
        </div>
        <div className="mt-10 flex flex-wrap items-center gap-4">
          <BackToOpportunities />
          <Link to="/dashboard" className="tap inline-block rounded-md text-sm font-medium text-primary hover:underline">
            ← Back to roadmap
          </Link>
        </div>
      </Workspace>
    );
  }

  if (!op) {
    return (
      <Workspace wide>
        <BackToOpportunities />
        <PageHeader icon={<FileText className="h-5 w-5" />} title="Opportunity Details" subtitle="Pick a step from your roadmap." />
        <Link to="/dashboard" className="tap mt-6 inline-block rounded-md text-sm font-medium text-primary hover:underline">
          ← Back to dashboard
        </Link>
      </Workspace>
    );
  }

  // Opportunity exists but isn't on the student's roadmap — show detail without status controls
  if (!step) {
    return (
      <Workspace wide>
        <BackToOpportunities />
        <PageHeader
          icon={<FileText className="h-5 w-5" />}
          title={op.name}
          subtitle={op.leverage}
          meta={[op.category, op.access === "translated" ? "Local equivalent" : "Direct access", op.timeframe]}
        />

        {op.origin === "live" ? (
          <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl border bg-muted/50 px-3 py-2">
            <FoundViaSearchBadge />
            <span className="text-[13px] leading-relaxed text-muted-foreground">
              This one came from a live search, not Sylo&apos;s curated dataset.
            </span>
          </div>
        ) : null}

        <div className="mt-6">
          <PropertyRow label="Requirements">
            <span className="flex flex-wrap justify-end gap-1.5">
              {op.requirements.map((r) => (
                <Tag key={r}>{r}</Tag>
              ))}
            </span>
          </PropertyRow>
          <PropertyRow label="Deadline">
            <Tag tone="amber">{op.timeframe}</Tag>
          </PropertyRow>
          <PropertyRow label="Timeline">{op.timeline}</PropertyRow>
          <PropertyRow label="Contact">
            {op.contact && !op.contact.includes("@campus.edu") ? op.contact : <span className="text-muted-foreground">Check your campus portal</span>}
          </PropertyRow>
          <PropertyRow label="Link">
            {op.link ? (
              <a href={op.link} target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2 hover:text-primary/80">
                {op.link.replace(/^https?:\/\//, "").split("/")[0]}
              </a>
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
          </PropertyRow>
          {op.brandEquivalent && (
            <PropertyRow label="Equivalent to">
              <Tag>{op.brandEquivalent}</Tag>
            </PropertyRow>
          )}
          {op.missingHere && (
            <PropertyRow label="Why this instead">{op.missingHere}</PropertyRow>
          )}
        </div>

        {step === undefined && (
          <p className="mt-6 rounded-xl border bg-muted/50 px-3 py-2 text-[13px] text-muted-foreground">
            This opportunity isn&apos;t on your roadmap yet. Build a roadmap to see where it fits in your sequence.
          </p>
        )}

        <div className="mt-10 flex flex-wrap items-center gap-4">
          <BackToOpportunities />
          <Link to="/dashboard" className="tap inline-block rounded-md text-sm font-medium text-primary hover:underline">
            ← Back to dashboard
          </Link>
        </div>
      </Workspace>
    );
  }



  return (
    <Workspace wide>
      <BackToOpportunities />
      <PageHeader
        icon={<FileText className="h-5 w-5" />}
        title={op.name}
        subtitle={op.leverage}
        meta={[op.category, op.access === "translated" ? "Local equivalent" : "Direct access", op.timeframe]}
      />

      {op.origin === "live" ? (
        <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl border bg-muted/50 px-3 py-2">
          <FoundViaSearchBadge />
          <span className="text-[13px] leading-relaxed text-muted-foreground">
            This one came from a live search, not Sylo&apos;s curated dataset. The sources below are
            what it was checked against.
          </span>
        </div>
      ) : null}

      <div className="mt-6">
        <PropertyRow label="Status">
          <span className="inline-flex items-center gap-2">
            <StatusTag status={step.status} />
            <select
              value={step.status}
              onChange={(e) => setStatus(op.id, e.target.value as typeof step.status)}
              className="tap rounded-xl border bg-background px-2 py-1 text-xs hover:border-primary/40 focus:border-primary/40"
              aria-label="Change status"
            >
              <option value="not-started">Not started</option>
              <option value="in-progress">In progress</option>
              <option value="complete">Complete</option>
            </select>
          </span>
        </PropertyRow>
        <PropertyRow label="Requirements">
          <span className="flex flex-wrap justify-end gap-1.5">
            {op.requirements.map((r) => (
              <Tag key={r}>{r}</Tag>
            ))}
          </span>
        </PropertyRow>
        <PropertyRow label="Deadline">
          <Tag tone="amber">{op.timeframe}</Tag>
        </PropertyRow>
        <PropertyRow label="Timeline">{op.timeline}</PropertyRow>
        <PropertyRow label="Contact">
          {op.contact && !op.contact.includes("@campus.edu") ? op.contact : <span className="text-muted-foreground">Check your campus portal</span>}
        </PropertyRow>
        <PropertyRow label="Link">
          {op.link && !op.link.includes("campus.edu") ? (
            <a href={op.link} target="_blank" rel="noopener noreferrer" className="tap rounded-md font-medium text-primary hover:underline">
              {op.link}
            </a>
          ) : (
            <span className="text-muted-foreground">School-specific — check your campus portal</span>
          )}
        </PropertyRow>
        {op.sources?.length ? (
          // Both sources when there are two — the visible proof that
          // cross-checking actually happened, rather than a claim that it did.
          <PropertyRow label={op.sources.length > 1 ? "Sources" : "Source"}>
            <span className="flex flex-col items-end gap-1">
              {op.sources.map((s) => (
                <a
                  key={s.url}
                  href={s.url}
                  target="_blank"
                  rel="noreferrer"
                  className="tap max-w-full truncate rounded-md font-medium text-primary hover:underline"
                >
                  {s.title}
                </a>
              ))}
              {op.singleSourced ? (
                <span className="text-xs text-muted-foreground">
                  Confirmed from one source — worth double-checking.
                </span>
              ) : null}
            </span>
          </PropertyRow>
        ) : null}
        {/* {op.courseCode ? (
          <PropertyRow label="Course">
            <span className="flex flex-wrap items-baseline gap-2">
              <span className="font-medium">{op.courseCode}</span>
              {op.leverage ? (
                <span className="text-xs text-muted-foreground">{op.leverage}</span>
              ) : null}
            </span>
          </PropertyRow>
        ) : null} */}
      </div>

      <section className="mt-10">
        <h2 className="border-b pb-3 text-lg font-semibold tracking-tight">Why this matters for you</h2>
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
          You&apos;re a {profile?.year} {profile?.major} major at {profile?.school} heading toward{" "}
          {track?.label}. {step.reasoning}
        </p>
      </section>

      {op.access === "translated" ? (
        <section className="mt-8 rounded-2xl border border-primary/10 bg-primary/5 p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary/80">
            Opportunity translation
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="card-tonal rounded-2xl p-4">
              <p className="text-sm font-semibold tracking-tight">Missing at {profile?.school}</p>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                {op.brandEquivalent} — {op.missingHere}
              </p>
            </div>
            <div className="card-tonal rounded-2xl p-4">
              <p className="text-sm font-semibold tracking-tight">What you have instead</p>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                {op.name} — {op.leverage}
              </p>
            </div>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            Admissions readers and recruiters are looking for the function, not the brand name. This
            produces the same artifact: supervised work, a named recommender, and a dated record you
            can point to.
          </p>
        </section>
      ) : null}

      <section className="mt-10">
        <h2 className="border-b pb-3 text-lg font-semibold tracking-tight">Why did Sylo recommend this?</h2>
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
          {op.origin === "live" ? (
            <>
              Sylo searched for opportunities matching your goal, major, year, and school, then ran
              follow-up searches to confirm each one still exists before showing it to you. It
              ranked what survived by leverage and by how soon each window closes.
            </>
          ) : (
            <>
              Sylo ranked every opportunity tagged to {track?.label} by how much leverage it creates
              and how soon its window closes, then filtered to what you&apos;re eligible for right
              now.
            </>
          )}{" "}
          This one came out{" "}
          {op.id === roadmap?.topOpportunityId ? "first" : `at position ${(roadmap?.steps.findIndex((s) => s.opportunityId === op.id) ?? 0) + 1}`}
          .
        </p>
        <button
          type="button"
          onClick={() => setShowReasons((v) => !v)}
          className="tap mt-4 flex items-center gap-1.5 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          {showReasons ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          Reasoning factors
        </button>
        {showReasons ? (
          op.origin === "live" ? (
            <ul className="mt-3 space-y-2 pl-6 text-sm text-muted-foreground">
              {op.requirements[0] ? (
                <li>• The eligibility line found on its page: {op.requirements[0]}.</li>
              ) : (
                <li>• No eligibility requirements were published where Sylo could find them.</li>
              )}
              <li>
                • Matched against your search: {profile?.year} {profile?.major} major at{" "}
                {profile?.school}.
              </li>
              <li>
                •{" "}
                {op.singleSourced
                  ? "Confirmed from one source only — Sylo looked for a second and didn't find one."
                  : `Corroborated across ${op.sources?.length ?? 2} independent sources, listed above.`}
              </li>
              <li>• Its window ({op.timeframe}) closes sooner than most other steps in your sequence.</li>
            </ul>
          ) : (
            <ul className="mt-3 space-y-2 pl-6 text-sm text-muted-foreground">
              <li>• Your year ({profile?.year}) meets the eligibility line: {op.requirements[0]}.</li>
              <li>• Your goal ({track?.label}) is the track this opportunity is tagged to.</li>
              <li>• Your school ({profile?.school}) {op.access === "translated" ? `does not host ${op.brandEquivalent}, so this stands in for it.` : "offers this directly, with no substitution needed."}</li>
              <li>• Its window ({op.timeframe}) closes sooner than most other steps in your sequence.</li>
              {profile?.major ? <li>• Your major ({profile?.major}) supplies the coursework this expects.</li> : null}
            </ul>
          )
        ) : null}
      </section>

      <Link to="/dashboard" className="tap mt-10 inline-block rounded-md text-sm font-medium text-primary hover:underline">
        ← Back to roadmap
      </Link>
    </Workspace>
  );
}

/** Returns to the browsable opportunities grid (no id in the URL). */
function BackToOpportunities() {
  return (
    <Link
      to="/opportunity-details"
      search={{ id: undefined }}
      className="tap inline-flex items-center gap-1.5 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground"
    >
      <ChevronLeft className="h-4 w-4" />
      All opportunities
    </Link>
  );
}
