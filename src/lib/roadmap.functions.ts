import { createServerFn } from "@tanstack/react-start";
import { generateText, Output, NoObjectGeneratedError } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";
import { TRACKS } from "./wayfind-data";
import { OPPORTUNITIES } from "./opportunities-db";

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
  diversitySelfId: z.boolean().optional(),
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
  gapAnalysis: z.object({
    strengths: z.array(z.string()),
    gaps: z.array(z.object({
      gap: z.string(),
      why: z.string(),
      action: z.string(),
    })),
    bottomLine: z.string(),
  }).optional(),
});

export type GeneratedRoadmap = z.infer<typeof RoadmapSchema>;

export const generateRoadmap = createServerFn({ method: "POST" })
  .validator((input: unknown) => Input.parse(input))
  .handler(async ({ data }) => {
    try { const { config } = await import("dotenv"); config(); } catch { /* no-op */ }
    const key = process.env.LOVABLE_API_KEY;

    const track = TRACKS.find((t) => t.id === data.trackId) ?? TRACKS[0];
    const pool = OPPORTUNITIES.filter((o) => {
      if (o.track !== track.id) return false;
      // Exclude diversity-cohort programs unless the student has opted in
      if (!data.diversitySelfId && o.tags?.includes("diversity-cohort")) return false;
      return true;
    });

    // "Something else" (or any track with no verified dataset): stay honest —
    // no AI call, no invented programs, just the student's own words.
    // The "something-else" track may have generic records in the DB, but those
    // aren't matched to the student's actual goal — treat them as no data.
    if (pool.length === 0 || track.id === "something-else") {
      return {
        summary: data.goalText
          ? `You're a ${data.year} ${data.major} major at ${data.school} working toward: ${data.goalText}. Sylo's verified dataset doesn't cover this path yet — add your own steps below and Sylo will sequence them.`
          : `You're a ${data.year} ${data.major} major at ${data.school}. Sylo's verified dataset doesn't cover this path yet — add your own steps below and Sylo will sequence them.`,
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
      "reasoning: 1-2 sentences, plain second person, referencing the student's year, major, or school. If background context is provided, explain why this step matters given their specific gaps — e.g. 'You don't have research experience yet, so this is the fastest on-ramp.' No hedging, no generic advice.",
      "If the student has provided background context (skills, experience, clubs, prior work), use it to personalize the reasoning — explain why a step matters given where they already are.",
      "summary: 1-2 forward-framed sentences about where the student stands. Never give a score, percentage, or peer comparison.",
      "alternates: exactly 2 short alternate branches worth knowing about, grounded in the dataset.",
      "If the student has provided background context (skills, experience, prior work, clubs), include a 'gapAnalysis' field in your response with: strengths (2-3 things they already have going for them), gaps (2-4 specific things missing between where they are and their goal, each with gap/why/action), and bottomLine (single most important thing to focus on right now). If no background context is provided, omit the gapAnalysis field entirely.",
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

      // Anti-hallucination: strip any URLs from reasoning text (the AI should
      // never embed links — real links come from the opportunity data itself).
      const sanitizeText = (s: string) => s.replace(/https?:\/\/[^\s)]+/g, "").trim();
      const cleanedSteps = steps.map((s) => ({ ...s, reasoning: sanitizeText(s.reasoning).slice(0, 600) }));
      const summary = sanitizeText(r.summary).slice(0, 500);

      // Sanitize gap analysis text if present
      const gapAnalysis = r.gapAnalysis ? {
        strengths: r.gapAnalysis.strengths.map((s) => sanitizeText(s).slice(0, 350)),
        gaps: r.gapAnalysis.gaps.map((g) => ({
          gap: sanitizeText(g.gap).slice(0, 300),
          why: sanitizeText(g.why).slice(0, 350),
          action: sanitizeText(g.action).slice(0, 350),
        })),
        bottomLine: sanitizeText(r.gapAnalysis.bottomLine).slice(0, 450),
      } : undefined;

      return { ...r, summary, steps: cleanedSteps, topOpportunityId: top, gapAnalysis };
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
      const sorted = [...pool].sort((a, b) => {
        // Empty deadlines (rolling) sort after real deadlines
        if (!a.deadline && !b.deadline) return 0;
        if (!a.deadline) return 1;
        if (!b.deadline) return -1;
        return a.deadline.localeCompare(b.deadline);
      });
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
