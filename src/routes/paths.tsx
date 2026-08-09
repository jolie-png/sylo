import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Briefcase, ChevronRight, Code, Heart, Sparkles, TrendingUp } from "lucide-react";
import { useState } from "react";
import { Workspace, PageHeader } from "@/components/workspace";
import { SUCCESS_STORIES, type SuccessStory } from "@/lib/success-stories";
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

  return (
    <Workspace wide>
      <PageHeader
        icon={<Sparkles className="h-5 w-5" />}
        title="Success Maps"
        subtitle="Real roadmaps from students who made it to where you want to go."
      />

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

      <div className="mt-10 rounded-2xl border border-dashed border-foreground/20 bg-muted/30 p-6 text-center">
        <p className="text-sm text-muted-foreground">Your path is next.</p>
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
