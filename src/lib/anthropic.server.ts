import Anthropic from "@anthropic-ai/sdk";
import { createHash } from "node:crypto";

/**
 * Server-only Anthropic client.
 *
 * `maxRetries: 0` is deliberate: live roadmap generation runs under a hard
 * wall-clock deadline, and SDK-level retries would spend that budget on a
 * request that is already late. A failed call falls back to the seed dataset
 * instead, which is faster and always succeeds.
 */
export function createAnthropicClient(apiKey: string) {
  return new Anthropic({ apiKey, maxRetries: 0 });
}

/**
 * Pinned Claude model IDs. Kept here so a model swap is a one-line change.
 * - HAIKU: cheapest/fastest — good for narrow extraction (pin-drop, resume).
 * - SONNET: stronger judgment & instruction-following — used for the roadmap
 *   analysis where naming real programs and honest ranking matter.
 */
export const CLAUDE_HAIKU = "claude-haiku-4-5-20251001";
export const CLAUDE_SONNET = "claude-sonnet-4-5-20250929";

export function hashKey(input: string) {
  return createHash("sha256").update(input).digest("hex").slice(0, 32);
}
