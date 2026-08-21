import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createAnthropicClient, hashKey, CLAUDE_SONNET } from "./anthropic.server";

// The roadmap analysis leans on Claude for judgment (naming real programs,
// honest ranking, personalized reasoning), so it runs on Sonnet rather than
// Haiku. Swap to CLAUDE_HAIKU here to cut cost ~3x if needed.
const ANALYSIS_MODEL = CLAUDE_SONNET;
import { TRACKS, type Opportunity, type OpportunitySource, isGradStudent } from "./wayfind-data";
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
  diversitySelfId: z.boolean().optional(),
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

// LLMs frequently emit `null` for absent fields instead of omitting them.
// These helpers accept string|null|undefined and normalize so a single stray
// null doesn't fail the whole parse (and discard an otherwise-good roadmap).
const strOrEmpty = z.string().nullish().transform((v) => v ?? "");
const strArrayOrEmpty = z.array(z.string()).nullish().transform((v) => v ?? []);

const SourceSchema = z.object({ title: strOrEmpty, url: z.string() });

const LiveOpportunitySchema = z.object({
  name: z.string(),
  category: z.enum(CATEGORIES),
  deadline: strOrEmpty,
  timeframe: strOrEmpty,
  requirements: strArrayOrEmpty,
  contact: strOrEmpty,
  link: z.string(),
  timeline: strOrEmpty,
  leverage: strOrEmpty,
  reasoning: strOrEmpty,
  sources: z.array(SourceSchema).nullish().transform((v) => v ?? []),
  courseCode: z.string().nullish(),
  gapLabel: z.string().nullish(),
  upstream: z.string().nullish(),
  unlocks: z.array(z.string()).nullish(),
  window: z.string().nullish(),
});

const LiveResponseSchema = z.object({
  found: z.boolean(),
  summary: strOrEmpty,
  opportunities: z.array(LiveOpportunitySchema).nullish().transform((v) => v ?? []),
  alternates: z
    .array(z.object({ title: strOrEmpty, detail: strOrEmpty }))
    .nullish()
    .transform((v) => v ?? []),
  gapAnalysis: z
    .object({
      strengths: strArrayOrEmpty,
      gaps: z
        .array(z.object({ gap: strOrEmpty, why: strOrEmpty, action: strOrEmpty }))
        .nullish()
        .transform((v) => v ?? []),
      bottomLine: strOrEmpty,
    })
    .nullish(),
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

// The Sonnet advisor writes 6 full cards + gap analysis, which can take longer
// than a minute. A 60s cap was aborting the call mid-generation and silently
// dropping every request to the raw-search fallback, so give it real headroom.
const TIMEOUT_MS = 150_000;
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
  // An "Other" goal doesn't map to a curated track. A loose keyword search across
  // ALL tracks produces off-target matches — e.g. "data scientist" pulling in
  // physician-SCIENTIST pipelines or evolutionary-biology REUs — so we skip the
  // curated DB entirely and let live web search handle the free-text goal.
  if (data.trackId === "something-else") return [];

  const results = searchOpportunities({
    track: data.trackId as any,
    school: data.school,
    year: data.year,
    query: data.goalText || undefined,
    // Exclude diversity-cohort programs unless the student has opted in
    excludeTags: data.diversitySelfId ? undefined : ["diversity-cohort"],
    limit: 10,
  });
  return prioritizeForCareerStage(results, data);
}

/**
 * Turn a free-text goal into a clean searchable phrase by stripping
 * conversational lead-ins ("I want to be a data scientist" -> "data scientist").
 */
function normalizeGoal(goal: string): string {
  const cleaned = goal
    .trim()
    .replace(
      /^(i\s+(really\s+)?want\s+to\s+(be|become|work\s+(as|in))|i'?d\s+like\s+to\s+(be|become)|my\s+goal\s+is\s+to\s+(be|become)|i'?m\s+aiming\s+to\s+(be|become)|aspiring|i\s+want)\s+(an?\s+)?/i,
      "",
    )
    .replace(/[.!?]+$/, "")
    .trim();
  return cleaned || goal.trim();
}

/**
 * A senior (or grad student) with substantial prior experience is usually
 * choosing a full-time / next-step move — not hunting for a summer internship.
 * Preserve the DB's relevance order, but float full-time / rotational / new-grad
 * programs above summer-internship-style entries so the roadmap doesn't lead a
 * graduating senior with offers toward underclassman-style summer programs.
 */
function prioritizeForCareerStage(
  records: OpportunityRecord[],
  data: z.infer<typeof Input>,
): OpportunityRecord[] {
  const isLateStage = data.year.toLowerCase() === "senior" || isGradStudent(data.year);
  const hasExtensiveExp =
    (data.priorWork?.split(/[,;]/).length ?? 0) >= 2 || (data.priorWork?.length ?? 0) > 100;
  if (!isLateStage || !hasExtensiveExp) return records;

  const bucketOf = (rec: OpportunityRecord): number => {
    const hay = `${rec.name} ${rec.tags.join(" ")} ${rec.timeframe} ${rec.timeline} ${rec.leverage}`.toLowerCase();
    const fullTime = /full-?time|new-?grad|rotational|\bapm\b|\brpm\b/.test(hay);
    if (fullTime) return 0; // full-time / next-step programs first
    const summerIntern = /\bsummer\b|\b\d+\s*weeks?\b|internship/.test(hay);
    if (summerIntern) return 2; // summer-internship-style entries last
    return 1; // everything else keeps its middle spot
  };

  // Stable sort by bucket — preserves the DB's relevance order within each tier.
  return records
    .map((rec, i) => ({ rec, i, b: bucketOf(rec) }))
    .sort((a, b) => a.b - b.b || a.i - b.i)
    .map((x) => x.rec);
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
    const destination = normalizeGoal(data.goalText) || track?.label || "their goal";
    const opList = opportunities.slice(0, 10).map((o, i) => `${i + 1}. ${o.name} — ${o.leverage.slice(0, 80)}`).join("\n");

    const contextParts = [
      `Student: ${data.year} ${data.major} major at ${data.school}, heading toward ${destination}.`,
    ];
    if (data.experience) contextParts.push(`Experience: ${data.experience}`);
    if (data.skills) contextParts.push(`Skills: ${data.skills}`);
    if (data.priorWork) contextParts.push(`Prior work: ${data.priorWork}`);
    if (data.clubs) contextParts.push(`Clubs: ${data.clubs}`);
    if (data.alreadyDone) contextParts.push(`Already done: ${data.alreadyDone}`);

    // Detect advanced students who likely have return offers
    const isSenior = data.year.toLowerCase() === "senior";
    const hasExtensiveExp = (data.priorWork?.split(/[,;]/).length ?? 0) >= 2 || (data.priorWork?.length ?? 0) > 100;
    if (isSenior && hasExtensiveExp) {
      contextParts.push(`\nCRITICAL: This is a senior with extensive internship experience who very likely has a return offer. Frame gaps around maximizing their first year on the job and choosing between opportunities — not about 'getting in.' Their biggest decisions are probably: which offer to accept, how to prepare for Day 1, and what to prioritize in their first 90 days.`);
    }

    // First call: gap analysis
    try {
      console.error("[LIVE-ROADMAP] gap analysis: calling Claude...");
      const client = createAnthropicClient(anthropicKey);

      const gapResponse = await client.messages.create({
        model: ANALYSIS_MODEL,
        max_tokens: 1800,
        system: `You produce a personalized gap analysis for a student using CAUSALITY reasoning. Return ONLY a JSON object:
{"strengths":["string","string"],"gaps":[{"gap":"string","why":"string","action":"string"}],"bottomLine":"string"}

Rules:
- strengths: 2-3 strings. NAME specific companies, skills, or experiences from their profile. Frame as trajectory components they already have: "Two Amazon SDE internships give you the production-scale credibility that PM hiring managers look for." Each string must be ONE complete sentence — never leave a thought unfinished.
- gaps: 2-3 items. Frame as MISSING trajectory components: "People who land [goal] can typically point to [X]. You can't yet." The 'why' explains causality: why this specific gap blocks them. The 'action' gives the one move that fills it. Each field must be a COMPLETE sentence.
- bottomLine: One sentence using the pattern: "You have [X] and [Y] — the fastest path to [goal] is filling [specific gap] because [causal reason]."
- CRITICAL: Every string in your response must be a complete thought ending with proper punctuation. Never cut off mid-sentence.
- When referencing diversity/identity programs, frame them as investments in the student's growth (e.g. 'leadership development program', 'career accelerator') — never as backdoors, shortcuts, or ways to bypass normal hiring.
- Think like an advisor who's seen 100 students make this exact transition. What did the ones who succeeded all have in common? What's this student missing from that pattern?
- Never invent URLs or program names.
- FACTUAL ATTRIBUTION (do not misattribute): Only tie a skill, project, or accomplishment to a specific company, team, or program if the profile EXPLICITLY links them. If the student lists a type of work (e.g. "LLM-powered features", "AI/ML evaluation") without stating where it happened, describe it generically — do NOT attach it to a different employer they listed for a separate role. Example: given "SDE Intern at AWS", "worked on LLM features", and "AI Fellow at Handshake AI", NEVER write "your LLM work at AWS" — that link was never stated; attribute it only as generally described or to the org actually tied to it. Never fabricate the employer, product, team, or context of an experience.
- NO PROBABILITY CLAIMS: Never forecast the student's odds of admission, an offer, or acceptance. Do not use "likely", "guaranteed", "you'll get in", "high chance", or parenthetical tags like "(likely)". Frame outcomes as what an opportunity can open, conditional on their performance — not as a prediction you are making.`,
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
            strengths: parsed.strengths.map((s: string) => cleanText(s.replace(/https?:\/\/[^\s)]+/g, ""), 600)),
            gaps: parsed.gaps.map((g: any) => ({
              gap: cleanText(g.gap?.replace(/https?:\/\/[^\s)]+/g, "") || "", 400),
              why: cleanText(g.why?.replace(/https?:\/\/[^\s)]+/g, "") || "", 600),
              action: cleanText(g.action?.replace(/https?:\/\/[^\s)]+/g, "") || "", 600),
            })),
            bottomLine: cleanText(parsed.bottomLine.replace(/https?:\/\/[^\s)]+/g, ""), 550),
          };
        }
      }
    } catch (gapErr) {
      console.error("[LIVE-ROADMAP] gap analysis failed:", gapErr);
    }

    // Second call: personalized reasoning + dependency chain per step
    try {
      const client = createAnthropicClient(anthropicKey);
      const top5 = opportunities.slice(0, 8);
      const opListShort = top5.map((o) => `${o.name} (deadline: ${o.deadline || "rolling"})`).join(", ");

      const reasoningResponse = await client.messages.create({
        model: ANALYSIS_MODEL,
        max_tokens: 4000,
        system: `Given a student profile and a list of programs, return ONLY a JSON object where each key is a program name and each value is an object with these fields:

{
  "reasoning": "2-3 sentences using CAUSALITY + ACTION reasoning",
  "upstream": "What prior experience or prerequisite this builds on (reference the student's actual background)",
  "unlocks": ["1-3 things this step makes possible — credentials, access, or signals it creates"],
  "window": "Timing constraint or deadline info"
}

For "reasoning", structure as THREE parts:
1. PATTERN: What people who reached [goal] typically demonstrated (name the 2-3 signals).
2. FIT: Which signals THIS student already has (name specific companies/projects) and which one this program fills.
3. EDGE: One specific thing to emphasize in the application given their unique background.

CRITICAL LENGTH RULE: Each "reasoning" field must be 2-3 COMPLETE sentences. Never leave a thought unfinished. If you're running long, end the sentence you're on and stop. A complete 2-sentence reasoning is better than a 3-sentence one that cuts off mid-thought.

For "upstream": Reference what the student ALREADY has that makes them ready for this step. Name specific companies, courses, or experiences. If no prerequisite, write "None — open to all eligible students."

For "unlocks": List 1-3 SPECIFIC things this step opens. Not generic benefits — actual next steps it enables. E.g. "Return offer pipeline at the company", "Faculty recommendation letter for grad school", "Access to partner company recruiting events." Keep each unlock SHORT and self-contained — a complete phrase of ~15 words or fewer. Write the full thought and STOP; never trail off mid-phrase or end on a dangling word like "different"/"across" or an open quote.

For "window": Strategic timing advice ONLY. Do NOT restate a specific calendar date or year — the card already shows the authoritative deadline, and a restated date can contradict it. Use relative guidance instead. E.g. "Apply a few weeks before the deadline — interviews usually start about a month later, so prep cases ahead of time."

Rules:
- ALWAYS name their specific companies, skills, roles, and clubs.
- The EDGE must be genuinely actionable.
- "unlocks" should be things that are CAUSALLY downstream — not just generic benefits of any internship.
- "upstream" should connect to their SPECIFIC prior experience, not generic prerequisites.
- FACTUAL ATTRIBUTION (do not misattribute): Only tie a skill or project to a specific company/team/program if the profile EXPLICITLY links them. If a type of work is listed without an employer (e.g. "LLM evaluation", "full-stack tools"), keep it generic — never attach it to a different employer they named for a separate role. Example: NEVER write "your LLM work at AWS" when AWS is only tied to a separate SDE role. Never invent the employer, product, or context of an experience.
- NO PROBABILITY CLAIMS: Never forecast odds of an offer, admission, or acceptance. Do not use "likely", "guaranteed", "you'll get", "high chance", or parenthetical tags like "(likely)". Frame "unlocks" and "leverage" as what the step CAN open or is DESIGNED to lead to, conditional on performance — e.g. "A strong showing can convert into a return offer" rather than "Return offer (likely)".
- NO FABRICATED STATS OR MECHANICS: Never invent numbers or program mechanics you can't verify — no made-up conversion/acceptance rates (e.g. "70–80% convert"), cohort sizes, salary figures, or authority claims (e.g. "direct investment decision-making authority", "board seats", "visa sponsorship guaranteed"). Describe what a program generally offers in plain, non-numeric terms. If you don't know a specific figure or mechanic, omit it rather than guessing.
- NO RESTATED DEADLINES: Do not write a specific calendar date or year in any field. Give relative timing ("apply a few weeks before the deadline") instead of a hard date that could contradict the deadline shown on the card.`,
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
              const entry = reasonParsed[op.name] 
                || Object.values(reasonParsed).find((_, i) => Object.keys(reasonParsed)[i]?.toLowerCase().includes(op.name.slice(0, 20).toLowerCase()));
              if (entry) {
                if (typeof entry === "string") {
                  // Backward compat: if model returns just a string
                  step.reasoning = cleanText(entry.replace(/https?:\/\/[^\s)]+/g, ""), 700);
                } else if (typeof entry === "object") {
                  if (entry.reasoning) step.reasoning = cleanText(String(entry.reasoning).replace(/https?:\/\/[^\s)]+/g, ""), 700);
                  // Populate cascade fields on the opportunity if missing
                  if (!op.upstream && entry.upstream) op.upstream = cleanText(String(entry.upstream).replace(/https?:\/\/[^\s)]+/g, ""), 350);
                  if (!op.unlocks?.length && Array.isArray(entry.unlocks)) op.unlocks = entry.unlocks.map((u: any) => cleanText(String(u).replace(/https?:\/\/[^\s)]+/g, ""), 320)).filter(Boolean).slice(0, 4);
                  if (!op.window && entry.window) op.window = cleanText(String(entry.window).replace(/https?:\/\/[^\s)]+/g, ""), 350);
                }
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
    summary: `These programs are matched to your profile as a ${data.year} ${data.major} student at ${data.school}. Each links to its official application page — confirm the current deadline there before you apply.`,
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

// --- Claude advisor prompt (Sonnet) -----------------------------------------

function buildSystemPrompt() {
  return [
    "You are Sylo's senior career advisor. Given a student profile and Google search results for context, produce the definitive, ranked list of REAL, NAMED opportunities this specific student should pursue next — the same caliber a world-class mentor who has placed hundreds of students would give from memory.",
    "",
    "HOW TO USE THE INPUTS:",
    "- The SEARCH RESULTS are context and a freshness signal: they confirm which programs exist and are currently running, and they often contain the official application URL. Use them.",
    "- You are NOT limited to the search results. Use your own knowledge of the landscape to name the canonical, real programs for this goal (e.g. for Product Management: Meta RPM, Google APM, Uber APM, Instacart APM, Product Buds Case Competition, Product School; for Data Science: company new-grad and rotational programs, applied-ML fellowships, analytics case competitions). Only name programs that genuinely exist.",
    "- Treat the curated examples in the prompt as the quality bar to match, not as your only options.",
    "",
    "WHAT TO RETURN:",
    "- Exactly 6 opportunities, ordered by leverage. The FIRST is the single highest-leverage next move.",
    "- Mix tiers like a real advisor would: marquee rotational/pipeline programs, fellowships, case competitions, certifications, and internships.",
    "- EVERY card must be a confident 'yes, pursue this' for THIS student. ONLY include programs they are eligible for and that genuinely fit their stage and timeline. If a program is a poor fit — they're overqualified, underqualified, ineligible, or it clashes with their graduation timeline — DO NOT include it. Just leave it out silently.",
    "- NEVER write conceding or self-defeating reasoning. Do not say 'this isn't for you', 'you're not yet eligible', 'this doesn't fit your timeline', 'you're beyond this', or 'this is lower-leverage'. Every reasoning is a positive case for why this specific student should pursue this specific program.",
    "- NEVER return the same program twice.",
    "- Set found=true whenever you can name at least 3 real programs for the goal (you almost always can). Only return found=false if the goal is empty or incoherent.",
    "- ALWAYS include a 'gapAnalysis' object: strengths (2-3 strings citing SPECIFIC things from their profile), gaps (2-3 items of {gap, why, action} — what's actually missing given their background), bottomLine (one sentence on their single biggest focus).",
    "- In each opportunity's reasoning, reference the student's specific background and name the gap this step fills.",
    "",
    "LINKS (this is what makes each card useful):",
    "- For 'link', give the DIRECT official application or program page (the program's own page on the company/organization site) — NOT a search-result page, article, or generic careers homepage.",
    "- Prefer an official URL present in the SEARCH RESULTS. If search doesn't contain it, use the program's real official URL from your knowledge ONLY when you are confident it is correct.",
    "- CRITICAL — never guess or fabricate a URL. If you are not confident of the exact official URL, leave 'link' as an empty string \"\" and rely on 'sources' instead. A wrong link is worse than no link; the app will fall back to the real source or a program search.",
    "- Put any official link in 'link' and also list it (plus any backing pages) in 'sources'. NEVER link to job boards or aggregators (Indeed, LinkedIn, ZipRecruiter, GitHub lists, Reddit, 'top 10' articles).",
    "",
    "PER-OPPORTUNITY FIELDS:",
    "- name: the official program name (e.g. 'Meta Rotational Product Manager (RPM) Program').",
    "- category: exactly one of " + CATEGORIES.join(", ") + ".",
    "- timeframe: a stable, knowledge-based descriptor of format/length (e.g. 'Full-time rotational (2 years)', 'Summer (12 weeks)', 'Self-paced (40 hours)', 'Semester-long (team-based)'). This is NOT a calendar date.",
    "",
    "WHAT COUNTS AS AN OPPORTUNITY (name real programs, not noise):",
    "- Each card must be a specific, named program, role, competition, fellowship, or certification a student can actually apply to — e.g. 'Meta RPM Program', 'Insight Data Science Fellowship', 'Kaggle competition', a named company new-grad/rotational program.",
    "- Do NOT emit generic labels or listings as cards ('Data Scientist Jobs', 'Entry-level roles', 'Degree Search', a university news headline, a 'top 10' article). If the only thing search surfaced for a slot is a listing, name the real underlying program from your knowledge instead and link to its official page.",
    "- Respect eligibility and stage, and SILENTLY DROP anything that doesn't fit: a graduating senior wants full-time/new-grad and rotational programs (never 'get your first internship', never 'Senior Data Scientist' roles requiring years of experience, never a summer internship that clashes with their grad date); a PhD student is already admitted, so never suggest degree admissions. Do not include a program just to then explain why it's a bad fit — if it's a bad fit, omit it entirely.",
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
    "CAUSALITY REASONING (make every recommendation a mini trajectory proof):",
    "- For each opportunity's 'reasoning' field, use this mental model: 'People who reached [goal] typically had [X + Y + Z]. You already have [X] (via [specific experience]). This step fills [Y].'",
    "- Example: 'Students who landed Google APM typically had: a shipped product with real users (you have this via your Amazon internal tools work) + a PM externship or case competition (this is your gap). Meta RPM fills the externship signal.'",
    "- The 'leverage' field should explain what this step UNLOCKS in the trajectory — not just what it is. Frame it as: 'This gives you [credential/signal] that [target outcome] specifically screens for.'",
    "- In gapAnalysis, frame gaps as missing trajectory components: 'People who land [goal] can point to [X]. You can't yet — this is the gap.'",
    "- Connect each opportunity to the SPECIFIC gap it closes. If an opportunity doesn't close a named gap, it's lower priority.",
    "- Think like a career advisor who's seen 100 students make this transition: what did the ones who succeeded have in common? What's this student missing from that pattern?",
    "",
    "DEADLINE RULES (students want a concrete date — give them one):",
    "- Fill 'deadline' with a full ISO date (YYYY-MM-DD) for the program's typical CURRENT-cycle application deadline, using the search results and your own knowledge of how the program runs (e.g. Google APM closes in early fall, most APM cohorts recruit Aug–Oct). Relative to today's date in the user prompt, pick the next upcoming occurrence.",
    "- It is better to give your best-estimate current-cycle date than to leave it blank. Only leave 'deadline' empty when the program is genuinely rolling/continuous — in that case set 'window' to 'Rolling'.",
    "- Never output a date in the past relative to today, and never use a year more than ~1 cycle out.",
    "",
    "reasoning: 2 COMPLETE sentences, plain second person. MUST reference something specific from the student's profile. Never leave a sentence unfinished.",
    "summary: 1-2 forward-framed sentences that reference the student's specific background. Do NOT describe the results as 'live search leads' or mention searching — write it as a confident, curated set of recommendations.",
    "deadline: best current-cycle ISO YYYY-MM-DD (see DEADLINE RULES); empty only if truly rolling.",
    "category: exactly one of " + CATEGORIES.join(", ") + ".",
    "",
    "Chain reasoning fields: gapLabel ONLY on the first opportunity. upstream, unlocks, and window on EVERY opportunity.",
    "",
    "DIVERSITY/IDENTITY-BASED PROGRAMS:",
    "- NEVER recommend programs that require specific racial, ethnic, gender, disability, or other identity-based eligibility (e.g. 'for underrepresented students', 'for Black/African-American students', 'for women in tech', 'for students with disabilities') UNLESS the student has explicitly self-identified as eligible.",
    "- If the search results contain such programs, skip them entirely unless the student profile indicates eligibility.",
    "- This includes programs like BOLD, APIA Scholars, AAPD, MLT, SEO, SHPE, NSBE, Outreachy, etc.",
    "- Programs open to ALL students regardless of identity (e.g. Kleiner Perkins, 8VC, Product Buds) are fine.",
    "",
    "FRAMING RULE FOR DIVERSITY PROGRAMS (when the student IS eligible):",
    "- Frame these programs as INVESTMENTS in the student's development — not as backdoors, shortcuts, or ways to bypass normal processes.",
    "- DO NOT use language like: 'pipeline', 'hack', 'side door', 'bypass the resume screen', 'skip the normal process', 'diversity hire', 'meat grinder', 'cold-apply grind'.",
    "- DO use language like: 'leadership development program', 'structured mentorship', 'career accelerator', 'professional development cohort', 'skill-building fellowship'.",
    "- The tone should be: 'This program was built to invest in students like you' — not 'This is how you game the system.'",
    "- Example BAD: 'Google's diversity pipeline — business roles are impossible to get without this.'",
    "- Example GOOD: 'A summer leadership program at Google focused on business roles, with mentorship from senior leaders and direct exposure to product teams.'",
    "",
    "DEPENDENCY CHAIN RULES (upstream/unlocks/window):",
    "- upstream: What this step builds on. Reference the student's ACTUAL prior experience where relevant (e.g. 'Builds on your Amazon SDE internship experience'). If nothing is required, write 'None — open to all eligible students'.",
    "- unlocks: 1-3 things this step makes possible. Only include outcomes that are logically true (e.g. a research position unlocks a faculty rec letter). Keep each unlock SHORT and self-contained — a complete phrase of ~15 words or fewer that ends cleanly, never trailing off mid-phrase.",
    "- window: Relative timing advice only — do NOT restate a specific calendar date or year (the deadline is shown separately, and a restated date can contradict it). E.g. 'Apply a few weeks before the deadline; interviews usually follow about a month later.' If no hard deadline, write 'Rolling' or omit.",
    "- Only name programs that genuinely exist. It is fine to name a real program from your own knowledge even if it is not in the search results, but never fabricate a program, a deadline, or a prerequisite.",
    "",
    "FACTUAL ATTRIBUTION (do not misattribute the student's background):",
    "- Only tie a skill, project, or accomplishment to a specific company, team, or program if the student's profile EXPLICITLY links them.",
    "- If the profile lists a type of work without saying where it happened (e.g. 'LLM-powered features', 'AI/ML evaluation'), refer to it generically — do NOT attach it to a different employer they listed for a separate role.",
    "- Example: given 'SDE Intern at AWS', 'worked on LLM features', and 'AI Fellow at Handshake AI', NEVER write 'your LLM work at AWS' — that link was never stated. Attribute it only as generally described, or to the org actually tied to it.",
    "- Never fabricate the employer, product, team, or context of any experience.",
    "",
    "OUTCOME LANGUAGE (no probability claims):",
    "- Never forecast the student's odds of admission, an offer, or acceptance. Do not use 'likely', 'guaranteed', 'you'll get in', 'high chance', or parenthetical tags like '(likely)'.",
    "- Frame 'unlocks' and 'leverage' as what the step CAN open or is DESIGNED to lead to, conditional on their performance — e.g. 'A strong showing can convert into a return offer' rather than 'Return offer (likely)'.",
    "",
    "NO FABRICATED STATS OR MECHANICS:",
    "- Never invent numbers or program mechanics you can't verify — no made-up conversion/acceptance rates (e.g. '70–80% convert'), cohort sizes, salary figures, or authority claims (e.g. 'direct investment decision-making authority', 'board seats', 'guaranteed visa sponsorship').",
    "- Describe what a program generally offers in plain, non-numeric terms. If you don't know a specific figure or mechanic, omit it rather than guessing.",
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
  const destination = normalizeGoal(data.goalText) || (track && track.id !== "something-else" ? track.label : "") || "not yet named";

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
  contextLines.push(`- Diversity/identity program eligibility: ${data.diversitySelfId ? "Student has self-identified as eligible for diversity/identity-based programs" : "NOT specified — do NOT recommend identity-based programs"}`);

  // Explicitly flag what's available for personalization
  const hasContext = !!(data.experience || data.priorWork || data.skills || data.clubs || data.alreadyDone);

  // Graduating seniors need full-time / new-grad roles, not internships — but we
  // do NOT assume they already have an offer (a senior with internships is
  // usually still recruiting for full-time).
  const isSenior = data.year.toLowerCase() === "senior";

  return [
    ...contextLines,
    "",
    hasContext
      ? "IMPORTANT: This student has provided detailed background (experience, internships, skills, clubs). Your reasoning for EVERY opportunity MUST reference their specific background by name. Do NOT write generic reasoning. Every 'reasoning' field should read like it was written by an advisor who read their full resume."
      : "NOTE: This student has not provided detailed background yet. Base personalization on their year, major, school, and goal.",
    "",
    ...(isSenior ? [
      "CONTEXT — GRADUATING SENIOR: Prioritize full-time and new-grad roles, rotational programs, and full-time-transition steps. Do NOT recommend freshman/sophomore pipelines or 'get your first internship' advice — they're past that. IMPORTANT: New-grad rotational programs and full-time roles at named companies (e.g. a company's 'Students & Grads' program, a named 'Rotational Program', or a specific new-grad role) ARE appropriate opportunities and SHOULD be included when they fit the goal. Do NOT assume the student already has an offer — a senior with internship experience is usually still recruiting, so surfacing real full-time/new-grad programs is exactly what helps them.",
      "",
    ] : []),
    "SEARCH RESULTS (context and link source — not your only source of fact):",
    "============================================",
    searchResults,
    "============================================",
    "",
    "Use these results to confirm which programs are live and to find official application links. Then produce the definitive ranked list of REAL, NAMED opportunities for this student — drawing on your own knowledge of the landscape, not just what appears above. Match the caliber of a curated advisor's list.",
    "Rank by leverage and fit to their background. Include 1-2 candid lower-fit options with honest reasoning about why they rank lower.",
    "For EVERY opportunity, give a DIRECT official application/program link when you are confident of it (from the results if present, otherwise the program's real official URL); if unsure, leave 'link' empty and rely on 'sources'. Also give upstream (what it builds on), unlocks (what it opens), and window (timing). If no prerequisite exists, set upstream to 'None — open to all eligible students'.",
    "ALWAYS include a gapAnalysis object — strengths must cite SPECIFIC things from their profile, gaps must identify what's ACTUALLY missing given their background.",
    "Only include a deadline when you're confident it's the current cycle; otherwise leave it empty and rely on timeframe. Never guess a date.",
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

function clean(parsed: z.infer<typeof LiveResponseSchema>, data: z.infer<typeof Input>): LiveRoadmap | null {
  const track = TRACKS.find((t) => t.id === data.trackId) ?? TRACKS[0];
  const seenNames = new Set<string>();
  const opportunities: Opportunity[] = [];
  const steps: { opportunityId: string; reasoning: string }[] = [];

  for (const raw of parsed.opportunities) {
    // Strip a trailing period/whitespace from the program name — the advisor
    // sometimes ends the name like a sentence ("...Analyst Program."), which
    // reads oddly as a card title. Keep internal punctuation intact.
    const name = trim(raw.name, 120).replace(/\s*\.+\s*$/, "").trim();
    // Keep the model's link only when it's a well-formed URL; otherwise leave it
    // empty and let opportunityLink() fall back to a real source URL or a program
    // search at render time. We no longer drop a card just for a missing/bad link
    // — that was leaving users with dead-end opportunities.
    const link = safeUrl(raw.link) ?? "";
    if (!name) continue;

    // Reject generic career portal pages that aren't specific programs
    const genericPageNames = /^(students?|careers?|early\s*careers?|internships?\s*(&|and)\s*programs?|programs?|opportunities|jobs?)$/i;
    if (genericPageNames.test(name.trim())) continue;

    // Reject informational articles, guides, lists that aren't actionable programs
    const infoSignals = /full list|complete guide|ultimate guide|how to|top \d+|ranking|what is|vs\.|overview|explained/i;
    if (infoSignals.test(name)) continue;

    // Reject only if the card itself is a junk SOURCE (a generic landing page or
    // catch-all resource). We deliberately DO NOT reject on honest fit language
    // like "lower-leverage for you" / "misaligns with your stage" — a candid
    // ranked list that includes lower-fit options is exactly what we want.
    const junkSourceSignals = /generic (landing|careers?|recruiting) page|not a specific program|catch-all|general resource/i;
    if (junkSourceSignals.test(raw.reasoning)) continue;

    // Reject closed/expired programs based on text signals
    const closedSignals = /applications?\s+(are\s+)?(now\s+)?closed|no longer accepting|deadline has passed|program (is|has been) (discontinued|cancelled)/i;
    if (closedSignals.test(raw.reasoning) || closedSignals.test(raw.leverage) || closedSignals.test(raw.timeframe)) continue;

    // NOTE: We intentionally trust the model's 'link' here. Sylo now uses Claude
    // as the retriever (like the pin-drop extractor): it names real programs and
    // supplies their official application URL, which is often NOT one of the raw
    // Serper result links. safeUrl() still guarantees a well-formed http(s) URL.

    const nameKey = name.toLowerCase().replace(/\d{4}[\/\-]\d{4}|\d{4}/g, "").replace(/[^a-z\s]/g, "").replace(/\s+/g, " ").trim();
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
    // A knowledge-named program may arrive without a separate sources array — its
    // official 'link' is the source of truth, so synthesize one rather than drop
    // the card.
    if (sources.length === 0 && link) {
      const host = hostOf(link);
      sources.push({ title: host || name, url: link });
    }

    const isHero = opportunities.length === 0;
    const unlocks = (raw.unlocks ?? []).map((u) => trim(u, 320)).filter(Boolean).slice(0, 4);
    seenNames.add(nameKey);
    const id = slug(name, opportunities.length);

    opportunities.push({
      // Web-searched programs are national by default, not school-specific — so the
      // Long View badges them "National" rather than falsely tagging them to the
      // student's school.
      id, name, track: track.id, category: raw.category, access: "direct", school: "any",
      deadline: (() => {
        const d = raw.deadline.trim();
        if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return "";
        const deadlineDate = new Date(d);
        // Reject PAST deadlines. A search often surfaces last cycle's date for a
        // recurring program; showing "Deadline passed" (or ranking it) is worse
        // than showing no date, so blank it and let the card say "check the link".
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (deadlineDate < today) return "";
        // Reject dates more than 2 years in the future — likely hallucinated
        const maxFuture = new Date();
        maxFuture.setFullYear(maxFuture.getFullYear() + 2);
        if (deadlineDate > maxFuture) return "";
        return d;
      })(),
      timeframe: trim(raw.timeframe, 80) || "Timing not confirmed",
      requirements: raw.requirements.map((r) => trim(r, 90)).filter(Boolean).slice(0, 6),
      contact: trim(raw.contact, 120), link,
      timeline: trim(raw.timeline, 300), leverage: trim(raw.leverage, 400),
      courseCode: raw.courseCode ? trim(raw.courseCode, 20) : undefined,
      gapLabel: isHero && raw.gapLabel ? trim(raw.gapLabel, 200) : undefined,
      upstream: raw.upstream ? trim(raw.upstream, 350) : undefined,
      unlocks: unlocks.length ? unlocks : undefined,
      window: raw.window ? trim(raw.window, 240) : undefined,
      origin: "live", sources, singleSourced: sources.length < 2,
    });
    steps.push({ opportunityId: id, reasoning: trim(raw.reasoning, 600) || trim(raw.leverage, 400) });
  }

  if (opportunities.length === 0) return null;
  return {
    summary: trim(parsed.summary, 500) || `You're a ${data.year} ${data.major} major at ${data.school}. Everything below was found by search just now.`,
    topOpportunityId: opportunities[0].id,
    steps,
    alternates: (parsed.alternates ?? []).map((a) => ({ title: trim(a.title, 120), detail: trim(a.detail, 280) })).filter((a) => a.title && a.detail).slice(0, 2),
    opportunities,
    // Sanitize gap analysis — strip any hallucinated URLs from text fields
    gapAnalysis: parsed.gapAnalysis ? {
      strengths: parsed.gapAnalysis.strengths.map((s) => cleanText(s.replace(/https?:\/\/[^\s)]+/g, ""), 600)),
      gaps: parsed.gapAnalysis.gaps.map((g) => ({
        gap: cleanText(g.gap.replace(/https?:\/\/[^\s)]+/g, ""), 400),
        why: cleanText(g.why.replace(/https?:\/\/[^\s)]+/g, ""), 600),
        action: cleanText(g.action.replace(/https?:\/\/[^\s)]+/g, ""), 600),
      })),
      bottomLine: cleanText(parsed.gapAnalysis.bottomLine.replace(/https?:\/\/[^\s)]+/g, ""), 550),
    } : undefined,
  };
}

function extractJson(text: string): unknown | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidates = [fenced?.[1], text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1)];
  for (const c of candidates) { if (!c) continue; try { return JSON.parse(c); } catch { /* next */ } }
  // Last resort: the response was likely truncated mid-object (hit the token
  // ceiling). Try to salvage it by closing any unterminated string/brackets so
  // we keep the complete opportunities instead of dropping to the raw fallback.
  const repaired = repairTruncatedJson(text);
  if (repaired) { try { return JSON.parse(repaired); } catch { /* give up */ } }
  return null;
}

/**
 * Best-effort repair of a JSON object that was cut off mid-generation. Walks
 * the text tracking string/escape state and bracket depth, trims any trailing
 * partial token, then appends the closing brackets needed to balance. Returns
 * null if there's nothing usable.
 */
function repairTruncatedJson(text: string): string | null {
  const start = text.indexOf("{");
  if (start === -1) return null;
  const s = text.slice(start);

  let inStr = false;
  let esc = false;
  const stack: string[] = [];
  let lastComplete = -1; // index (exclusive) right after a top-level-safe close or comma

  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === "\\") esc = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') { inStr = true; continue; }
    if (ch === "{" || ch === "[") stack.push(ch);
    else if (ch === "}") { if (stack[stack.length - 1] === "{") stack.pop(); lastComplete = i + 1; }
    else if (ch === "]") { if (stack[stack.length - 1] === "[") stack.pop(); lastComplete = i + 1; }
  }

  // If nothing ever closed, we can't safely salvage.
  if (lastComplete === -1) return null;

  // Cut back to the last structurally complete point (drops a trailing partial
  // property/value), then re-walk to compute the still-open bracket stack.
  let body = s.slice(0, lastComplete).replace(/,\s*$/, "");
  const open: string[] = [];
  inStr = false; esc = false;
  for (let i = 0; i < body.length; i++) {
    const ch = body[i];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === "\\") esc = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') inStr = true;
    else if (ch === "{" || ch === "[") open.push(ch);
    else if (ch === "}" || ch === "]") open.pop();
  }
  while (open.length) {
    body += open.pop() === "{" ? "}" : "]";
  }
  return body;
}

// --- Fallback: structure raw search results without an LLM ------------------

// Job-board aggregators and content sites that are never a single, applyable
// program. A card pointing at an Indeed/LinkedIn search or a "top 20" article
// is noise, so these hosts are dropped before we build fallback cards.
const AGGREGATOR_HOSTS = new Set([
  "wikipedia.org", "bls.gov", "indeed.com", "glassdoor.com", "linkedin.com",
  "ziprecruiter.com", "simplify.jobs", "github.com", "reddit.com", "builtin.com",
  "dice.com", "monster.com", "wellfound.com", "angel.co", "levels.fyi",
  "medium.com", "quora.com", "coursera.org", "udemy.com", "youtube.com",
  "salary.com", "payscale.com", "teal.com", "jobright.ai",
]);

const FALLBACK_INFO_PATTERN =
  /full list|complete guide|ultimate guide|how to|top \d+|\bbest\b|ranking|what is|vs\.|overview|explained|salary|interview (prep|questions)|reddit|\bwiki\b|cheat ?sheet|\d+\+? (jobs|roles|positions)|jobs,?\s+employment|now hiring|\$\d/i;

// Titles that describe a listing/search/aggregator/article rather than a single
// applyable program. These slip past the host denylist because they live on
// many different domains, so we reject them by shape of the title.
const GENERIC_LISTING_PATTERN =
  /\broadmap\b|degree search|job (board|search)|jobs? (in|for|near|by|at)\b|entry[- ]level|recent grad|new grad(uate)? (jobs|roles|positions)|list of|directory|browse|explore|category|search tool|listings?\b|bachelor'?s|master'?s degree|master'?s program|\bdegree\b|bootcamp|graduate programs?/i;

/**
 * True when a title carries no company/program identity — it's just the role
 * name ("Data Scientist", "DATA SCIENTISTS") or the student's goal words alone.
 * Such a card can't be applied to, so it shouldn't appear on the board.
 */
function isGenericRoleTitle(name: string, goal: string): boolean {
  const norm = name.toLowerCase().replace(/[^a-z]+/g, " ").trim();
  const goalNorm = goal.toLowerCase().replace(/[^a-z]+/g, " ").trim();
  if (!norm) return true;
  if (norm === goalNorm || norm === `${goalNorm}s`) return true;
  if (/^data scientists?$/.test(norm) || /^data science$/.test(norm)) return true;
  return false;
}

/** Best-effort category for a raw search result, since the fallback has no LLM. */
function inferCategory(title: string): Opportunity["category"] {
  const t = title.toLowerCase();
  if (/fellow|fellowship|residency/.test(t)) return "Fellowship";
  if (/research|\blab\b|reu/.test(t)) return "Research";
  if (/scholar|grant|funding|award/.test(t)) return "Funding";
  // Rotational / new-grad / internship programs and named company roles.
  return "Internship";
}

/**
 * Last-resort structuring of raw Serper results into a roadmap when the LLM
 * pass returns nothing (either it errored, or it flagged found:false and
 * rejected every result). We drop aggregators and info/list articles, keep
 * named programs and company roles, and hand the survivors to the enrichment
 * step (Step 6) which layers on gap analysis and personalized reasoning — so
 * these cards end up at parity with the LLM-structured path.
 */
function fallbackFromSearchResults(
  rawResults: SerperResult[],
  data: z.infer<typeof Input>,
): LiveRoadmap | null {
  const track = TRACKS.find((t) => t.id === data.trackId) ?? TRACKS[0];
  const goal =
    normalizeGoal(data.goalText) ||
    (track.id !== "something-else" ? track.label : "") ||
    "your goal";

  // Filter to results that look like real programs/opportunities (not generic
  // info pages or job-board aggregator searches).
  const seenHosts = new Map<string, number>();
  const relevant = rawResults.filter((r) => {
    const host = hostOf(r.link);
    if (!host) return false;
    // Drop aggregators and their subdomains (e.g. jobs.linkedin.com).
    if ([...AGGREGATOR_HOSTS].some((h) => host === h || host.endsWith(`.${h}`))) return false;
    if (FALLBACK_INFO_PATTERN.test(r.title)) return false;
    // Drop listing/search/article titles and bare role labels — they aren't a
    // single program a student can apply to.
    if (GENERIC_LISTING_PATTERN.test(r.title)) return false;
    if (isGenericRoleTitle(r.title, goal)) return false;
    // Cap to 2 results per host so one company's careers site can't fill the board.
    const count = seenHosts.get(host) ?? 0;
    if (count >= 2) return false;
    seenHosts.set(host, count + 1);
    return true;
  }).slice(0, 5);

  if (relevant.length < 2) return null;

  const opportunities: Opportunity[] = [];
  const steps: { opportunityId: string; reasoning: string }[] = [];

  for (const r of relevant) {
    const link = safeUrl(r.link);
    if (!link) continue;
    const host = hostOf(link);
    // Strip a trailing " | Site Name" / " - Site Name" suffix from the title —
    // but if that leaves a too-generic stub (e.g. "Students and Grads"), keep the
    // full title so the company/program context isn't lost.
    const full = r.title.trim();
    const stripped = full.replace(/\s*[\|·–—-]\s*[^|·–—-]*$/, "").trim();
    const genericStub = /^(students?|grads?|students?\s+(and|&)\s+grads?|careers?|jobs?|programs?|opportunities|new grads?)$/i;
    const name = (stripped.length >= 15 && !genericStub.test(stripped) ? stripped : full).slice(0, 120);
    const id = slug(name, opportunities.length);

    opportunities.push({
      id,
      name,
      track: track.id,
      category: inferCategory(r.title),
      access: "direct",
      school: "any",
      deadline: "",
      timeframe: "Check link for current dates",
      requirements: [],
      contact: "",
      link,
      timeline: cleanText(r.snippet, 240),
      leverage: cleanText(r.snippet, 240) || r.title,
      origin: "live",
      sources: [{ title: host || r.title.slice(0, 60), url: link }],
      singleSourced: true,
    });
    steps.push({
      opportunityId: id,
      reasoning: cleanText(r.snippet, 280) || `A ${goal} opening surfaced by search for a ${data.year} at ${data.school}.`,
    });
  }

  if (opportunities.length === 0) return null;

  return {
    summary: `These programs are matched to your profile as a ${data.year} ${data.major} student at ${data.school}. Each links to its official page — confirm the current deadline there before you apply.`,
    topOpportunityId: opportunities[0].id,
    steps,
    alternates: [],
    opportunities,
  };
}

// --- Serper raw results (needed for fallback) --------------------------------

async function gatherSearchResultsRaw(data: z.infer<typeof Input>, serperKey: string): Promise<SerperResult[]> {
  const track = TRACKS.find((t) => t.id === data.trackId);
  const goal = normalizeGoal(data.goalText) || (track && track.id !== "something-else" ? track.label : "") || "career opportunities";
  const isGrad = isGradStudent(data.year);

  // Recruiting runs ~a year ahead. Once we're past early spring, the live cycle
  // is NEXT year's — so bias the search toward the upcoming cycle instead of a
  // hardcoded year that goes stale (and surfaces already-closed programs).
  const now = new Date();
  const cycle = now.getMonth() >= 3 ? now.getFullYear() + 1 : now.getFullYear();
  const yr = `${cycle}`;
  const acadYr = `${cycle} ${cycle + 1}`;

  let queries: string[];

  if (isGrad) {
    // Graduate-specific queries: focus on fellowships, residencies, funding, conferences
    queries = [
      `${goal} fellowship residency program PhD graduate ${acadYr} apply`,
      `${goal} research funding grant PhD student application deadline`,
      `${data.major} PhD ${goal} workshop conference call for papers ${acadYr}`,
    ];
    // Add school-specific query
    queries.push(`${data.school} ${data.major} PhD funding fellowship opportunity`);
    // Add goal-specific industry research query
    if (goal.toLowerCase().includes("industry") || goal.toLowerCase().includes("research scientist")) {
      queries.push(`${goal} research intern PhD student summer ${acadYr}`);
    }
  } else {
    // Only GRADUATING SENIORS want full-time / new-grad roles. Juniors and below
    // recruit for summer internships — even experienced ones — so seniority is
    // based on class year, NOT on how much experience they have.
    const isSenior = data.year.toLowerCase() === "senior";

    if (isSenior) {
      queries = [
        `${goal} full-time new grad analyst rotational program ${yr} apply`,
        `${goal} entry level new graduate role ${data.major} application deadline`,
        `${data.school} ${goal} full-time recruiting new grad program`,
      ];
    } else {
      // Underclassman / junior queries — target named programs and company
      // internship roles with real application pages (not articles/aggregators).
      queries = [
        `${goal} summer ${yr} internship program apply application undergraduate`,
        `${goal} internship for ${data.major} students application deadline ${yr}`,
        `company ${goal} summer ${yr} internship program apply ${data.year}`,
      ];
    }
  }

  // Add a targeted query if skills or prior work provide signal
  if (data.skills) {
    const topSkill = data.skills.split(/[,;]/).map((s) => s.trim()).filter(Boolean)[0];
    if (topSkill) {
      queries.push(isGrad
        ? `${topSkill} ${goal} fellowship residency PhD ${acadYr}`
        : `${data.school} ${topSkill} ${goal} summer ${yr} internship`);
    }
  }
  if (data.priorWork && !isGrad) {
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

    // Surface a config problem loudly: without Serper, any profile whose curated
    // coverage is thin (common for arbitrary judge-submitted resumes) falls back
    // to the empty state instead of live-searching real opportunities.
    if (!serperKey) {
      console.warn("[LIVE-ROADMAP] SERPER_API_KEY not set — live web search disabled; relying on curated data only.");
    }
    if (!anthropicKey) {
      console.warn("[LIVE-ROADMAP] ANTHROPIC_API_KEY not set — gap analysis and personalized reasoning disabled.");
    }

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
      console.error(
        `[LIVE-ROADMAP] Serper returned ${rawResults.length} results. Titles:`,
        rawResults.slice(0, 10).map((r) => r.title),
      );
      if (rawResults.length === 0 && curatedResults.length === 0) {
        console.error("[LIVE-ROADMAP] no search results and no curated results");
        return null;
      }

      const searchResults = rawResults.map((r, i) => `[${i + 1}] "${r.title}"\n    URL: ${r.link}\n    Snippet: ${r.snippet}`).join("\n\n");
      console.error("[LIVE-ROADMAP] got results, sending to Sonnet advisor...");

      // Step 3: Try Claude to structure the live results
      let result: LiveRoadmap | null = null;

      if (anthropicKey && rawResults.length > 0) {
        try {
          const client = createAnthropicClient(anthropicKey);
          const response = await client.messages.create(
            {
              model: ANALYSIS_MODEL,
              // The advisor returns 6-9 richly-detailed cards plus gap analysis
              // in one response. Sonnet is verbose, so 4096 truncated the JSON
              // mid-object and silently dropped us to the raw-search fallback.
              // 8000 gives comfortable headroom for a full board.
              max_tokens: 8000,
              system: buildSystemPrompt(),
              messages: [{ role: "user", content: buildUserPrompt(data, searchResults) }],
            },
            { signal: controller.signal },
          );

          // If Claude hit the token ceiling the JSON is truncated and won't
          // parse — surface that explicitly instead of failing mysteriously.
          if (response.stop_reason === "max_tokens") {
            console.error("[LIVE-ROADMAP] WARNING: advisor response hit max_tokens — JSON likely truncated. Raise max_tokens or reduce card count.");
          }

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
              result = clean(parsed.data, data);
              console.error(`[LIVE-ROADMAP] advisor produced ${result?.opportunities.length ?? 0} named programs`);
            } else if (parsed.success) {
              console.error(
                `[LIVE-ROADMAP] advisor returned found:false with ${parsed.data.opportunities?.length ?? 0} opportunities`,
              );
            } else {
              console.error("[LIVE-ROADMAP] schema error");
            }
          } else {
            console.error("[LIVE-ROADMAP] couldn't parse advisor JSON. stop_reason:", response.stop_reason, "| first 400 chars:", text.slice(0, 400));
          }
        } catch (llmErr) {
          console.error("[LIVE-ROADMAP] LLM failed, falling back to raw results:", llmErr instanceof Error ? llmErr.message : llmErr);
        }
      }

      // Step 4: If the LLM failed, wasn't available, or flagged found:false and
      // rejected every result, structure the raw search results directly. This
      // keeps a student on an uncovered path (no curated data, strict LLM) from
      // hitting a dead-end empty state when search DID surface real programs.
      // The survivors are filtered (no aggregators/articles) and then polished
      // by the enrichment pass in Step 6, so they reach parity with LLM output.
      if (!result && rawResults.length > 0) {
        result = fallbackFromSearchResults(rawResults, data);
        if (result) {
          console.error("[LIVE-ROADMAP] used raw-search fallback:", { opportunities: result.opportunities.length });
        } else {
          console.error("[LIVE-ROADMAP] fallback produced nothing usable from raw results");
        }
      }

      // Step 5: Merge curated results into the live roadmap
      if (result && curatedResults.length > 0) {
        const curatedOpportunities = curatedResults.map(curatedRecordToOpportunity);
        const curatedSteps = curatedOpportunities.map((op) => ({
          opportunityId: op.id,
          reasoning: op.leverage || `Curated opportunity for ${data.year} students.`,
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

      // Step 6: The advisor call already returns gap analysis, personalized
      // reasoning, and dependency chains inline, so no second pass is needed for
      // it. Only run the enrichment pass when we fell through to the raw-search
      // fallback (bare cards with no analysis) — detected by a missing
      // gapAnalysis. This preserves the advisor's own high-quality output and
      // avoids paying for two extra Sonnet calls on the main path.
      const isLiveOnly = result && curatedResults.length < CURATED_THRESHOLD;
      if (result && anthropicKey && isLiveOnly && !result.gapAnalysis) {
        try {
          const enrichResult = await buildCuratedRoadmap(
            result.opportunities.map((o) => ({
              ...o,
              tags: [],
              yearRelevance: [],
              region: "National",
              confidence: "curated" as const,
              lastVerified: "",
              recurring: false,
              source: "",
            })) as OpportunityRecord[],
            data,
            anthropicKey,
          );
          if (enrichResult.gapAnalysis) result.gapAnalysis = enrichResult.gapAnalysis;
          for (const enrichedStep of enrichResult.steps) {
            const original = result.steps.find((s) => s.opportunityId === enrichedStep.opportunityId);
            if (original && enrichedStep.reasoning.length > 50) original.reasoning = enrichedStep.reasoning;
          }
          for (const enrichedOp of enrichResult.opportunities) {
            const original = result.opportunities.find((o) => o.id === enrichedOp.id);
            if (original) {
              if (enrichedOp.upstream) original.upstream = enrichedOp.upstream;
              if (enrichedOp.unlocks?.length) original.unlocks = enrichedOp.unlocks;
              if (enrichedOp.window) original.window = enrichedOp.window;
            }
          }
        } catch (enrichErr) {
          console.error("[LIVE-ROADMAP] enrichment call failed:", enrichErr);
        }
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
