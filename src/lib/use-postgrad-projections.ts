import { useCallback, useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { generatePostGradProjections, type PostGradProjection } from "./generatePostGradProjections.functions";
import { postGradMilestonesForTrack, type Milestone } from "./wayfind-data";
import type { Profile } from "./wayfind-store";

const STORAGE_KEY = "sylo:postgrad-projections:v1";

type StoredProjections = {
  /** Hash of the profile used to generate these. */
  profileKey: string;
  projections: PostGradProjection[];
};

function profileKey(profile: Profile): string {
  return [profile.trackId, profile.major, profile.year, profile.school, profile.experience || "", profile.skills || "", profile.priorWork || ""]
    .map((s) => s.toLowerCase().trim())
    .join("|");
}

function loadStored(): StoredProjections | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StoredProjections;
  } catch {
    return null;
  }
}

function saveStored(data: StoredProjections) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch { /* storage full — fine, just don't persist */ }
}

/**
 * Converts static Milestone data into the PostGradProjection shape for seamless fallback.
 */
function staticFallback(trackId: string): PostGradProjection[] {
  const milestones = postGradMilestonesForTrack(trackId);
  return milestones.map((m: Milestone) => ({
    year: m.year,
    focus: m.focus,
    lookOutFor: m.lookOutFor,
    actions: m.actions,
    doneWhen: m.doneWhen,
  }));
}

export type PostGradState = {
  /** The projections to render — either live-generated or static fallback. */
  projections: PostGradProjection[];
  /** Whether the AI generation is currently in-flight. */
  loading: boolean;
  /** Whether the current projections came from AI (true) or static fallback (false). */
  isLive: boolean;
  /** Trigger regeneration (e.g., after profile update). */
  regenerate: () => void;
};

/**
 * Hook that manages post-graduation projections:
 * 1. Returns static fallback immediately (instant content)
 * 2. Fires an AI call in the background
 * 3. Replaces with live projections when they arrive
 * 4. Persists live results to localStorage for fast reload
 */
export function usePostGradProjections(profile: Profile | null): PostGradState {
  const generate = useServerFn(generatePostGradProjections);
  const [projections, setProjections] = useState<PostGradProjection[]>([]);
  const [loading, setLoading] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // On mount or profile change: check localStorage, then fallback to static
  useEffect(() => {
    if (!profile) {
      setProjections([]);
      setIsLive(false);
      return;
    }

    // Instant demo personas have hand-crafted milestones — don't overlay AI projections
    if (profile.personaName) {
      setProjections([]);
      setIsLive(false);
      return;
    }

    const key = profileKey(profile);
    const stored = loadStored();

    if (stored && stored.profileKey === key && stored.projections.length > 0) {
      setProjections(stored.projections);
      setIsLive(true);
      return;
    }

    // Use static fallback immediately
    const fallback = staticFallback(profile.trackId);
    setProjections(fallback);
    setIsLive(false);
  }, [profile?.trackId, profile?.major, profile?.year, profile?.school]);

  const doGenerate = useCallback(async () => {
    if (!profile) return;

    setLoading(true);
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const result = await generate({
        data: {
          trackId: profile.trackId,
          goalText: profile.goalText,
          major: profile.major,
          year: profile.year,
          school: profile.school,
          experience: profile.experience,
          gpa: profile.gpa,
          skills: profile.skills,
          priorWork: profile.priorWork,
          clubs: profile.clubs,
          alreadyDone: profile.alreadyDone,
        },
      });

      if (controller.signal.aborted) return;

      if (result && result.length > 0) {
        setProjections(result);
        setIsLive(true);
        saveStored({ profileKey: profileKey(profile), projections: result });
      }
      // If null (failed), keep the static fallback — don't clear
    } catch (err) {
      if (!controller.signal.aborted) {
        console.error("[usePostGradProjections] generation failed:", err);
      }
      // Keep static fallback on failure
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  }, [profile, generate]);

  // Auto-generate on mount if we don't have live data for this profile
  useEffect(() => {
    if (!profile) return;
    // Skip for instant demo personas — they already have hand-crafted milestones
    if (profile.personaName) return;

    const key = profileKey(profile);
    const stored = loadStored();

    // Only auto-generate if we don't already have matching live data
    if (!stored || stored.profileKey !== key || stored.projections.length === 0) {
      doGenerate();
    }
  }, [profile?.trackId, profile?.major, profile?.year, profile?.school, profile?.experience, profile?.skills, profile?.priorWork]);

  // Cleanup on unmount
  useEffect(() => {
    return () => { abortRef.current?.abort(); };
  }, []);

  return {
    projections,
    loading,
    isLive,
    regenerate: doGenerate,
  };
}
