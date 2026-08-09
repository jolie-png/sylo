import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { SyloMark } from "@/components/SyloMark";
import { OpportunityFeed } from "@/components/opportunity-feed";

export const Route = createFileRoute("/opportunities")({
  head: () => ({
    meta: [
      { title: "Explore Opportunities — Sylo" },
      {
        name: "description",
        content:
          "Browse curated programs, fellowships, insight days, and early-talent pipelines. Pin the deadlines you don't want to miss.",
      },
      { property: "og:title", content: "Explore Opportunities — Sylo" },
      {
        property: "og:description",
        content:
          "Discover pipeline programs, scholarships, diversity cohorts, and fellowship windows — all in one place.",
      },
    ],
  }),
  component: OpportunitiesPage,
});

function OpportunitiesPage() {
  return (
    <div className="min-h-screen bg-canvas">
      {/* Header */}
      <header className="sticky top-0 z-40 h-11 border-b bg-card">
        <div className="mx-auto flex h-full max-w-5xl items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="tap flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
            </Link>
            <div className="flex items-center gap-2">
              <SyloMark className="h-5 w-5" animated={true} />
              <span className="text-sm font-medium tracking-tight">Opportunities</span>
            </div>
          </div>
          <Link
            to="/roadmap-builder"
            className="tap rounded-full bg-primary px-3.5 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
          >
            Build Roadmap
          </Link>
        </div>
      </header>

      {/* Main content */}
      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
        <div className="mb-6">
          <h1 className="text-xl font-bold tracking-tight">
            Programs &amp; Pipelines
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Fellowships, insight days, diversity cohorts, scholarships, and early-ID
            deadlines you don't want to miss. Pin the ones that matter to you.
          </p>
        </div>

        <OpportunityFeed />
      </main>
    </div>
  );
}
