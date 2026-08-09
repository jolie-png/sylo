/**
 * Ask Sylo — server function for web search fallback.
 *
 * Flow: local DB search first (free, in-component) → if no results, uses
 * Serper.dev to do a real Google search and returns actual URLs that exist.
 * No AI hallucination — results are real web pages. Costs ~$0.001/query.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const Input = z.object({
  query: z.string().min(1).max(300),
});

export type WebSearchResult = {
  title: string;
  snippet: string;
  link: string;
  source: string;
};

type SerperOrganic = { title: string; link: string; snippet: string };

async function searchSerper(query: string, apiKey: string, num = 5): Promise<SerperOrganic[]> {
  try {
    const res = await fetch("https://google.serper.dev/search", {
      method: "POST",
      headers: { "X-API-KEY": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({ q: query, num }),
    });
    if (!res.ok) {
      console.warn(`[ask-sylo/serper] ${res.status}`);
      return [];
    }
    const data = await res.json() as { organic?: SerperOrganic[] };
    return data.organic ?? [];
  } catch (err) {
    console.warn("[ask-sylo/serper] error:", err);
    return [];
  }
}

export const askSyloWebSearch = createServerFn({ method: "POST" })
  .validator((input: unknown) => Input.parse(input))
  .handler(async ({ data }) => {
    try {
      const { config } = await import("dotenv");
      config();
    } catch { /* no-op */ }

    const serperKey = process.env.SERPER_API_KEY;
    if (!serperKey) {
      return { results: [] as WebSearchResult[] };
    }

    // Build a targeted search query for student programs
    const searchQuery = `${data.query} student program fellowship application deadline`;

    const organic = await searchSerper(searchQuery, serperKey, 6);

    if (organic.length === 0) {
      return { results: [] as WebSearchResult[] };
    }

    // Extract domain name for the "source" field
    function extractDomain(url: string): string {
      try {
        const hostname = new URL(url).hostname.replace(/^www\./, "");
        return hostname;
      } catch {
        return "web";
      }
    }

    const results: WebSearchResult[] = organic
      .filter((r) => r.title && r.snippet && r.link)
      .slice(0, 5)
      .map((r) => ({
        title: r.title,
        snippet: r.snippet,
        link: r.link,
        source: extractDomain(r.link),
      }));

    return { results };
  });
