import { Sparkles, CheckCircle2, Plus, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { DeadlinePill } from "@/components/deadline-badges";
import type { PinItem } from "@/lib/pin-store";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface PinItemCardProps {
  item: PinItem;
  onSelect: (id: string) => void;
  onAddToRoadmap?: (item: PinItem) => void;
  onCheckEligibility?: (item: PinItem) => void;
}

// ---------------------------------------------------------------------------
// PinItemCard
// ---------------------------------------------------------------------------

export function PinItemCard({ item, onSelect, onAddToRoadmap, onCheckEligibility }: PinItemCardProps) {
  // Any pinned item can be added to the roadmap — roadmap steps support free-form
  // notes, so reminders/deadlines are just as valid as programs.
  const showAddButton = !item.linkedStepId && onAddToRoadmap;
  const showLinkedLabel = !!item.linkedStepId;
  // The eligibility check only makes sense for actual opportunities that list
  // requirements to check against.
  // Temporarily hide the Opportunity badge and "Am I eligible?" button on Pin
  // Drop. Flip this to `true` to bring both back.
  const SHOW_OPPORTUNITY_FEATURES: boolean = false;
  const showEligibility =
    SHOW_OPPORTUNITY_FEATURES &&
    item.isOpportunityLike &&
    item.opportunityDetails?.requirements &&
    item.opportunityDetails.requirements.length > 0 &&
    onCheckEligibility;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(item.id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(item.id);
        }
      }}
      className={cn(
        "group relative cursor-pointer rounded-xl border bg-card p-3 transition-all",
        "hover:border-primary/20 hover:shadow-sm",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
      )}
    >
      {/* Thumbnail + content grid */}
      <div className="flex gap-3">
        {/* Thumbnail */}
        {item.imageThumbnailBase64 && (
          <img
            src={
              item.imageThumbnailBase64.startsWith("data:")
                ? item.imageThumbnailBase64
                : `data:image/jpeg;base64,${item.imageThumbnailBase64}`
            }
            alt={`Thumbnail for ${item.title}`}
            className="h-20 w-20 shrink-0 rounded-lg object-cover bg-muted"
          />
        )}

        {/* Text content */}
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          {/* Title row */}
          <div className="flex items-start gap-2">
            <h3 className="line-clamp-2 text-sm font-semibold leading-tight">
              {item.title}
            </h3>
            {SHOW_OPPORTUNITY_FEATURES && item.isOpportunityLike && (
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">
                <Sparkles className="h-2.5 w-2.5" />
                Opportunity
              </span>
            )}
          </div>

          {/* Tags */}
          {item.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {item.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Deadline pill */}
          {item.detectedDate && (
            <div className="mt-0.5">
              <DeadlinePill deadline={item.detectedDate} unverified />
            </div>
          )}
        </div>
      </div>

      {/* Roadmap integration row */}
      {(showAddButton || showLinkedLabel || showEligibility) && (
        <div className="mt-2 flex items-center gap-2 border-t pt-2">
          {showAddButton && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onAddToRoadmap(item);
              }}
              className={cn(
                "inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-[11px] font-medium text-primary-foreground",
                "transition-colors hover:bg-primary/90",
              )}
            >
              <Plus className="h-3 w-3" />
              Add & track
            </button>
          )}
          {showEligibility && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onCheckEligibility(item);
              }}
              className="inline-flex items-center gap-1 rounded-full border border-primary/30 px-3 py-1 text-[11px] font-medium text-primary hover:bg-primary/5"
            >
              <ShieldCheck className="h-3 w-3" />
              Am I eligible?
            </button>
          )}
          {showLinkedLabel && (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-3 w-3" />
              Added & tracked
            </span>
          )}
        </div>
      )}
    </div>
  );
}
