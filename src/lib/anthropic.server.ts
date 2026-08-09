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

export function hashKey(input: string) {
  return createHash("sha256").update(input).digest("hex").slice(0, 32);
}
