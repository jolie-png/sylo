# Sylo — The map from degree to career

**Category:** College to Career

## The Problem

A student posts on LinkedIn about starting at Goldman Sachs. In the comments: "How'd you get this?" The answer is never "I applied online." It's a pipeline program most students have never heard of — a sophomore summit, an insight series — that quietly fed them into recruiting a year before applications opened.

The information exists: on corporate career pages, buried in PDFs, posted once on Reddit. The students who find these programs? Someone told them — a mentor, a parent in the field. Miss one early step and you break the eligibility chain for the fellowship, the lab, or the internship that depended on it. Your timeline slips by a year.

Career platforms tell students what is out there. Academic systems tell students what is required. Nobody connects the two into a concrete sequence for one student at one school — and nobody tells a student which steps depend on which.

## What We Built

Sylo turns a career destination into a sequenced dependency graph of real opportunities at your school. Not a list. A graph — where each step declares what it requires upstream, what it unlocks downstream, and when its window closes.

A student selects where they want to end up — physician-scientist, investment banker, software engineer, or any goal in their own words. Sylo reads their major, year, and school, then builds a personalized roadmap: a topological sort of the opportunities available to them, weighted by deadline urgency and downstream leverage.

**The core insight:** career opportunities are not independent items to browse — they form prerequisite chains. A PURA research award requires a faculty mentor. That mentor comes from joining a lab through UROC. GRIP (government research) requires active research, which PURA provides. Move one step and the chain breaks. Sylo models these dependencies explicitly and surfaces them to the student.

### How the sequencing works

Each opportunity in Sylo's database carries three dependency fields:

- **Upstream:** What this step requires before it can be taken (e.g., "Faculty mentor identified" or "Completed Startup Lab")
- **Unlocks:** What this step makes possible — chained forward at least two steps (e.g., "Research Option credit → GRIP eligibility → Security clearance pipeline")
- **Window:** The hard time constraint that makes ordering matter (e.g., "Sept 15 — one shot per semester")

The roadmap is a topological sort of this graph, filtered to what a specific student qualifies for right now. When a student reorders steps, Sylo warns if the new order breaks a dependency: *"CREATE-X Launch requires CREATE-X Startup Lab — moving it above may break the sequence."*

This is what separates Sylo from a career directory. A directory shows you Goldman Possibilities and SEO Career on the same page. Sylo shows you Goldman Possibilities *first* because its October deadline closes before SEO's November window — and because attending Goldman's insight program makes your SEO application stronger (firm exposure + demonstrated interest). The ordering is computed, not alphabetical.

### Three layers

- **Curated dependency graph:** 125+ verified programs — fellowships, insight days, diversity cohorts, research pipelines — each with upstream requirements, downstream unlocks, deadlines, eligibility, and direct links. Filtered to what is open to that student right now.
- **Live search + AI structuring:** For goals without curated data, Sylo searches the web, then uses Claude to structure results into verified steps with inferred dependency relationships. Only opportunities confirmed from an independent page make the roadmap.
- **Gap analysis:** Sylo identifies what is missing between where a student is and their goal, names the specific gap, and connects it to the next step that resolves it.

The result is a living board: drag-and-drop steps with dependency-aware reordering, status tracking, personal notes, custom goals, and a Long View showing what each future year demands. Zero sign-up. Runs on Cloudflare's edge.

## Who It's For

- The CS freshman who does not know Google STEP applications open twelve months before the internship starts — and that Microsoft Explore closes the same week.
- The pre-med sophomore who needs a faculty mentor before they can qualify for any research fellowship — and doesn't know that MCDB office hours are the on-ramp to URFP, which unlocks HHMI Pathways.
- The first-generation finance student who missed the one sophomore insight program that feeds into junior analyst recruiting — because nobody told her Goldman Possibilities in October is the prerequisite for the sophomore internship pipeline.

## Where This Goes

Degree planning already solved this problem for academics — it models course prerequisites as a directed graph and tells you what to take and when. Sylo applies the same structure to career opportunities: same student, same school, same data — just pointed at career outcomes instead of graduation requirements.

Next: expand the dependency graph school by school, surface Sylo inside advising workflows, and give career centers a dashboard showing which students are on track and which are about to miss a window in their prerequisite chain.

Sylo is the invisible advisor every well-connected student already has — now available to every student, at every school, the moment they pick a direction.
