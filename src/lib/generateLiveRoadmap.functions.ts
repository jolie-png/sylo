import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createAnthropicClient, hashKey } from "./anthropic.server";
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
    // "something-else" track means the user's goal doesn't map to a specific track —
    // search across ALL tracks using their goal text as a keyword instead.
    track: data.trackId === "something-else" ? undefined : data.trackId as any,
    school: data.school,
    year: data.year,
    query: data.goalText || undefined,
    // Exclude diversity-cohort programs unless the student has opted in
    excludeTags: data.diversitySelfId ? undefined : ["diversity-cohort"],
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
        model: "claude-haiku-4-5-20251001",
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
            strengths: parsed.strengths.map((s: string) => cleanText(s.replace(/https?:\/\/[^\s)]+/g, ""), 350)),
            gaps: parsed.gaps.map((g: any) => ({
              gap: cleanText(g.gap?.replace(/https?:\/\/[^\s)]+/g, "") || "", 300),
              why: cleanText(g.why?.replace(/https?:\/\/[^\s)]+/g, "") || "", 350),
              action: cleanText(g.action?.replace(/https?:\/\/[^\s)]+/g, "") || "", 350),
            })),
            bottomLine: cleanText(parsed.bottomLine.replace(/https?:\/\/[^\s)]+/g, ""), 450),
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
        model: "claude-haiku-4-5-20251001",
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

For "unlocks": List 1-3 SPECIFIC things this step opens. Not generic benefits — actual next steps it enables. E.g. "Return offer pipeline at the company", "Faculty recommendation letter for grad school", "Access to partner company recruiting events."

For "window": The timing constraint. Include the deadline if known, and any strategic timing advice. E.g. "Apply by Oct 14 — interviews start November, so prep cases by mid-October."

Rules:
- ALWAYS name their specific companies, skills, roles, and clubs.
- The EDGE must be genuinely actionable.
- "unlocks" should be things that are CAUSALLY downstream — not just generic benefits of any internship.
- "upstream" should connect to their SPECIFIC prior experience, not generic prerequisites.`,
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
                  if (!op.unlocks?.length && Array.isArray(entry.unlocks)) op.unlocks = entry.unlocks.map((u: any) => cleanText(String(u).replace(/https?:\/\/[^\s)]+/g, ""), 150)).filter(Boolean).slice(0, 4);
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
    "RESULT FILTERING (CRITICAL — reject junk from search results):",
    "- REJECT news articles, press releases, or blog posts that are not actionable opportunities. If a result is just announcing something happened or reporting on a program without an apply link, skip it.",
    "- REJECT generic program listings the student is ALREADY in. If they're a PhD student, do NOT recommend 'PhD programs' or 'graduate admissions' pages — they're already admitted.",
    "- REJECT opportunities with eligibility the student clearly doesn't meet. If the student is a graduate student, skip anything that says 'undergraduate only', 'recent graduate (within 6 months)', or 'must be enrolled as an undergraduate'.",
    "- REJECT results that are just department homepages, faculty listings, or university news pages — these are not opportunities.",
    "- REJECT results where the title is a sentence fragment or news headline rather than a program/opportunity name.",
    "- REJECT programs that explicitly state applications are closed, deadlines have passed, or are no longer accepting applicants for the current cycle. Only include opportunities that are currently open or will open soon.",
    "- REJECT generic career portals, recruiting landing pages, or 'Students & Graduates' homepages that are not a specific named program with a clear application process. If the page title is just 'Students', 'Careers', 'Early Careers', or 'Internships & Programs' without naming a specific program, it's a landing page — skip it.",
    "- REJECT results where the snippet is just navigation text, login prompts, or boilerplate about the company — these are not opportunities.",
    "- If after filtering fewer than 2 real opportunities remain, return found=false rather than padding with junk results.",
    "- NEVER include a result you would advise the student NOT to pursue. If your honest assessment is 'this is redundant', 'this is below your level', 'this is a step backward', or 'this doesn't apply to you' — do NOT include it in the opportunities array at all. Only include opportunities where your reasoning is genuinely 'you should do this.' If you can't say 'yes, do this' about a result, leave it out entirely.",
    "- REJECT generic informational resources (guides, lists, articles about the industry) that are not specific actionable programs with application processes. 'Investment Banking Target Schools: Full List' is a blog post, not an opportunity.",
    "- Every opportunity you return MUST pass this test: 'Can the student take a concrete action (apply, register, attend, submit an application) at the provided link within the next 12 months?' If the answer is no — if the link is just information to read, a list to browse, or a resource to bookmark — it is NOT an opportunity and you MUST skip it.",
    "- Ask yourself before including each result: 'Would I confidently tell this specific student to do this right now?' If the answer is 'maybe' or 'it depends' or 'it's just good to know about' — leave it out. Only include results where you'd say 'Yes, do this.'",
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
    "DEADLINE RULES:",
    "- deadline MUST be a full ISO date: YYYY-MM-DD. The year is REQUIRED.",
    "- The year must be the CURRENT or NEXT application cycle relative to today's date (provided in the user prompt). Never use past years.",
    "- If the search results mention a month but no year, infer the correct year: if the month is in the future relative to today, use the current year. If it's in the past, use next year.",
    "- If no specific date is found in the search results, leave deadline as empty string. Do NOT guess dates.",
    "",
    "reasoning: 2-3 COMPLETE sentences, plain second person. MUST reference something specific from the student's profile. Never leave a sentence unfinished — if you're running long, end the current sentence and stop. A complete thought is better than a truncated one.",
    "summary: 1-2 forward-framed sentences that reference the student's specific background.",
    "deadline: ISO YYYY-MM-DD if found in search results, otherwise empty string. MUST include year.",
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
  contextLines.push(`- Diversity/identity program eligibility: ${data.diversitySelfId ? "Student has self-identified as eligible for diversity/identity-based programs" : "NOT specified — do NOT recommend identity-based programs"}`);

  // Explicitly flag what's available for personalization
  const hasContext = !!(data.experience || data.priorWork || data.skills || data.clubs || data.alreadyDone);

  // Detect advanced students who likely already have offers
  const isSenior = data.year.toLowerCase() === "senior";
  const hasExtensiveExperience = (data.priorWork?.split(/[,;]/).length ?? 0) >= 2 || (data.priorWork?.length ?? 0) > 100;
  const likelyHasOffer = isSenior && hasExtensiveExperience;

  return [
    ...contextLines,
    "",
    hasContext
      ? "IMPORTANT: This student has provided detailed background (experience, internships, skills, clubs). Your reasoning for EVERY opportunity MUST reference their specific background by name. Do NOT write generic reasoning. Every 'reasoning' field should read like it was written by an advisor who read their full resume."
      : "NOTE: This student has not provided detailed background yet. Base personalization on their year, major, school, and goal.",
    "",
    ...(likelyHasOffer ? [
      "CRITICAL CONTEXT: This is a SENIOR with extensive internship experience. They very likely already have a return offer or are in final-round recruiting. DO NOT recommend exploratory programs, freshman/sophomore pipelines, or 'getting your first internship' advice. Focus instead on: maximizing their final year, preparing for full-time transition, choosing between offers, or building skills for their first year on the job. If few programs are relevant at this stage, return fewer results rather than padding with irrelevant ones.",
      "",
    ] : []),
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

    // Reject generic career portal pages that aren't specific programs
    const genericPageNames = /^(students?|careers?|early\s*careers?|internships?\s*(&|and)\s*programs?|programs?|opportunities|jobs?)$/i;
    if (genericPageNames.test(name.trim())) continue;

    // Reject informational articles, guides, lists that aren't actionable programs
    const infoSignals = /full list|complete guide|ultimate guide|how to|top \d+|ranking|what is|vs\.|overview|explained/i;
    if (infoSignals.test(name)) continue;

    // Reject if reasoning explicitly calls it a generic page or not useful
    const genericSignals = /generic (landing|careers?|recruiting) page|not a specific program|catch-all|general resource|step backward|below your level|redundant|doesn't apply|not actionable/i;
    if (genericSignals.test(raw.reasoning)) continue;

    // Reject closed/expired programs based on text signals
    const closedSignals = /applications?\s+(are\s+)?(now\s+)?closed|no longer accepting|deadline has passed|program (is|has been) (discontinued|cancelled)/i;
    if (closedSignals.test(raw.reasoning) || closedSignals.test(raw.leverage) || closedSignals.test(raw.timeframe)) continue;

    // Anti-hallucination: if we have a set of known-good URLs from search,
    // reject any link Claude produced that wasn't in the original results.
    // This prevents the AI from inventing plausible-looking URLs.
    if (knownUrls && knownUrls.size > 0 && !knownUrls.has(link)) {
      // Check if the domain at least matches a known result (looser check)
      const linkHost = hostOf(link);
      const hasMatchingDomain = linkHost && [...knownUrls].some((u) => hostOf(u) === linkHost);
      if (!hasMatchingDomain) continue; // Fully hallucinated domain — skip entirely
    }

    const nameKey = name.toLowerCase().replace(/\d{4}[\/\-]\d{4}|\d{4}/g, "").replace(/[^a-z\s]/g, "").replace(/\s+/g, " ").trim();
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
      strengths: parsed.gapAnalysis.strengths.map((s) => cleanText(s.replace(/https?:\/\/[^\s)]+/g, ""), 350)),
      gaps: parsed.gapAnalysis.gaps.map((g) => ({
        gap: cleanText(g.gap.replace(/https?:\/\/[^\s)]+/g, ""), 300),
        why: cleanText(g.why.replace(/https?:\/\/[^\s)]+/g, ""), 350),
        action: cleanText(g.action.replace(/https?:\/\/[^\s)]+/g, ""), 350),
      })),
      bottomLine: cleanText(parsed.gapAnalysis.bottomLine.replace(/https?:\/\/[^\s)]+/g, ""), 450),
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
  const infoPattern = /full list|complete guide|ultimate guide|how to|top \d+|ranking|what is|vs\.|overview|explained|salary|interview prep|reddit/i;
  const relevant = rawResults.filter((r) => {
    const host = hostOf(r.link);
    if (!host || dominated.has(host)) return false;
    if (infoPattern.test(r.title)) return false;
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
      leverage: cleanText(r.snippet, 240) || r.title,
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
  const isGrad = isGradStudent(data.year);

  let queries: string[];

  if (isGrad) {
    // Graduate-specific queries: focus on fellowships, residencies, funding, conferences
    queries = [
      `${goal} fellowship residency program PhD graduate 2026 2027 apply`,
      `${goal} research funding grant PhD student application deadline`,
      `${data.major} PhD ${goal} workshop conference call for papers 2026 2027`,
    ];
    // Add school-specific query
    queries.push(`${data.school} ${data.major} PhD funding fellowship opportunity`);
    // Add goal-specific industry research query
    if (goal.toLowerCase().includes("industry") || goal.toLowerCase().includes("research scientist")) {
      queries.push(`${goal} research intern PhD student summer 2026 2027`);
    }
  } else {
    // Undergraduate queries (existing logic)
    queries = [
      `${data.school} ${goal} program opportunity ${data.year} student 2025 2026`,
      `${goal} internship fellowship for ${data.major} undergrad ${data.school}`,
      `${data.school} ${data.major} research club career program apply deadline`,
    ];
  }

  // Add a targeted query if skills or prior work provide signal
  if (data.skills) {
    const topSkill = data.skills.split(/[,;]/).map((s) => s.trim()).filter(Boolean)[0];
    if (topSkill) {
      queries.push(isGrad
        ? `${topSkill} ${goal} fellowship residency PhD 2026 2027`
        : `${data.school} ${topSkill} ${goal} program internship 2025 2026`);
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
              max_tokens: 4096,
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
        console.error("[LIVE-ROADMAP] fallback disabled — raw search results don't meet quality bar");
        // Fallback disabled: raw search results without AI structuring produce
        // low-quality cards (no requirements, wrong categories, informational articles).
        // Better to return null and let the curated DB carry the roadmap.
        // result = fallbackFromSearchResults(rawResults, data);
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

      // Step 6: For live-search results, ALWAYS run the enrichment call to get
      // gap analysis, personalized reasoning, and dependency chains at the same
      // quality level as the curated path. This is what makes the difference
      // between generic search snippets and deeply personalized roadmap content.
      const isLiveOnly = result && curatedResults.length < CURATED_THRESHOLD;
      if (result && anthropicKey && isLiveOnly) {
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
          // Always take gap analysis from enrichment (it's higher quality than inline)
          if (enrichResult.gapAnalysis) {
            result.gapAnalysis = enrichResult.gapAnalysis;
          }
          // Replace reasoning and dependency chains with enriched versions
          for (const enrichedStep of enrichResult.steps) {
            const original = result.steps.find((s) => s.opportunityId === enrichedStep.opportunityId);
            if (original && enrichedStep.reasoning.length > 50) {
              original.reasoning = enrichedStep.reasoning;
            }
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
