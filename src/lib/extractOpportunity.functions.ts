import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createAnthropicClient } from "./anthropic.server";

// ---------------------------------------------------------------------------
// Input / Output schemas
// ---------------------------------------------------------------------------

const Input = z.object({
  url: z.string().url(),
});

const CATEGORIES = ["Research", "Internship", "Fellowship", "Club", "Funding", "Advising", "Course"] as const;

/** Coerce any loosely-typed model output into a string. */
const toStr = (v: unknown): string => (typeof v === "string" ? v : v == null ? "" : String(v));

// Lenient schema: the model is told to use "" for unknown fields, and it often
// returns an empty/invalid `category` or omits keys entirely. Rather than reject
// the whole extraction when a single field is missing, we coerce every field to a
// safe value so a real (if partial) program still comes through. Meaningfulness is
// checked after parsing (must have at least a name or description).
const ProgramDetailsSchema = z.object({
  name: z.preprocess(toStr, z.string()),
  deadline: z.preprocess(toStr, z.string()), // YYYY-MM-DD or empty string
  requirements: z.preprocess((v) => {
    if (Array.isArray(v)) return v.map(toStr).map((s) => s.trim()).filter(Boolean);
    if (typeof v === "string" && v.trim()) return [v.trim()];
    return [];
  }, z.array(z.string())),
  description: z.preprocess(toStr, z.string()),
  category: z.preprocess(
    (v) => (typeof v === "string" && (CATEGORIES as readonly string[]).includes(v) ? v : "Research"),
    z.enum(CATEGORIES),
  ),
  timeframe: z.preprocess(toStr, z.string()),
  contact: z.preprocess(toStr, z.string()),
});

export type ExtractedProgram = z.infer<typeof ProgramDetailsSchema>;
export type ExtractResult = ExtractedProgram | { error: string };

// ---------------------------------------------------------------------------
// Prompt
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `You are a program details extractor for undergraduate students. Given the text content of a webpage about a university program, fellowship, internship, or opportunity, extract and return a JSON object with:

- name: The official program name
- deadline: Application deadline in YYYY-MM-DD format. If no exact date, use empty string ""
- requirements: Array of eligibility requirements (major, year, GPA, etc.)
- description: 1-2 sentence summary of what the program offers
- category: Exactly one of: Research, Internship, Fellowship, Club, Funding, Advising, Course
- timeframe: When the program runs (e.g. "Summer - 8 weeks", "Fall semester", "Rolling")
- contact: Program contact info (office, email, or department)

Rules:
1. Return ONLY a JSON object. No markdown, no explanation.
2. Only extract information explicitly stated on the page. Never invent details.
3. If a field has no information on the page, use empty string "" (or empty array for requirements).
4. For deadline, prefer the next upcoming deadline. Convert to YYYY-MM-DD format.
5. Keep description concise and student-facing.`;

// ---------------------------------------------------------------------------
// HTML → plain text (basic, no external parser needed)
// ---------------------------------------------------------------------------

function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "") // strip scripts
    .replace(/<style[\s\S]*?<\/style>/gi, "") // strip styles
    .replace(/<nav[\s\S]*?<\/nav>/gi, "") // strip nav
    .replace(/<footer[\s\S]*?<\/footer>/gi, "") // strip footer
    .replace(/<header[\s\S]*?<\/header>/gi, "") // strip header
    .replace(/<[^>]+>/g, " ") // strip remaining tags
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#\d+;/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// ---------------------------------------------------------------------------
// Server function
// ---------------------------------------------------------------------------

export const extractOpportunity = createServerFn({ method: "POST" })
  .validator((input: unknown) => Input.parse(input))
  .handler(async ({ data }): Promise<ExtractResult> => {
    try { const { config } = await import("dotenv"); config(); } catch { /* no-op */ }

    // Step 1: Fetch the page
    let pageText: string;
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10_000);

      const response = await fetch(data.url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; Sylo/1.0; student-opportunity-finder)",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!response.ok) {
        return { error: `Could not access that page (HTTP ${response.status}). Check the URL and try again.` };
      }

      const html = await response.text();
      pageText = htmlToText(html);

      // Cap at ~12k chars to stay within token limits
      if (pageText.length > 12000) {
        pageText = pageText.slice(0, 12000);
      }

      if (pageText.length < 50) {
        return { error: "The page didn't have enough readable text. Try a different URL." };
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        return { error: "The page took too long to load. Try again or paste a different URL." };
      }
      return { error: `Could not fetch that URL. Check it's a valid, public page.` };
    }

    // Step 2: Send to Claude for extraction
    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    if (!anthropicKey) {
      return { error: "Program extraction isn't available without an API key. Add the step manually instead." };
    }

    try {
      const client = createAnthropicClient(anthropicKey);
      const response = await client.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1500,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: `Extract program details from this webpage content:\n\nURL: ${data.url}\n\n---\n\n${pageText}`,
          },
        ],
      });

      const text = response.content
        .filter((b) => b.type === "text")
        .map((b) => (b as { type: "text"; text: string }).text)
        .join("\n");

      // Parse JSON from the response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return { error: "Couldn't extract structured details from that page. Try a more specific program page." };
      }

      let raw: unknown;
      try {
        raw = JSON.parse(jsonMatch[0]);
      } catch {
        return { error: "Couldn't parse the extracted details. Try again." };
      }

      const parsed = ProgramDetailsSchema.safeParse(raw);
      if (!parsed.success) {
        return { error: "The page didn't have enough program details to extract. Try a specific program page with deadlines and requirements." };
      }

      // Only treat it as a failure when nothing meaningful came back — a name or a
      // description is enough to make a usable pin, even if the deadline or
      // requirements are missing.
      if (!parsed.data.name.trim() && !parsed.data.description.trim()) {
        return { error: "The page didn't have enough program details to extract. Try a specific program page with deadlines and requirements." };
      }

      return parsed.data;
    } catch {
      return { error: "Extraction failed. Try again in a moment." };
    }
  });
