# Sylo — The map from degree to career

Sylo turns a career destination into a sequenced dependency graph of real opportunities at your school. Not a list — a graph where each step declares what it builds on, what it opens, and when its window closes.

## Live Demo

[sylo.lovable.app](https://sylo.lovable.app)

## What it does

A student selects where they want to end up. Sylo reads their major, year, and school, then builds a personalized roadmap: a topological sort of opportunities weighted by deadline urgency and downstream leverage.

- **125+ curated programs** with verified deadlines, eligibility, and dependency chains
- **AI-powered live search** for goals without curated data (Claude + Serper)
- **Gap analysis** identifying what's missing and connecting it to the next action
- **Dependency-aware sequencing** — every step shows what it builds on and what it opens

## Tech Stack

- **Framework:** TanStack Start (React + SSR)
- **Routing:** TanStack Router (file-based)
- **AI:** Anthropic Claude (Haiku 4.5) for roadmap generation + link extraction
- **Search:** Serper.dev (Google Search API)
- **Styling:** Tailwind CSS + Radix UI primitives
- **Deployment:** Cloudflare Workers (via Nitro)
- **State:** React Context + localStorage persistence

## Running Locally

```bash
npm install
cp .env.example .env  # Add your ANTHROPIC_API_KEY and SERPER_API_KEY
npm run dev
```

## Project Structure

```
src/
├── routes/          # Pages (TanStack Router file-based routing)
├── components/      # UI components
├── lib/
│   ├── wayfind-data.ts              # Curated opportunity database (static)
│   ├── opportunities-db.json        # Extended curated programs
│   ├── generateLiveRoadmap.functions.ts  # AI roadmap generation (server)
│   ├── extractOpportunity.functions.ts   # Link extraction (server)
│   ├── parseResume.functions.ts          # Resume parsing (server)
│   └── wayfind-store.tsx            # Global state (React Context)
```
