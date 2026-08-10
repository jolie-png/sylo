/**
 * Opportunity Database — query layer over the bundled curated dataset.
 *
 * Mirrors the pattern used in `universities.ts`: a static JSON import parsed
 * once at module load, with lightweight in-memory search and filter functions
 * that never allocate the full dataset per query.
 */

import { z } from "zod";
import rawRecords from "./opportunities-db.json";
import {
  OPPORTUNITIES as SEED_OPPORTUNITIES,
  type Opportunity as SeedOpportunity,
  type TrackId,
} from "./wayfind-data";

// ---------------------------------------------------------------------------
// Schema (Zod) — validates every record at import time
// ---------------------------------------------------------------------------

const TRACK_VALUES = [
  "physician-scientist",
  "nursing",
  "public-health",
  "business-analyst",
  "product-manager",
  "management-consulting",
  "software-engineer",
  "data-science",
  "cybersecurity",
  "investment-banking",
  "private-equity",
  "financial-planning",
  "research-phd",
  "public-affairs",
  "policy-analyst",
  "government-relations",
  "design",
  "product-designer",
  "creative-director",
  "something-else",
] as const;

const CATEGORY_VALUES = [
  "Research",
  "Internship",
  "Fellowship",
  "Club",
  "Funding",
  "Advising",
  "Course",
] as const;

export const OpportunityRecordSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(200),
  track: z.enum(TRACK_VALUES),
  category: z.enum(CATEGORY_VALUES),
  access: z.enum(["direct", "translated"]),
  school: z.string().default("any"),
  deadline: z.string().default(""),
  timeframe: z.string().default(""),
  requirements: z.array(z.string()).default([]),
  contact: z.string().default(""),
  link: z.string().default(""),
  timeline: z.string().default(""),
  leverage: z.string().default(""),
  tags: z.array(z.string().max(50)).max(20).default([]),
  yearRelevance: z
    .array(z.enum(["Freshman", "Sophomore", "Junior", "Senior", "Graduate"]))
    .default([]),
  region: z.string().default("National"),
  confidence: z.enum(["curated", "live", "community"]).default("curated"),
  lastVerified: z.string().default(""),
  recurring: z.boolean().default(false),
  source: z.string().default(""),
  // Fields from the seed dataset that may also appear
  brandEquivalent: z.string().optional(),
  missingHere: z.string().optional(),
  courseCode: z.string().optional(),
  gapLabel: z.string().optional(),
  upstream: z.string().optional(),
  unlocks: z.array(z.string()).optional(),
  window: z.string().optional(),
  origin: z.enum(["seed", "live"]).optional(),
  sources: z
    .array(z.object({ title: z.string(), url: z.string() }))
    .optional(),
  singleSourced: z.boolean().optional(),
});

export type OpportunityRecord = z.infer<typeof OpportunityRecordSchema>;

// ---------------------------------------------------------------------------
// Dataset construction: merge seed data + external curated JSON
// ---------------------------------------------------------------------------

/** Convert a seed opportunity into the extended record format. */
function seedToRecord(op: SeedOpportunity): OpportunityRecord {
  return {
    ...op,
    tags: [],
    yearRelevance: [],
    region: "National",
    confidence: "curated" as const,
    lastVerified: "2026-01-01",
    recurring: false,
    source: "wayfind-data.ts",
  };
}

// Validate external records
const externalRecords: OpportunityRecord[] = [];
for (const raw of rawRecords as unknown[]) {
  const result = OpportunityRecordSchema.safeParse(raw);
  if (result.success) {
    externalRecords.push(result.data);
  } else {
    console.warn(
      `[opportunities-db] Invalid record skipped:`,
      (raw as { id?: string })?.id ?? "unknown",
      result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`),
    );
  }
}

// Merge: seed opportunities + external, deduplicated by id
const seedRecords = SEED_OPPORTUNITIES.map(seedToRecord);
const idSet = new Set<string>();
const ALL_RECORDS: OpportunityRecord[] = [];

for (const rec of [...seedRecords, ...externalRecords]) {
  if (!idSet.has(rec.id)) {
    idSet.add(rec.id);
    ALL_RECORDS.push(rec);
  }
}

// ---------------------------------------------------------------------------
// Search index — built once at import time
// ---------------------------------------------------------------------------

const LOWER_NAMES = ALL_RECORDS.map((r) => r.name.toLowerCase());
const LOWER_TAGS = ALL_RECORDS.map((r) => r.tags.map((t) => t.toLowerCase()));

/** Full-text search corpus: everything searchable about each record, concatenated. */
const SEARCH_CORPUS = ALL_RECORDS.map((r) =>
  [
    r.name,
    r.category,
    r.leverage,
    r.timeframe,
    r.timeline,
    r.track,
    r.region,
    ...r.tags,
    ...r.requirements,
    ...r.yearRelevance,
    r.brandEquivalent ?? "",
    r.source ?? "",
  ]
    .join(" ")
    .toLowerCase(),
);

export const OPPORTUNITY_COUNT = ALL_RECORDS.length;
export const MAX_RESULTS = 50;

// ---------------------------------------------------------------------------
// Query API
// ---------------------------------------------------------------------------

export type OpportunityFilters = {
  query?: string;
  track?: TrackId | TrackId[];
  category?: string | string[];
  school?: string;
  year?: string;
  region?: string;
  tags?: string[];
  deadlineWindow?: 30 | 60 | 90 | null;
  limit?: number;
};

/**
 * Search and filter opportunities. Omitting a filter means no constraint.
 * Multiple filters are AND across fields; multi-value fields use OR within.
 */
export function searchOpportunities(filters: OpportunityFilters = {}): OpportunityRecord[] {
  const limit = Math.min(Math.max(filters.limit ?? MAX_RESULTS, 1), 200);
  const q = filters.query?.trim().toLowerCase() ?? "";
  const tracks = filters.track
    ? Array.isArray(filters.track)
      ? filters.track
      : [filters.track]
    : null;
  const categories = filters.category
    ? Array.isArray(filters.category)
      ? filters.category
      : [filters.category]
    : null;
  const school = filters.school?.trim().toLowerCase() ?? null;
  const year = filters.year ?? null;
  const region = filters.region?.trim().toLowerCase() ?? null;
  const tags = filters.tags?.map((t) => t.toLowerCase()) ?? null;

  const now = new Date();
  const deadlineCutoff = filters.deadlineWindow
    ? new Date(now.getTime() + filters.deadlineWindow * 24 * 60 * 60 * 1000)
    : null;

  // Scoring for result ranking
  type Scored = { record: OpportunityRecord; score: number };
  const results: Scored[] = [];

  for (let i = 0; i < ALL_RECORDS.length; i++) {
    const rec = ALL_RECORDS[i];
    let score = 0;

    // Text query filter — split into words, match any word against the full corpus
    if (q) {
      const words = q.split(/\s+/).filter((w) => w.length >= 2);
      if (words.length === 0) continue;

      const corpus = SEARCH_CORPUS[i];
      const matchCount = words.filter((w) => corpus.includes(w)).length;

      if (matchCount === 0) continue;

      // Score based on how many query words matched
      score += matchCount * 3;
      // Bonus for name match
      if (LOWER_NAMES[i].includes(q)) score += 10;
      else if (words.some((w) => LOWER_NAMES[i].includes(w))) score += 5;
    }

    // Track filter
    if (tracks && !tracks.includes(rec.track)) continue;

    // Category filter
    if (categories && !categories.includes(rec.category)) continue;

    // School filter: school-specific records + universal "any"
    if (school && school !== "any") {
      const recSchool = rec.school.toLowerCase();
      if (recSchool !== "any" && recSchool !== school) continue;
      // Boost school-specific
      if (recSchool === school) score += 8;
    }

    // Year filter — exclude programs that specify year relevance if student's year isn't included
    if (year && rec.yearRelevance.length > 0) {
      if (rec.yearRelevance.includes(year as any)) {
        score += 4;
      } else {
        // Program explicitly lists which years it's for, and this student isn't one of them
        continue;
      }
    }

    // Region filter
    if (region && region !== "national") {
      const recRegion = rec.region.toLowerCase();
      if (recRegion !== "national" && recRegion !== region) continue;
      if (recRegion === region) score += 3;
    }

    // Tags filter (OR logic)
    if (tags && tags.length > 0) {
      const hasMatch = tags.some((t) => LOWER_TAGS[i].includes(t));
      if (!hasMatch) continue;
    }

    // Deadline window filter
    if (deadlineCutoff && rec.deadline) {
      const dl = new Date(rec.deadline);
      if (dl > deadlineCutoff || dl < now) continue;
    }

    // Deadline proximity boost (soonest = higher score)
    if (rec.deadline) {
      const dl = new Date(rec.deadline);
      if (dl >= now) {
        const daysOut = (dl.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
        score += Math.max(0, 10 - Math.floor(daysOut / 30));
      } else {
        score -= 5; // Past deadline penalized
      }
    }

    // Confidence boost
    if (rec.confidence === "curated") score += 2;

    results.push({ record: rec, score });
  }

  // Sort: highest score first, then by deadline proximity
  results.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    // Secondary: deadline proximity
    const dlA = a.record.deadline ? new Date(a.record.deadline).getTime() : Infinity;
    const dlB = b.record.deadline ? new Date(b.record.deadline).getTime() : Infinity;
    return dlA - dlB;
  });

  return results.slice(0, limit).map((r) => r.record);
}

/** Get a single opportunity by ID. */
export function getOpportunityById(id: string): OpportunityRecord | undefined {
  return ALL_RECORDS.find((r) => r.id === id);
}

/** Get all unique tags in the dataset. */
export function getAllTags(): string[] {
  const tagSet = new Set<string>();
  for (const rec of ALL_RECORDS) {
    for (const t of rec.tags) tagSet.add(t);
  }
  return [...tagSet].sort();
}

/** Get all records (for backward compat with OPPORTUNITIES usage). */
export function getAllOpportunities(): OpportunityRecord[] {
  return ALL_RECORDS;
}

/**
 * Backward-compatible export: the full merged dataset as a plain array.
 * Components that previously imported OPPORTUNITIES from wayfind-data.ts
 * can switch to this without changes.
 */
export const OPPORTUNITIES = ALL_RECORDS;
