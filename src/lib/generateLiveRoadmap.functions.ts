import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createAnthropicClient, hashKey } from "./anthropic.server";
import { TRACKS, type Opportunity, type OpportunitySource } from "./wayfind-data";
import type { GapAnalysis } from "./wayfind-store";
import { searchOpportunities, type OpportunityRecord } from "./opportunities-db";
import { cleanText } from "./text-sanitize";

const Input = z.object({
  trackId: z.string(),
  goalText: z.string(),
  major: z.string(),
  year: z.string(),
  school: z.string(),
  sessionId: z.string().optional(),
  experience: z.string().optional(),
  gpa: z.string().optional(),
  skills: z.string().optional(),
  priorWork: z.string().optional(),
  clubs: z.string().optional(),
  alreadyDone: z.string().optional(),
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
  gapAnalysis: z.object({
    strengths: z.array(z.string()),
    gaps: z.array(z.object({ gap: z.string(), why: z.string(), action: z.string() })),
    bottomLine: z.string(),
  }).optional(),
});

export type LiveRoadmap = {
  summary: string;
  topOpportunityId: string;
  steps: { opportunityId: string; reasoning: string }[];
  alternates: { title: string; detail: string }[];
  opportunities: Opportunity[];
  gapAnalysis?: GapAnalysis;
};

// --- Rate limiting & caching ------------------------------------------------

const TIMEOUT_MS = 60_000;
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

// --- Curated DB integration -------------------------------------------------

const CURATED_THRESHOLD = 3;

/** Convert an OpportunityRecord from the curated DB into the Opportunity shape. */
function curatedRecordToOpportunity(rec: OpportunityRecord): Opportunity {
  return {
    id: rec.id,
    name: rec.name,
    track: rec.track,
    category: rec.category,
    access: rec.access,
    school: rec.school,
    deadline: rec.deadline,
    timeframe: rec.timeframe,
    requirements: rec.requirements,
    contact: rec.contact,
    link: rec.link,
    timeline: rec.timeline,
    leverage: rec.leverage,
    courseCode: rec.courseCode,
    gapLabel: rec.gapLabel,
    upstream: rec.upstream,
    unlocks: rec.unlocks,
    window: rec.window,
    brandEquivalent: rec.brandEquivalent,
    missingHere: rec.missingHere,
    origin: "seed",
    sources: rec.source ? [{ title: rec.source, url: rec.link }] : [],
    singleSourced: false,
  };
}

/** Query the curated opportunity database for matches relevant to this student. */
function queryCuratedOpportunities(data: z.infer<typeof Input>): OpportunityRecord[] {
  return searchOpportunities({
    track: data.trackId as any,
    school: data.school,
    year: data.year,
    query: data.goalText || undefined,
    limit: 10,
  });
}

/** Build a LiveRoadmap from curated DB results alone, with optional AI gap analysis. */
async function buildCuratedRoadmap(
  curatedRecords: OpportunityRecord[],
  data: z.infer<typeof Input>,
  anthropicKey?: string,
): Promise<LiveRoadmap> {
  const opportunities = curatedRecords.map(curatedRecordToOpportunity);
  const steps = opportunities.map((op) => ({
    opportunityId: op.id,
    reasoning: op.leverage || `Curated opportunity for ${data.year} students at ${data.school}.`,
  }));

  // Attempt a lightweight Claude call for gap analysis + personalized reasoning
  let gapAnalysis: LiveRoadmap["gapAnalysis"] | undefined;
  if (anthropicKey) {
    const track = TRACKS.find((t) => t.id === data.trackId);
    const destination = data.goalText?.trim() || track?.label || "their goal";
    const opList = opportunities.slice(0, 10).map((o, i) => `${i + 1}. ${o.name} — ${o.leverage.slice(0, 80)}`).join("\n");

    const contextParts = [
      `Student: ${data.year} ${data.major} major at ${data.school}, heading toward ${destination}.`,
    ];
    if (data.experience) contextParts.push(`Experience: ${data.experience}`);
    if (data.skills) contextParts.push(`Skills: ${data.skills}`);
    if (data.priorWork) contextParts.push(`Prior work: ${data.priorWork}`);
    if (data.clubs) contextParts.push(`Clubs: ${data.clubs}`);
    if (data.alreadyDone) contextParts.push(`Already done: ${data.alreadyDone}`);

    // First call: gap analysis
    try {
      console.error("[LIVE-ROADMAP] gap analysis: calling Claude...");
      const client = createAnthropicClient(anthropicKey);

      const gapResponse = await client.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 600,
        system: `You produce a personalized gap analysis for a student. Return ONLY a JSON object:
{"strengths":["string","string"],"gaps":[{"gap":"string","why":"string","action":"string"}],"bottomLine":"string"}

Rules:
- strengths: 2-3 strings. NAME specific companies, skills, or experiences from their profile. Not "Strong technical background" — instead "Two Amazon SDE internships give you production-scale engineering judgment."
- gaps: 2-3 items. Identify what's ACTUALLY missing. If they have SDE experience but want PM, the gap is "product judgment beyond engineering execution."
- bottomLine: One specific sentence of mentor-level advice.
- Never invent URLs or program names.`,
        messages: [{
          role: "user",
          content: `${contextParts.join("\n")}\n\nOpportunities available: ${opList}\n\nReturn JSON.`,
        }],
      });

      const gapText = gapResponse.content
        .filter((b) => b.type === "text")
        .map((b) => (b as { type: "text"; text: string }).text)
        .join("");
      const gapJson = gapText.match(/\{[\s\S]*\}/);
      if (gapJson) {
        const cleanedJson = gapJson[0]
          .replace(/,\s*([}\]])/g, "$1")       // trailing commas
          .replace(/[\r\n]+/g, " ")             // newlines
          .replace(/[\x00-\x1f\t]/g, " ");     // control chars
        let parsed: any;
        try {
          parsed = JSON.parse(cleanedJson);
        } catch {
          // Retry with more aggressive cleanup
          try {
            parsed = JSON.parse(cleanedJson.replace(/([^\\])\\(?!["\\/bfnrtu])/g, "$1\\\\"));
          } catch { /* give up */ }
        }
        if (parsed?.strengths && parsed?.gaps && parsed?.bottomLine) {
          gapAnalysis = {
            strengths: parsed.strengths.map((s: string) => cleanText(s.replace(/https?:\/\/[^\s)]+/g, ""), 200)),
            gaps: parsed.gaps.map((g: any) => ({
              gap: cleanText(g.gap?.replace(/https?:\/\/[^\s)]+/g, "") || "", 120),
              why: cleanText(g.why?.replace(/https?:\/\/[^\s)]+/g, "") || "", 200),
              action: cleanText(g.action?.replace(/https?:\/\/[^\s)]+/g, "") || "", 200),
            })),
            bottomLine: cleanText(parsed.bottomLine.replace(/https?:\/\/[^\s)]+/g, ""), 300),
          };
        }
      }
    } catch (gapErr) {
      console.error("[LIVE-ROADMAP] gap analysis failed:", gapErr);
    }

    // Second call: personalized reasoning per step (separate to keep JSON small)
    try {
      const client = createAnthropicClient(anthropicKey);
      const top5 = opportunities.slice(0, 5);
      const opListShort = top5.map((o) => o.name).join(", ");

      const reasoningResponse = await client.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 600,
        system: `Given a student profile and a list of programs, return ONLY a JSON object where each key is a program name and each value is 1 sentence explaining why THIS student specifically should do it. Reference their actual experience by name. Example: {"Google APM":"Your Amazon SDE internships prove technical depth — APM lets you translate that into product ownership at Google scale."}`,
        messages: [{
          role: "user",
          content: `${contextParts.join("\n")}\n\nPrograms: ${opListShort}\n\nReturn JSON.`,
        }],
      });

      const reasonText = reasoningResponse.content
        .filter((b) => b.type === "text")
        .map((b) => (b as { type: "text"; text: string }).text)
        .join("");
      const reasonJson = reasonText.match(/\{[\s\S]*\}/);
      if (reasonJson) {
        const cleaned = reasonJson[0].replace(/,\s*([}\]])/g, "$1").replace(/[\r\n\t]/g, " ").replace(/[\x00-\x1f]/g, " ");
        let reasonParsed: any;
        try { reasonParsed = JSON.parse(cleaned); } catch { /* skip */ }
        if (reasonParsed && typeof reasonParsed === "object") {
          for (const step of steps) {
            const op = opportunities.find((o) => o.id === step.opportunityId);
            if (op) {
              // Try exact match or fuzzy match on the key
              const personalReasoning = reasonParsed[op.name] 
                || Object.values(reasonParsed).find((_, i) => Object.keys(reasonParsed)[i]?.toLowerCase().includes(op.name.slice(0, 20).toLowerCase()));
              if (personalReasoning && typeof personalReasoning === "string") {
                step.reasoning = cleanText(personalReasoning.replace(/https?:\/\/[^\s)]+/g, ""), 280);
              }
            }
          }
        }
      }
    } catch (reasonErr) {
      console.error("[LIVE-ROADMAP] personalized reasoning failed:", reasonErr);
    }
  }

  return {
    summary: `Based on ${data.school}'s verified pipeline for ${data.year} ${data.major} students — these are curated, deadline-checked opportunities.`,
    topOpportunityId: opportunities[0].id,
    steps,
    alternates: [],
    opportunities,
    gapAnalysis,
  };
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
    "6. Return 3-6 opportunities if available, ordered by leverage. NEVER return the same program twice — even if it appears in multiple search results, include it only once.",
    "7. ALWAYS include a 'gapAnalysis' object in your JSON response with: strengths (2-3 strings about what the student's year/major/school gives them), gaps (array of {gap, why, action} — 2-3 gaps between where they are and their goal), bottomLine (one sentence on their single biggest focus). Base this on their year, major, and goal even if no resume context is provided.",
    "8. In the reasoning field for each opportunity, reference the student's specific gaps — explain why THIS opportunity matters given what they're missing.",
    "",
    "PERSONALIZATION RULES (CRITICAL — every reasoning and gap must feel like it was written for THIS student, not a generic archetype):",
    "- If the student lists prior internships (e.g. 'Amazon Prime Video SDE Intern'), NAME the company in your reasoning. Example: 'Your Amazon experience gives you production-scale credibility — this role lets you apply that to a consumer product from the PM seat.'",
    "- If the student lists skills (e.g. 'Python, SQL, Figma'), reference specific ones that are relevant. Example: 'Your SQL and quantitative research background means you can skip the data fluency ramp most new PMs struggle with.'",
    "- If the student lists clubs or orgs, connect them. Example: 'Leading in Columbia's CORE shows you can drive cross-functional work — APM programs screen for exactly this.'",
    "- In gapAnalysis.strengths, cite the SPECIFIC experience that makes them strong — not generic statements about their major or school.",
    "- In gapAnalysis.gaps, identify what's ACTUALLY missing given their specific background — don't repeat generic advice that ignores their resume.",
    "- The bottomLine should reference their specific situation, not a one-size-fits-all statement.",
    "- NEVER write generic reasoning like 'This is great for CS students' or 'Good for aspiring PMs'. Always connect to THIS student's specific data.",
    "",
    "DEADLINE RULES:",
    "- deadline MUST be a full ISO date: YYYY-MM-DD. The year is REQUIRED.",
    "- The year must be the CURRENT or NEXT application cycle relative to today's date (provided in the user prompt). Never use past years.",
    "- If the search results mention a month but no year, infer the correct year: if the month is in the future relative to today, use the current year. If it's in the past, use next year.",
    "- If no specific date is found in the search results, leave deadline as empty string. Do NOT guess dates.",
    "",
    "reasoning: 1-2 sentences, plain second person. MUST reference something specific from the student's profile.",
    "summary: 1-2 forward-framed sentences that reference the student's specific background.",
    "deadline: ISO YYYY-MM-DD if found in search results, otherwise empty string. MUST include year.",
    "category: exactly one of " + CATEGORIES.join(", ") + ".",
    "",
    "Chain reasoning fields: gapLabel ONLY on the first opportunity. upstream, unlocks, and window on EVERY opportunity.",
    "",
    "DEPENDENCY CHAIN RULES (upstream/unlocks/window):",
    "- upstream: What this step builds on. Reference the student's ACTUAL prior experience where relevant (e.g. 'Builds on your Amazon SDE internship experience'). Use ONLY facts from the search results or the student's profile. If nothing is required, write 'None — open to all eligible students'.",
    "- unlocks: 1-3 things this step makes possible. Only include outcomes that are logically true (e.g. a research position unlocks a faculty rec letter). Never invent program names not in the search results.",
    "- window: The timing constraint if a deadline exists. Copy from the deadline/timeframe info. If no hard deadline, write 'Rolling' or omit.",
    "- NEVER invent program names, deadlines, or prerequisites that aren't stated in the search results or obvious from the opportunity type.",
    "",
    "Reply with ONE JSON object matching:",
    JSON.stringify({
      found: true, summary: "string",
      opportunities: [{ name: "string", category: "Research", deadline: "", timeframe: "string", requirements: ["string"], contact: "", link: "https://...", timeline: "string", leverage: "string", reasoning: "string", sources: [{ title: "string", url: "https://..." }], gapLabel: "optional — first opportunity only", upstream: "string — what this builds on", unlocks: ["string — what this opens"], window: "string — timing constraint" }],
      alternates: [{ title: "string", detail: "string" }],
      gapAnalysis: { strengths: ["string"], gaps: [{ gap: "string", why: "string", action: "string" }], bottomLine: "string" },
    }, null, 0),
  ].join("\n");
}

function buildUserPrompt(data: z.infer<typeof Input>, searchResults: string) {
  const track = TRACKS.find((t) => t.id === data.trackId);
  const destination = data.goalText.trim() || (track && track.id !== "something-else" ? track.label : "") || "not yet named";

  const contextLines: string[] = [
    "STUDENT PROFILE:",
    `- Year: ${data.year}`,
    `- Major: ${data.major}`,
    `- School: ${data.school}`,
    `- Goal: ${destination}`,
    `- Today: ${new Date().toISOString().slice(0, 10)}`,
  ];
  if (data.gpa) contextLines.push(`- GPA: ${data.gpa}`);
  if (data.skills) contextLines.push(`- Skills & tools: ${data.skills}`);
  if (data.experience) contextLines.push(`- Experience & background: ${data.experience}`);
  if (data.priorWork) contextLines.push(`- Prior internships/jobs: ${data.priorWork}`);
  if (data.clubs) contextLines.push(`- Clubs/orgs: ${data.clubs}`);
  if (data.alreadyDone) contextLines.push(`- Already tried toward this goal: ${data.alreadyDone}`);

  // Explicitly flag what's available for personalization
  const hasContext = !!(data.experience || data.priorWork || data.skills || data.clubs || data.alreadyDone);

  return [
    ...contextLines,
    "",
    hasContext
      ? "IMPORTANT: This student has provided detailed background (experience, internships, skills, clubs). Your reasoning for EVERY opportunity MUST reference their specific background by name. Do NOT write generic reasoning. Every 'reasoning' field should read like it was written by an advisor who read their full resume."
      : "NOTE: This student has not provided detailed background yet. Base personalization on their year, major, school, and goal.",
    "",
    "SEARCH RESULTS (your only source of fact):",
    "============================================",
    searchResults,
    "============================================",
    "",
    "Extract real opportunities from these results. Only include things the search results actually describe.",
    "Use the student's background to rank results by relevance — prioritize opportunities that fit their current skill level and fill gaps in their experience.",
    "For EVERY opportunity, include upstream (what it builds on — reference their prior experience where relevant), unlocks (what it opens — only logical outcomes, never invented program names), and window (timing). If no prerequisite exists, set upstream to 'None — open to all eligible students'.",
    "ALWAYS include a gapAnalysis object — strengths must cite SPECIFIC things from their profile, gaps must identify what's ACTUALLY missing given their background.",
    "All deadlines must be YYYY-MM-DD format with a plausible year relative to today's date. If a deadline year isn't stated, infer it (future month = this year, past month = next year). If you can't determine a date, use empty string.",
    "Return strict JSON.",
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

const trim = (s: string, max: number) => cleanText(s, max);

function clean(parsed: z.infer<typeof LiveResponseSchema>, data: z.infer<typeof Input>, knownUrls?: Set<string>): LiveRoadmap | null {
  const track = TRACKS.find((t) => t.id === data.trackId) ?? TRACKS[0];
  const seenNames = new Set<string>();
  const opportunities: Opportunity[] = [];
  const steps: { opportunityId: string; reasoning: string }[] = [];

  for (const raw of parsed.opportunities) {
    const name = trim(raw.name, 120);
    const link = safeUrl(raw.link);
    if (!name || !link) continue;

    // Anti-hallucination: if we have a set of known-good URLs from search,
    // reject any link Claude produced that wasn't in the original results.
    // This prevents the AI from inventing plausible-looking URLs.
    if (knownUrls && knownUrls.size > 0 && !knownUrls.has(link)) {
      // Check if the domain at least matches a known result (looser check)
      const linkHost = hostOf(link);
      const hasMatchingDomain = linkHost && [...knownUrls].some((u) => hostOf(u) === linkHost);
      if (!hasMatchingDomain) continue; // Fully hallucinated domain — skip entirely
    }

    const nameKey = name.toLowerCase();
    if (seenNames.has(nameKey)) continue;

    const sources: OpportunitySource[] = [];
    const hosts = new Set<string>();
    for (const s of raw.sources) {
      const url = safeUrl(s.url);
      const host = url && hostOf(url);
      if (!url || !host || hosts.has(host)) continue;
      // Anti-hallucination: only accept source URLs that actually came from search
      if (knownUrls && knownUrls.size > 0 && !knownUrls.has(url)) {
        // Allow if at least the domain appeared in search results (page might differ)
        const domainInSearch = [...knownUrls].some((u) => hostOf(u) === host);
        if (!domainInSearch) continue;
      }
      hosts.add(host);
      sources.push({ title: trim(s.title, 120) || host, url });
      if (sources.length === 3) break;
    }
    if (sources.length === 0) continue;

    const isHero = opportunities.length === 0;
    const unlocks = (raw.unlocks ?? []).map((u) => trim(u, 90)).filter(Boolean).slice(0, 4);
    seenNames.add(nameKey);
    const id = slug(name, opportunities.length);

    opportunities.push({
      id, name, track: track.id, category: raw.category, access: "direct", school: data.school,
      deadline: (() => {
        const d = raw.deadline.trim();
        if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return "";
        // Reject dates more than 18 months in the past — likely a stale or hallucinated deadline
        const deadlineDate = new Date(d);
        const cutoff = new Date();
        cutoff.setMonth(cutoff.getMonth() - 18);
        if (deadlineDate < cutoff) return "";
        // Reject dates more than 2 years in the future — likely hallucinated
        const maxFuture = new Date();
        maxFuture.setFullYear(maxFuture.getFullYear() + 2);
        if (deadlineDate > maxFuture) return "";
        return d;
      })(),
      timeframe: trim(raw.timeframe, 80) || "Timing not confirmed",
      requirements: raw.requirements.map((r) => trim(r, 90)).filter(Boolean).slice(0, 6),
      contact: trim(raw.contact, 120), link,
      timeline: trim(raw.timeline, 240), leverage: trim(raw.leverage, 280),
      courseCode: raw.courseCode ? trim(raw.courseCode, 20) : undefined,
      gapLabel: isHero && raw.gapLabel ? trim(raw.gapLabel, 120) : undefined,
      upstream: raw.upstream ? trim(raw.upstream, 200) : undefined,
      unlocks: unlocks.length ? unlocks : undefined,
      window: raw.window ? trim(raw.window, 240) : undefined,
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
    // Sanitize gap analysis — strip any hallucinated URLs from text fields
    gapAnalysis: parsed.gapAnalysis ? {
      strengths: parsed.gapAnalysis.strengths.map((s) => cleanText(s.replace(/https?:\/\/[^\s)]+/g, ""), 200)),
      gaps: parsed.gapAnalysis.gaps.map((g) => ({
        gap: cleanText(g.gap.replace(/https?:\/\/[^\s)]+/g, ""), 120),
        why: cleanText(g.why.replace(/https?:\/\/[^\s)]+/g, ""), 200),
        action: cleanText(g.action.replace(/https?:\/\/[^\s)]+/g, ""), 200),
      })),
      bottomLine: cleanText(parsed.gapAnalysis.bottomLine.replace(/https?:\/\/[^\s)]+/g, ""), 300),
    } : undefined,
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
      reasoning: cleanText(r.snippet, 280) || `Relevant result for ${goal} at ${data.school}.`,
    });
  }

  if (opportunities.length === 0) return null;

  return {
    summary: `You're a ${data.year} ${data.major} major at ${data.school}. Sylo searched for "${goal}" and found these leads. Every link goes to the original source — tap through for the latest details.`,
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

  // Add a targeted query if skills or prior work provide signal
  if (data.skills) {
    const topSkill = data.skills.split(/[,;]/).map((s) => s.trim()).filter(Boolean)[0];
    if (topSkill) queries.push(`${data.school} ${topSkill} ${goal} program internship 2025 2026`);
  }
  if (data.priorWork) {
    queries.push(`${goal} next step after internship ${data.major} ${data.school}`);
  }

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

    const cacheKey = cacheKeyFor(data);
    const cached = readCache(cacheKey);
    if (cached) return cached;

    if (!withinRateCap(data.sessionId)) { console.error("[LIVE-ROADMAP] rate cap hit"); return null; }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      // Step 1: Query the curated opportunity database first
      console.error("[LIVE-ROADMAP] querying curated DB...", { track: data.trackId, school: data.school, year: data.year });
      const curatedResults = queryCuratedOpportunities(data);
      console.error("[LIVE-ROADMAP] curated matches:", curatedResults.length);

      // If we have enough curated results, use them directly (no API calls needed)
      if (curatedResults.length >= CURATED_THRESHOLD) {
        console.error("[LIVE-ROADMAP] sufficient curated results, skipping live search. Generating gap analysis...");
        const result = await buildCuratedRoadmap(curatedResults, data, anthropicKey);
        console.error("[LIVE-ROADMAP] curated roadmap built. gapAnalysis:", result.gapAnalysis ? "YES" : "NO");
        writeCache(cacheKey, result);
        return result;
      }

      // Step 2: Not enough curated results — do live Serper search
      if (!serperKey) {
        // No Serper key but we have some curated results — return what we have
        if (curatedResults.length > 0) {
          const result = await buildCuratedRoadmap(curatedResults, data, anthropicKey);
          writeCache(cacheKey, result);
          return result;
        }
        console.error("[LIVE-ROADMAP] no SERPER_API_KEY and no curated results");
        return null;
      }

      console.error("[LIVE-ROADMAP] searching live (curated had <3 matches)...", { school: data.school, goal: data.goalText || data.trackId });
      const rawResults = await gatherSearchResultsRaw(data, serperKey);
      if (rawResults.length === 0 && curatedResults.length === 0) {
        console.error("[LIVE-ROADMAP] no search results and no curated results");
        return null;
      }

      const searchResults = rawResults.map((r, i) => `[${i + 1}] "${r.title}"\n    URL: ${r.link}\n    Snippet: ${r.snippet}`).join("\n\n");
      console.error("[LIVE-ROADMAP] got results, sending to Haiku...");

      // Step 3: Try Claude to structure the live results
      let result: LiveRoadmap | null = null;

      if (anthropicKey && rawResults.length > 0) {
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
            if (!parsed.success) {
              console.error("[LIVE-ROADMAP] Zod validation failed:", JSON.stringify(parsed.error.issues.slice(0, 3)));
            }
            if (parsed.success && parsed.data.found) {
              // Pass known Serper URLs so clean() can reject hallucinated links
              const knownUrls = new Set(rawResults.map((r) => r.link));
              result = clean(parsed.data, data, knownUrls);
            } else {
              console.error("[LIVE-ROADMAP]", parsed.success ? "found:false" : "schema error");
            }
          } else {
            console.error("[LIVE-ROADMAP] couldn't parse JSON from Haiku. First 500 chars:", text.slice(0, 500));
          }
        } catch (llmErr) {
          console.error("[LIVE-ROADMAP] LLM failed, falling back to raw results:", llmErr instanceof Error ? llmErr.message : llmErr);
        }
      }

      // Step 4: If LLM failed or wasn't available, structure results directly
      if (!result && rawResults.length > 0) {
        console.error("[LIVE-ROADMAP] using search-results fallback");
        result = fallbackFromSearchResults(rawResults, data);
      }

      // Step 5: Merge curated results into the live roadmap
      if (result && curatedResults.length > 0) {
        const curatedOpportunities = curatedResults.map(curatedRecordToOpportunity);
        const curatedSteps = curatedOpportunities.map((op) => ({
          opportunityId: op.id,
          reasoning: op.leverage || `Verified opportunity for ${data.year} students.`,
        }));

        // Prepend curated results (they're higher confidence)
        const existingIds = new Set(result.opportunities.map((o) => o.id));
        const newCurated = curatedOpportunities.filter((o) => !existingIds.has(o.id));
        const newSteps = curatedSteps.filter((s) => !existingIds.has(s.opportunityId));

        result.opportunities = [...newCurated, ...result.opportunities];
        result.steps = [...newSteps, ...result.steps];
        if (newCurated.length > 0) {
          result.topOpportunityId = newCurated[0].id;
        }
      } else if (!result && curatedResults.length > 0) {
        // Live search totally failed but we have some curated data
        result = await buildCuratedRoadmap(curatedResults, data, anthropicKey);
      }

      if (result) {
        console.error("[LIVE-ROADMAP] success!", { opportunities: result.opportunities.length, curated: curatedResults.length });
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
