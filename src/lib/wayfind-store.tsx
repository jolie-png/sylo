import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  OPPORTUNITIES,
  PERSONAS,
  TRACKS,
  getOpportunity,
  opportunitiesForTrack,
  type Opportunity,
  type Persona,
  type StepStatus,
} from "./wayfind-data";
import { getOpportunityById } from "./opportunities-db";
import type { GeneratedRoadmap } from "./roadmap.functions";

export type Profile = {
  major: string;
  year: string;
  school: string;
  trackId: string;
  goalText: string;
  personaName?: string;
  /** Student's display name. */
  name?: string;
  /** Free-text: resume bullet points, past experience, anything relevant. */
  experience?: string;
  /** Self-reported GPA (optional, never judged — used to filter eligibility). */
  gpa?: string;
  /** Skills, tools, languages the student already knows. */
  skills?: string;
  /** Prior internships, jobs, or research positions. */
  priorWork?: string;
  /** Clubs, orgs, or extracurriculars. */
  clubs?: string;
  /** What the student has already tried or done toward this goal. */
  alreadyDone?: string;
};

export type Step = {
  id: string;
  opportunityId: string;
  reasoning: string;
  status: StepStatus;
};

export type Roadmap = {
  summary: string;
  topOpportunityId: string;
  steps: Step[];
  alternates: { title: string; detail: string }[];
  /** Gap analysis: what the student has vs. what they need for their goal. */
  gapAnalysis?: GapAnalysis;
};

export type GapItem = {
  /** What's missing or underdeveloped. */
  gap: string;
  /** Why this gap matters for their stated goal. */
  why: string;
  /** The concrete next action to close it. */
  action: string;
};

export type GapAnalysis = {
  /** What the student already has going for them (2-3 bullet points). */
  strengths: string[];
  /** Specific gaps between where they are and their goal (2-4 items). */
  gaps: GapItem[];
  /** One-sentence bottom line: the single biggest thing to focus on. */
  bottomLine: string;
};

export type CustomStep = {
  id: string;
  title: string;
  note?: string;
  targetDate?: string;
  status: StepStatus;
};

type State = {
  profile: Profile | null;
  roadmap: Roadmap | null;
  /**
   * Opportunities found by live search rather than read from the seed dataset.
   * They live here because `getOpportunity` can't find them — see
   * `resolveOpportunity`. Persisted, so a refresh keeps a live roadmap.
   */
  liveOpportunities: Opportunity[];
  customSteps: CustomStep[];
  pinnedIds: string[];
  loading: boolean;
  hydrated: boolean;
  setProfile: (p: Profile) => void;
  /** Omitting `live` clears any previous live results — seed roadmaps replace them. */
  setRoadmap: (r: Roadmap | null, live?: Opportunity[]) => void;
  /** Live results first, then the seed dataset. Use instead of `getOpportunity`. */
  resolveOpportunity: (id: string) => Opportunity | undefined;
  /** Seed opportunities for the track plus any live ones currently on the board. */
  browsableOpportunities: (trackId: string) => Opportunity[];
  setLoading: (v: boolean) => void;
  setStatus: (opportunityId: string, status: StepStatus) => void;
  toggleComplete: (opportunityId: string) => void;
  loadPersona: (personaId: string) => void;
  addCustomStep: (input: { title: string; note?: string; targetDate?: string }) => void;
  updateCustomStep: (id: string, patch: Partial<Omit<CustomStep, "id">>) => void;
  removeCustomStep: (id: string) => void;
  /** Student curation only. Never touches roadmap.steps or the ranked next move. */
  togglePinned: (id: string) => void;
  /** Reorder roadmap steps by moving a step from one index to another. */
  reorderSteps: (fromIndex: number, toIndex: number) => void;
};

const Ctx = createContext<State | null>(null);
const KEY = "wayfind:state:v1";


export function fromGenerated(r: GeneratedRoadmap): Roadmap {
  return {
    summary: r.summary,
    topOpportunityId: r.topOpportunityId,
    alternates: r.alternates,
    gapAnalysis: r.gapAnalysis,
    steps: r.steps.map((s) => ({
      id: s.opportunityId,
      opportunityId: s.opportunityId,
      reasoning: s.reasoning,
      status: "not-started" as StepStatus,
    })),
  };
}

export function personaRoadmap(persona: Persona): Roadmap {
  const track = TRACKS.find((t) => t.id === persona.track)!;
  const pool = OPPORTUNITIES.filter((o) => o.track === persona.track).sort((a, b) =>
    a.deadline.localeCompare(b.deadline),
  );
  return {
    summary: `You're a ${persona.year} ${persona.major} major at ${persona.school} aiming at ${track.label}. ${track.blurb} Everything below is already open to you.`,
    topOpportunityId: pool[0]?.id ?? "",
    alternates: track.brandPrograms.map((b) => ({
      title: b.name,
      detail: `${b.sponsor} — ${b.note}. Not available at ${persona.school}, so Sylo routed you to the local equivalent instead.`,
    })),
    steps: pool.map((o, i) => ({
      id: o.id,
      opportunityId: o.id,
      reasoning: o.leverage,
      status: (i === 1 ? "in-progress" : i === 2 ? "complete" : "not-started") as StepStatus,
    })),
  };
}

export function WayfindProvider({ children }: { children: ReactNode }) {
  const [profile, setProfileState] = useState<Profile | null>(null);
  const [roadmap, setRoadmapState] = useState<Roadmap | null>(null);
  const [liveOpportunities, setLiveOpportunities] = useState<Opportunity[]>([]);
  const [customSteps, setCustomSteps] = useState<CustomStep[]>([]);
  const [pinnedIds, setPinnedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        setProfileState(parsed.profile ?? null);
        setRoadmapState(parsed.roadmap ?? null);
        setLiveOpportunities(
          Array.isArray(parsed.liveOpportunities) ? parsed.liveOpportunities : [],
        );
        setCustomSteps(Array.isArray(parsed.customSteps) ? parsed.customSteps : []);
        setPinnedIds(Array.isArray(parsed.pinnedIds) ? parsed.pinnedIds : []);
      }
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!profile && !roadmap && customSteps.length === 0 && pinnedIds.length === 0) return;
    try {
      localStorage.setItem(
        KEY,
        JSON.stringify({ profile, roadmap, liveOpportunities, customSteps, pinnedIds }),
      );
    } catch {
      /* ignore */
    }
  }, [profile, roadmap, liveOpportunities, customSteps, pinnedIds]);


  const setProfile = useCallback((p: Profile) => setProfileState(p), []);

  const setRoadmap = useCallback((r: Roadmap | null, live?: Opportunity[]) => {
    setRoadmapState(r);
    setLiveOpportunities(live ?? []);
  }, []);

  const resolveOpportunity = useCallback(
    (id: string) =>
      liveOpportunities.find((o) => o.id === id) ??
      getOpportunity(id) ??
      (getOpportunityById(id) as Opportunity | undefined),
    [liveOpportunities],
  );

  const browsableOpportunities = useCallback(
    (trackId: string) => [...liveOpportunities, ...opportunitiesForTrack(trackId)],
    [liveOpportunities],
  );

  const setStatus = useCallback((opportunityId: string, status: StepStatus) => {
    setRoadmapState((prev) =>
      prev
        ? {
            ...prev,
            steps: prev.steps.map((s) => (s.opportunityId === opportunityId ? { ...s, status } : s)),
          }
        : prev,
    );
  }, []);

  const toggleComplete = useCallback((opportunityId: string) => {
    setRoadmapState((prev) =>
      prev
        ? {
            ...prev,
            steps: prev.steps.map((s) =>
              s.opportunityId === opportunityId
                ? { ...s, status: s.status === "complete" ? "not-started" : "complete" }
                : s,
            ),
          }
        : prev,
    );
  }, []);

  /**
   * Instant-demo path. Sets profile with real context and loads the seed
   * roadmap (real programs at real schools). No network call needed.
   */
  const loadPersona = useCallback((personaId: string) => {
    const persona = PERSONAS.find((p) => p.id === personaId);
    if (!persona) return;
    setProfileState({
      major: persona.major,
      year: persona.year,
      school: persona.school,
      trackId: persona.track,
      goalText: TRACKS.find(t => t.id === persona.track)?.label ?? "",
      personaName: persona.name,
      experience: persona.id === "maya"
        ? "Volunteered at campus health clinic for one semester, completed intro bio lab sequence"
        : "Built a full-stack task manager with React and Node.js, contributed to an open-source Python library",
      skills: persona.id === "maya"
        ? "Lab techniques (PCR, gel electrophoresis), SPSS, medical terminology, Spanish"
        : "Python, Java, TypeScript, React, Node.js, SQL, Git, AWS basics",
      priorWork: persona.id === "maya"
        ? "Campus health clinic volunteer (Fall 2024), biology tutor"
        : "Software engineering intern at a seed-stage startup (Summer 2024)",
      clubs: persona.id === "maya"
        ? "Pre-med society, undergraduate research association"
        : "ACM chapter, hackathon team (won 2nd place at HackGT), CS tutoring",
      alreadyDone: persona.id === "maya"
        ? "Shadowed a physician for 40 hours, applied to two research labs (waitlisted)"
        : "Applied to Google STEP (rejected), completed LeetCode 150, took Coursera ML course",
    });
    setRoadmapState(personaRoadmap(persona));
    setLiveOpportunities([]);
  }, []);

  const addCustomStep = useCallback(
    (input: { title: string; note?: string; targetDate?: string }) => {
      setCustomSteps((prev) => [
        ...prev,
        {
          id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          title: input.title,
          note: input.note?.trim() || undefined,
          targetDate: input.targetDate?.trim() || undefined,
          status: "not-started" as StepStatus,
        },
      ]);
    },
    [],
  );

  const updateCustomStep = useCallback((id: string, patch: Partial<Omit<CustomStep, "id">>) => {
    setCustomSteps((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }, []);

  const removeCustomStep = useCallback((id: string) => {
    setCustomSteps((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const togglePinned = useCallback((id: string) => {
    setPinnedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }, []);

  const reorderSteps = useCallback((fromIndex: number, toIndex: number) => {
    setRoadmapState((prev) => {
      if (!prev) return prev;
      const steps = [...prev.steps];
      const [moved] = steps.splice(fromIndex, 1);
      if (!moved) return prev;
      steps.splice(toIndex, 0, moved);
      return { ...prev, steps };
    });
  }, []);

  const value = useMemo(
    () => ({
      profile,
      roadmap,
      liveOpportunities,
      customSteps,
      pinnedIds,
      loading,
      hydrated,
      setProfile,
      setRoadmap,
      resolveOpportunity,
      browsableOpportunities,
      setLoading,
      setStatus,
      toggleComplete,
      loadPersona,
      addCustomStep,
      updateCustomStep,
      removeCustomStep,
      togglePinned,
      reorderSteps,
    }),
    [
      profile,
      roadmap,
      liveOpportunities,
      customSteps,
      pinnedIds,
      loading,
      hydrated,
      setProfile,
      setRoadmap,
      resolveOpportunity,
      browsableOpportunities,
      setStatus,
      toggleComplete,
      loadPersona,
      addCustomStep,
      updateCustomStep,
      removeCustomStep,
      togglePinned,
      reorderSteps,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}


export function useWayfind() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useWayfind must be used inside WayfindProvider");
  return ctx;
}

import type { ParsedResumeData } from "./resume-validation";

/** Merge parsed resume data into existing profile, only overwriting non-empty fields. */
export function mergeResumeData(
  existing: Profile,
  parsed: ParsedResumeData,
): Profile {
  return {
    ...existing,
    experience: parsed.experience?.trim() || existing.experience,
    skills: parsed.skills?.trim() || existing.skills,
    priorWork: parsed.priorWork?.trim() || existing.priorWork,
    clubs: parsed.clubs?.trim() || existing.clubs,
    alreadyDone: parsed.alreadyDone?.trim() || existing.alreadyDone,
  };
}
