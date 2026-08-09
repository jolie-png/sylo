/**
 * Ask Sylo — server function for web search fallback.
 *
 * Flow: local DB search first (free) → if no results, uses Gemini Flash
 * via the existing AI gateway to do a grounded web search. Costs ~$0.0001/query.
 */

import { createServerFn } from "@tanstack/react-start";
import { generateText } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";

const Input = z.object({
  query: z.string().min(1).max(300),
});

export type WebSearchResult = {
  title: string;
  snippet: string;
  link: string;
  source: string;
};

export const askSyloWebSearch = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => Input.parse(input))
  .handler(async ({ data }) => {
    try {
      const { config } = await import("dotenv");
      config();
    } catch { /* no-op */ }

    const key = process.env.LOVABLE_API_KEY;
    if (!key) {
      return { results: [] as WebSearchResult[], error: "No API key configured" };
    }

    const gateway = createLovableAiGatewayProvider(key);

    try {
      const { text } = await generateText({
        model: gateway("google/gemini-3.6-flash"),
        system: [
          "You are a helpful assistant that finds student opportunity programs.",
          "The user is searching for specific programs, fellowships, scholarships, insight days, or early-talent pipelines.",
          "Return ONLY a JSON array of up to 5 results. Each result must have: title, snippet (1-2 sentences about what it is and its deadline), link (URL), source (website name).",
          "Focus on real, named programs with application deadlines. No generic advice.",
          "If you cannot find specific programs, return an empty array: []",
          "Return ONLY valid JSON, no markdown, no explanation.",
        ].join(" "),
        prompt: `Find student programs, fellowships, or opportunities related to: "${data.query}". Return as JSON array.`,
      });

      // Parse the JSON response
      const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      const parsed = JSON.parse(cleaned);

      if (!Array.isArray(parsed)) {
        return { results: [] as WebSearchResult[] };
      }

      const results: WebSearchResult[] = parsed
        .slice(0, 5)
        .map((r: any) => ({
          title: String(r.title ?? ""),
          snippet: String(r.snippet ?? ""),
          link: String(r.link ?? ""),
          source: String(r.source ?? "web"),
        }))
        .filter((r: WebSearchResult) => r.title && r.snippet);

      return { results };
    } catch (err) {
      console.warn("[ask-sylo] Web search failed:", err);
      return { results: [] as WebSearchResult[], error: "Search failed" };
    }
  });
