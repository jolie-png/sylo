import { createServerFn } from "@tanstack/react-start";
import { generateText, Output, NoObjectGeneratedError } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";
import { TRACKS, OPPORTUNITIES } from "./wayfind-data";

const Input = z.object({
  trackId: z.string(),
  goalText: z.string(),
  major: z.string(),
  year: z.string(),
  school: z.string(),
  experience: z.string().optional(),
  gpa: z.string().optional(),
  skills: z.string().optional(),
  priorWork: z.string().optional(),
  clubs: z.string().optional(),
  alreadyDone: z.string().optional(),
});

const RoadmapSchema = z.object({
  summary: z.string(),
  topOpportunityId: z.string(),
  steps: z.array(
    z.object({
      opportunityId: z.string(),
      reasoning: z.string(),
    }),
  ),
  alternates: z.array(z.object({ title: z.string(), detail: z.string() })),
});

export type GeneratedRoadmap = z.infer<typeof RoadmapSchema>;

export const generateRoadmap = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => Input.parse(input))
  .handler(async ({ data }) => {
    try { const { config } = await import("dotenv"); config(); } catch { /* no-op */ }
    const key = process.env.LOVABLE_API_KEY;

    const track = TRACKS.find((t) => t.id === data.trackId) ?? TRACKS[0];
    const pool = OPPORTUNITIES.filter((o) => o.track === track.id);

    // "Something else" (or any track with no verified dataset): stay honest —
    // no AI call, no invented programs, just the student's own words.
    if (pool.length === 0) {
      return {
        summary: data.goalText
          ? `You're a ${data.year} ${data.major} major at ${data.school} working toward: ${data.goalText}. Sylo doesn't have verified opportunity data for this path yet, so nothing below is invented — add your own steps and Sylo will sequence them.`
          : `You're a ${data.year} ${data.major} major at ${data.school}. Sylo doesn't have verified opportunity data for this path yet, so nothing below is invented — add your own steps and Sylo will sequence them.`,
        topOpportunityId: "",
        steps: [],
        alternates: [],
      } satisfies GeneratedRoadmap;
    }

    const dataset = {
      track,
      opportunities: pool,
      today: new Date().toISOString().slice(0, 10),
    };


    const system = [
      "You are Sylo, an academic pathway sequencer for undergraduates.",
      "Reason ONLY over the provided JSON dataset and the student's inputs.",
      "NEVER invent a program, course, deadline, contact, or requirement that is not in the dataset.",
      "Every opportunityId MUST be an id from dataset.opportunities. Use each id at most once.",
      "Return every opportunity in the dataset, ordered by leverage and by how soon its window closes.",
      "topOpportunityId is the single highest-leverage next move and must be the first step.",
      "reasoning: 1-2 sentences, plain second person, referencing the student's year, major, or school. No hedging, no generic advice.",
      "If the student has provided background context (skills, experience, clubs, prior work), use it to personalize the reasoning — explain why a step matters given where they already are.",
      "summary: 1-2 forward-framed sentences about where the student stands. Never give a score, percentage, or peer comparison.",
      "alternates: exactly 2 short alternate branches worth knowing about, grounded in the dataset.",
    ].join(" ");

    const contextLines: string[] = [
      `STUDENT: ${data.year} ${data.major} major at ${data.school}.`,
      `DESTINATION: ${track.label}${data.goalText ? ` — in their words: "${data.goalText}"` : ""}`,
    ];
    if (data.gpa) contextLines.push(`GPA: ${data.gpa}`);
    if (data.skills) contextLines.push(`Skills: ${data.skills}`);
    if (data.experience) contextLines.push(`Experience: ${data.experience}`);
    if (data.priorWork) contextLines.push(`Prior internships/jobs: ${data.priorWork}`);
    if (data.clubs) contextLines.push(`Clubs/orgs: ${data.clubs}`);
    if (data.alreadyDone) contextLines.push(`Already tried toward this goal: ${data.alreadyDone}`);

    const prompt = [
      ...contextLines,
      "",
      "DATASET (the only permitted source of fact):",
      JSON.stringify(dataset),
    ].join("\n\n");

    const validIds = new Set(pool.map((o) => o.id));

    const clean = (r: GeneratedRoadmap): GeneratedRoadmap => {
      const seen = new Set<string>();
      const steps = r.steps.filter((s) => {
        if (!validIds.has(s.opportunityId) || seen.has(s.opportunityId)) return false;
        seen.add(s.opportunityId);
        return true;
      });
      for (const o of pool) {
        if (!seen.has(o.id)) steps.push({ opportunityId: o.id, reasoning: o.leverage });
      }
      const top = validIds.has(r.topOpportunityId) ? r.topOpportunityId : steps[0].opportunityId;
      steps.sort((a, b) => (a.opportunityId === top ? -1 : b.opportunityId === top ? 1 : 0));
      return { ...r, steps, topOpportunityId: top };
    };

    try {
      if (!key) throw new Error("Missing LOVABLE_API_KEY");
      const gateway = createLovableAiGatewayProvider(key);
      const { output } = await generateText({
        model: gateway("google/gemini-3.6-flash"),

        output: Output.object({ schema: RoadmapSchema }),
        system,
        prompt,
      });
      return clean(output);
    } catch (error) {
      if (NoObjectGeneratedError.isInstance(error) && error.text) {
        const match = error.text.match(/\{[\s\S]*\}/);
        if (match) {
          const parsed = RoadmapSchema.safeParse(JSON.parse(match[0]));
          if (parsed.success) return clean(parsed.data);
        }
      }
      // Deterministic dataset-grounded fallback — never fabricates.
      const sorted = [...pool].sort((a, b) => a.deadline.localeCompare(b.deadline));
      return clean({
        summary: `You're a ${data.year} ${data.major} major at ${data.school} heading toward ${track.label}. ${track.blurb}`,
        topOpportunityId: sorted[0].id,
        steps: sorted.map((o) => ({ opportunityId: o.id, reasoning: o.leverage })),
        alternates: track.brandPrograms.map((b) => ({
          title: b.name,
          detail: `${b.sponsor} — ${b.note}. Not offered at ${data.school}; Sylo routed you to the local equivalent instead.`,
        })),
      });
    }
  });
