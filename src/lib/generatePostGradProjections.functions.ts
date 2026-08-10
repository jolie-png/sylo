import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createAnthropicClient, hashKey } from "./anthropic.server";
import { TRACKS } from "./wayfind-data";
import type { MilestoneYear } from "./wayfind-data";
import { cleanText } from "./text-sanitize";

// ---------------------------------------------------------------------------
// Input schema — same student profile fields as roadmap generation
// ---------------------------------------------------------------------------

const Input = z.object({
  trackId: z.string(),
  goalText: z.string(),
  major: z.string(),
  year: z.string(),
  school: z.string(),
  experience: z.string().optional(),
  gpa: z.string().optional(),
  skills: z.string().optional(),
  priorWork: z.string().optional(),
  clubs: z.string().optional(),
  alreadyDone: z.string().optional(),
});

// ---------------------------------------------------------------------------
// Output type — mirrors the static Milestone shape so the UI can use either
// ---------------------------------------------------------------------------

export type PostGradProjection = {
  year: MilestoneYear;
  focus: string;
  lookOutFor: string;
  actions: string[];
  doneWhen: string;
};

const ProjectionSchema = z.object({
  year: z.enum(["Year 1", "Years 2–3"]),
  focus: z.string(),
  lookOutFor: z.string(),
  actions: z.array(z.string()),
  doneWhen: z.string(),
});

const ResponseSchema = z.object({
  projections: z.array(ProjectionSchema),
});

// ---------------------------------------------------------------------------
// Caching — lightweight in-memory cache keyed by student profile hash
// ---------------------------------------------------------------------------

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const CACHE_MAX_ENTRIES = 100;
const cache = new Map<string, { at: number; value: PostGradProjection[] }>();

function cacheKeyFor(data: z.infer<typeof Input>) {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
  return hashKey(
    ["postgrad", data.trackId, norm(data.goalText), norm(data.major), norm(data.year), norm(data.school), norm(data.experience || ""), norm(data.skills || ""), norm(data.priorWork || "")].join("|"),
  );
}

function readCache(key: string): PostGradProjection[] | null {
  const hit = cache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.at > CACHE_TTL_MS) { cache.delete(key); return null; }
  return hit.value;
}

function writeCache(key: string, value: PostGradProjection[]) {
  if (cache.size >= CACHE_MAX_ENTRIES) {
    const oldest = [...cache.entries()].sort((a, b) => a[1].at - b[1].at)[0];
    if (oldest) cache.delete(oldest[0]);
  }
  cache.set(key, { at: Date.now(), value });
}

// ---------------------------------------------------------------------------
// Prompt construction
// ---------------------------------------------------------------------------

function buildSystemPrompt() {
  return [
    "You are an expert career advisor who creates deeply personalized post-graduation projections. You've read the student's full resume and background — your advice should feel like it comes from a mentor who knows them personally.",
    "",
    "Given a student's profile (major, school, career goal, experience, skills), generate personalized post-graduation milestones for two phases:",
    "1. Year 1: The first year after graduation in their target career",
    "2. Years 2-3: What the next two years typically look like for someone on this path",
    "",
    "CRITICAL PERSONALIZATION RULES:",
    "- You MUST reference the student's specific companies, roles, and skills BY NAME in your actions and lookOutFor.",
    "- If they interned at Amazon, say 'Your Amazon experience gives you...' not 'Your prior internship experience...'",
    "- If they know Python and SQL, reference those specifically when relevant: 'Your SQL skills let you skip the data fluency ramp...'",
    "- If they were in specific clubs (e.g., 'Columbia Organization of Rising Entrepreneurs'), connect that to an action.",
    "- The 'focus' should feel custom to their trajectory — someone with 2x Amazon SDE internships pivoting to PM has a VERY different Year 1 than someone with no tech experience.",
    "- 'lookOutFor' should reference their specific situation: what someone with THEIR background specifically needs to watch for that differs from the generic path.",
    "- Actions must build on what they've ALREADY done — not start from scratch. If they've already done 2 SDE internships, don't tell them to 'get an internship.'",
    "- 'doneWhen' should reference a specific outcome that makes sense given where they're starting from.",
    "",
    "QUALITY RULES:",
    "- Each action should be one sentence, concrete, and actionable. Not vague advice.",
    "- Never invent specific company names they didn't mention. You CAN reference general categories ('a FAANG company', 'a Series B startup').",
    "- If they mentioned specific companies they worked at, explain how that experience transfers or creates leverage.",
    "- Write in direct second person. No filler, no hedging, no 'consider doing X' — just 'Do X.'",
    "- The overall arc should tell a coherent story: here's where you are → here's Year 1 → here's Years 2-3, and each builds on the last.",
    "",
    "Return ONLY a JSON object matching this schema:",
    JSON.stringify({
      projections: [
        { year: "Year 1", focus: "short phrase", lookOutFor: "one sentence", actions: ["action 1", "action 2", "action 3", "action 4", "action 5"], doneWhen: "one sentence" },
        { year: "Years 2–3", focus: "short phrase", lookOutFor: "one sentence", actions: ["action 1", "action 2", "action 3", "action 4", "action 5"], doneWhen: "one sentence" },
      ],
    }, null, 0),
  ].join("\n");
}

function buildUserPrompt(data: z.infer<typeof Input>) {
  const track = TRACKS.find((t) => t.id === data.trackId);
  const destination = data.goalText?.trim() || track?.label || "their career goal";

  const parts: string[] = [
    "STUDENT PROFILE:",
    `- Year: ${data.year} (about to graduate)`,
    `- Major: ${data.major}`,
    `- School: ${data.school}`,
    `- Career Goal: ${destination}`,
  ];
  if (data.experience) parts.push(`- Experience & Background: ${data.experience}`);
  if (data.gpa) parts.push(`- GPA: ${data.gpa}`);
  if (data.skills) parts.push(`- Skills & Tools: ${data.skills}`);
  if (data.priorWork) parts.push(`- Prior Internships/Jobs: ${data.priorWork}`);
  if (data.clubs) parts.push(`- Clubs & Orgs: ${data.clubs}`);
  if (data.alreadyDone) parts.push(`- Already Done Toward This Goal: ${data.alreadyDone}`);

  const hasContext = !!(data.experience || data.priorWork || data.skills || data.clubs || data.alreadyDone);

  parts.push("");
  if (hasContext) {
    parts.push("IMPORTANT: This student has detailed background. Your projections MUST reference their specific companies, skills, and experiences by name. Every action should feel like it was written by someone who read their full resume. Do NOT write generic career advice — write advice for THIS specific person given what they've already accomplished.");
  } else {
    parts.push("NOTE: Limited background provided. Personalize based on their major, school, and career goal.");
  }
  parts.push("");
  parts.push("Generate personalized post-graduation projections for Year 1 and Years 2-3. Return strict JSON.");

  return parts.join("\n");
}

// ---------------------------------------------------------------------------
// JSON extraction helper
// ---------------------------------------------------------------------------

function extractJson(text: string): unknown | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidates = [fenced?.[1], text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1)];
  for (const c of candidates) {
    if (!c) continue;
    try { return JSON.parse(c); } catch { /* next */ }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Server function
// ---------------------------------------------------------------------------

const TIMEOUT_MS = 30_000;

export const generatePostGradProjections = createServerFn({ method: "POST" })
  .validator((input: unknown) => Input.parse(input))
  .handler(async ({ data }): Promise<PostGradProjection[] | null> => {
    try { const { config } = await import("dotenv"); config(); } catch { /* no-op in production */ }

    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    if (!anthropicKey) {
      console.error("[POST-GRAD] no ANTHROPIC_API_KEY");
      return null;
    }

    const cacheKey = cacheKeyFor(data);
    const cached = readCache(cacheKey);
    if (cached) return cached;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      console.error("[POST-GRAD] generating projections...", { track: data.trackId, school: data.school });

      const client = createAnthropicClient(anthropicKey);
      const response = await client.messages.create(
        {
          model: "claude-haiku-4-5-20251001",
          max_tokens: 2500,
          system: buildSystemPrompt(),
          messages: [{ role: "user", content: buildUserPrompt(data) }],
        },
        { signal: controller.signal },
      );

      const text = response.content
        .filter((b) => b.type === "text")
        .map((b) => (b as { type: "text"; text: string }).text)
        .join("");

      const json = extractJson(text);
      if (!json) {
        console.error("[POST-GRAD] couldn't parse JSON. First 300 chars:", text.slice(0, 300));
        return null;
      }

      const parsed = ResponseSchema.safeParse(json);
      if (!parsed.success) {
        console.error("[POST-GRAD] Zod validation failed:", JSON.stringify(parsed.error.issues.slice(0, 3)));
        return null;
      }

      const projections: PostGradProjection[] = parsed.data.projections.map((p) => ({
        year: p.year as MilestoneYear,
        focus: cleanText(p.focus, 120),
        lookOutFor: cleanText(p.lookOutFor, 300),
        actions: p.actions.map((a) => cleanText(a, 200)).slice(0, 5),
        doneWhen: cleanText(p.doneWhen, 300),
      }));

      console.error("[POST-GRAD] success!", { count: projections.length });
      writeCache(cacheKey, projections);
      return projections;
    } catch (err) {
      console.error("[POST-GRAD] error:", err instanceof Error ? err.message : err);
      return null;
    } finally {
      clearTimeout(timer);
    }
  });
