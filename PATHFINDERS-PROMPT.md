# Prompt: Write the Stellic Pathfinders 500-Word Writeup

You are writing a 500-word competition submission for the Stellic Pathfinders Challenge 2026. This writeup must be perfect — it will be judged by Stellic leadership (a degree-planning SaaS company) alongside a 2-minute demo video and a live app link.

---

## Competition Context

**Stellic** is a degree-planning platform used by universities like NYU, Johns Hopkins, and Indiana University. They founded the Pathfinders Challenge to find student-built tools that improve the college experience.

**Category:** College to Career (Category 04) — "Bridge the gap between graduation and what comes next."

**Submission requirements:** Title, category, 500-word write-up, 2-min demo video, live URL, tool list.

**Judging criteria (weighted equally):**
1. Does it solve a real student problem?
2. Is it original?
3. How much could it help students if it scaled?
4. The design and experience
5. How well it's built

**Format required:** The writeup must cover: what you built, the problem, and who it's for.

---

## The Product: Sylo

Sylo turns a career destination into one ranked next move, grounded in real opportunities at your school. A student picks where they want to end up (physician-scientist, software engineer, investment banker, or any custom goal), enters their major/year/school, and gets a personalized roadmap — not a generic list.

### Core capabilities:
- **Curated opportunity database:** 125+ verified programs (fellowships, insight days, diversity cohorts, research pipelines, funding) with real deadlines, eligibility, contacts, and direct links. Filtered by school, year, and track.
- **Live search + AI structuring:** For schools/goals without curated data, Sylo searches the web via Serper, then uses Claude Haiku to structure results into verified steps with cited sources. Only results confirmed from an independent page appear.
- **Gap analysis:** When students share background context (skills, clubs, prior work), Sylo identifies what's specifically missing between where they are and their goal, names each gap, and connects it to the next concrete action.
- **Living board:** Drag-reorderable steps, status tracking (Not Started / In Progress / Complete), personal notes on each step, custom goals, and a multi-year "Long View" showing what each future year demands.
- **Ask Sylo chat:** Built-in search that queries the curated database first (free, instant), then falls back to web search. Students can add results directly to their roadmap.
- **Instant demos:** Two pre-loaded personas (Maya: CS Freshman at Georgia Tech; Alex: Biology Sophomore at UCLA) with real school-specific programs, gap analyses, and roadmaps. Zero-friction entry for judges.

### Tech stack:
React, TanStack Start (full-stack framework), TypeScript, Tailwind CSS, dnd-kit (drag-and-drop), Radix UI, Gemini Flash (seed roadmap generation), Claude Haiku (live search structuring), Serper.dev (web search), Reddit JSON API (community posts). No sign-up required. Deploys to edge via Cloudflare.

---

## The Problem (emotional core)

The real insight: students don't fail because they lack ambition or ability. They fail because nobody showed them the *sequence*. The specific entry point — a sophomore summit, an insight program, an early-ID deadline — that feeds into the recruiting pipeline a full year before applications open. The information exists online but is never broadcast. The students who find it had someone tell them directly. Everyone else misses the window and their timeline slips by a year, not a semester.

The structural gap: career platforms list opportunities, academic systems list requirements, career centers say "go network." Nobody connects all three into a concrete sequence for one specific student at one specific school. That's what Sylo does.

---

## Who it's for

First-gen students, students without industry mentors, anyone who picked a direction but doesn't have the "invisible advisor" that well-connected students get from family or alumni networks. Specific examples: the CS freshman who doesn't know STEP applications open 12 months early; the pre-med sophomore who needs a faculty mentor before they can apply to anything; the finance student who missed the one sophomore insight program that feeds into summer analyst recruiting.

---

## Writing Constraints

- Exactly 500 words (±5). Count carefully.
- Three sections: The Problem, What We Built, Who It's For.
- The Problem section should lead with a hook — a specific, vivid scenario that judges can picture. Then widen to the systemic issue. Do NOT start with "we noticed" or "our team wanted to."
- What We Built should be concrete and specific. Name the number of programs in the database. Name what the AI does. Name the interaction model. Include one sentence about the tech to satisfy the "how well it's built" criterion.
- Who It's For should name 3 specific student archetypes. End with the positioning line.
- Tone: direct, confident, plainspoken. No buzzwords. No "leverage AI to empower." Write like you're explaining to a smart friend who doesn't know tech jargon.
- The connection to Stellic's existing product (degree planning) should be implicit — Sylo extends the same structured-data approach from "map courses to graduation" into "map opportunities to career." Don't say this explicitly. Let judges make the connection themselves.
- Do NOT include: team bios, what you learned, challenges you faced, future plans, or anything that sounds like a development journal. This is a product pitch, not a retrospective.

---

## Output

Return only the final 500-word writeup in markdown. Include a title and category line at the top. Use ## headers for the three sections. No preamble, no explanation, no word count annotation.
