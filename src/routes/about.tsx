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

      {/* Hook */}
      <section className="mt-8">
        <h2 className="text-lg font-semibold tracking-tight">Everyone knows what matters. Nobody knows the steps.</h2>
        <div className="mt-3 space-y-3 text-sm leading-relaxed text-muted-foreground">
          <p>
            Everyone knows internships matter. Everyone knows networking matters. But what does that
            actually look like in practice? You&apos;re told to &ldquo;put yourself out there&rdquo; — so you
            mass-message hundreds of people on LinkedIn, show up to career fairs, and hope someone responds.
            And even when someone does — how do you build the experience that makes you worth referring,
            when you don&apos;t know which experiences actually matter for where you&apos;re trying to go?
          </p>
          <p>
            You see someone post that they&apos;re starting at Goldman Sachs, and in the comments:
            &ldquo;how&apos;d you get this?&rdquo; The answer is almost never &ldquo;I applied online.&rdquo;
            It&apos;s a pipeline program most students have never heard of — an insight series, a bridge
            program, a sophomore summit — that quietly fed them into recruiting a year before applications
            even opened. The information is technically online — tucked away on a corporate careers page,
            buried in a PDF, or posted once on LinkedIn where you&apos;d have to be lucky enough to
            scroll past it at the right time. It&apos;s rarely broadcast. Career fairs exist, but
            you&apos;re one of hundreds. Cold outreach exists, but you&apos;re one of thousands. The
            students who actually find these programs? Someone told them directly. A mentor, a parent
            in the industry, an older friend who&apos;d already been through it.
          </p>
          <p>
            Career platforms tell students what&apos;s out there. Academic systems tell students what&apos;s
            required. Career centers say &ldquo;go network&rdquo; and &ldquo;build your brand.&rdquo; Nobody
            connects the three into a concrete sequence for one student at one school. And higher education
            runs on a chain reaction — miss one early step and you break the eligibility chain for the
            fellowship, the lab, the internship that depended on it. Your timeline doesn&apos;t slip by a
            semester. It slips by a year.
          </p>
          <p className="font-medium text-foreground">
            The path exists. The programs exist. Most students just never see the map.
          </p>
        </div>
      </section>

      {/* Real story */}
      <section className="mt-8 rounded-2xl border border-primary/15 bg-primary/5 p-5 sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-primary/80">Real story</p>
        <p className="mt-3 text-sm leading-relaxed text-foreground">
          <a
            href="https://www.wallstreetoasis.com/forum/investment-banking/advice-for-college-senior-w-no-internship-experience"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            One student shared their experience online
          </a>
          : they knew they wanted finance by sophomore year. 3.8 GPA. Financial modeling skills. Trading
          since high school. They did everything they thought mattered — coursework, technical skills, even
          networking. But the actual entry point (a sophomore insight program that feeds directly into summer
          analyst recruiting) opened and closed without them knowing it existed.
        </p>
        <p className="mt-3 text-sm leading-relaxed text-foreground">
          By senior year: the skills, the grades, the interest. But no pipeline, no internship, no way in.
        </p>
        <p className="mt-3 text-sm font-medium leading-relaxed text-foreground">
          They didn&apos;t fail because they weren&apos;t good enough. They failed because nobody showed
          them what to actually do next.
        </p>
      </section>

      {/* What Sylo is */}
      <section className="mt-8">
        <h2 className="text-lg font-semibold tracking-tight">Sylo is the map.</h2>
        <div className="mt-3 space-y-3 text-sm leading-relaxed text-muted-foreground">
          <p>
            A student tells Sylo where they want to end up. Sylo gives them one ranked next move — tied to
            their real major, year, and school. Not a list to scroll. Not &ldquo;network more.&rdquo; One
            step, one deadline, one reason why it matters right now.
          </p>
          <p>
            Under the hood: 125+ verified pipeline programs — fellowships, insight days, diversity cohorts,
            research funding — filtered to what&apos;s open to that student right now, sequenced by leverage
            and deadline, with direct links to the actual application page.
          </p>
          <p>
            And when a student spots an opportunity on their own — a flyer, an Instagram post, an email from
            a professor — they can drop a pin on it. Sylo reads the screenshot or link, extracts the title,
            deadline, and requirements, checks whether the student is eligible based on their profile, and
            lets them add it straight to their roadmap. Everything flows into one progress board where they
            drag steps from Not Started to Complete.
          </p>
          <p className="font-medium text-foreground">
            It&apos;s the kind of clarity that used to require knowing the right person — delivered to every
            student, at every school, the moment they pick a destination.
          </p>
        </div>
      </section>

      {/* What makes it different */}
      <section className="mt-8">
        <h2 className="text-lg font-semibold tracking-tight">What makes it different.</h2>
        <div className="mt-3 space-y-3 text-sm leading-relaxed text-muted-foreground">
          <p>
            Handshake, Ripplematch, and LinkedIn serve students who are ready to apply. Sylo serves
            students a year before that — when the pipeline programs, insight days, and research
            fellowships that feed into recruiting are still open. Those platforms are the last step.
            Sylo is steps one through five.
          </p>
          <p>
            Not a resume optimizer — that assumes you already know what to put on it. Not an internship
            board — that assumes you already know what to search for. Not ChatGPT — that answers questions
            you already know to ask, with no idea what your school actually offers or what depends on what.
          </p>
          <p>
            And the checklist you see after? That&apos;s the output format, not the product. The hard part
            isn&apos;t checking boxes — it&apos;s knowing which boxes should exist. A student can&apos;t add
            &ldquo;apply to the Goldman Sachs Possibilities Summit by October 15&rdquo; to a to-do list if
            they&apos;ve never heard of it. Sylo computes the route. The checklist is just how it shows you.
          </p>
          <p>
            Sylo reasons over a student&apos;s real progress, real school, and real opportunities — the same
            kind of structured academic data that planning systems already manage — and turns it into: here&apos;s
            what to do next, here&apos;s why, and here&apos;s the deadline.
          </p>
        </div>
      </section>

      {/* Where this fits */}
      <section className="mt-8">
        <h2 className="text-lg font-semibold tracking-tight">Where this fits.</h2>
        <div className="mt-3 space-y-3 text-sm leading-relaxed text-muted-foreground">
          <p>
            Degree planning tools already brought structure to academic requirements — mapping what you
            need to graduate into a clear, sequenced path. Sylo extends that same approach into what
            comes after: the career pipeline that follows the degree.
          </p>
          <p>
            The foundation is the same: structured data about a specific student at a specific institution,
            turned into a concrete plan. The difference is that instead of mapping courses to graduation,
            Sylo maps opportunities to outcomes — using the same academic context (major, year, school,
            progress) as the starting point.
          </p>
          <p className="font-medium text-foreground">
            If degree planning is the map to graduation, Sylo is the map from graduation to career — and
            it starts the moment a student picks a destination, not the semester before they leave.
          </p>
        </div>
      </section>

      {/* Closing */}
      <section className="mt-8 rounded-2xl border bg-card p-5 sm:p-6">
        <div className="flex items-center gap-3">
          <SyloMark className="h-6 w-6" animated />
          <p className="text-lg font-semibold tracking-tight">
            Sylo gives that map to every student, from the moment they pick a destination.
          </p>
        </div>
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
