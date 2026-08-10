import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Briefcase, ChevronRight, Code, Heart, Sparkles, TrendingUp, Users, PenLine } from "lucide-react";
import { useState } from "react";
import { Workspace, PageHeader } from "@/components/workspace";
import { SUCCESS_STORIES, type SuccessStory } from "@/lib/success-stories";
import { getPublishedMaps, type PublishedMap } from "@/lib/published-maps";
import { PublishedMapCard } from "@/components/published-map-card";
import { SuccessMapForm } from "@/components/success-map-form";
import { TRACKS } from "@/lib/wayfind-data";
import { useWayfind } from "@/lib/sylo-store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/paths")({
  head: () => ({
    meta: [
      { title: "Paths That Worked — Sylo" },
      { name: "description", content: "Real roadmaps from students who made it. See what they did, when they did it, and why it mattered." },
      { property: "og:title", content: "Paths That Worked — Sylo" },
    ],
  }),
  component: PathsPage,
});

function PathsPage() {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [trackFilter, setTrackFilter] = useState<string>("");
  const [submitted, setSubmitted] = useState(false);
  const { profile } = useWayfind();

  const publishedMaps = getPublishedMaps(trackFilter ? { query: trackFilter } : undefined);

  const handleSubmit = (map: Omit<PublishedMap, "id" | "publishedAt">) => {
    // MVP: log to console (operator would copy this to the static JSON)
    console.log("[SUCCESS MAP SUBMISSION]", JSON.stringify({ ...map, id: `pub-${Date.now()}`, publishedAt: new Date().toISOString().slice(0, 10) }, null, 2));
    setShowForm(false);
    setSubmitted(true);
  };

  if (showForm) {
    return (
      <Workspace wide>
        <SuccessMapForm
          prefill={profile ? { school: profile.school, major: profile.major, track: profile.trackId } : undefined}
          onSubmit={handleSubmit}
          onCancel={() => setShowForm(false)}
        />
      </Workspace>
    );
  }

  return (
    <Workspace wide>
      <PageHeader
        icon={<Sparkles className="h-5 w-5" />}
        title="Success Maps"
        subtitle="Real roadmaps from students who made it to where you want to go."
      />

      {/* Curated stories section */}
      <div className="mt-8 space-y-4">
        {SUCCESS_STORIES.map((story) => (
          <StoryCard
            key={story.id}
            story={story}
            expanded={expanded === story.id}
            onToggle={() => setExpanded(expanded === story.id ? null : story.id)}
          />
        ))}
      </div>

      {/* Community published maps section */}
      {publishedMaps.length > 0 && (
        <section className="mt-12">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Users className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-lg font-semibold tracking-tight">Community paths</h2>
            </div>

            {/* Search filter */}
            <input
              type="text"
              value={trackFilter}
              onChange={(e) => setTrackFilter(e.target.value)}
              placeholder="Search paths..."
              className="w-48 rounded-xl border bg-background px-3 py-1.5 text-xs outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
              aria-label="Search community paths"
            />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Paths shared by students who completed their roadmap. Reviewed before publishing.
          </p>

          <div className="mt-5 space-y-4">
            {publishedMaps.map((map) => (
              <PublishedMapCard
                key={map.id}
                map={map}
                expanded={expanded === map.id}
                onToggle={() => setExpanded(expanded === map.id ? null : map.id)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Share your path CTA */}
      <div className="mt-10 rounded-2xl border border-dashed border-foreground/20 bg-muted/30 p-6 text-center">
        {submitted ? (
          <>
            <p className="text-sm font-medium text-foreground">Thanks for sharing your path!</p>
            <p className="mt-1 text-sm text-muted-foreground">
              We'll review it and publish it so future students can see what worked.
            </p>
          </>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              Have a path that worked? Share it so others can see what you did.
            </p>
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="tap group mt-3 inline-flex items-center justify-between gap-4 rounded-full border border-primary/30 bg-primary/5 px-6 py-3 text-sm font-semibold text-primary hover:bg-primary/10"
            >
              <PenLine className="h-4 w-4" />
              <span>Share my path</span>
            </button>
          </>
        )}

        <div className="mt-4 border-t pt-4">
          <p className="text-sm text-muted-foreground">Or start building yours.</p>
          <Link
            to="/roadmap-builder"
            className="tap group mt-3 inline-flex items-center justify-between gap-4 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/95"
          >
            <span>Build my roadmap</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-full border border-primary-foreground/30 transition-colors group-hover:bg-primary-foreground/10">
              <ArrowRight className="h-4 w-4" />
            </span>
          </Link>
        </div>
      </div>

    </Workspace>
  );
}

function StoryIcon({ icon }: { icon: string }) {
  const cls = "h-5 w-5 text-foreground/70";
  switch (icon) {
    case "code": return <Code className={cls} />;
    case "trending-up": return <TrendingUp className={cls} />;
    case "heart": return <Heart className={cls} />;
    case "briefcase": return <Briefcase className={cls} />;
    default: return <Sparkles className={cls} />;
  }
}

function StoryCard({
  story,
  expanded,
  onToggle,
}: {
  story: SuccessStory;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="rounded-2xl border bg-card shadow-sm transition-shadow hover:shadow-md">
      <button
        type="button"
        onClick={onToggle}
        className="tap flex w-full items-start gap-4 p-5 text-left"
      >
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-secondary">
          <StoryIcon icon={story.avatar} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-[15px] font-semibold tracking-tight">{story.name}</span>
            <span className="text-xs text-muted-foreground">· {story.school} · {story.major}</span>
          </div>
          <p className="mt-1 text-sm font-medium text-primary">{story.outcome}</p>
        </div>
        <ChevronRight
          className={cn(
            "mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform",
            expanded && "rotate-90",
          )}
        />
      </button>

      {expanded ? (
        <div className="border-t px-5 pb-5 pt-4">
          <blockquote className="text-sm italic leading-relaxed text-muted-foreground">
            &ldquo;{story.quote}&rdquo;
          </blockquote>

          <ol className="mt-5 space-y-4">
            {story.steps.map((step, i) => (
              <li key={i} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary">
                    {i + 1}
                  </span>
                  {i < story.steps.length - 1 ? (
                    <div className="mt-1 h-full w-px bg-border" />
                  ) : null}
                </div>
                <div className="pb-2">
                  <p className="text-sm font-semibold tracking-tight">{step.label}</p>
                  <p className="mt-0.5 text-[13px] leading-relaxed text-muted-foreground">{step.detail}</p>
                  <p className="mt-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground/70">{step.year}</p>
                </div>
              </li>
            ))}
          </ol>

          {story.sourceUrl ? (
            <a
              href={story.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary hover:underline"
            >
              Read full story →
            </a>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
