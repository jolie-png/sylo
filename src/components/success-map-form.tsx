import { useState } from "react";
import { Plus, Trash2, ChevronLeft, Eye, Send, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import { STEP_CATEGORIES, getCategoryStyle, type StepCategory, type PublishedStep, type PublishedMap } from "@/lib/published-maps";
import { PublishedMapCard } from "@/components/published-map-card";
import { TRACKS } from "@/lib/wayfind-data";

type FormStep = {
  id: string;
  timing: string;
  action: string;
  category: StepCategory;
  unlocked: string;
};

type FormState = {
  author: string;
  anonymous: boolean;
  linkedin: string;
  school: string;
  major: string;
  startYear: string;
  track: string;
  outcome: string;
  timeline: string;
  steps: FormStep[];
  turningPoint: string;
  wouldSkip: string;
  advice: string;
};

const INITIAL_STEP: () => FormStep = () => ({
  id: `step-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
  timing: "",
  action: "",
  category: "other",
  unlocked: "",
});

function createInitialState(prefill?: { school?: string; major?: string; track?: string }): FormState {
  return {
    author: "",
    anonymous: true,
    linkedin: "",
    school: prefill?.school ?? "",
    major: prefill?.major ?? "",
    startYear: "",
    track: prefill?.track ?? "",
    outcome: "",
    timeline: "",
    steps: [INITIAL_STEP(), INITIAL_STEP(), INITIAL_STEP()],
    turningPoint: "",
    wouldSkip: "",
    advice: "",
  };
}

/**
 * Structured submission form for publishing a success map.
 * Guided prompts ensure quality content.
 */
export function SuccessMapForm({
  prefill,
  onSubmit,
  onCancel,
}: {
  prefill?: { school?: string; major?: string; track?: string };
  onSubmit: (map: Omit<PublishedMap, "id" | "publishedAt">) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<FormState>(() => createInitialState(prefill));
  const [view, setView] = useState<"form" | "preview">("form");

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const updateStep = (id: string, patch: Partial<FormStep>) =>
    setForm((prev) => ({
      ...prev,
      steps: prev.steps.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    }));

  const addStep = () => {
    if (form.steps.length >= 12) return;
    setForm((prev) => ({ ...prev, steps: [...prev.steps, INITIAL_STEP()] }));
  };

  const removeStep = (id: string) => {
    if (form.steps.length <= 3) return;
    setForm((prev) => ({ ...prev, steps: prev.steps.filter((s) => s.id !== id) }));
  };

  const isValid =
    form.school.trim() &&
    form.major.trim() &&
    form.track &&
    form.outcome.trim() &&
    form.timeline.trim() &&
    form.steps.filter((s) => s.timing.trim() && s.action.trim()).length >= 3 &&
    form.turningPoint.trim() &&
    form.wouldSkip.trim() &&
    form.advice.trim();

  const handleSubmit = () => {
    if (!isValid) return;
    const validSteps: PublishedStep[] = form.steps
      .filter((s) => s.timing.trim() && s.action.trim())
      .map((s) => ({
        timing: s.timing.trim(),
        action: s.action.trim(),
        category: s.category,
        ...(s.unlocked.trim() ? { unlocked: s.unlocked.trim() } : {}),
      }));

    onSubmit({
      author: form.anonymous ? "Anonymous" : form.author.trim() || "Anonymous",
      track: form.track,
      school: form.school.trim(),
      major: form.major.trim(),
      startYear: form.startYear || "Unknown",
      outcome: form.outcome.trim(),
      timeline: form.timeline.trim(),
      steps: validSteps,
      turningPoint: form.turningPoint.trim(),
      wouldSkip: form.wouldSkip.trim(),
      advice: form.advice.trim(),
      ...(form.linkedin.trim() ? { linkedin: form.linkedin.trim() } : {}),
    });
  };

  // Build preview map for the preview pane
  const previewMap: PublishedMap = {
    id: "preview",
    author: form.anonymous ? "Anonymous" : form.author.trim() || "Anonymous",
    track: form.track,
    school: form.school || "Your school",
    major: form.major || "Your major",
    startYear: form.startYear || "",
    outcome: form.outcome || "Your outcome",
    timeline: form.timeline || "",
    steps: form.steps
      .filter((s) => s.timing || s.action)
      .map((s) => ({
        timing: s.timing || "...",
        action: s.action || "...",
        category: s.category,
        ...(s.unlocked ? { unlocked: s.unlocked } : {}),
      })),
    turningPoint: form.turningPoint || "...",
    wouldSkip: form.wouldSkip || "...",
    advice: form.advice || "...",
    publishedAt: new Date().toISOString().slice(0, 10),
  };

  if (view === "preview") {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setView("form")}
            className="tap inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to editing
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!isValid}
            className="tap inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 disabled:opacity-50"
          >
            <Send className="h-3.5 w-3.5" />
            Submit for review
          </button>
        </div>

        <p className="text-[12px] text-muted-foreground">
          This is how your path will appear to other students after review.
        </p>

        <PublishedMapCard map={previewMap} expanded={true} onToggle={() => {}} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onCancel}
          className="tap inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
          Cancel
        </button>
        <button
          type="button"
          onClick={() => setView("preview")}
          className="tap inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          <Eye className="h-3 w-3" />
          Preview
        </button>
      </div>

      <div>
        <h2 className="text-lg font-semibold tracking-tight">Share your roadmap</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Help future students see what actually worked. We'll review before publishing.
        </p>
      </div>

      {/* Section 1: Who are you */}
      <fieldset className="space-y-3 rounded-2xl border p-4">
        <legend className="px-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Where you started
        </legend>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="School" required>
            <input
              value={form.school}
              onChange={(e) => update("school", e.target.value)}
              placeholder="e.g., Columbia University"
              className=""
            />
          </Field>
          <Field label="Major" required>
            <input
              value={form.major}
              onChange={(e) => update("major", e.target.value)}
              placeholder="e.g., Computer Science"
              className=""
            />
          </Field>
          <Field label="Career track" required>
            <select
              value={form.track}
              onChange={(e) => update("track", e.target.value)}
              className=""
            >
              <option value="">Select a track...</option>
              {TRACKS.filter((t) => t.id !== "something-else").map((t) => (
                <option key={t.id} value={t.id}>{t.label}</option>
              ))}
            </select>
          </Field>
          <Field label="Starting year">
            <select
              value={form.startYear}
              onChange={(e) => update("startYear", e.target.value)}
              className=""
            >
              <option value="">When did you start?</option>
              <option value="Freshman">Freshman</option>
              <option value="Sophomore">Sophomore</option>
              <option value="Junior">Junior</option>
              <option value="Senior">Senior</option>
            </select>
          </Field>
        </div>
      </fieldset>

      {/* Section 2: Where you ended up */}
      <fieldset className="space-y-3 rounded-2xl border p-4">
        <legend className="px-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Where you ended up
        </legend>
        <Field label="Outcome (role + company type)" required>
          <input
            value={form.outcome}
            onChange={(e) => update("outcome", e.target.value)}
            placeholder="e.g., Associate Product Manager at Google"
            className=""
          />
        </Field>
        <Field label="Timeline (start → end)">
          <input
            value={form.timeline}
            onChange={(e) => update("timeline", e.target.value)}
            placeholder="e.g., Sophomore fall → Senior winter"
            className=""
          />
        </Field>
      </fieldset>

      {/* Section 3: Steps */}
      <fieldset className="space-y-3 rounded-2xl border p-4">
        <legend className="px-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          What you did (3–12 steps)
        </legend>
        <p className="text-[12px] text-muted-foreground">
          List the steps you took in order. Include the semester/year, what you did, and what category it falls under.
        </p>

        <div className="space-y-4">
          {form.steps.map((step, i) => (
            <div key={step.id} className="relative rounded-xl border bg-muted/30 p-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-muted-foreground">Step {i + 1}</span>
                {form.steps.length > 3 && (
                  <button
                    type="button"
                    onClick={() => removeStep(step.id)}
                    className="tap rounded p-1 text-muted-foreground hover:text-red-500"
                    aria-label="Remove step"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                )}
              </div>
              <div className="mt-2 grid gap-2 sm:grid-cols-[140px_1fr]">
                <input
                  value={step.timing}
                  onChange={(e) => updateStep(step.id, { timing: e.target.value })}
                  placeholder="e.g., Junior summer"
                  className="w-full rounded-xl border bg-background px-3 py-2 text-xs outline-none focus:border-primary/40"
                />
                <select
                  value={step.category}
                  onChange={(e) => updateStep(step.id, { category: e.target.value as StepCategory })}
                  className="w-full rounded-xl border bg-background px-3 py-2 text-xs outline-none focus:border-primary/40"
                >
                  {STEP_CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>
              <textarea
                value={step.action}
                onChange={(e) => updateStep(step.id, { action: e.target.value })}
                placeholder="What did you do? Be specific — this is what others will learn from."
                rows={2}
                className="mt-2 w-full resize-none rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:border-primary/40"
              />
              <input
                value={step.unlocked}
                onChange={(e) => updateStep(step.id, { unlocked: e.target.value })}
                placeholder="What did this unlock? (optional)"
                className="mt-2 w-full rounded-xl border bg-background px-3 py-2 text-xs text-primary/80 outline-none focus:border-primary/40"
              />
            </div>
          ))}
        </div>

        {form.steps.length < 12 && (
          <button
            type="button"
            onClick={addStep}
            className="tap inline-flex items-center gap-1.5 rounded-full border border-dashed px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            <Plus className="h-3 w-3" />
            Add step
          </button>
        )}
      </fieldset>

      {/* Section 4: Reflections */}
      <fieldset className="space-y-3 rounded-2xl border p-4">
        <legend className="px-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Reflections
        </legend>

        <Field label="Turning point — the one thing that mattered most" required>
          <textarea
            value={form.turningPoint}
            onChange={(e) => update("turningPoint", e.target.value)}
            placeholder="What was the single most important decision, action, or moment? Why did it matter more than everything else?"
            rows={3}
            className="text-sm"
          />
        </Field>

        <Field label="What would you skip if you did it again?" required>
          <textarea
            value={form.wouldSkip}
            onChange={(e) => update("wouldSkip", e.target.value)}
            placeholder="What seemed important at the time but turned out to be noise? Be honest — this is the most useful part for others."
            rows={3}
            className="text-sm"
          />
        </Field>

        <Field label="One piece of advice for someone at step 1" required>
          <textarea
            value={form.advice}
            onChange={(e) => update("advice", e.target.value)}
            placeholder="If you could go back and tell yourself one thing at the beginning, what would it be?"
            rows={3}
            className="text-sm"
          />
        </Field>
      </fieldset>

      {/* Section 5: Identity */}
      <fieldset className="space-y-3 rounded-2xl border p-4">
        <legend className="px-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          How you appear
        </legend>
        <p className="text-[12px] text-muted-foreground">
          Only your display name, school, major, and the steps above will be public. No email or contact info is shared.
        </p>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={form.anonymous}
            onChange={(e) => update("anonymous", e.target.checked)}
            className="h-4 w-4 rounded border"
          />
          <span className="text-sm">Stay anonymous</span>
        </label>

        {!form.anonymous && (
          <Field label="First name or alias">
            <input
              value={form.author}
              onChange={(e) => update("author", e.target.value)}
              placeholder="e.g., Jordan"
              className=""
            />
          </Field>
        )}

        <Field label="LinkedIn profile (optional)">
          <input
            value={form.linkedin}
            onChange={(e) => update("linkedin", e.target.value)}
            placeholder="https://linkedin.com/in/yourname"
            className=""
          />
          <p className="mt-1 text-[11px] text-muted-foreground/70">
            Displayed publicly so others can connect with you. Leave blank to skip.
          </p>
        </Field>
      </fieldset>

      {/* Actions */}
      <div className="flex items-center justify-between border-t pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="tap text-sm text-muted-foreground hover:text-foreground"
        >
          Cancel
        </button>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setView("preview")}
            className="tap inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium hover:bg-accent"
          >
            <Eye className="h-3.5 w-3.5" />
            Preview
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!isValid}
            className="tap inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 disabled:opacity-50"
          >
            <Send className="h-3.5 w-3.5" />
            Submit for review
          </button>
        </div>
      </div>

      {!isValid && (
        <p className="text-center text-[11px] text-muted-foreground">
          Fill in all required fields and at least 3 steps to submit.
        </p>
      )}
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[12px] font-medium text-muted-foreground">
        {label}
        {required && <span className="text-red-400"> *</span>}
      </span>
      <div className="mt-1 [&_input]:w-full [&_input]:rounded-xl [&_input]:border [&_input]:bg-background [&_input]:px-3 [&_input]:py-2 [&_input]:text-sm [&_input]:outline-none [&_input]:focus:border-primary/40 [&_select]:w-full [&_select]:rounded-xl [&_select]:border [&_select]:bg-background [&_select]:px-3 [&_select]:py-2 [&_select]:text-sm [&_select]:outline-none [&_select]:focus:border-primary/40 [&_textarea]:w-full [&_textarea]:rounded-xl [&_textarea]:border [&_textarea]:bg-background [&_textarea]:px-3 [&_textarea]:py-2 [&_textarea]:text-sm [&_textarea]:outline-none [&_textarea]:focus:border-primary/40 [&_textarea]:resize-none">{children}</div>
    </label>
  );
}
