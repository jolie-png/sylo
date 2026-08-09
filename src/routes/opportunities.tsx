import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { SyloMark } from "@/components/SyloMark";
import { OpportunityDatabaseBrowser } from "@/components/opportunity-database-browser";

export const Route = createFileRoute("/opportunities")({
  head: () => ({
    meta: [
      { title: "Explore Opportunities — Sylo" },
      {
        name: "description",
        content:
          "Browse curated programs, fellowships, internships, and early-talent pipelines. Filtered by track, year, and deadline.",
      },
      { property: "og:title", content: "Explore Opportunities — Sylo" },
      {
        property: "og:description",
        content:
          "Search verified student programs, fellowships, and pipelines across every career track.",
      },
    ],
  }),
  component: OpportunitiesPage,
});

function OpportunitiesPage() {
  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      {/* Header */}
      <header className="sticky top-0 z-40 h-11 border-b bg-card">
        <div className="mx-auto flex h-full max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="tap flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
            </Link>
            <div className="flex items-center gap-2">
              <SyloMark className="h-5 w-5" animated={false} />
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

      {/* Browser */}
      <main className="flex-1">
        <OpportunityDatabaseBrowser />
      </main>
    </div>
  );
}
