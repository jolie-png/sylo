import { createServerFn } from "@tanstack/react-start";

export type ConfigStatus = {
  /** Anthropic key present — powers resume parsing + roadmap gap analysis. */
  hasAnthropicKey: boolean;
  /** Serper key present — powers live web search for profiles with thin curated coverage. */
  hasSerperKey: boolean;
};

/**
 * Reports whether the server has the API keys required for live generation.
 * Returns ONLY booleans — never the key values. Safe to call from the client.
 *
 * Used by the operator-only `?diag=1` banner to confirm the DEPLOYED environment
 * is configured before judging (local .env does not affect the hosted app).
 */
export const getConfigStatus = createServerFn({ method: "GET" }).handler(
  async (): Promise<ConfigStatus> => {
    try {
      const { config } = await import("dotenv");
      config();
    } catch {
      /* no-op in production */
    }
    const hasAnthropicKey = !!process.env.ANTHROPIC_API_KEY;
    const hasSerperKey = !!process.env.SERPER_API_KEY;

    if (!hasSerperKey) {
      console.warn(
        "[config-status] SERPER_API_KEY is NOT set — live web search is disabled. " +
          "Profiles without curated coverage will fall back to the empty state. " +
          "Set SERPER_API_KEY in the deployed environment's secrets.",
      );
    }

    return { hasAnthropicKey, hasSerperKey };
  },
);
