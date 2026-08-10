// ---------------------------------------------------------------------------
// Text sanitization utilities for AI-generated content.
// Prevents truncated words, detects mangled output, and ensures clean display.
// ---------------------------------------------------------------------------

/**
 * Truncate a string at a word boundary, never mid-word.
 * If the string is already under `max` characters, returns it unchanged.
 * Adds ellipsis only if content was actually cut.
 */
export function trimAtWord(s: string, max: number): string {
  const cleaned = s.trim();
  if (cleaned.length <= max) return cleaned;

  // Find the last space before the max limit
  const truncated = cleaned.slice(0, max);
  const lastSpace = truncated.lastIndexOf(" ");

  // If no space found (single giant word), just return up to max (unlikely for sentences)
  if (lastSpace <= 0) return truncated;

  // Cut at word boundary — don't add ellipsis for cleaner display
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
    if (lastWord.length > 0 && lastWord.length <= 2 && !validShortWords.has(lastWord)) {
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
  ]);

  // Check if the text ends with a dangling word (with or without period)
  const trailingMatch = text.match(/\s(\w+)[.]?$/);
  if (trailingMatch) {
    const candidate = trailingMatch[1].toLowerCase();
    if (danglingEnders.has(candidate)) {
      // Remove the dangling ending — cut back to the previous sentence or clause
      const cutPoint = text.lastIndexOf(" ", text.length - trailingMatch[0].length);
      if (cutPoint > text.length * 0.5) {
        text = text.slice(0, cutPoint).trimEnd();
      }
    }
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
