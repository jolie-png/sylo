import { createFileRoute, Link } from "@tanstack/react-router";
import { Info, ArrowRight } from "lucide-react";
import { Workspace, PageHeader } from "@/components/workspace";
import { SyloMark } from "@/components/SyloMark";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "Why Sylo Exists" },
      { name: "description", content: "The missing intelligence layer between a student's degree plan and their future opportunities." },
      { property: "og:title", content: "Why Sylo Exists" },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <Workspace wide>
      <PageHeader
        icon={<Info className="h-5 w-5" />}
        title="Why Sylo exists"
        subtitle="The missing layer between what you're studying and where you're headed."
      />

      {/* The problem */}
      <section className="mt-8">
        <h2 className="text-lg font-semibold tracking-tight">Nobody connects the dominoes.</h2>
        <div className="mt-3 space-y-3 text-sm leading-relaxed text-muted-foreground">
          <p>
            Career platforms tell students what&apos;s out there. Academic systems tell students what&apos;s required.
            Nobody connects the two to a specific student&apos;s actual situation — and that&apos;s the real gap.
            Not a missing database. A missing connection.
          </p>
          <p>
            Higher education runs on a domino effect. Skip one foundational course, and you don&apos;t just delay
            a class — you break the eligibility chain for the fellowship, the lab placement, the internship
            that depended on it. Miss the course, and your timeline doesn&apos;t slip by a semester. It slips by a year.
          </p>
        </div>
      </section>

      {/* The example */}
      <section className="mt-8 rounded-2xl border border-primary/15 bg-primary/5 p-5 sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-primary/80">Example</p>
        <p className="mt-3 text-sm leading-relaxed text-foreground">
          Maya is a first-generation biology major who wants to become a physician-scientist. Postponing
          a single fall research methods course doesn&apos;t just delay a requirement — it breaks the eligibility
          chain for the faculty mentor she needs by October, which breaks the recommendation letter she needs
          in November, which breaks the fellowship application due in January.
        </p>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Sylo shows her that chain before she registers, not after she&apos;s missed it: take Research Methods
          this fall, because it&apos;s the exact domino that unlocks everything after it.
        </p>
      </section>

      {/* What Sylo is */}
      <section className="mt-8">
        <h2 className="text-lg font-semibold tracking-tight">What Sylo is.</h2>
        <div className="mt-3 space-y-3 text-sm leading-relaxed text-muted-foreground">
          <p>
            <span className="font-medium text-foreground">Sylo is the missing intelligence layer between a student&apos;s
            degree plan and their future opportunities.</span> A student tells Sylo where they want to end up.
            Sylo maps the single next highest-leverage move — tied to their real major, year, and school.
          </p>
          <p>
            Not a resume optimizer. Not an internship board. Those tools assume a student already knows the
            destination and just needs help polishing the application or filtering a list. The actual gap sits
            earlier: knowing which door to walk toward, and that this semester&apos;s course registration is
            already the first domino in that chain.
          </p>
        </div>
      </section>

      {/* What Sylo isn't */}
      <section className="mt-8">
        <h2 className="text-lg font-semibold tracking-tight">What Sylo isn&apos;t.</h2>
        <div className="mt-3 space-y-3 text-sm leading-relaxed text-muted-foreground">
          <p>
            Opening ChatGPT isn&apos;t the same thing. A general model answers questions a student already knows
            to ask, and it has no idea what a specific school actually offers or what depends on what. Sylo
            doesn&apos;t wait to be asked — it reasons over a verified dataset of real opportunities and each
            student&apos;s real progress.
          </p>
          <p>
            And it&apos;s not a generic career quiz. Sylo doesn&apos;t tell students what they should want.
            It takes the destination they already have and shows them the fastest, most honest path from here to there.
          </p>
        </div>
      </section>

      {/* Opportunity translation */}
      <section className="mt-8">
        <h2 className="text-lg font-semibold tracking-tight">Opportunity translation.</h2>
        <div className="mt-3 space-y-3 text-sm leading-relaxed text-muted-foreground">
          <p>
            When Sylo notices a student&apos;s school has no formal pipeline for a competitive opportunity,
            it doesn&apos;t leave them stuck — it surfaces the real equivalent already sitting inside their own
            university, built on the same ingredients the brand-name program actually looks for.
          </p>
          <p>
            That only works because Sylo is reasoning over a student&apos;s actual academic record and actual school,
            not generic advice.
          </p>
        </div>
      </section>

      {/* The invisible advisor */}
      <section className="mt-8 rounded-2xl border bg-card p-5 sm:p-6">
        <div className="flex items-center gap-3">
          <SyloMark className="h-6 w-6" animated />
          <h2 className="text-lg font-semibold tracking-tight">The invisible advisor.</h2>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Every connected student already has one — a parent, an older friend, a mentor, or just the right
          feed of LinkedIn posts — quietly telling them what to do next, and quietly telling them which
          dominoes matter.
        </p>
        <p className="mt-3 text-sm font-medium leading-relaxed text-foreground">
          Sylo gives that advisor to every student, at every decision point, from the moment they open a
          course catalog.
        </p>
      </section>

      {/* CTA */}
      <div className="mt-10 text-center">
        <Link
          to="/roadmap-builder"
          className="tap group inline-flex items-center justify-between gap-4 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/95"
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
