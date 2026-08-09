import rows from "./universities.json";

/**
 * The university list behind the School combobox.
 *
 * Source: Hipo's `university-domains-list` (MIT), the same dataset the
 * universities.hipolabs.com API serves. We deliberately do NOT call that API:
 * the school picker must work with no network at all, so the list is trimmed
 * and committed as a static asset instead.
 *
 * Scope: United States only. Every opportunity in `wayfind-data.ts` is a US
 * program, so worldwide matches were never useful here. Anyone whose school
 * isn't in this set is never blocked — the combobox's free-text row commits
 * whatever they typed.
 *
 * `universities.json` holds plain name strings — deduped, sorted by name.
 * `country`, `domains` and `web_pages` are dropped at generation time.
 *
 * To refresh (~68 KB raw):
 *
 *   curl -sSL -o /tmp/uni-raw.json \
 *     https://raw.githubusercontent.com/Hipo/university-domains-list/master/world_universities_and_domains.json
 *   node -e '
 *     const fs=require("fs"), raw=require("/tmp/uni-raw.json");
 *     const clean=s=>String(s||"").replace(/\s+/g," ").trim();
 *     const seen=new Set(), out=[];
 *     for (const u of raw) {
 *       if (clean(u.country) !== "United States") continue;
 *       const n=clean(u.name);
 *       if (!n) continue;
 *       const k=n.toLowerCase();
 *       if (seen.has(k)) continue;
 *       seen.add(k); out.push(n);
 *     }
 *     out.sort((a,b)=>a.localeCompare(b));
 *     fs.writeFileSync("src/lib/universities.json", JSON.stringify(out));
 *   '
 */
const ROWS = rows as string[];

/**
 * Lowercased names, index-aligned with ROWS. Built once at import so each
 * keystroke is a few thousand `indexOf` calls rather than that many
 * `toLowerCase` allocations.
 */
const LOWER_NAMES = ROWS.map((n) => n.toLowerCase());

/** Rendering every match would mean hundreds of DOM nodes for a query like "state". */
export const MAX_RESULTS = 50;

export const UNIVERSITY_COUNT = ROWS.length;

/**
 * Case-insensitive substring search, capped at `limit`.
 *
 * Names that START with the query rank above names that merely contain it, so
 * typing "stanford" surfaces Stanford University rather than whichever
 * unrelated school happens to sort first alphabetically. An empty query
 * returns the head of the alphabetical list so the dropdown is never blank.
 */
export function searchUniversities(query: string, limit = MAX_RESULTS): string[] {
  const q = query.trim().toLowerCase();
  const startsWith: string[] = [];
  const contains: string[] = [];

  for (let i = 0; i < ROWS.length; i++) {
    // Every prefix match outranks every substring match, so once we have a
    // full page of them nothing later in the list can displace one.
    if (startsWith.length >= limit) break;

    const at = q ? LOWER_NAMES[i].indexOf(q) : 0;
    if (at < 0) continue;

    if (at === 0) startsWith.push(ROWS[i]);
    else if (contains.length < limit) contains.push(ROWS[i]);
  }

  return [...startsWith, ...contains].slice(0, limit);
}

/**
 * Whether the typed text already names a school in the list. Drives the
 * free-text fallback: no point offering `Use "Stanford University"` when
 * Stanford University is sitting right there as a real row.
 */
export function isKnownUniversity(query: string): boolean {
  const q = query.trim().toLowerCase();
  return q !== "" && LOWER_NAMES.includes(q);
}
