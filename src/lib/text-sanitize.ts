// ---------------------------------------------------------------------------
// Text sanitization utilities for AI-generated content.
// Prevents truncated words, detects mangled output, and ensures clean display.
// ---------------------------------------------------------------------------

/**
 * Truncate a string at a sentence boundary when possible, falling back to word boundary.
 * If the string is already under `max` characters, returns it unchanged.
 * Prefers cutting at the end of a complete sentence to avoid mid-thought truncation.
 */
export function trimAtWord(s: string, max: number): string {
  const cleaned = s.trim();
  if (cleaned.length <= max) return cleaned;

  const truncated = cleaned.slice(0, max);

  // Try to find the last sentence-ending punctuation within the truncated text
  // Look for . ! or ? followed by a space or end-of-string (to avoid cutting at abbreviations like "e.g.")
  const sentenceEndPattern = /[.!?](?:\s|$)/g;
  let lastSentenceEnd = -1;
  let match: RegExpExecArray | null;
  while ((match = sentenceEndPattern.exec(truncated)) !== null) {
    lastSentenceEnd = match.index + 1; // Include the punctuation
  }

  // If we found a sentence boundary in the back half of the text, cut there —
  // dropping an incomplete trailing sentence reads far better than keeping a
  // mid-thought fragment. We keep the threshold high enough to retain most of
  // the content rather than collapsing to a single short opening sentence.
  if (lastSentenceEnd > max * 0.5) {
    return cleaned.slice(0, lastSentenceEnd).trimEnd();
  }

  // Fallback: cut at word boundary
  const lastSpace = truncated.lastIndexOf(" ");
  if (lastSpace <= 0) return truncated;

  return truncated.slice(0, lastSpace).replace(/[,;:\-–—]\s*$/, "").trimEnd();
}

/**
 * Detect and fix common AI text generation artifacts:
 * - Trailing incomplete words (< 3 chars at end of string after a space)
 * - Sentences that end with dangling prepositions/connectors (truncation signal)
 * - Unclosed parentheses or quotes
 * - Sentences that end abruptly without punctuation after being clearly mid-thought
 */
export function sanitizeGenerated(s: string): string {
  let text = s.trim();
  if (!text) return text;

  // Fix trailing fragment: if the last "word" is 1-2 chars and doesn't look
  // like a valid short word (a, I, an, or, to, do, be, etc.), remove it
  const validShortWords = new Set([
    "a", "i", "an", "or", "to", "do", "be", "if", "in", "is", "it", "no",
    "of", "on", "so", "up", "us", "we", "am", "as", "at", "by", "go", "he",
    "me", "my", "ok", "oh",
  ]);

  const lastSpaceIdx = text.lastIndexOf(" ");
  if (lastSpaceIdx > 0) {
    const lastWord = text.slice(lastSpaceIdx + 1).replace(/[.,;:!?'")\]]+$/, "").toLowerCase();
    // Never strip a trailing number — it almost always completes a phrase
    // ("Day 1", "Tier 2", "top 5") rather than being a truncated fragment.
    const isNumber = /^\d+$/.test(lastWord);
    if (lastWord.length > 0 && lastWord.length <= 2 && !validShortWords.has(lastWord) && !isNumber) {
      // Likely a truncated word — remove it
      text = text.slice(0, lastSpaceIdx).trimEnd();
    }
  }

  // Detect sentences ending with dangling prepositions/connectors — a strong
  // signal of mid-sentence truncation. These words are valid on their own but
  // almost never end a sentence properly.
  const danglingEnders = new Set([
    "from", "with", "and", "the", "your", "their", "this", "that", "which",
    "where", "when", "while", "into", "onto", "upon", "about", "after",
    "before", "between", "through", "during", "without", "within", "toward",
    "towards", "against", "beyond", "under", "over", "for", "but", "nor",
    "yet", "both", "either", "neither", "not", "also", "then", "than",
    "because", "since", "although", "though", "whether", "unless", "until",
    "can", "will", "would", "could", "should", "shall", "may", "might",
    "must", "has", "have", "had", "was", "were", "been", "being",
    // Common prepositions/connectors that are dangling when they end a
    // truncated fragment (this branch only runs on non-terminated text).
    "in", "on", "at", "to", "of", "by", "as", "or", "up", "per", "via", "off",
    "out",
  ]);

  // A sentence can never validly end with the article "a"/"an" (with or without
  // a trailing period) — if it does, the noun it introduced was truncated away.
  // Remove the stranded article so we don't emit "...you need a."
  text = text.replace(/\s+an?(\.)?$/i, "").trimEnd();

  // Repair trailing fragments left by hard truncation. Only act when the text
  // does NOT already end with sentence punctuation — a properly terminated
  // sentence from the model is left untouched. This targets artifacts like
  // "...companies are looking for in Day" where the "1 of a rotation..." tail
  // was severed mid-sentence, leaving a stranded noun.
  const endsWithPunctuation = /[.!?]["'”’)\]]?$/.test(text);
  if (!endsWithPunctuation) {
    // Count-nouns that get stranded when a phrase like "Day 1" / "Phase 3" is
    // truncated after the noun ("...looking for in Day"). We only treat these
    // as stranded when they are NOT preceded by a number or quantity word —
    // otherwise "90 days" or "two quarters" is a valid ending and must be kept.
    const orphanCountNouns = new Set([
      "day", "days", "year", "years", "week", "weeks", "month", "months",
      "quarter", "quarters", "phase", "phases", "step", "steps", "round",
      "rounds", "level", "levels", "tier", "tiers", "chapter",
    ]);
    const quantityWords = new Set([
      "one", "two", "three", "four", "five", "six", "seven", "eight", "nine",
      "ten", "eleven", "twelve", "few", "several", "many", "couple", "multiple",
      "various", "dozen", "dozens", "hundreds", "thousands", "first", "next",
      "last", "past", "coming", "final",
    ]);
    // Strip up to a few trailing dangling tokens (connectors or stranded
    // count-nouns); the ending-punctuation pass below re-terminates cleanly.
    const tokens = text.split(/\s+/);
    for (let i = 0; i < 6 && tokens.length > 1; i++) {
      const last = tokens[tokens.length - 1].toLowerCase().replace(/[.,;:!?'"()[\]]+$/, "");
      const prev = tokens[tokens.length - 2].toLowerCase().replace(/[.,;:!?'"()[\]]+$/, "");
      const isDangling = danglingEnders.has(last);
      // Treat plain numbers, decimals, and ranges ("2", "2.5", "2-3", "2–3") as
      // numeric — so a count-noun that correctly follows one ("2–3 years") is kept.
      const prevIsNumeric = /^\d+([.\-–—/]\d+)?$/.test(prev);
      const isStrandedNoun =
        orphanCountNouns.has(last) && !prevIsNumeric && !quantityWords.has(prev);
      if (isDangling || isStrandedNoun) {
        tokens.pop();
      } else {
        break;
      }
    }
    text = tokens.join(" ").replace(/[,;:\-–—]\s*$/, "").trimEnd();
  }

  // Remove trailing punctuation fragments (comma, semicolon, dash at the very end with no following text)
  text = text.replace(/[,;:\-–—]\s*$/, "").trimEnd();

  // Fix unclosed parentheses — if there's an opening ( without a closing ), remove from the ( onward
  const openParens = (text.match(/\(/g) || []).length;
  const closeParens = (text.match(/\)/g) || []).length;
  if (openParens > closeParens) {
    const lastOpen = text.lastIndexOf("(");
    // Only remove if the unclosed paren is in the last 30% of the string (likely a truncation artifact)
    if (lastOpen > text.length * 0.7) {
      text = text.slice(0, lastOpen).trimEnd();
      text = text.replace(/[,;:\-–—]\s*$/, "").trimEnd();
    }
  }

  // Fix unclosed quotes at the end
  const singleQuotes = (text.match(/'/g) || []).length;
  const doubleQuotes = (text.match(/"/g) || []).length;
  if (singleQuotes % 2 !== 0 && text.endsWith("'")) {
    // Trailing unclosed single quote is fine (possessive), skip
  } else if (doubleQuotes % 2 !== 0) {
    // Unclosed double quote — likely truncation mid-quote
    const lastQuote = text.lastIndexOf('"');
    if (lastQuote > text.length * 0.7) {
      text = text.slice(0, lastQuote).trimEnd();
      text = text.replace(/[,;:\-–—]\s*$/, "").trimEnd();
    }
  }

  // Ensure the string ends with proper punctuation if it looks like a sentence
  // (starts with uppercase and is longer than 20 chars)
  if (text.length > 20 && /^[A-Z]/.test(text)) {
    const lastChar = text[text.length - 1];
    if (!/[.!?'")}\]]/.test(lastChar)) {
      text += ".";
    }
  }

  return text;
}

/**
 * Apply both trimming and sanitization in one pass.
 * Use this for all AI-generated text fields before storing/displaying them.
 */
export function cleanText(s: string, max: number): string {
  return sanitizeGenerated(trimAtWord(s, max));
}
