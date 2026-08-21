import { X, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { checkRequirement } from "@/lib/check-eligibility";
import type { PinItem } from "@/lib/pin-store";
import type { Profile } from "@/lib/wayfind-store";

interface PinEligibilityPopupProps {
  item: PinItem;
  profile: Profile | null;
  onClose: () => void;
}

export function PinEligibilityPopup({ item, profile, onClose }: PinEligibilityPopupProps) {
  const requirements = item.opportunityDetails?.requirements ?? [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Popup */}
      <div className="relative z-10 w-full max-w-sm rounded-2xl border bg-card p-5 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
              <ShieldCheck className="h-4 w-4" />
            </span>
            <div>
              <p className="text-sm font-semibold tracking-tight">Am I eligible?</p>
              <p className="text-[11px] text-muted-foreground line-clamp-1">
                {item.opportunityDetails?.name || item.title}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Requirements checklist */}
        <ul className="mt-4 space-y-2">
          {requirements.map((req) => {
            const match = checkRequirement(req, profile);
            return (
              <li key={req} className="flex items-start gap-2 text-xs">
                <span className={cn(
                  "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-bold",
                  match === "yes" && "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
                  match === "no" && "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
                  match === "unknown" && "bg-muted text-muted-foreground",
                )}>
                  {match === "yes" ? "✓" : match === "no" ? "✗" : "?"}
                </span>
                <span className={cn(
                  match === "yes" && "text-foreground",
                  match === "no" && "text-red-700 dark:text-red-400",
                  match === "unknown" && "text-muted-foreground",
                )}>
                  {req}
                </span>
              </li>
            );
          })}
        </ul>

        {!profile && (
          <p className="mt-3 rounded-lg bg-muted/50 px-3 py-2 text-[11px] text-muted-foreground">
            Build your roadmap first so Sylo knows your major, year, and school.
          </p>
        )}

        {/* Legend */}
        <div className="mt-4 flex items-center gap-3 border-t pt-3 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1"><span className="text-green-600">✓</span> You meet this</span>
          <span className="flex items-center gap-1"><span className="text-red-600">✗</span> Gap</span>
          <span className="flex items-center gap-1"><span>?</span> Can't tell</span>
        </div>
      </div>
    </div>
  );
}
