/**
 * Reddit Opportunity Scanner — free, no-auth integration.
 *
 * Uses Reddit's public JSON endpoints (no API key, no OAuth, $0 cost).
 * Every public subreddit serves JSON at `reddit.com/r/{sub}/search.json`.
 * Rate limit: ~10 req/min without auth (more than enough for our use case).
 *
 * This module searches relevant subreddits for posts about programs,
 * fellowships, deadlines, and pipelines that students are discussing.
 * Results are tagged as confidence: "live" and surfaced alongside curated data.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type RedditOpportunityPost = {
  id: string;
  title: string;
  subreddit: string;
  url: string;
  selftext: string;
  score: number;
  numComments: number;
  created: number; // unix timestamp
  permalink: string;
  /** Extracted insights from the post */
  insight: string;
};

// ---------------------------------------------------------------------------
// Subreddits to scan for student opportunity intel
// ---------------------------------------------------------------------------

const RELEVANT_SUBREDDITS = [
  "csMajors",
  "cscareerquestions",
  "internships",
  "FinancialCareers",
  "premed",
  "gradadmissions",
  "scholarships",
] as const;

// Search queries that target pipeline/deadline content, not job postings
const SEARCH_QUERIES = [
  "fellowship application deadline",
  "early ID program",
  "insight day application",
  "diversity program deadline",
  "sophomore program application",
  "freshman program pipeline",
  "scholarship deadline don't miss",
  "REU application",
  "underclassmen program",
] as const;

// ---------------------------------------------------------------------------
// Public JSON fetch (no auth, no cost)
// ---------------------------------------------------------------------------

const REDDIT_BASE = "https://www.reddit.com";
const USER_AGENT = "Sylo/1.0 (student opportunity scanner)";

async function fetchRedditJson(url: string): Promise<unknown> {
  const res = await fetch(url, {
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "application/json",
    },
  });
  if (!res.ok) {
    throw new Error(`Reddit fetch failed: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

// ---------------------------------------------------------------------------
// Search a single subreddit
// ---------------------------------------------------------------------------

async function searchSubreddit(
  subreddit: string,
  query: string,
  limit = 10,
): Promise<RedditOpportunityPost[]> {
  const params = new URLSearchParams({
    q: query,
    restrict_sr: "true",
    sort: "relevance",
    t: "year", // last year of posts
    limit: String(limit),
    type: "link",
  });

  const url = `${REDDIT_BASE}/r/${subreddit}/search.json?${params}`;

  try {
    const data = (await fetchRedditJson(url)) as {
      data?: { children?: Array<{ data: Record<string, unknown> }> };
    };

    if (!data?.data?.children) return [];

    return data.data.children
      .filter((child) => {
        const d = child.data;
        // Filter for quality: minimum engagement
        const score = (d.score as number) ?? 0;
        const comments = (d.num_comments as number) ?? 0;
        return score >= 5 || comments >= 3;
      })
      .map((child) => {
        const d = child.data;
        const selftext = (d.selftext as string) ?? "";
        return {
          id: `reddit-${d.id as string}`,
          title: (d.title as string) ?? "",
          subreddit: (d.subreddit as string) ?? subreddit,
          url: (d.url as string) ?? "",
          selftext: selftext.slice(0, 500), // cap for sanity
          score: (d.score as number) ?? 0,
          numComments: (d.num_comments as number) ?? 0,
          created: (d.created_utc as number) ?? 0,
          permalink: `https://www.reddit.com${d.permalink as string}`,
          insight: extractInsight(selftext, (d.title as string) ?? ""),
        };
      });
  } catch (err) {
    console.warn(`[reddit] Failed to search r/${subreddit}: ${err}`);
    return [];
  }
}

// ---------------------------------------------------------------------------
// Extract a short insight/summary from post content
// ---------------------------------------------------------------------------

function extractInsight(selftext: string, title: string): string {
  // Look for deadline mentions
  const deadlineMatch = selftext.match(
    /deadline[:\s]*([\w\s,]+\d{4}|[\w]+\s+\d{1,2})/i,
  );
  if (deadlineMatch) {
    return `Deadline mentioned: ${deadlineMatch[1].trim()}`;
  }

  // Look for "don't miss" / "apply by" patterns
  const applyMatch = selftext.match(
    /apply\s+by\s+([\w\s,]+\d{4}|[\w]+\s+\d{1,2})/i,
  );
  if (applyMatch) {
    return `Apply by: ${applyMatch[1].trim()}`;
  }

  // Fall back to first meaningful sentence
  const firstSentence = selftext
    .replace(/\n/g, " ")
    .split(/[.!?]/)
    .find((s) => s.trim().length > 20);

  if (firstSentence) {
    return firstSentence.trim().slice(0, 150);
  }

  return title;
}

// ---------------------------------------------------------------------------
// Server function: search Reddit for opportunity intel
// ---------------------------------------------------------------------------

const SearchInput = z.object({
  query: z.string().optional(),
  subreddits: z.array(z.string()).optional(),
  limit: z.number().min(1).max(25).optional(),
});

export const searchRedditOpportunities = createServerFn({ method: "POST" })
  .validator((input: unknown) => SearchInput.parse(input))
  .handler(async ({ data }) => {
    const subreddits = data.subreddits ?? [...RELEVANT_SUBREDDITS];
    const query = data.query ?? "program deadline fellowship application";
    const limit = data.limit ?? 5;

    // Search up to 3 subreddits at a time to stay under rate limits
    const subsToSearch = subreddits.slice(0, 3);

    const results: RedditOpportunityPost[] = [];

    for (const sub of subsToSearch) {
      // Small delay between requests to be respectful of free tier
      if (results.length > 0) {
        await new Promise((r) => setTimeout(r, 1000));
      }
      const posts = await searchSubreddit(sub, query, limit);
      results.push(...posts);
    }

    // Deduplicate by id and sort by score
    const seen = new Set<string>();
    const unique = results.filter((r) => {
      if (seen.has(r.id)) return false;
      seen.add(r.id);
      return true;
    });

    unique.sort((a, b) => b.score - a.score);

    return {
      posts: unique.slice(0, 15),
      searchedSubreddits: subsToSearch,
      query,
    };
  });

// ---------------------------------------------------------------------------
// Server function: get trending opportunity discussions
// ---------------------------------------------------------------------------

export const getTrendingOpportunityPosts = createServerFn({ method: "POST" })
  .validator((input: unknown) => {
    // No input needed
    return {};
  })
  .handler(async () => {
    // Pull "hot" posts from key subreddits that mention programs/deadlines
    const subreddits = ["csMajors", "internships", "FinancialCareers"];
    const results: RedditOpportunityPost[] = [];

    for (const sub of subreddits) {
      if (results.length > 0) {
        await new Promise((r) => setTimeout(r, 1000));
      }

      const url = `${REDDIT_BASE}/r/${sub}/hot.json?limit=15`;

      try {
        const data = (await fetchRedditJson(url)) as {
          data?: { children?: Array<{ data: Record<string, unknown> }> };
        };

        if (!data?.data?.children) continue;

        const relevant = data.data.children
          .filter((child) => {
            const d = child.data;
            const title = ((d.title as string) ?? "").toLowerCase();
            const text = ((d.selftext as string) ?? "").toLowerCase();
            const combined = title + " " + text;

            // Only keep posts that mention programs/deadlines/pipelines
            return (
              combined.includes("deadline") ||
              combined.includes("fellowship") ||
              combined.includes("program") ||
              combined.includes("application") ||
              combined.includes("scholarship") ||
              combined.includes("insight day") ||
              combined.includes("early id") ||
              combined.includes("don't miss") ||
              combined.includes("pipeline")
            );
          })
          .map((child) => {
            const d = child.data;
            const selftext = (d.selftext as string) ?? "";
            return {
              id: `reddit-${d.id as string}`,
              title: (d.title as string) ?? "",
              subreddit: (d.subreddit as string) ?? sub,
              url: (d.url as string) ?? "",
              selftext: selftext.slice(0, 500),
              score: (d.score as number) ?? 0,
              numComments: (d.num_comments as number) ?? 0,
              created: (d.created_utc as number) ?? 0,
              permalink: `https://www.reddit.com${d.permalink as string}`,
              insight: extractInsight(selftext, (d.title as string) ?? ""),
            };
          });

        results.push(...relevant);
      } catch (err) {
        console.warn(`[reddit] Failed to fetch hot from r/${sub}: ${err}`);
      }
    }

    // Sort by recency
    results.sort((a, b) => b.created - a.created);

    return {
      posts: results.slice(0, 10),
      source: "reddit-trending",
    };
  });
