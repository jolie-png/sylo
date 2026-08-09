import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, AlertTriangle } from "lucide-react";
import { SyloMark } from "@/components/SyloMark";
import { TypingHero } from "@/components/TypingHero";
import { RoadmapWorkspacePreview } from "@/components/roadmap-workspace-preview";
import { WavyRouteLine } from "@/components/wavy-route-line";
import { getOpportunity } from "@/lib/wayfind-data";
import { useInView } from "@/lib/use-in-view";
import { cn } from "@/lib/utils";


export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Sylo — the map for every student's path" },
      {
        name: "description",
        content:
          "Sylo turns a career destination into one ranked next move, grounded in real opportunities at your own school. No sign-up.",
      },
      { property: "og:title", content: "Sylo — the map for every student's path" },
      {
        property: "og:description",
        content: "The path already exists. Sylo draws the map.",
      },
    ],
  }),
  component: Landing,
});

const dashboardOp = getOpportunity("op-ucla-urfp") ?? {
  name: "Undergraduate Research Fellows Program",
  leverage: "A funded research position and faculty mentor — the two things med school apps weigh heaviest.",
  unlocks: undefined,
  timeframe: "Apply Fall quarter",
  gapLabel: undefined,
  window: undefined,
  brandEquivalent: undefined,
};

const translationOp = getOpportunity("op-ucla-bisep") ?? {
  name: "Biomedical Science Enrichment Program (BISEP)",
  leverage: "Gets you into a real lab before most sophomores know how to ask.",
};


function Landing() {
  const wavyTop = useInView();
  const cards = useInView();
  const wavyBottom = useInView();
  const cta = useInView();

  return (
    <div className="min-h-screen bg-canvas">
      {/* Compact workspace chrome: 44px bar, hairline border, solid card surface. */}
      <header className="sticky top-0 z-40 h-11 border-b bg-card">
        <div className="mx-auto flex h-full max-w-5xl items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <SyloMark className="h-6 w-6" animated={true} />
            <span className="text-sm font-medium tracking-tight">Sylo</span>

          </div>

        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 sm:px-6">
        <section className="relative">
          {/* Sticky stage: hero follows the scroll for a longer distance, then releases. */}
          <div className="relative h-[100vh]">
            <div className="sticky top-11 z-10 flex h-[calc(100vh-2.75rem)] w-full flex-col items-center justify-center text-center">
              <p className="text-sm font-medium text-primary">Real guidance, crafted for your path.</p>
              <div className="mt-6">
                <TypingHero />
              </div>
              <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground sm:text-xl">
                Tell Sylo where you want to end up. It reads your major, year, and school&apos;s
                programs, then returns a personalized roadmap — one ranked next move at a time.
              </p>

              <div className="mt-10 flex flex-col items-center justify-center gap-3">
                <Link
                  to="/roadmap-builder"
                  className="tap group inline-flex items-center justify-between gap-4 rounded-full bg-primary px-8 py-4 text-lg font-semibold text-primary-foreground hover:bg-primary/95"
                >
                  <span>Build My Roadmap</span>
                  <span className="flex h-10 w-10 items-center justify-center rounded-full border border-primary-foreground/30 transition-colors group-hover:bg-primary-foreground/10">
                    <ArrowRight className="h-5 w-5" />
                  </span>
                </Link>
                {/* <Link
                  to="/opportunities"
                  className="tap text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                >
                  Or browse all programs &amp; pipelines →
                </Link> */}
              </div>
            </div>
          </div>

          {/* Workspace preview sits in normal flow below the sticky stage so it can never overlap the hero. */}
          <div className="relative z-20 pt-10">
            <RoadmapWorkspacePreview />
          </div>
        </section>

        <div
          ref={wavyTop.ref}
          className={cn(
            "flex justify-center pt-8 pb-2 transition-all duration-700",
            wavyTop.inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6",
          )}
        >
          <div className="flex flex-col items-center">
            <WavyRouteLine height={144} className="text-primary/60" />
            <WavyRouteLine height={144} className="text-primary/60" />
          </div>
        </div>

        <section
          ref={cards.ref}
          className={cn(
            "py-4 sm:py-6 transition-all duration-700 delay-200",
            cards.inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8",
          )}
        >
          <div className="grid gap-3 sm:grid-cols-3">
            {/* 01 */}
            <div className="flex flex-col rounded-xl border bg-card p-5 shadow-[var(--shadow-card)]">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">01</p>
              <h2 className="mt-2.5 text-[17px] font-semibold leading-snug tracking-tight">
                One next move, not twenty.
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                No dashboard to learn. Just the single highest-leverage thing to do right now, and why it matters this week.
              </p>

              <div className="field-tonal mt-auto pt-4 flex items-start gap-2.5 rounded-lg p-3">
                <span className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
                  1
                </span>
                <div>
                  <span className="text-sm font-medium tracking-tight">{dashboardOp.name}</span>
                  <p className="mt-1 text-xs text-primary">→ {dashboardOp.unlocks?.[0] ?? dashboardOp.leverage}</p>
                </div>
              </div>
            </div>

            {/* 02 */}
            <div className="flex flex-col rounded-xl border bg-card p-5 shadow-[var(--shadow-card)]">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">02</p>
              <h2 className="mt-2.5 text-[17px] font-semibold leading-snug tracking-tight">
                Your school, not a brochure.
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                When the name-brand program doesn&apos;t exist where you are, Sylo names the real equivalent — built on the same ingredients that actually matter.
              </p>

              <div className="field-tonal mt-auto pt-4 flex items-start gap-2.5 rounded-lg p-3">
                <span className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-tag-blue text-[10px] font-semibold text-tag-blue-foreground">
                  →
                </span>
                <div>
                  <span className="text-sm font-medium tracking-tight">{translationOp.name}</span>
                  <p className="mt-1 text-xs text-primary">
                    Real program at your school — no brand-name equivalent needed
                  </p>
                </div>
              </div>
            </div>

            {/* 03 */}
            <div className="flex flex-col rounded-xl border bg-card p-5 shadow-[var(--shadow-card)]">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">03</p>
              <h2 className="mt-2.5 text-[17px] font-semibold leading-snug tracking-tight">
                See what&apos;s actually blocking you.
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Your biggest gap, stated plainly, with the deadline attached — not buried three clicks deep.
              </p>

              <div className="field-tonal mt-auto pt-4 flex items-start gap-2.5 rounded-lg p-3">
                <span className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-tag-amber text-tag-amber-foreground">
                  <AlertTriangle className="h-3 w-3" />
                </span>
                <div>
                  <span className="text-sm font-medium tracking-tight">No faculty mentor identified</span>
                  <p className="mt-1 text-xs text-primary">→ URFP requires one before you apply — find a PI this quarter or miss the Nov 15 deadline.</p>
                </div>
              </div>
            </div>
          </div>
        </section>



        <div
          ref={wavyBottom.ref}
          className={cn(
            "flex justify-center py-2 transition-all duration-700",
            wavyBottom.inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6",
          )}
        >
          <div className="flex flex-col items-center">
            <WavyRouteLine height={144} className="text-primary/60" />
            <WavyRouteLine height={144} className="text-primary/60" />
          </div>
        </div>

        <section
          ref={cta.ref}
          className={cn(
            "py-6 sm:py-8 transition-all duration-700 delay-200",
            cta.inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8",
          )}
        >
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-4xl">
              The invisible advisor every well-connected student already has.<br /><span className="text-primary">Now it&apos;s yours.</span>
            </h2>
            <p className="mx-auto mt-4 max-w-md text-base text-muted-foreground text-balance">
              No sign-up required. Real roadmaps in seconds.
            </p>
            <div className="mt-8 pb-40">
              <Link
                to="/roadmap-builder"
                className="tap group inline-flex items-center justify-between gap-4 rounded-full bg-primary px-8 py-4 text-lg font-semibold text-primary-foreground hover:bg-primary/95"
              >
                <span>Build My Roadmap</span>
                <span className="flex h-10 w-10 items-center justify-center rounded-full border border-primary-foreground/30 transition-colors group-hover:bg-primary-foreground/10">
                  <ArrowRight className="h-5 w-5" />
                </span>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t bg-card px-6 py-8">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-2">
            <SyloMark className="h-5 w-5" animated={true} />
            <span className="text-sm font-semibold tracking-tight">Sylo</span>
          </div>
          <Link to="/paths" className="text-sm text-muted-foreground hover:text-foreground hover:underline">
            Paths that worked
          </Link>
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} Sylo. All rights reserved.
          </p>
        </div>
      </footer>

    </div>
  );
}


