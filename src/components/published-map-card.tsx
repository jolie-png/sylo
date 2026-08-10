import { useState } from "react";
import { ChevronRight, Lightbulb, SkipForward, MessageCircle, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { getCategoryStyle, getCategoryLabel, type PublishedMap } from "@/lib/published-maps";
import { ProgramLinkedText } from "@/components/program-linker";

/**
 * Displays a single published success map as an expandable card
 * with a vertical timeline, turning point highlight, and advice section.
 */
export function PublishedMapCard({
  map,
  expanded,
  onToggle,
}: {
  map: PublishedMap;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="rounded-2xl border bg-card shadow-sm transition-shadow hover:shadow-md">
      {/* Header — always visible */}
      <button
        type="button"
        onClick={onToggle}
        className="tap flex w-full items-start gap-4 p-5 text-left"
      >
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-secondary">
          <span className="text-lg font-semibold text-foreground/70">
            {map.author[0]?.toUpperCase() ?? "?"}
          </span>
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[15px] font-semibold tracking-tight">{map.author}</span>
            <span className="text-xs text-muted-foreground">
              · {map.school} · {map.major}
            </span>
            {map.isExample && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-400">
                <Sparkles className="h-2.5 w-2.5" />
                Example
              </span>
            )}
          </div>
          <p className="mt-1 text-sm font-medium text-primary">{map.outcome}</p>
          <p className="mt-0.5 text-[12px] text-muted-foreground">{map.timeline}</p>
        </div>
        <ChevronRight
          className={cn(
            "mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform",
            expanded && "rotate-90",
          )}
        />
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t px-5 pb-6 pt-5">
          {/* Timeline */}
          <ol className="space-y-0">
            {map.steps.map((step, i) => (
              <li key={i} className="relative flex gap-3">
                {/* Vertical line connector */}
                <div className="flex flex-col items-center">
                  <span
                    className={cn(
                      "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold",
                      getCategoryStyle(step.category),
                    )}
                  >
                    {i + 1}
                  </span>
                  {i < map.steps.length - 1 && (
                    <div className="mt-1 h-full w-px bg-border" />
                  )}
                </div>

                {/* Content */}
                <div className="pb-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground/70">
                      {step.timing}
                    </span>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[10px] font-medium",
                        getCategoryStyle(step.category),
                      )}
                    >
                      {getCategoryLabel(step.category)}
                    </span>
                  </div>
                  <p className="mt-1 text-sm leading-relaxed text-foreground/90">
                    <ProgramLinkedText text={step.action} />
                  </p>
                  {step.unlocked && (
                    <p className="mt-1.5 text-[12px] leading-relaxed text-primary/80">
                      → <ProgramLinkedText text={step.unlocked} />
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ol>

          {/* Turning Point — highlighted */}
          <div className="mt-4 rounded-xl border border-primary/15 bg-primary/[0.04] p-4">
            <div className="flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-primary/70" />
              <p className="text-[12px] font-semibold uppercase tracking-wide text-primary/80">
                Turning point
              </p>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-foreground/85">
              <ProgramLinkedText text={map.turningPoint} />
            </p>
          </div>

          {/* What I'd skip */}
          <div className="mt-3 rounded-xl bg-muted/50 p-4">
            <div className="flex items-center gap-2">
              <SkipForward className="h-3.5 w-3.5 text-muted-foreground" />
              <p className="text-[12px] font-semibold uppercase tracking-wide text-muted-foreground/80">
                What I'd skip
              </p>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-foreground/75">
              <ProgramLinkedText text={map.wouldSkip} />
            </p>
          </div>

          {/* Advice */}
          <div className="mt-3 rounded-xl bg-muted/50 p-4">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-3.5 w-3.5 text-muted-foreground" />
              <p className="text-[12px] font-semibold uppercase tracking-wide text-muted-foreground/80">
                Advice for someone starting out
              </p>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-foreground/75">
              <ProgramLinkedText text={map.advice} />
            </p>
          </div>

          {map.isExample && (
            <p className="mt-4 text-center text-[11px] text-muted-foreground/60">
              This is a composite example based on real experiences. Not a single individual.
            </p>
          )}

          {map.linkedin && !map.isExample && (
            <a
              href={map.linkedin}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary hover:underline"
            >
              Connect on LinkedIn →
            </a>
          )}
        </div>
      )}
    </div>
  );
}
