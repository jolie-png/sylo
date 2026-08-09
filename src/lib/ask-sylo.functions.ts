/**
 * Server function for Ask Sylo — searches Reddit from the server
 * to avoid CORS issues. Free, no API key needed.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const SUBREDDITS = [
  "csMajors",
  "cscareerquestions",
  "internships",
  "FinancialCareers",
  "premed",
  "gradadmissions",
  "scholarships",
];

const Input = z.object({
  query: z.string().min(1).max(200),
});

export type RedditSearchResult = {
  id: string;
  title: string;
  subreddit: string;
  score: number;
  numComments: number;
  permalink: string;
  selftext: string;
  created: number;
};

export const askSyloSearch = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => Input.parse(input))
  .handler(async ({ data }) => {
    const subs = SUBREDDITS.join("+");
    const params = new URLSearchParams({
      q: data.query,
      sort: "relevance",
      t: "year",
      limit: "10",
      type: "link",
      restrict_sr: "true",
    });

    const url = `https://www.reddit.com/r/${subs}/search.json?${params}`;

    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent": "Sylo:student-opportunity-search:v1.0 (by /u/sylo-app)",
        },
      });

      if (!res.ok) {
        console.warn(`[ask-sylo] Reddit returned ${res.status}`);
        return { posts: [] as RedditSearchResult[] };
      }

      const json = await res.json();

      if (!json?.data?.children) {
        return { posts: [] as RedditSearchResult[] };
      }

      const posts: RedditSearchResult[] = json.data.children
        .filter((child: any) => {
          const d = child.data;
          // Only include posts with some engagement
          return (d.score ?? 0) >= 2 || (d.num_comments ?? 0) >= 1;
        })
        .map((child: any) => {
          const d = child.data;
          return {
            id: d.id ?? "",
            title: d.title ?? "",
            subreddit: d.subreddit ?? "",
            score: d.score ?? 0,
            numComments: d.num_comments ?? 0,
            permalink: `https://www.reddit.com${d.permalink ?? ""}`,
            selftext: (d.selftext ?? "").slice(0, 400),
            created: d.created_utc ?? 0,
          };
        })
        .slice(0, 8);

      return { posts };
    } catch (err) {
      console.warn("[ask-sylo] Reddit fetch error:", err);
      return { posts: [] as RedditSearchResult[] };
    }
  });
