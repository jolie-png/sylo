import { createServerFn } from "@tanstack/react-start";
import type Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { createAnthropicClient, hashKey } from "./anthropic.server";
import { TRACKS, type Opportunity, type OpportunitySource } from "./wayfind-data";

const Input = z.object({
  trackId: z.string(),
  goalText: z.string(),
  major: z.string(),
  year: z.string(),
  school: z.string(),
  /** Opaque client-held id. Used only to key the server-side rate cap. */
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

/**
 * Superset of `GeneratedRoadmap`: the same summary/steps/alternates shape the
 * dashboard already consumes, plus the live `Opportunity` rows themselves,
 * which the client stores so lookups resolve (they are not in the seed data).
 */
export type LiveRoadmap = {
  summary: string;
  topOpportunityId: string;
  steps: { opportunityId: string; reasoning: string }[];
  alternates: { title: string; detail: string }[];
  opportunities: Opportunity[];
};

// --- Reliability guardrails -------------------------------------------------

/** Corroboration means several search-and-verify round trips, so this is long. */
const TIMEOUT_MS = Number(process.env.LIVE_SEARCH_TIMEOUT_MS ?? 35_000);
/** Live generations one visitor may trigger per rolling hour before falling back. */
const PER_SESSION_LIMIT = 4;
/** Live generations this server process may make per rolling hour, across everyone. */
const GLOBAL_LIMIT = 60;
const RATE_WINDOW_MS = 60 * 60 * 1000;
/** A few days is plenty for a competition demo. */
const CACHE_TTL_MS = 3 * 24 * 60 * 60 * 1000;
const CACHE_MAX_ENTRIES = 200;
/** Bound on `pause_turn` resumes so a runaway search loop can't outlive the deadline. */
const MAX_RESUMES = 3;

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
  if (hits.length >= PER_SESSION_LIMIT) {
    sessionHits.set(key, hits);
    return false;
  }

  hits.push(now);
  sessionHits.set(key, hits);
  globalHits.push(now);

  // Keep the session map from growing without bound on a long-lived process.
  if (sessionHits.size > 500) {
    for (const [k, v] of sessionHits) {
      if (fresh(v).length === 0) sessionHits.delete(k);
    }
  }
  return true;
}

/** Normalised so "very similar" profiles share one cache entry. */
function cacheKeyFor(data: z.infer<typeof Input>) {
  const norm = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  return hashKey(
    [data.trackId, norm(data.goalText), norm(data.major), norm(data.year), norm(data.school)].join(
      "|",
    ),
  );
}

function readCache(key: string): LiveRoadmap | null {
  const hit = cache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.at > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return hit.value;
}

function writeCache(key: string, value: LiveRoadmap) {
  if (cache.size >= CACHE_MAX_ENTRIES) {
    const oldest = [...cache.entries()].sort((a, b) => a[1].at - b[1].at)[0];
    if (oldest) cache.delete(oldest[0]);
  }
  cache.set(key, { at: Date.now(), value });
}

// --- Prompting --------------------------------------------------------------

const SYSTEM = [
  "You are Sylo's live opportunity researcher. You find real, currently-existing opportunities, programs, courses, and next steps for one specific undergraduate, and you return them as strict JSON.",
  "",
  "SEARCH, THEN VERIFY. This is a multi-search job, never a single search:",
  "1. Search first on the student's actual goal, major, year, and school.",
  "2. For every candidate you intend to return, run at least one MORE search specifically to confirm it still exists and that the details you found (deadline, contact, requirements) are consistent across sources.",
  "3. Corroborate each opportunity from at least two INDEPENDENT sources — different domains, surfaced by different searches. Two results from one search, or two pages on one domain, are one source, not two.",
  "4. If sources disagree on a detail, take the more authoritative or more recently published one — the program's own site over a third-party aggregator. Never average or guess between conflicting numbers.",
  "5. If after a genuine follow-up search an opportunity can only be confirmed from a single source, still return it, but list only that one source. Do not pad the sources array to look better corroborated than it is.",
  "",
  "NEVER invent a program, link, contact, deadline, requirement, or source URL you did not actually find in search results. Every sources[].url and every link must be a URL that appeared in your results. If you could not find a contact, use an empty string — do not guess an email address.",
  "",
  "Prefer fewer real results to more padded ones. If you can only confirm two opportunities, return two. If you cannot find anything real for this student, return found=false with an empty opportunities array — do not substitute something plausible-sounding.",
  "",
  "Chain reasoning: on the SINGLE highest-leverage opportunity only (list it first), fill in gapLabel, upstream, unlocks, and window — and only where what you actually found supports them. Prefer a shorter honest chain to a fabricated complete one: leave a field out rather than invent a fellowship deadline search did not turn up. Leave all four out entirely on every other opportunity.",
  "",
  "reasoning: 1-2 sentences, plain second person, referencing the student's year, major, or school. No hedging, no generic advice.",
  "summary: 1-2 forward-framed sentences about where the student stands. Never give a score, percentage, or peer comparison.",
  "deadline: ISO YYYY-MM-DD if you found a dated deadline, otherwise an empty string. Never guess a date.",
  "category: exactly one of " + CATEGORIES.join(", ") + ".",
  "",
  "Reply with ONE JSON object and no other text, matching:",
  JSON.stringify(
    {
      found: true,
      summary: "string",
      opportunities: [
        {
          name: "string",
          category: "Research",
          deadline: "YYYY-MM-DD or empty string",
          timeframe: "string, e.g. Closes Sept 30",
          requirements: ["string"],
          contact: "string or empty string",
          link: "https://…",
          timeline: "string",
          leverage: "string",
          reasoning: "string",
          sources: [{ title: "string", url: "https://…" }],
          courseCode: "optional string",
          gapLabel: "hero only, optional",
          upstream: "hero only, optional",
          unlocks: ["hero only, optional"],
          window: "hero only, optional",
        },
      ],
      alternates: [{ title: "string", detail: "string" }],
    },
    null,
    0,
  ),
].join("\n");

function buildPrompt(data: z.infer<typeof Input>) {
  const track = TRACKS.find((t) => t.id === data.trackId);
  const destination =
    data.goalText.trim() ||
    (track && track.id !== "something-else" ? track.label : "") ||
    "not yet named — infer it from their major and year";
  return [
    `STUDENT: ${data.year} ${data.major} major at ${data.school}.`,
    `DESTINATION, in their words: ${destination}`,
    `TODAY: ${new Date().toISOString().slice(0, 10)}. Only return opportunities whose window has not already closed.`,
    "Find what is actually open to this student at this school, or open to any student at their stage. Search, then verify.",
  ].join("\n\n");
}

// --- Validation -------------------------------------------------------------

function safeUrl(raw: string): string | null {
  try {
    const u = new URL(raw.trim());
    return u.protocol === "http:" || u.protocol === "https:" ? u.toString() : null;
  } catch {
    return null;
  }
}

function hostOf(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
}

function slug(name: string, i: number) {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  return `live-${base || "opportunity"}-${i}`;
}

const trim = (s: string, max: number) => s.trim().slice(0, max);

/**
 * Strips anything that doesn't fit the schema before it reaches the client.
 * Nothing unsourced, nothing with a fabricated-looking link, no duplicates,
 * and the upstream/unlocks/window chain only on the hero.
 */
function clean(
  parsed: z.infer<typeof LiveResponseSchema>,
  data: z.infer<typeof Input>,
): LiveRoadmap | null {
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

    // Dedupe sources by host — two pages on one domain are one source.
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
    // Unsourced results never reach the client, no matter what the model said.
    if (sources.length === 0) continue;

    const requirements = raw.requirements
      .map((r) => trim(r, 90))
      .filter(Boolean)
      .slice(0, 6);

    const isHero = opportunities.length === 0;
    const unlocks = isHero
      ? (raw.unlocks ?? [])
          .map((u) => trim(u, 90))
          .filter(Boolean)
          .slice(0, 4)
      : [];

    seenNames.add(nameKey);
    const id = slug(name, opportunities.length);

    opportunities.push({
      id,
      name,
      track: track.id,
      category: raw.category,
      access: "direct",
      school: data.school,
      deadline: /^\d{4}-\d{2}-\d{2}$/.test(raw.deadline.trim()) ? raw.deadline.trim() : "",
      timeframe: trim(raw.timeframe, 80) || "Timing not confirmed",
      requirements,
      contact: trim(raw.contact, 120),
      link,
      timeline: trim(raw.timeline, 240),
      leverage: trim(raw.leverage, 280),
      courseCode: raw.courseCode ? trim(raw.courseCode, 20) : undefined,
      gapLabel: isHero && raw.gapLabel ? trim(raw.gapLabel, 120) : undefined,
      upstream: isHero && raw.upstream ? trim(raw.upstream, 200) : undefined,
      unlocks: unlocks.length ? unlocks : undefined,
      window: isHero && raw.window ? trim(raw.window, 240) : undefined,
      origin: "live",
      sources,
      singleSourced: sources.length < 2,
    });

    steps.push({
      opportunityId: id,
      reasoning: trim(raw.reasoning, 280) || trim(raw.leverage, 280),
    });
  }

  // Explicit "no results" — the caller falls back rather than showing nothing.
  if (opportunities.length === 0) return null;

  return {
    summary:
      trim(parsed.summary, 400) ||
      `You're a ${data.year} ${data.major} major at ${data.school}. Everything below was found by search just now and each item lists its sources.`,
    topOpportunityId: opportunities[0].id,
    steps,
    alternates: (parsed.alternates ?? [])
      .map((a) => ({ title: trim(a.title, 120), detail: trim(a.detail, 280) }))
      .filter((a) => a.title && a.detail)
      .slice(0, 2),
    opportunities,
  };
}

/** Pulls the JSON object out of the model's final text, fenced or bare. */
function extractJson(text: string): unknown | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidates = [fenced?.[1], text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1)];
  for (const c of candidates) {
    if (!c) continue;
    try {
      return JSON.parse(c);
    } catch {
      /* try the next candidate */
    }
  }
  return null;
}

// --- TEMPORARY DIAGNOSTICS — remove before shipping -------------------------
// Added to trace why live search returns null in production. Everything in
// this block, and every `diag(...)` call below, is safe to delete wholesale:
// none of it affects control flow or return values.
// Search for "TEMP DIAG" to find every call site.

/** Never let the key reach a log line, even if an SDK error echoed it back. */
function scrubKey(text: string): string {
  const key = process.env.ANTHROPIC_API_KEY;
  return key ? text.split(key).join("[redacted]") : text;
}

function diag(branch: string, detail?: Record<string, unknown>) {
  const parts = detail
    ? Object.entries(detail).map(
        ([k, v]) => `${k}=${typeof v === "string" ? v : JSON.stringify(v)}`,
      )
    : [];
  console.error(
    scrubKey(
      `[TEMP DIAG] live-roadmap null: ${branch}${parts.length ? ` · ${parts.join(" · ")}` : ""}`,
    ),
  );
}

// --- Server function --------------------------------------------------------

/**
 * Live, search-grounded roadmap generation. Returns `null` — never throws —
 * for every failure mode (no key, rate cap, timeout, API error, refusal, no
 * real results), so the caller can fall back to the seed dataset silently.
 */
export const generateLiveRoadmap = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => Input.parse(input))
  .handler(async ({ data }): Promise<LiveRoadmap | null> => {
    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) {
      diag("no ANTHROPIC_API_KEY in process.env"); // TEMP DIAG
      return null;
    }

    const cacheKey = cacheKeyFor(data);
    const cached = readCache(cacheKey);
    if (cached) return cached;

    // Checked after the cache so a refresh of the same profile is free.
    if (!withinRateCap(data.sessionId)) {
      // TEMP DIAG — which cap tripped, without logging the session id itself.
      diag("rate cap hit", {
        globalHits: globalHits.length,
        globalLimit: GLOBAL_LIMIT,
        sessionHits: (sessionHits.get(data.sessionId || "anonymous") ?? []).length,
        sessionLimit: PER_SESSION_LIMIT,
        hasSessionId: Boolean(data.sessionId),
      });
      return null;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const client = createAnthropicClient(key);
      const messages: Anthropic.MessageParam[] = [{ role: "user", content: buildPrompt(data) }];

      let response: Anthropic.Message | null = null;
      for (let i = 0; i <= MAX_RESUMES; i++) {
        response = await client.messages.create(
          {
            model: "claude-opus-5",
            max_tokens: 8000,
            system: SYSTEM,
            // Low effort keeps several search-and-verify round trips inside the
            // deadline. Thinking stays on: with it disabled the model can emit a
            // tool call as plain text and the search silently never runs.
            thinking: { type: "adaptive" },
            output_config: { effort: "low" },
            tools: [{ type: "web_search_20260209", name: "web_search", max_uses: 5 }],
            messages,
          },
          { signal: controller.signal },
        );

        if (response.stop_reason !== "pause_turn") break;
        // Server-side search loop hit its iteration cap — resume where it left off.
        messages.push({ role: "assistant", content: response.content });
      }

      if (!response || response.stop_reason === "refusal") {
        // TEMP DIAG
        diag(response ? "model refused" : "no response after resume loop", {
          stopReason: response?.stop_reason ?? "none",
          resumesAllowed: MAX_RESUMES,
        });
        return null;
      }

      const text = response.content
        .filter((b): b is Anthropic.TextBlock => b.type === "text")
        .map((b) => b.text)
        .join("\n");

      const json = extractJson(text);
      if (!json) {
        // TEMP DIAG — the head of the text is enough to see what came back
        // instead of JSON (a refusal sentence, an empty string, prose, …).
        diag("response was not parseable JSON", {
          stopReason: response.stop_reason ?? "none",
          textLength: text.length,
          textHead: text.slice(0, 300),
        });
        return null;
      }

      const parsed = LiveResponseSchema.safeParse(json);
      if (!parsed.success || !parsed.data.found) {
        // TEMP DIAG
        if (!parsed.success) {
          diag("schema validation failed", {
            issues: parsed.error.issues
              .slice(0, 8)
              .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`),
          });
        } else {
          diag("model returned found:false", {
            opportunities: parsed.data.opportunities.length,
            summaryHead: parsed.data.summary.slice(0, 200),
          });
        }
        return null;
      }

      const result = clean(parsed.data, data);
      // TEMP DIAG — clean() only returns null when every row was dropped.
      if (!result) {
        diag("zero results after clean()", {
          opportunitiesFromModel: parsed.data.opportunities.length,
          reason: "every row lacked a name, a valid link, or a usable source",
        });
      }
      if (result) writeCache(cacheKey, result);
      return result;
    } catch (err) {
      // TEMP DIAG — separate the deadline from a genuine API/network failure.
      const message = err instanceof Error ? err.message : String(err);
      if (controller.signal.aborted) {
        diag("timed out / aborted", { timeoutMs: TIMEOUT_MS, message });
      } else {
        diag("API call threw", {
          name: err instanceof Error ? err.name : typeof err,
          status: (err as { status?: unknown })?.status ?? "none",
          message,
        });
      }
      // Timeout, network error, API error — all resolve to the seed fallback.
      return null;
    } finally {
      clearTimeout(timer);
    }
  });
