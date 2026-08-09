import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createAnthropicClient, hashKey } from "./anthropic.server";
import { TRACKS, type Opportunity, type OpportunitySource } from "./wayfind-data";

const Input = z.object({
  trackId: z.string(),
  goalText: z.string(),
  major: z.string(),
  year: z.string(),
  school: z.string(),
  sessionId: z.string().optional(),
});

const CATEGORIES = [
  "Research",
  "Internship",
  "Fellowship",
  "Club",
  "Funding",
  "Advising",
  "Course",
] as const;

const SourceSchema = z.object({ title: z.string(), url: z.string() });

const LiveOpportunitySchema = z.object({
  name: z.string(),
  category: z.enum(CATEGORIES),
  deadline: z.string(),
  timeframe: z.string(),
  requirements: z.array(z.string()),
  contact: z.string(),
  link: z.string(),
  timeline: z.string(),
  leverage: z.string(),
  reasoning: z.string(),
  sources: z.array(SourceSchema),
  courseCode: z.string().optional(),
  gapLabel: z.string().optional(),
  upstream: z.string().optional(),
  unlocks: z.array(z.string()).optional(),
  window: z.string().optional(),
});

const LiveResponseSchema = z.object({
  found: z.boolean(),
  summary: z.string(),
  opportunities: z.array(LiveOpportunitySchema),
  alternates: z.array(z.object({ title: z.string(), detail: z.string() })).optional(),
});

export type LiveRoadmap = {
  summary: string;
  topOpportunityId: string;
  steps: { opportunityId: string; reasoning: string }[];
  alternates: { title: string; detail: string }[];
  opportunities: Opportunity[];
};

// --- Rate limiting & caching ------------------------------------------------

const TIMEOUT_MS = 30_000;
const PER_SESSION_LIMIT = 6;
const GLOBAL_LIMIT = 120;
const RATE_WINDOW_MS = 60 * 60 * 1000;
const CACHE_TTL_MS = 3 * 24 * 60 * 60 * 1000;
const CACHE_MAX_ENTRIES = 200;

const cache = new Map<string, { at: number; value: LiveRoadmap }>();
const sessionHits = new Map<string, number[]>();
let globalHits: number[] = [];

function withinRateCap(sessionId: string | undefined): boolean {
  const now = Date.now();
  const fresh = (ts: number[]) => ts.filter((t) => now - t < RATE_WINDOW_MS);
  globalHits = fresh(globalHits);
  if (globalHits.length >= GLOBAL_LIMIT) return false;
  const key = sessionId || "anonymous";
  const hits = fresh(sessionHits.get(key) ?? []);
  if (hits.length >= PER_SESSION_LIMIT) { sessionHits.set(key, hits); return false; }
  hits.push(now);
  sessionHits.set(key, hits);
  globalHits.push(now);
  if (sessionHits.size > 500) {
    for (const [k, v] of sessionHits) { if (fresh(v).length === 0) sessionHits.delete(k); }
  }
  return true;
}

function cacheKeyFor(data: z.infer<typeof Input>) {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
  return hashKey([data.trackId, norm(data.goalText), norm(data.major), norm(data.year), norm(data.school)].join("|"));
}

function readCache(key: string): LiveRoadmap | null {
  const hit = cache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.at > CACHE_TTL_MS) { cache.delete(key); return null; }
  return hit.value;
}

function writeCache(key: string, value: LiveRoadmap) {
  if (cache.size >= CACHE_MAX_ENTRIES) {
    const oldest = [...cache.entries()].sort((a, b) => a[1].at - b[1].at)[0];
    if (oldest) cache.delete(oldest[0]);
  }
  cache.set(key, { at: Date.now(), value });
}

// --- Serper.dev Search API --------------------------------------------------

type SerperResult = { title: string; link: string; snippet: string };

async function searchSerper(query: string, apiKey: string, num = 10): Promise<SerperResult[]> {
  try {
    const res = await fetch("https://google.serper.dev/search", {
      method: "POST",
      headers: { "X-API-KEY": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({ q: query, num }),
    });
    if (!res.ok) { console.error(`[Serper] ${res.status}`); return []; }
    const data = await res.json() as { organic?: SerperResult[] };
    return data.organic ?? [];
  } catch (err) {
    console.error("[Serper] error:", err);
    return [];
  }
}

async function gatherSearchResults(data: z.infer<typeof Input>, serperKey: string): Promise<string> {
  const track = TRACKS.find((t) => t.id === data.trackId);
  const goal = data.goalText.trim() || (track && track.id !== "something-else" ? track.label : "") || "career opportunities";

  const queries = [
    `${data.school} ${goal} program opportunity ${data.year} student 2025 2026`,
    `${goal} internship fellowship for ${data.major} undergrad ${data.school}`,
    `${data.school} ${data.major} research club career program apply deadline`,
  ];

  const results = await Promise.all(queries.map((q) => searchSerper(q, serperKey, 8)));

  const seen = new Set<string>();
  const all: SerperResult[] = [];
  for (const batch of results) {
    for (const r of batch) {
      if (seen.has(r.link)) continue;
      seen.add(r.link);
      all.push(r);
    }
  }

  if (all.length === 0) return "";
  return all.map((r, i) => `[${i + 1}] "${r.title}"\n    URL: ${r.link}\n    Snippet: ${r.snippet}`).join("\n\n");
}

// --- Claude Haiku prompt ----------------------------------------------------

function buildSystemPrompt() {
  return [
    "You are Sylo's opportunity researcher. Given a student profile and Google search results, extract and structure real opportunities into strict JSON.",
    "",
    "RULES:",
    "1. ONLY use information from the provided search results. Never invent programs, links, or deadlines.",
    "2. The 'link' field MUST be a URL from the search results.",
    "3. The 'sources' array must contain URLs from the search results that mention this opportunity.",
    "4. Prefer programs specific to the student's school, year, and major.",
    "5. If search results don't have enough real opportunities, return found=false.",
    "6. Return 3-6 opportunities if available, ordered by leverage.",
    "",
    "reasoning: 1-2 sentences, plain second person.",
    "summary: 1-2 forward-framed sentences.",
    "deadline: ISO YYYY-MM-DD if found, otherwise empty string.",
    "category: exactly one of " + CATEGORIES.join(", ") + ".",
    "",
    "Chain reasoning fields (gapLabel, upstream, unlocks, window) ONLY on the first opportunity.",
    "",
    "Reply with ONE JSON object matching:",
    JSON.stringify({
      found: true, summary: "string",
      opportunities: [{ name: "string", category: "Research", deadline: "", timeframe: "string", requirements: ["string"], contact: "", link: "https://...", timeline: "string", leverage: "string", reasoning: "string", sources: [{ title: "string", url: "https://..." }], gapLabel: "optional", upstream: "optional", unlocks: ["optional"], window: "optional" }],
      alternates: [{ title: "string", detail: "string" }],
    }, null, 0),
  ].join("\n");
}

function buildUserPrompt(data: z.infer<typeof Input>, searchResults: string) {
  const track = TRACKS.find((t) => t.id === data.trackId);
  const destination = data.goalText.trim() || (track && track.id !== "something-else" ? track.label : "") || "not yet named";
  return [
    "STUDENT PROFILE:",
    `- Year: ${data.year}`,
    `- Major: ${data.major}`,
    `- School: ${data.school}`,
    `- Goal: ${destination}`,
    `- Today: ${new Date().toISOString().slice(0, 10)}`,
    "",
    "SEARCH RESULTS (your only source of fact):",
    "============================================",
    searchResults,
    "============================================",
    "",
    "Extract real opportunities from these results. Only include things the search results actually describe. Return strict JSON.",
  ].join("\n");
}

// --- Validation -------------------------------------------------------------

function safeUrl(raw: string): string | null {
  try { const u = new URL(raw.trim()); return (u.protocol === "http:" || u.protocol === "https:") ? u.toString() : null; } catch { return null; }
}

function hostOf(url: string): string | null {
  try { return new URL(url).hostname.replace(/^www\./, "").toLowerCase(); } catch { return null; }
}

function slug(name: string, i: number) {
  return `live-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "opportunity"}-${i}`;
}

const trim = (s: string, max: number) => s.trim().slice(0, max);

function clean(parsed: z.infer<typeof LiveResponseSchema>, data: z.infer<typeof Input>): LiveRoadmap | null {
  const track = TRACKS.find((t) => t.id === data.trackId) ?? TRACKS[0];
  const seenNames = new Set<string>();
  const opportunities: Opportunity[] = [];
  const steps: { opportunityId: string; reasoning: string }[] = [];

  for (const raw of parsed.opportunities) {
    const name = trim(raw.name, 120);
    const link = safeUrl(raw.link);
    if (!name || !link) continue;
    const nameKey = name.toLowerCase();
    if (seenNames.has(nameKey)) continue;

    const sources: OpportunitySource[] = [];
    const hosts = new Set<string>();
    for (const s of raw.sources) {
      const url = safeUrl(s.url);
      const host = url && hostOf(url);
      if (!url || !host || hosts.has(host)) continue;
      hosts.add(host);
      sources.push({ title: trim(s.title, 120) || host, url });
      if (sources.length === 3) break;
    }
    if (sources.length === 0) continue;

    const isHero = opportunities.length === 0;
    const unlocks = isHero ? (raw.unlocks ?? []).map((u) => trim(u, 90)).filter(Boolean).slice(0, 4) : [];
    seenNames.add(nameKey);
    const id = slug(name, opportunities.length);

    opportunities.push({
      id, name, track: track.id, category: raw.category, access: "direct", school: data.school,
      deadline: /^\d{4}-\d{2}-\d{2}$/.test(raw.deadline.trim()) ? raw.deadline.trim() : "",
      timeframe: trim(raw.timeframe, 80) || "Timing not confirmed",
      requirements: raw.requirements.map((r) => trim(r, 90)).filter(Boolean).slice(0, 6),
      contact: trim(raw.contact, 120), link,
      timeline: trim(raw.timeline, 240), leverage: trim(raw.leverage, 280),
      courseCode: raw.courseCode ? trim(raw.courseCode, 20) : undefined,
      gapLabel: isHero && raw.gapLabel ? trim(raw.gapLabel, 120) : undefined,
      upstream: isHero && raw.upstream ? trim(raw.upstream, 200) : undefined,
      unlocks: unlocks.length ? unlocks : undefined,
      window: isHero && raw.window ? trim(raw.window, 240) : undefined,
      origin: "live", sources, singleSourced: sources.length < 2,
    });
    steps.push({ opportunityId: id, reasoning: trim(raw.reasoning, 280) || trim(raw.leverage, 280) });
  }

  if (opportunities.length === 0) return null;
  return {
    summary: trim(parsed.summary, 400) || `You're a ${data.year} ${data.major} major at ${data.school}. Everything below was found by search just now.`,
    topOpportunityId: opportunities[0].id,
    steps,
    alternates: (parsed.alternates ?? []).map((a) => ({ title: trim(a.title, 120), detail: trim(a.detail, 280) })).filter((a) => a.title && a.detail).slice(0, 2),
    opportunities,
  };
}

function extractJson(text: string): unknown | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidates = [fenced?.[1], text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1)];
  for (const c of candidates) { if (!c) continue; try { return JSON.parse(c); } catch { /* next */ } }
  return null;
}

// --- Fallback: structure raw search results without an LLM ------------------

function fallbackFromSearchResults(
  rawResults: SerperResult[],
  data: z.infer<typeof Input>,
): LiveRoadmap | null {
  const track = TRACKS.find((t) => t.id === data.trackId) ?? TRACKS[0];
  const goal = data.goalText.trim() || "your goal";

  // Filter to results that look like real programs/opportunities (not generic info pages)
  const dominated = new Set(["wikipedia.org", "bls.gov", "indeed.com", "glassdoor.com", "linkedin.com"]);
  const relevant = rawResults.filter((r) => {
    const host = hostOf(r.link);
    if (!host || dominated.has(host)) return false;
    return true;
  }).slice(0, 6);

  if (relevant.length < 2) return null;

  const opportunities: Opportunity[] = [];
  const steps: { opportunityId: string; reasoning: string }[] = [];

  for (const r of relevant) {
    const link = safeUrl(r.link);
    if (!link) continue;
    const host = hostOf(link);
    const name = r.title.replace(/\s*[\|–—\-]\s*[^|–—\-]*$/, "").trim().slice(0, 120) || r.title.slice(0, 120);
    const id = slug(name, opportunities.length);

    opportunities.push({
      id,
      name,
      track: track.id,
      category: "Research",
      access: "direct",
      school: data.school,
      deadline: "",
      timeframe: "Check link for current dates",
      requirements: [],
      contact: "",
      link,
      timeline: r.snippet.slice(0, 240),
      leverage: `Found via search for "${goal}" at ${data.school}. Open the link to check eligibility and deadlines.`,
      origin: "live",
      sources: [{ title: host || r.title.slice(0, 60), url: link }],
      singleSourced: true,
    });
    steps.push({
      opportunityId: id,
      reasoning: r.snippet.slice(0, 280) || `Relevant result for ${goal} at ${data.school}.`,
    });
  }

  if (opportunities.length === 0) return null;

  return {
    summary: `You're a ${data.year} ${data.major} major at ${data.school}. Sylo searched for "${goal}" and found these leads. Open each link to verify details — dates and eligibility may have changed.`,
    topOpportunityId: opportunities[0].id,
    steps,
    alternates: [],
    opportunities,
  };
}

// --- Serper raw results (needed for fallback) --------------------------------

async function gatherSearchResultsRaw(data: z.infer<typeof Input>, serperKey: string): Promise<SerperResult[]> {
  const track = TRACKS.find((t) => t.id === data.trackId);
  const goal = data.goalText.trim() || (track && track.id !== "something-else" ? track.label : "") || "career opportunities";

  const queries = [
    `${data.school} ${goal} program opportunity ${data.year} student 2025 2026`,
    `${goal} internship fellowship for ${data.major} undergrad ${data.school}`,
    `${data.school} ${data.major} research club career program apply deadline`,
  ];

  const results = await Promise.all(queries.map((q) => searchSerper(q, serperKey, 8)));

  const seen = new Set<string>();
  const all: SerperResult[] = [];
  for (const batch of results) {
    for (const r of batch) {
      if (seen.has(r.link)) continue;
      seen.add(r.link);
      all.push(r);
    }
  }
  return all;
}

// --- Server function --------------------------------------------------------

export const generateLiveRoadmap = createServerFn({ method: "POST" })
  .validator((input: unknown) => Input.parse(input))
  .handler(async ({ data }): Promise<LiveRoadmap | null> => {
    // Load .env for local dev (handler runs server-side only)
    try { const { config } = await import("dotenv"); config(); } catch { /* no-op in production */ }

    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    const serperKey = process.env.SERPER_API_KEY;

    if (!serperKey) { console.error("[LIVE-ROADMAP] no SERPER_API_KEY"); return null; }

    const cacheKey = cacheKeyFor(data);
    const cached = readCache(cacheKey);
    if (cached) return cached;

    if (!withinRateCap(data.sessionId)) { console.error("[LIVE-ROADMAP] rate cap hit"); return null; }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      // Step 1: Search with Serper
      console.error("[LIVE-ROADMAP] searching...", { school: data.school, goal: data.goalText || data.trackId });
      const rawResults = await gatherSearchResultsRaw(data, serperKey);
      if (rawResults.length === 0) { console.error("[LIVE-ROADMAP] no search results"); return null; }

      const searchResults = rawResults.map((r, i) => `[${i + 1}] "${r.title}"\n    URL: ${r.link}\n    Snippet: ${r.snippet}`).join("\n\n");
      console.error("[LIVE-ROADMAP] got results, sending to Haiku...");

      // Step 2: Try Claude to structure the results (cheap + fast)
      let result: LiveRoadmap | null = null;

      if (anthropicKey) {
        try {
          const client = createAnthropicClient(anthropicKey);
          const response = await client.messages.create(
            {
              model: "claude-haiku-4-5-20251001",
              max_tokens: 3000,
              system: buildSystemPrompt(),
              messages: [{ role: "user", content: buildUserPrompt(data, searchResults) }],
            },
            { signal: controller.signal },
          );

          const text = response.content
            .filter((b) => b.type === "text")
            .map((b) => (b as { type: "text"; text: string }).text)
            .join("\n");

          const json = extractJson(text);
          if (json) {
            const parsed = LiveResponseSchema.safeParse(json);
            if (parsed.success && parsed.data.found) {
              result = clean(parsed.data, data);
            } else {
              console.error("[LIVE-ROADMAP]", parsed.success ? "found:false" : "schema error");
            }
          } else {
            console.error("[LIVE-ROADMAP] couldn't parse JSON from Haiku");
          }
        } catch (llmErr) {
          console.error("[LIVE-ROADMAP] LLM failed, falling back to raw results:", llmErr instanceof Error ? llmErr.message : llmErr);
        }
      } else {
        console.error("[LIVE-ROADMAP] no ANTHROPIC_API_KEY, using raw results fallback");
      }

      // Step 3: If LLM failed or wasn't available, structure results directly
      if (!result) {
        console.error("[LIVE-ROADMAP] using search-results fallback");
        result = fallbackFromSearchResults(rawResults, data);
      }

      if (result) {
        console.error("[LIVE-ROADMAP] success!", { opportunities: result.opportunities.length });
        writeCache(cacheKey, result);
      }
      return result;
    } catch (err) {
      console.error("[LIVE-ROADMAP] error:", err instanceof Error ? err.message : err);
      return null;
    } finally {
      clearTimeout(timer);
    }
  });
