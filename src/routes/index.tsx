import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Map, MapPin } from "lucide-react";
import { SyloMark } from "@/components/SyloMark";
import { TypingHero } from "@/components/TypingHero";
import { RoadmapWorkspacePreview } from "@/components/roadmap-workspace-preview";
import { PinDropDemo } from "@/components/pin-drop-demo";
import { WavyRouteLine } from "@/components/wavy-route-line";
import { getOpportunity } from "@/lib/wayfind-data";
import { useWayfind } from "@/lib/sylo-store";
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

function Landing() {
  const wavyTop = useInView();
  const cards = useInView();
  const wavyBottom = useInView();
  const cta = useInView();
  const { loadPersona } = useWayfind();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-canvas">
      {/* Compact workspace chrome: 44px bar, hairline border, solid card surface. */}
      <header className="sticky top-0 z-40 h-11 border-b border-border/40 bg-background">
        <div className="mx-auto flex h-full max-w-5xl items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <SyloMark className="h-6 w-6" animated={true} />
            <span className="text-sm font-medium tracking-tight">Sylo</span>

          </div>
          <Link to="/about" className="text-sm text-muted-foreground transition-colors duration-150 hover:text-foreground">
            Why Sylo?
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 sm:px-6">
        <section className="relative">
          {/* Sticky stage: hero follows the scroll for a longer distance, then releases. */}
          <div className="relative h-[100vh]">
            <div className="sticky top-11 z-10 flex h-[calc(100vh-2.75rem)] w-full flex-col items-center justify-center text-center">
              <div>
                <TypingHero />
              </div>
              <p className="mx-auto mt-5 max-w-xl text-[17px] leading-relaxed text-muted-foreground sm:text-lg">
                Tell Sylo where you want to end up. It reads your major, year, and school&apos;s
                programs, then returns a personalized roadmap — one ranked next move at a time.
              </p>

              <div className="mt-10 flex flex-col items-center justify-center gap-3">
                <Link
                  to="/roadmap-builder"
                  className="tap group inline-flex items-center justify-between gap-4 rounded-full bg-primary px-8 py-4 text-lg font-semibold text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/95 hover:shadow-xl hover:shadow-primary/25"
                >
                  <span>Build my roadmap</span>
                  <span className="flex h-10 w-10 items-center justify-center rounded-full border border-primary-foreground/30 transition-colors group-hover:bg-primary-foreground/10">
                    <ArrowRight className="h-5 w-5" />
                  </span>
                </Link>
              <p className="text-sm font-medium text-muted-foreground">
                <span className="relative inline-block">
                  <span className="group/demo cursor-default py-2">
                    <span className="text-primary underline-offset-4 group-hover/demo:underline">Try an instant demo →</span>
                    <span className="pointer-events-none absolute left-1/2 top-full z-50 flex -translate-x-1/2 gap-2 rounded-full border bg-card px-2 py-1.5 shadow-lg opacity-0 transition-opacity duration-200 group-hover/demo:pointer-events-auto group-hover/demo:opacity-100">
                      <button
                        type="button"
                        onClick={() => { loadPersona("alex"); navigate({ to: "/dashboard" }); }}
                        className="tap whitespace-nowrap rounded-full bg-secondary px-4 py-1.5 text-sm font-medium text-foreground hover:bg-primary hover:text-primary-foreground"
                      >
                        Alex · Biology @ UCLA
                      </button>
                      <button
                        type="button"
                        onClick={() => { loadPersona("maya"); navigate({ to: "/dashboard" }); }}
                        className="tap whitespace-nowrap rounded-full bg-secondary px-4 py-1.5 text-sm font-medium text-foreground hover:bg-primary hover:text-primary-foreground"
                      >
                        Maya · CS @ Georgia Tech
                      </button>
                    </span>
                    {/* Invisible bridge so cursor doesn't leave the hover zone between trigger and dropdown */}
                    <span className="pointer-events-none absolute left-0 right-0 top-full h-3 group-hover/demo:pointer-events-auto" />
                  </span>
                </span>
              </p>
              </div>
            </div>
          </div>

          {/* Workspace preview sits in normal flow below the sticky stage so it can never overlap the hero. */}
          <div className="relative z-20 pt-10">
            <div className="mx-auto max-w-2xl text-center mb-10">
              <h2 className="text-[24px] font-bold leading-snug tracking-tight sm:text-[32px]">
                One destination. Every step to get there.
              </h2>
              <p className="mx-auto mt-4 max-w-lg text-[16px] leading-relaxed text-muted-foreground sm:text-[17px]">
                Sylo finds the programs, deadlines, and sequence at your school —
                so you never have to figure out what comes next.
              </p>
            </div>
            <RoadmapWorkspacePreview />
          </div>

          {/* Wavy connector */}
          <div className="relative z-20 flex justify-center py-6">
            <div className="flex flex-col items-center">
              <WavyRouteLine height={144} duration={3.3} className="text-primary/60" />
              <WavyRouteLine height={144} duration={3.3} className="text-primary/60" />
            </div>
          </div>

          {/* Pin Drop micro-demo */}
          <div className="relative z-20">
            <div className="mx-auto max-w-xl text-center mb-8">
              <p className="text-[17px] leading-relaxed text-muted-foreground sm:text-lg">
                Drop a pin on anything you find.
              </p>
            </div>
            <PinDropDemo />
          </div>
        </section>

        <div
          ref={wavyTop.ref}
          className={cn(
            "flex justify-center pt-8 pb-2 transition-all duration-500 ease-out",
            wavyTop.inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4",
          )}
        >
          <div className="flex flex-col items-center">
            <WavyRouteLine height={144} duration={3.3} className="text-primary/60" />
            <WavyRouteLine height={144} duration={3.3} className="text-primary/60" />
          </div>
        </div>

        <section
          ref={cards.ref}
          className={cn(
            "py-4 sm:py-6 transition-all duration-500 ease-out delay-200",
            cards.inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6",
          )}
        >
          <div className="grid gap-4 sm:grid-cols-3">
            {/* 01 — Roadmap generation */}
            <div className="flex flex-col rounded-xl border bg-card p-5">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">01</p>
              <h2 className="mt-2.5 text-[17px] font-bold leading-snug tracking-tight">
                Your path, mapped in seconds.
              </h2>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
                Tell Sylo your goal, school, major, and year. It builds a sequenced plan ranked by leverage — modeled on the real paths that got other students there.
              </p>

              <div className="field-tonal mt-4 flex items-start gap-2.5 rounded-lg p-3">
                <span className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Map className="h-3 w-3" />
                </span>
                <div>
                  <span className="text-sm font-medium tracking-tight">{dashboardOp.name}</span>
                  <p className="mt-1 text-xs text-primary">→ {dashboardOp.unlocks?.[0] ?? dashboardOp.leverage}</p>
                </div>
              </div>
            </div>

            {/* 02 — Pin Drop */}
            <div className="flex flex-col rounded-xl border bg-card p-5">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">02</p>
              <h2 className="mt-2.5 text-[17px] font-bold leading-snug tracking-tight">
                Never lose a deadline again.
              </h2>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
                Screenshot a flyer or paste a link. Sylo reads it, sorts it by topic, and even checks if you're eligible — no more scattered screenshots.
              </p>

              <div className="field-tonal mt-4 rounded-lg p-3">
                <div className="flex items-start gap-2.5">
                  <span className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <MapPin className="h-3 w-3" />
                  </span>
                  <div>
                    <span className="text-sm font-medium tracking-tight">BISEP Fellowship · Due Nov 1</span>
                    <p className="mt-1 text-xs text-primary">✓ Sophomore standing · ✓ Research experience</p>
                  </div>
                </div>
              </div>
            </div>

            {/* 03 — Progress tracking */}
            <div className="flex flex-col rounded-xl border bg-card p-5">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">03</p>
              <h2 className="mt-2.5 text-[17px] font-bold leading-snug tracking-tight">
                Track it all in one place.
              </h2>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
                Drag steps between Not Started, In Progress, and Complete. Add notes, set deadlines, and see exactly where you stand.
              </p>

              <div className="field-tonal mt-4 rounded-lg p-3">
                <div className="flex items-center gap-3">
                  <div className="flex flex-col items-center gap-1">
                    <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/30" />
                    <span className="text-[9px] text-muted-foreground">3</span>
                  </div>
                  <div className="h-[2px] flex-1 rounded-full bg-border" />
                  <div className="flex flex-col items-center gap-1">
                    <span className="h-2.5 w-2.5 rounded-full bg-tag-blue-foreground/60 animate-pulse" />
                    <span className="text-[9px] text-muted-foreground">2</span>
                  </div>
                  <div className="h-[2px] flex-1 rounded-full bg-border" />
                  <div className="flex flex-col items-center gap-1">
                    <span className="h-2.5 w-2.5 rounded-full bg-tag-green-foreground/70" />
                    <span className="text-[9px] text-muted-foreground">4</span>
                  </div>
                </div>
                <p className="mt-2 text-center text-[11px] font-medium text-muted-foreground">4 of 9 steps complete</p>
              </div>
            </div>
          </div>
        </section>



        <div
          ref={wavyBottom.ref}
          className={cn(
            "flex justify-center py-2 transition-all duration-500 ease-out",
            wavyBottom.inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4",
          )}
        >
          <div className="flex flex-col items-center">
            <WavyRouteLine height={144} duration={3.3} className="text-primary/60" />
            <WavyRouteLine height={144} duration={3.3} className="text-primary/60" />
          </div>
        </div>

        <section
          ref={cta.ref}
          className={cn(
            "py-6 sm:py-8 transition-all duration-500 ease-out delay-200",
            cta.inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6",
          )}
        >
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-[28px] font-bold leading-[1.15] tracking-tight text-foreground sm:text-[38px]">
              A path you couldn&apos;t see.
            </h2>
            <p className="mt-3 text-[28px] font-bold tracking-tight text-primary sm:text-[38px]">Now one you can follow.</p>
            <p className="mx-auto mt-5 max-w-md text-base text-muted-foreground text-balance">
              No sign-up required. Real roadmaps in minutes.{" "}
              <Link to="/about" className="font-medium text-primary underline-offset-4 hover:underline">
                Learn more.
              </Link>
            </p>
            <div className="mt-8 pb-40">
              <Link
                to="/roadmap-builder"
                className="tap group inline-flex items-center justify-between gap-4 rounded-full bg-primary px-8 py-4 text-lg font-semibold text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/95 hover:shadow-xl hover:shadow-primary/25"
              >
                <span>Build my roadmap</span>
                <span className="flex h-10 w-10 items-center justify-center rounded-full border border-primary-foreground/30 transition-colors group-hover:bg-primary-foreground/10">
                  <ArrowRight className="h-5 w-5" />
                </span>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t px-6 py-6">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div className="flex items-center gap-2">
            <SyloMark className="h-4 w-4" animated={false} />
            <span className="text-xs font-medium tracking-tight text-muted-foreground">Sylo</span>
          </div>
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()}
          </p>
        </div>
      </footer>

    </div>
  );
}


