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
