import { Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { getAllOpportunities } from "@/lib/opportunities-db";

type ProgramMatch = {
  name: string;
  id: string;
};

/**
 * Build a lookup of program names → IDs from the opportunity database.
 * Sorted by name length descending so longer matches take priority
 * (e.g., "Goldman Sachs Emerging Leaders Series" matches before "Goldman Sachs").
 */
function buildProgramIndex(): ProgramMatch[] {
  const records = getAllOpportunities();
  const matches: ProgramMatch[] = records.map((r) => ({
    name: r.name,
    id: r.id,
  }));

  // Also add common short names / aliases that people use in conversation
  const aliases: Record<string, string> = {
    "Code for Good": "pipe-jpmorgan-code-for-good",
    "Uber Career Prep": "pipe-uber-career-prep",
    "UCP": "pipe-uber-career-prep",
    "Grace Hopper": "pipe-grace-hopper",
    "GHC": "pipe-grace-hopper",
    "Emerging Leaders": "pipe-goldman-emerging-leaders",
    "Emerging Leaders Series": "pipe-goldman-emerging-leaders",
    "Growing Future Leaders": "pipe-bcg-growing-future-leaders",
    "GFL": "pipe-bcg-growing-future-leaders",
    "SHPE": "pipe-shpe-national-convention",
    "SHPE National Convention": "pipe-shpe-national-convention",
    "Tapia Conference": "pipe-tapia-conference",
    "Tapia": "pipe-tapia-conference",
    "Google CSSI": "pipe-google-cssi",
    "CSSI": "pipe-google-cssi",
    "ColorStack": "pipe-colorstack",
    "Capital One Summit": "pipe-capital-one-summit",
    "Possibilities Series": "pipe-goldman-possibilities",
    "Goldman Sachs Possibilities Series": "pipe-goldman-possibilities",
    "Break Through Tech": "pipe-break-through-tech",
    "McKinsey Sophomore Diversity Leaders": "pipe-mckinsey-sdl",
    "Bain BEL": "pipe-bain-bel",
    "Building Entrepreneurial Leaders": "pipe-bain-bel",
  };

  for (const [alias, id] of Object.entries(aliases)) {
    // Only add if the ID actually exists in the DB
    if (records.some((r) => r.id === id)) {
      matches.push({ name: alias, id });
    }
  }

  // Sort by length descending — longer matches first to avoid partial matching issues
  return matches.sort((a, b) => b.name.length - a.name.length);
}

let cachedIndex: ProgramMatch[] | null = null;
function getProgramIndex(): ProgramMatch[] {
  if (!cachedIndex) cachedIndex = buildProgramIndex();
  return cachedIndex;
}

/**
 * Takes a text string and returns React nodes where recognized program names
 * are replaced with links to their opportunity detail page.
 */
export function ProgramLinkedText({ text }: { text: string }) {
  const parts = useMemo(() => linkifyPrograms(text), [text]);

  return (
    <>
      {parts.map((part, i) =>
        part.type === "text" ? (
          <span key={i}>{part.value}</span>
        ) : (
          <Link
            key={i}
            to="/opportunity-details"
            search={{ id: part.id }}
            className="font-medium text-primary underline decoration-primary/30 underline-offset-2 hover:decoration-primary/60"
          >
            {part.value}
          </Link>
        ),
      )}
    </>
  );
}

type TextPart = { type: "text"; value: string } | { type: "link"; value: string; id: string };

function linkifyPrograms(text: string): TextPart[] {
  const index = getProgramIndex();
  const parts: TextPart[] = [];
  let remaining = text;
  const matched = new Set<number>(); // Track character positions already matched

  // Find all matches with their positions
  type Match = { start: number; end: number; name: string; id: string };
  const allMatches: Match[] = [];

  for (const program of index) {
    let searchFrom = 0;
    while (true) {
      const idx = text.toLowerCase().indexOf(program.name.toLowerCase(), searchFrom);
      if (idx === -1) break;

      // Check it's not a partial word match (basic word boundary check)
      const charBefore = idx > 0 ? text[idx - 1] : " ";
      const charAfter = idx + program.name.length < text.length ? text[idx + program.name.length] : " ";
      const validBefore = /[\s,;:('"—–\-]/.test(charBefore) || idx === 0;
      const validAfter = /[\s,;:.)'"—–\-!?]/.test(charAfter) || idx + program.name.length === text.length;

      if (validBefore && validAfter) {
        allMatches.push({
          start: idx,
          end: idx + program.name.length,
          name: text.slice(idx, idx + program.name.length), // preserve original casing
          id: program.id,
        });
      }
      searchFrom = idx + 1;
    }
  }

  // Sort by start position, then by length descending (prefer longer matches)
  allMatches.sort((a, b) => a.start - b.start || (b.end - b.start) - (a.end - a.start));

  // Deduplicate overlapping matches (keep the first/longest one at each position)
  const finalMatches: Match[] = [];
  let lastEnd = 0;
  for (const m of allMatches) {
    if (m.start >= lastEnd) {
      finalMatches.push(m);
      lastEnd = m.end;
    }
  }

  // Build parts array
  let cursor = 0;
  for (const m of finalMatches) {
    if (m.start > cursor) {
      parts.push({ type: "text", value: text.slice(cursor, m.start) });
    }
    parts.push({ type: "link", value: m.name, id: m.id });
    cursor = m.end;
  }
  if (cursor < text.length) {
    parts.push({ type: "text", value: text.slice(cursor) });
  }

  return parts.length > 0 ? parts : [{ type: "text", value: text }];
}
