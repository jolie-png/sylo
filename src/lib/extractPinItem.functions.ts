import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createAnthropicClient } from "./anthropic.server";

// ---------------------------------------------------------------------------
// Input / Output schemas
// ---------------------------------------------------------------------------

const Input = z.object({
  imageBase64: z.string().min(1),
  mediaType: z.enum(["image/png", "image/jpeg", "image/webp"]),
  filename: z.string().min(1),
});

const OpportunityDetailsSchema = z.object({
  name: z.string(),
  deadline: z.string(),
  requirements: z.array(z.string()),
  description: z.string(),
  category: z.enum([
    "Research",
    "Internship",
    "Fellowship",
    "Club",
    "Funding",
    "Advising",
    "Course",
  ]),
  timeframe: z.string(),
  contact: z.string(),
});

const ExtractionOutputSchema = z.object({
  title: z.string(),
  extractedText: z.string(),
  topic: z.string(),
  tags: z.array(z.string()).min(1).max(6),
  detectedDate: z.string().nullable().optional(),
  isOpportunityLike: z.boolean(),
  opportunityDetails: OpportunityDetailsSchema.optional().nullable(),
});

export type PinItemMetadata = {
  title: string;
  extractedText: string;
  topic: string;
  tags: string[];
  detectedDate?: string;
  isOpportunityLike: boolean;
  opportunityDetails?: {
    name: string;
    deadline: string;
    requirements: string[];
    description: string;
    category:
      | "Research"
      | "Internship"
      | "Fellowship"
      | "Club"
      | "Funding"
      | "Advising"
      | "Course";
    timeframe: string;
    contact: string;
  };
};

export type PinExtractionError = { error: string };
export type ExtractPinItemResult = PinItemMetadata | PinExtractionError;

/** @deprecated Use ExtractPinItemResult instead */
export type ExtractCatchItemResult = ExtractPinItemResult;

// ---------------------------------------------------------------------------
// Prompt
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `Today's date is ${new Date().toISOString().slice(0, 10)}.

You are a screenshot analysis assistant for a college student organization tool called Sylo. Students upload screenshots of many things: internship postings, class deadlines, financial aid notices, housing info, event flyers, professor emails, LinkedIn posts, notes-to-self, or any other life content.

Your job is to examine the screenshot and extract structured metadata. The image may contain:
- Partial or cut-off text
- UI chrome (LinkedIn, email clients, messaging apps, browser tabs)
- Flyers or posters (possibly with design elements)
- Photos of physical documents, whiteboards, or sticky notes
- Any combination of the above

Return ONLY a JSON object with these fields:
- title: A short (5-10 word) summary of what this screenshot contains
- extractedText: The full OCR'd text content visible in the image. Transcribe all readable text faithfully, even if incomplete.
- topic: An open-ended label categorizing the content (examples: "Financial Aid", "Class Deadlines", "Housing", "Career & Internships", "Campus Life", "Notes to Self", "Events", "Academic", or any label that fits)
- tags: 2-4 short descriptive tags relevant to the content
- detectedDate: If a specific date or deadline is visible, return it in YYYY-MM-DD format. If no date is detectable, return null.
- isOpportunityLike: true if this looks like a program, fellowship, internship, research position, club recruitment, funding opportunity, or similar actionable opportunity a student might apply for. false otherwise.
- opportunityDetails: ONLY include this field if isOpportunityLike is true. Object with: name (program name), deadline (YYYY-MM-DD or ""), requirements (array of eligibility items), description (1-2 sentence summary), category (one of: Research, Internship, Fellowship, Club, Funding, Advising, Course), timeframe (when it runs), contact (contact info or "")

Rules:
1. Return ONLY a JSON object. No markdown fences, no explanation, no extra text.
2. Only extract information explicitly visible in the image. Never invent details.
3. If a field has no information, use empty string "" (or empty array for requirements/tags).
4. For detectedDate, prefer the most relevant upcoming deadline if multiple dates appear. When a year is not explicitly written next to a date, infer the year from surrounding context (e.g. a heading that says "Fall 2026" means dates in that post are in 2026). If no year context exists at all, use the next upcoming occurrence of that date relative to today.
5. Keep title concise and student-facing.
6. The topic should be a natural language label, not a code or abbreviation.`;

// ---------------------------------------------------------------------------
// Server function
// ---------------------------------------------------------------------------

export const extractPinItem = createServerFn({ method: "POST" })
  .validator((input: unknown) => Input.parse(input))
  .handler(async ({ data }): Promise<ExtractPinItemResult> => {
    try {
      const { config } = await import("dotenv");
      config();
    } catch {
      /* no-op */
    }

    // Check for API key
    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    if (!anthropicKey) {
      return {
        error:
          "Screenshot extraction isn't available without an API key. Add the step manually instead.",
      };
    }

    try {
      const client = createAnthropicClient(anthropicKey);

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10_000);

      let response;
      try {
        response = await client.messages.create(
          {
            model: "claude-haiku-4-5-20251001",
            max_tokens: 2000,
            system: SYSTEM_PROMPT,
            messages: [
              {
                role: "user",
                content: [
                  {
                    type: "image",
                    source: {
                      type: "base64",
                      media_type: data.mediaType,
                      data: data.imageBase64,
                    },
                  },
                  {
                    type: "text",
                    text: "Analyze this screenshot and extract structured metadata as JSON.",
                  },
                ],
              },
            ],
          },
          { signal: controller.signal },
        );
      } finally {
        clearTimeout(timeout);
      }

      // Extract text from response
      const text = response.content
        .filter((b) => b.type === "text")
        .map((b) => (b as { type: "text"; text: string }).text)
        .join("\n");

      // Parse JSON from the response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return {
          error:
            "Couldn't extract details from that screenshot. Try a clearer image.",
        };
      }

      let raw: unknown;
      try {
        raw = JSON.parse(jsonMatch[0]);
      } catch {
        return {
          error:
            "Couldn't extract details from that screenshot. Try a clearer image.",
        };
      }

      // Validate with Zod
      const parsed = ExtractionOutputSchema.safeParse(raw);
      if (!parsed.success) {
        return {
          error:
            "Couldn't structure the extracted content. Try again.",
        };
      }

      // Build the result
      const result: PinItemMetadata = {
        title: parsed.data.title,
        extractedText: parsed.data.extractedText,
        topic: parsed.data.topic,
        tags: parsed.data.tags,
        isOpportunityLike: parsed.data.isOpportunityLike,
      };

      // Only include detectedDate if present and non-null
      if (parsed.data.detectedDate) {
        result.detectedDate = parsed.data.detectedDate;
      }

      // Only include opportunityDetails when opportunity-like and details exist
      if (parsed.data.isOpportunityLike && parsed.data.opportunityDetails) {
        result.opportunityDetails = parsed.data.opportunityDetails;
      }

      return result;
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        return { error: "Extraction took too long. Try again." };
      }

      // Handle Anthropic SDK errors (rate limit, server errors, etc.)
      if (
        err instanceof Error &&
        "status" in err &&
        typeof (err as { status?: number }).status === "number"
      ) {
        const status = (err as { status: number }).status;
        if (status === 429) {
          return {
            error: "Too many requests. Wait a moment and try again.",
          };
        }
        if (status >= 500) {
          return { error: "Extraction failed. Try again in a moment." };
        }
      }

      return { error: "Extraction failed. Try again in a moment." };
    }
  });

/** @deprecated Use extractPinItem instead */
export const extractCatchItem = extractPinItem;
