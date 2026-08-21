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

const SYSTEM_PROMPT = `You are an opportunity extractor for undergraduate students. You are given the text of ANY webpage a student wants to save: a single program/fellowship/internship page, a job posting, an aggregator or listing page (many openings), a club or org page, or a general career resource. Return a JSON object with:

- name: The most specific title of what the page is about. For a single program or posting, its official name. For a listing/aggregator/resource page, the page or resource title (e.g. "2027 U.S. & Canada Internships List", "Morgan Stanley Career Opportunities"). Use the page's main heading or <title> if there is no formal program name.
- deadline: Application deadline in YYYY-MM-DD format ONLY if explicitly stated. Otherwise "".
- requirements: Array of eligibility requirements explicitly stated (major, year, GPA, etc.). Empty array [] if none.
- description: 1-2 sentence, student-facing summary of what this page or opportunity offers.
- category: Best-fit single value from exactly: Research, Internship, Fellowship, Club, Funding, Advising, Course. If unclear, pick the closest fit.
- timeframe: When it runs if stated (e.g. "Summer - 8 weeks", "Fall semester", "Rolling"). Otherwise "".
- contact: Contact info (office, email, or department) if stated. Otherwise "".

Rules:
1. Return ONLY a JSON object. No markdown, no explanation.
2. Never invent specific facts. Deadlines, GPA cutoffs, requirements, and contacts must be "" or [] unless explicitly present on the page.
3. ALWAYS produce a usable name and description from whatever the page is about. A listing, aggregator, or resource page is still worth saving — summarize what it is. Only leave name and description empty if the page has no readable content at all.
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
    let pageTitle = "";
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

      // Grab the <title> up front so we can fall back to it if the model can't
      // find a formal program name (aggregator/listing/JS-shell pages).
      const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
      if (titleMatch) {
        pageTitle = titleMatch[1]
          .replace(/&nbsp;/g, " ")
          .replace(/&amp;/g, "&")
          .replace(/&#\d+;/g, "")
          .replace(/\s+/g, " ")
          .trim();
      }

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

      const result = parsed.data;

      // Last-resort fallback: if the model returned no name/description at all but
      // we did fetch readable text, salvage a usable pin from the page's <title>
      // and the first slice of text rather than rejecting the link outright. This
      // is what keeps aggregator/listing/JS-shell pages from erroring.
      if (!result.name.trim()) {
        result.name = pageTitle || "Saved link";
      }
      if (!result.description.trim()) {
        result.description = pageTitle
          ? `Saved from ${pageTitle}.`
          : "Saved link — add details below.";
      }

      return result;
    } catch {
      return { error: "Extraction failed. Try again in a moment." };
    }
  });
