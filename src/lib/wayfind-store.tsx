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
  /** User notes for Sylo_Steps, keyed by opportunityId. */
  stepNotes: Record<string, string>;
  /** User overrides for Sylo_Step reasoning, keyed by opportunityId. */
  stepReasoningOverrides: Record<string, string>;
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
  /** Set or remove a User_Note for a Sylo_Step. Null/empty removes the note. */
  setStepNote: (opportunityId: string, note: string | null) => void;
  /** Set or remove a reasoning override for a Sylo_Step. Null/empty removes it. */
  setStepReasoning: (opportunityId: string, reasoning: string | null) => void;
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
  const pool = OPPORTUNITIES.filter((o) => o.track === persona.track).sort((a, b) => {
    // Empty deadlines (rolling programs) sort AFTER real deadlines
    if (!a.deadline && !b.deadline) return 0;
    if (!a.deadline) return 1;
    if (!b.deadline) return -1;
    return a.deadline.localeCompare(b.deadline);
  });
  const gapAnalysis: GapAnalysis = persona.id === "maya"
    ? {
        strengths: [
          "Already learning Python and Java — ahead of most freshmen in CS fundamentals",
          "Proactive about career exploration (attended career fairs, applied to STEP)",
          "Engaged in Women in CS and GT hackathon community from day one",
        ],
        gaps: [
          {
            gap: "No project beyond coursework",
            why: "Freshman-year programs like Google STEP and Microsoft Explore look for evidence of building things outside of class — even small projects count.",
            action: "Build one complete side project (a web app or CLI tool) and push it to GitHub before applications open.",
          },
          {
            gap: "No exposure to collaborative software development",
            why: "Hackathons and team projects are how freshmen demonstrate they can work in real engineering environments, which STEP and Explore explicitly value.",
            action: "Participate in HackGT as a builder (not just attendee) and ship something with a team this semester.",
          },
          {
            gap: "Limited data structures & algorithms knowledge",
            why: "Technical interviews for STEP and Explore test basic DS&A — you need this before sophomore recruiting opens.",
            action: "Start LeetCode Easys now and take CS 1332 (Data Structures) next semester to be ready by fall recruiting.",
          },
        ],
        bottomLine: "You're early — which is actually an advantage. The biggest unlock is building one real project and doing one team hackathon before STEP/Explore applications open next fall.",
      }
    : {
        strengths: [
          "Strong GPA in sciences with completed intro bio lab sequence",
          "Clinical exposure through campus health clinic volunteering (1 semester)",
          "Active in pre-med society and undergraduate research association",
        ],
        gaps: [
          {
            gap: "No faculty mentor identified",
            why: "A PI relationship is required for most research fellowships and strongly weighted in med school applications.",
            action: "Reach out to 2–3 MCDB faculty whose work interests you this quarter.",
          },
          {
            gap: "No sustained research experience",
            why: "Physician-scientist tracks expect 2+ quarters of lab work, not just coursework.",
            action: "Apply to MCDB Faculty Research Mentorship or BISEP for a funded lab placement.",
          },
          {
            gap: "Limited clinical depth beyond shadowing",
            why: "40 hours shows interest, but programs like POSTBAC-IRTA expect hands-on patient interaction.",
            action: "Join MAPS Pre-Med Pipeline for structured clinical exposure this year.",
          },
        ],
        bottomLine: "Your biggest unlock right now is securing a faculty mentor — most research programs and fellowships on your roadmap require one before you can even apply.",
      };

  return {
    summary: `You're a ${persona.year} ${persona.major} major at ${persona.school} aiming at ${track.label}. ${track.blurb} Everything below is already open to you.`,
    topOpportunityId: pool[0]?.id ?? "",
    gapAnalysis,
    alternates: track.brandPrograms.map((b) => ({
      title: b.name,
      detail: `${b.sponsor} — ${b.note}. Not available at ${persona.school}, so Sylo routed you to the local equivalent instead.`,
    })),
    steps: pool.map((o, i) => ({
      id: o.id,
      opportunityId: o.id,
      reasoning: o.leverage,
      // Demo feel: top step is "in-progress" (the current focus), the last
      // rolling-deadline step is "complete" (low-barrier thing already done).
      status: (i === 0 ? "in-progress" : i === pool.length - 1 ? "complete" : "not-started") as StepStatus,
    })),
  };
}

export function WayfindProvider({ children }: { children: ReactNode }) {
  const [profile, setProfileState] = useState<Profile | null>(null);
  const [roadmap, setRoadmapState] = useState<Roadmap | null>(null);
  const [liveOpportunities, setLiveOpportunities] = useState<Opportunity[]>([]);
  const [customSteps, setCustomSteps] = useState<CustomStep[]>([]);
  const [pinnedIds, setPinnedIds] = useState<string[]>([]);
  const [stepNotes, setStepNotes] = useState<Record<string, string>>({});
  const [stepReasoningOverrides, setStepReasoningOverrides] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw);

        // Clean up stale roadmap steps that reference opportunities no longer in the dataset
        if (parsed.roadmap && parsed.roadmap.steps) {
          const validSteps = parsed.roadmap.steps.filter(
            (s: { opportunityId: string }) =>
              getOpportunity(s.opportunityId) ||
              getOpportunityById(s.opportunityId) ||
              (Array.isArray(parsed.liveOpportunities) &&
                parsed.liveOpportunities.some((o: { id: string }) => o.id === s.opportunityId))
          );
          if (validSteps.length < parsed.roadmap.steps.length) {
            parsed.roadmap.steps = validSteps;
            // If the top opportunity is no longer valid, reset it
            if (parsed.roadmap.topOpportunityId && !validSteps.some(
              (s: { opportunityId: string }) => s.opportunityId === parsed.roadmap.topOpportunityId
            )) {
              parsed.roadmap.topOpportunityId = validSteps[0]?.opportunityId ?? "";
            }
          }
        }

        setProfileState(parsed.profile ?? null);
        setRoadmapState(parsed.roadmap ?? null);
        setLiveOpportunities(
          Array.isArray(parsed.liveOpportunities) ? parsed.liveOpportunities : [],
        );
        setCustomSteps(Array.isArray(parsed.customSteps) ? parsed.customSteps : []);
        setPinnedIds(Array.isArray(parsed.pinnedIds) ? parsed.pinnedIds : []);
        setStepNotes(parsed.stepNotes && typeof parsed.stepNotes === "object" ? parsed.stepNotes : {});
        setStepReasoningOverrides(parsed.stepReasoningOverrides && typeof parsed.stepReasoningOverrides === "object" ? parsed.stepReasoningOverrides : {});
      }
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!profile && !roadmap && customSteps.length === 0 && pinnedIds.length === 0 && Object.keys(stepNotes).length === 0 && Object.keys(stepReasoningOverrides).length === 0) return;
    try {
      localStorage.setItem(
        KEY,
        JSON.stringify({ profile, roadmap, liveOpportunities, customSteps, pinnedIds, stepNotes, stepReasoningOverrides }),
      );
    } catch {
      /* ignore */
    }
  }, [profile, roadmap, liveOpportunities, customSteps, pinnedIds, stepNotes, stepReasoningOverrides]);


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
      name: persona.name,
      experience: persona.id === "maya"
        ? "Built a personal portfolio site with HTML/CSS/JS, completed CS 1301 (intro to computing) with an A"
        : "Volunteered at campus health clinic for one semester, completed intro bio lab sequence",
      skills: persona.id === "maya"
        ? "Python, Java (learning), HTML/CSS, Git basics, intro algorithms"
        : "Lab techniques (PCR, gel electrophoresis), SPSS, medical terminology, Spanish",
      priorWork: persona.id === "maya"
        ? "Part-time IT help desk assistant at school library (Fall 2025)"
        : "Campus health clinic volunteer (Fall 2024), biology tutor",
      clubs: persona.id === "maya"
        ? "Women in CS, GT hackathon club (attended HackGT as participant)"
        : "Pre-med society, undergraduate research association",
      alreadyDone: persona.id === "maya"
        ? "Attended two career fairs, applied to Google STEP (haven't heard back yet)"
        : "Shadowed a physician for 40 hours, applied to two research labs (waitlisted)",
    });
    setRoadmapState(personaRoadmap(persona));
    setLiveOpportunities([]);
    // Reset user-specific state so no data leaks between demos
    setCustomSteps([]);
    setStepNotes({});
    setStepReasoningOverrides({});
    // Pre-pin a few opportunities so the demo feels lived-in
    setPinnedIds(
      persona.id === "maya"
        ? ["op-gt-createx-learn", "op-gt-coop", "op-gt-grip"]
        : ["op-ucla-bisep", "op-ucla-hhmi-pathways", "op-ucla-mcdb-research"],
    );
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

  const setStepNote = useCallback((opportunityId: string, note: string | null) => {
    setStepNotes((prev) => {
      const trimmed = note?.trim();
      if (!trimmed) {
        // Remove the key when note is null or empty/whitespace-only
        const { [opportunityId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [opportunityId]: trimmed };
    });
  }, []);

  const setStepReasoning = useCallback((opportunityId: string, reasoning: string | null) => {
    setStepReasoningOverrides((prev) => {
      const trimmed = reasoning?.trim();
      if (!trimmed) {
        const { [opportunityId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [opportunityId]: trimmed };
    });
  }, []);

  const value = useMemo(
    () => ({
      profile,
      roadmap,
      liveOpportunities,
      customSteps,
      pinnedIds,
      stepNotes,
      stepReasoningOverrides,
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
      setStepNote,
      setStepReasoning,
    }),
    [
      profile,
      roadmap,
      liveOpportunities,
      customSteps,
      pinnedIds,
      stepNotes,
      stepReasoningOverrides,
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
      setStepNote,
      setStepReasoning,
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
