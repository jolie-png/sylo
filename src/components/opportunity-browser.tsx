import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Pin, PinOff } from "lucide-react";
import { Tag, FoundViaSearchBadge } from "@/components/workspace";
import { useWayfind } from "@/lib/sylo-store";

/**
 * Browsable grid of every verified opportunity on the student's own track.
 *
 * Pinning is pure student curation: it reads and writes `pinnedIds` only, and
 * has no effect on roadmap.steps, the ranked next move, or any sequencing.
 * Nothing here is generated — pinning only surfaces more of the verified
 * fields that already exist in wayfind-data.ts.
 */
export function OpportunityBrowser({ trackId }: { trackId: string }) {
  const navigate = useNavigate();
  const { pinnedIds, togglePinned, resolveOpportunity, browsableOpportunities } = useWayfind();
  const [filter, setFilter] = useState<"all" | "pinned">("all");

  const all = browsableOpportunities(trackId);
  const shown = filter === "pinned" ? all.filter((op) => pinnedIds.includes(op.id)) : all;

  return (
    <div className="mt-6">
      <div className="flex items-center gap-1.5 rounded-full border bg-muted/50 p-1 w-fit">
        {(["all", "pinned"] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`tap rounded-full px-3.5 py-1 text-xs font-medium capitalize transition-colors ${
              filter === f
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {f === "pinned" ? `Pinned${pinnedIds.length ? ` (${pinnedIds.length})` : ""}` : "All"}
          </button>
        ))}
      </div>

      {shown.length || filter === "pinned" ? (
      <p className="mt-3 text-xs text-muted-foreground">
        {filter === "pinned"
          ? "Things you saved. Pinning is your own shortlist — it never changes what Sylo ranks as your next move."
          : all.some((op) => op.origin === "live")
            ? "Verified opportunities on this track, plus what search turned up for you just now — those are tagged separately. Pin the ones you want to keep close."
            : "Every verified opportunity on this track. Pin the ones you want to keep close."}
      </p>
      ) : null}

      {shown.length === 0 ? (
        <p className="mt-8 rounded-2xl border border-dashed p-6 text-sm text-muted-foreground">
          {filter === "pinned"
            ? "Nothing pinned yet. Tap the pin on any card to save it here."
            : "Sylo hasn't found opportunities for this path yet. Try generating your roadmap again, or add your own steps on the dashboard."}
        </p>
      ) : (
        <div className="mt-5 columns-1 gap-4 sm:columns-2 [column-fill:_balance]">
          {shown.map((op) => {
            const pinned = pinnedIds.includes(op.id);
            const full = resolveOpportunity(op.id);
            return (
              <div
                key={op.id}
                role="button"
                tabIndex={0}
                onClick={() => navigate({ to: "/opportunity-details", search: { id: op.id } })}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    navigate({ to: "/opportunity-details", search: { id: op.id } });
                  }
                }}
                className="tap card-tonal mb-4 block break-inside-avoid cursor-pointer rounded-2xl border p-4 text-left transition-shadow hover:shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold leading-snug tracking-tight">{op.name}</p>
                  <button
                    type="button"
                    aria-label={pinned ? `Unpin ${op.name}` : `Pin ${op.name}`}
                    aria-pressed={pinned}
                    onClick={(e) => {
                      e.stopPropagation();
                      togglePinned(op.id);
                    }}
                    className={`tap -mr-1 -mt-1 shrink-0 rounded-full p-1.5 ${
                      pinned ? "text-primary" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {pinned ? (
                      <Pin className="h-4 w-4" fill="currentColor" />
                    ) : (
                      <PinOff className="h-4 w-4" />
                    )}
                  </button>
                </div>

                <div className="mt-2.5 flex flex-wrap items-center gap-1.5 [&>*]:max-w-full [&>*]:whitespace-normal [&>*]:break-words">
                  <Tag>{op.category}</Tag>
                  <Tag tone="amber">{op.timeframe}</Tag>
                  {op.origin === "live" ? <FoundViaSearchBadge /> : null}
                </div>

                {pinned && full ? (
                  <p className="mt-3 border-t pt-3 text-xs leading-relaxed text-muted-foreground">
                    {full.leverage}
                  </p>
                ) : null}

                {pinned && filter === "pinned" && full ? (
                  <div className="mt-3 space-y-2">
                    <div className="flex flex-wrap gap-1.5 [&>*]:max-w-full [&>*]:whitespace-normal [&>*]:break-words">
                      {full.requirements.map((r) => (
                        <Tag key={r}>{r}</Tag>
                      ))}
                    </div>
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                      Timeframe · <span className="normal-case">{full.timeframe}</span>
                    </p>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
