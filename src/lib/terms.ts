// Term bucketing. A card belongs to the academic term that contains its real
// deadline date — never a positional guess.

export type Term = { key: string; label: string };

/** Aug–Dec → Fall, Jan–May → Spring, Jun–Jul → Summer. */
export function termFor(iso: string): Term | null {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  const season = month >= 8 ? "Fall" : month >= 6 ? "Summer" : "Spring";
  const order = season === "Spring" ? 0 : season === "Summer" ? 1 : 2;
  return { key: `${year}-${order}`, label: `${season} ${year}` };
}

/** Unique terms present in a set of ISO deadlines, chronologically ordered. */
export function termsFromDeadlines(deadlines: string[]): Term[] {
  const map = new Map<string, Term>();
  for (const iso of deadlines) {
    const t = termFor(iso);
    if (t) map.set(t.key, t);
  }
  return [...map.values()].sort((a, b) => a.key.localeCompare(b.key));
}

/** The term immediately after the given one. */
export function nextTerm(term: Term): Term {
  const [yearStr, orderStr] = term.key.split("-");
  let year = Number(yearStr);
  let order = Number(orderStr) + 1;
  if (order > 2) {
    order = 0;
    year += 1;
  }
  const season = order === 0 ? "Spring" : order === 1 ? "Summer" : "Fall";
  return { key: `${year}-${order}`, label: `${season} ${year}` };
}

/** Extend a term list forward so the board always has `count` columns. */
export function padTerms(terms: Term[], count: number): Term[] {
  const out = [...terms];
  while (out.length < count && out.length > 0) out.push(nextTerm(out[out.length - 1]));
  return out;
}

// ─── Academic term scheduling ───────────────────────────────────────────────

export type AcademicTerm = {
  /** e.g. "Fall Junior" — used as the stored value */
  value: string;
  /** e.g. "Fall Junior Year" — used for display */
  label: string;
};

export const SEASONS = ["Fall", "Spring", "Summer"] as const;
export type Season = (typeof SEASONS)[number];

/**
 * Generate all academic term options ordered chronologically
 * starting from the student's current year.
 *
 * The canonical season order within a single academic year is
 * Fall → Spring → Summer (Fall starts the year).
 *
 * Returns exactly `3 × years.length` options.
 */
export function academicTermOptions(
  currentYear: string,
  years: string[]
): AcademicTerm[] {
  const startIndex = years.indexOf(currentYear);
  // If currentYear isn't found, default to the beginning
  const offset = startIndex >= 0 ? startIndex : 0;

  const options: AcademicTerm[] = [];
  for (let i = 0; i < years.length; i++) {
    const yearIndex = (offset + i) % years.length;
    const year = years[yearIndex];
    for (const season of SEASONS) {
      options.push({
        value: `${season} ${year}`,
        label: `${season} ${year} Year`,
      });
    }
  }
  return options;
}

/**
 * Detect whether a targetDate string is an ISO date (YYYY-MM-DD format).
 */
export function isIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

/**
 * Format a targetDate for display:
 * - ISO dates → human-readable locale date string
 * - Academic term strings → term label with "Year" appended
 * - Empty/undefined → empty string
 * - Unrecognized → raw string as-is (graceful fallback)
 */
export function formatTargetDate(value: string | undefined): string {
  if (!value || value.trim() === "") return "";

  if (isIsoDate(value)) {
    const d = new Date(`${value}T00:00:00`);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleDateString();
  }

  // Academic term string — append "Year" if not already present
  if (value.endsWith("Year")) return value;
  return `${value} Year`;
}
