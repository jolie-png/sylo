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
import type { GeneratedRoadmap } from "./roadmap.functions";

export type Profile = {
  major: string;
  year: string;
  school: string;
  trackId: string;
  goalText: string;
  personaName?: string;
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
};

const Ctx = createContext<State | null>(null);
const KEY = "wayfind:state:v1";


export function fromGenerated(r: GeneratedRoadmap): Roadmap {
  return {
    summary: r.summary,
    topOpportunityId: r.topOpportunityId,
    alternates: r.alternates,
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
    topOpportunityId: pool[0].id,
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
    (id: string) => liveOpportunities.find((o) => o.id === id) ?? getOpportunity(id),
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
   * The instant-demo path. Local seed data only, no network call of any kind —
   * live search must never be wired into this. Clearing `liveOpportunities`
   * keeps a previous live board from leaking into Maya's or Alex's roadmap.
   */
  const loadPersona = useCallback((personaId: string) => {
    const persona = PERSONAS.find((p) => p.id === personaId);
    if (!persona) return;
    setProfileState({
      major: persona.major,
      year: persona.year,
      school: persona.school,
      trackId: persona.track,
      goalText: "",
      personaName: persona.name,
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
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}


export function useWayfind() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useWayfind must be used inside WayfindProvider");
  return ctx;
}
