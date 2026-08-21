import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Check, ChevronLeft, ChevronRight, ExternalLink, FileText, Heart, MessageCircle, Pin, PinOff, Plus } from "lucide-react";
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
import { getTrack, opportunityLink } from "@/lib/wayfind-data";
import { OpportunityBrowser } from "@/components/opportunity-browser";
import { DeadlinePill } from "@/components/deadline-badges";
import { LinkifyText } from "@/components/linkify-text";
import { CalendarButton } from "@/components/calendar-button";
import { cn } from "@/lib/utils";

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
    addCustomStep,
    updateCustomStep,
    removeCustomStep,
    resolveOpportunity,
    browsableOpportunities,
    liveOpportunities,
    addOpportunityToRoadmap,
    pinnedIds,
    togglePinned,
  } = useWayfind();
  const navigate = useNavigate();
  const [justAdded, setJustAdded] = useState(false);

  useEffect(() => {
    // No redirect — show a helpful message instead
  }, [hydrated, id, profile, roadmap, navigate]);

  // No-id browse mode requires profile+roadmap — show a CTA instead of blank page
  if (!id && (!profile || !roadmap)) {
    return (
      <Workspace wide>
        <PageHeader
          icon={<FileText className="h-5 w-5" />}
          title="Opportunities"
          subtitle="Fellowships, insight days, diversity cohorts, scholarships, and early-ID deadlines you don't want to miss."
        />
        <div className="mt-10 flex flex-col items-center text-center">
          <p className="text-sm text-muted-foreground">
            Build your roadmap first — Sylo uses your major, year, and school to show you the right opportunities.
          </p>
          <Link
            to="/roadmap-builder"
            className="tap mt-4 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
          >
            Build my roadmap <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </Workspace>
    );
  }

  // When id is present, allow viewing even without roadmap

  // No id in the URL → browse every opportunity on the student's own track.
  if (!id) {
    return (
      <Workspace wide>
        <PageHeader
          icon={<FileText className="h-5 w-5" />}
          title="Opportunities"
          subtitle="Fellowships, insight days, diversity cohorts, scholarships, and early-ID deadlines you don't want to miss. Save the ones that matter to you."
        />
        <OpportunityBrowser trackId={profile!.trackId} />
      </Workspace>
    );
  }

  const targetId = id;
  const custom = customSteps.find((s) => s.id === targetId);
  const op = resolveOpportunity(targetId);
  const step = roadmap?.steps.find((s) => s.opportunityId === targetId);
  const track = profile ? getTrack(profile.trackId) : null;

  // If there's a custom step but it maps to a real opportunity, show the rich detail view
  if (custom && !op) {
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
      </Workspace>
    );
  }

  if (!op) {
    return (
      <Workspace wide>
        <PageHeader icon={<FileText className="h-5 w-5" />} title="Opportunity Details" subtitle="Pick a step from your roadmap." />
        <Link to="/dashboard" className="tap mt-6 inline-flex items-center gap-1.5 rounded-md text-sm font-medium text-primary hover:text-primary/80">
          <ChevronLeft className="h-4 w-4" />
          Back to roadmap
        </Link>
      </Workspace>
    );
  }

  // Opportunity exists but isn't on the student's roadmap — show detail without status controls
  if (!step) {
    return (
      <Workspace wide>
        <PageHeader
          icon={<FileText className="h-5 w-5" />}
          title={op.name}
          subtitle={op.leverage?.replace(/\n*Link:\s*https?:\/\/[^\s,)]+/g, "").trim()}
          meta={[op.category, op.access === "translated" ? "Local equivalent" : "Direct access", op.timeframe]}
        />

        {/* {op.origin === "live" ? (
          <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl border bg-muted/50 px-3 py-2">
            <FoundViaSearchBadge />
            <span className="text-[13px] leading-relaxed text-muted-foreground">
              Found live and verified before appearing on your roadmap.
            </span>
          </div>
        ) : null} */}

        <div className="mt-6">
          {custom && (
            <PropertyRow label="Status">
              <select
                value={custom.status}
                onChange={(e) => updateCustomStep(custom.id, { status: e.target.value as typeof custom.status })}
                className="tap rounded-xl border bg-background px-2 py-1 text-xs hover:border-primary/40 focus:border-primary/40"
                aria-label="Change status"
              >
                <option value="not-started">Not started</option>
                <option value="in-progress">In progress</option>
                <option value="complete">Complete</option>
              </select>
            </PropertyRow>
          )}
          <PropertyRow label="Requirements">
            <span className="flex flex-wrap items-center justify-end gap-x-1.5 text-sm text-foreground">
              {op.requirements.map((r, i) => (
                <span key={r} className="inline-flex items-center gap-x-1.5">
                  {i > 0 && <span className="text-foreground">·</span>}
                  {r}
                </span>
              ))}
            </span>
          </PropertyRow>
          <PropertyRow label="Deadline">
            <Tag tone="amber">{op.timeframe}</Tag>
            <DeadlinePill deadline={op.deadline} unverified={op.origin === "live"} />
            <CalendarButton name={op.name} deadline={op.deadline} description={op.leverage} url={opportunityLink(op)} compact />
          </PropertyRow>
          {/* <PropertyRow label="Timeline"><LinkifyText text={op.timeline} /></PropertyRow> */}
          {/* <PropertyRow label="Link">
            {op.link ? (
              <a href={op.link} target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2 hover:text-primary/80">
                {op.link.replace(/^https?:\/\//, "").split("/")[0]}
              </a>
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
          </PropertyRow> */}
          {op.brandEquivalent && (
            <PropertyRow label="Equivalent to">
              <Tag>{op.brandEquivalent}</Tag>
            </PropertyRow>
          )}
          {op.missingHere && (
            <PropertyRow label="Why this instead">{op.missingHere}</PropertyRow>
          )}
          <div className="mt-2 flex items-center gap-1.5 px-3 text-[10px] text-muted-foreground/70">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-500/60" />
            Last verified Aug 2026
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <a
            href={opportunityLink(op)}
            target="_blank"
            rel="noopener noreferrer"
            className="tap group inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90"
          >
            Open program page
            <ExternalLink className="h-4 w-4 opacity-70 transition-opacity group-hover:opacity-100" />
          </a>

          {step === undefined && roadmap && !justAdded && !customSteps.some((s) => s.title === op.name) && (
            <button
              type="button"
              onClick={() => {
                addCustomStep({
                  title: op.name,
                  note: `${op.leverage}\n\nLink: ${opportunityLink(op)}`,
                  targetDate: op.deadline || undefined,
                  source: "opportunity",
                });
                setJustAdded(true);
              }}
              className="tap inline-flex items-center gap-2 rounded-full border border-primary px-5 py-2.5 text-sm font-semibold text-primary shadow-sm hover:bg-primary/5"
            >
              Add & track
              <Plus className="h-4 w-4" />
            </button>
          )}

          {justAdded && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-5 py-2.5 text-sm font-medium text-emerald-700">
              <Check className="h-4 w-4" />
              Added & tracked
            </span>
          )}

          {!justAdded && step === undefined && customSteps.some((s) => s.title === op.name) && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-5 py-2.5 text-sm font-medium text-emerald-700">
              <Check className="h-4 w-4" />
              Added & tracked
            </span>
          )}

          <button
            type="button"
            onClick={() => togglePinned(op.id)}
            className={cn(
              "tap inline-flex items-center gap-2 rounded-full border px-5 py-2.5 text-sm font-semibold shadow-sm",
              pinnedIds.includes(op.id)
                ? "border-rose-300 bg-rose-50 text-rose-700 hover:bg-rose-100"
                : "border-muted-foreground/30 text-muted-foreground hover:bg-muted/50"
            )}
          >
            {pinnedIds.includes(op.id) ? <Heart className="h-4 w-4 fill-current" /> : <Heart className="h-4 w-4" />}
            {pinnedIds.includes(op.id) ? "Saved" : "Save"}
          </button>
        </div>

        {step === undefined && !roadmap && (
          <p className="mt-4 rounded-xl border bg-muted/50 px-3 py-2 text-[13px] text-muted-foreground">
            This opportunity isn&apos;t on your roadmap yet. Build a roadmap to see where it fits in your sequence.
          </p>
        )}

        <div className="mt-10 flex flex-wrap items-center gap-4">
          <BackToOpportunities />
          {roadmap && (
            <Link to="/dashboard" className="tap inline-flex items-center gap-1.5 rounded-md text-sm font-medium text-primary hover:text-primary/80">
              <ChevronLeft className="h-4 w-4" />
              Back to roadmap
            </Link>
          )}
        </div>
      </Workspace>
    );
  }



  return (
    <Workspace wide>
      <PageHeader
        icon={<FileText className="h-5 w-5" />}
        title={op.name}
        subtitle={op.leverage}
        meta={[op.category, op.access === "translated" ? "Local equivalent" : "Direct access", op.timeframe]}
      />

      {/* {op.origin === "live" ? (
        <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl border bg-muted/50 px-3 py-2">
          <FoundViaSearchBadge />
          <span className="text-[13px] leading-relaxed text-muted-foreground">
            Found live and cross-checked against the sources below before making your roadmap.
          </span>
        </div>
      ) : null} */}

      <div className="mt-6">
        <PropertyRow label="Status">
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
        </PropertyRow>
        <PropertyRow label="Requirements">
          <span className="flex flex-wrap items-center justify-end gap-x-1.5 text-sm text-foreground">
            {op.requirements.map((r, i) => (
              <span key={r} className="inline-flex items-center gap-x-1.5">
                {i > 0 && <span className="text-foreground">·</span>}
                {r}
              </span>
            ))}
          </span>
        </PropertyRow>
        <PropertyRow label="Deadline">
          <Tag tone="amber">{op.timeframe}</Tag>
          <DeadlinePill deadline={op.deadline} unverified={op.origin === "live"} />
          <CalendarButton name={op.name} deadline={op.deadline} description={step.reasoning} url={opportunityLink(op)} compact />
        </PropertyRow>
        {/* <PropertyRow label="Timeline"><LinkifyText text={op.timeline} /></PropertyRow> */}
        {/* <PropertyRow label="Link">
          {op.link && !op.link.includes("campus.edu") ? (
            <a href={op.link} target="_blank" rel="noopener noreferrer" className="tap rounded-md font-medium text-primary hover:underline">
              {op.link}
            </a>
          ) : (
            <span className="text-muted-foreground">School-specific — check your campus portal</span>
          )}
        </PropertyRow> */}
        {/* {op.sources?.length ? (
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
                  Confirmed from one source. Link included so you can verify directly.
                </span>
              ) : null}
            </span>
          </PropertyRow>
        ) : null} */}
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

      {(() => {
        return (
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <a
            href={opportunityLink(op)}
            target="_blank"
            rel="noopener noreferrer"
            className="tap group inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90"
          >
            Open program page
            <ExternalLink className="h-4 w-4 opacity-70 transition-opacity group-hover:opacity-100" />
          </a>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-700">
            <Check className="h-4 w-4" />
            On your roadmap & track
          </span>
          <button
            type="button"
            onClick={() => togglePinned(op.id)}
            className={cn(
              "tap inline-flex items-center gap-2 rounded-full border px-5 py-2.5 text-sm font-semibold shadow-sm",
              pinnedIds.includes(op.id)
                ? "border-rose-300 bg-rose-50 text-rose-700 hover:bg-rose-100"
                : "border-muted-foreground/30 text-muted-foreground hover:bg-muted/50"
            )}
          >
            {pinnedIds.includes(op.id) ? <Heart className="h-4 w-4 fill-current" /> : <Heart className="h-4 w-4" />}
            {pinnedIds.includes(op.id) ? "Saved" : "Save"}
          </button>
        </div>
        );
      })()}

      {step.reasoning === "You added this opportunity to your roadmap." ? (
        <div className="mt-6 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
          <span className="text-emerald-600 text-sm">✓</span>
          <p className="flex-1 text-[13px] text-emerald-800">
            Added to your roadmap & track.
          </p>
        </div>
      ) : null}

      {step.reasoning !== "You added this opportunity to your roadmap." && step.reasoning !== "You added this to your roadmap." && !step.id.startsWith("promoted-") ? (
        <>
          <section className="mt-10">
            <h2 className="border-b pb-3 text-lg font-semibold tracking-tight">Why Sylo recommended this for you</h2>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              You&apos;re a {profile?.year} {profile?.major} major at {profile?.school} heading toward{" "}
              {track?.label || profile?.goalText || "your goal"}. <LinkifyText text={step.reasoning} />
            </p>

            {/* Dependency chain details */}
            {(op.upstream || op.unlocks?.length || op.window) ? (
              <ul className="mt-4 space-y-2 rounded-lg bg-muted/50 px-4 py-3 text-sm text-muted-foreground">
                {op.upstream ? (
                  <li>• <span className="font-medium text-foreground/80">Builds on:</span> {op.upstream}{op.upstream.endsWith(".") ? "" : "."}</li>
                ) : null}
                {op.unlocks?.length ? (
                  <li>• <span className="font-medium text-foreground/80">Opens:</span> {op.unlocks.join(" → ")}.</li>
                ) : null}
                <li>• Your school ({profile?.school}) {op.access === "translated" ? `does not host ${op.brandEquivalent}, so this stands in for it.` : "offers this directly — no substitution needed."}</li>
                {op.window ? (
                  <li>• <span className="font-medium text-foreground/80">Timing:</span> {op.window}{op.window.endsWith(".") ? "" : "."}</li>
                ) : op.timeframe ? (
                  <li>• <span className="font-medium text-foreground/80">Window:</span> {op.timeframe}.</li>
                ) : null}
              </ul>
            ) : null}
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
        </>
      ) : null}

      <div className="mt-10 flex flex-wrap items-center gap-4">
        <BackToOpportunities />
        {roadmap && (
          <Link to="/dashboard" className="tap inline-flex items-center gap-1.5 rounded-md text-sm font-medium text-primary hover:text-primary/80">
            <ChevronLeft className="h-4 w-4" />
            Back to roadmap
          </Link>
        )}
      </div>
    </Workspace>
  );
}

/** Returns to the browsable opportunities grid preserving scroll position. */
function BackToOpportunities() {
  return (
    <button
      type="button"
      onClick={() => {
        // Go back in history to restore scroll position on the previous page
        window.history.back();
      }}
      className="tap inline-flex items-center gap-1.5 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground"
    >
      <ChevronLeft className="h-4 w-4" />
      Back
    </button>
  );
}
