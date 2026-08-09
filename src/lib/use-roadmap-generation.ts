import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { generateRoadmap } from "./roadmap.functions";
import { generateLiveRoadmap } from "./generateLiveRoadmap.functions";
import { fromGenerated, type Roadmap } from "./wayfind-store";
import type { Opportunity } from "./wayfind-data";

const SESSION_KEY = "sylo:session-id";

/** Stable per-visitor id. Only ever used to key the server-side rate cap. */
function sessionId(): string | undefined {
  try {
    let id = localStorage.getItem(SESSION_KEY);
    if (!id) {
      id = `s-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
      localStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return undefined;
  }
}

export type RoadmapInput = {
  trackId: string;
  goalText: string;
  major: string;
  year: string;
  school: string;
  experience?: string;
  gpa?: string;
  skills?: string;
  priorWork?: string;
  clubs?: string;
  alreadyDone?: string;
};

export type GenerationResult = {
  roadmap: Roadmap;
  /** Non-empty only when live search produced the board. */
  live: Opportunity[];
};

/**
 * The order of preference, every time a roadmap is needed:
 *
 *   1. Live, search-powered generation.
 *   2. On any failure — timeout, API error, rate cap, no results — the
 *      existing deterministic seed-dataset match.
 *
 * A student should never be able to tell which of the two succeeded. Only a
 * failure of *both* surfaces, and the callers already handle that.
 *
 * The instant-demo shortcuts don't come through here at all: `loadPersona`
 * reads local seed data directly, with no network call.
 */
export function useRoadmapGeneration() {
  const live = useServerFn(generateLiveRoadmap);
  const seed = useServerFn(generateRoadmap);

  return useCallback(
    async (input: RoadmapInput): Promise<GenerationResult> => {
      try {
        const result = await live({ data: { ...input, sessionId: sessionId() } });
        if (result && result.steps.length > 0) {
          return { roadmap: fromGenerated(result), live: result.opportunities };
        }
      } catch (err) {
        console.error("[useRoadmapGeneration] live search failed:", err);
        /* Live search is best-effort. Fall through to the seed dataset. */
      }
      return { roadmap: fromGenerated(await seed({ data: input })), live: [] };
    },
    [live, seed],
  );
}

const PHASES = [
  "Searching for real opportunities…",
  "Cross-checking sources…",
  "Sequencing your roadmap…",
  "Almost there — assembling your path…",
];

/**
 * Live search runs several search-then-verify round trips, so the wait is
 * genuinely long. Naming each phase as it happens keeps it from reading as a
 * hung spinner, and each label is true of what the server is doing at the time.
 */
export function useSearchProgressLabel(active: boolean) {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    if (!active) {
      setPhase(0);
      return;
    }
    const timers = [
      window.setTimeout(() => setPhase(1), 5000),
      window.setTimeout(() => setPhase(2), 14000),
      window.setTimeout(() => setPhase(3), 22000),
    ];
    return () => timers.forEach(window.clearTimeout);
  }, [active]);

  return PHASES[phase];
}
