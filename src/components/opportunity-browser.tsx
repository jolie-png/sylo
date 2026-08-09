import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Pin, PinOff, SlidersHorizontal, Search } from "lucide-react";
import { Tag, FoundViaSearchBadge } from "@/components/workspace";
import { useWayfind } from "@/lib/sylo-store";
import { OPPORTUNITIES } from "@/lib/opportunities-db";
import { TRACKS, type Opportunity } from "@/lib/wayfind-data";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const CATEGORIES = ["Research", "Internship", "Fellowship", "Club", "Funding", "Advising", "Course"];

/**
 * Browsable grid of opportunities with Pinterest-style pinning.
 *
 * Single nav bar: My Track | View All | Pinned
 * Plus category/track filtering when browsing all.
 */
export function OpportunityBrowser({ trackId }: { trackId: string }) {
  const navigate = useNavigate();
  const { pinnedIds, togglePinned, resolveOpportunity, browsableOpportunities } = useWayfind();
  const [view, setView] = useState<"track" | "all" | "pinned">("track");
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [trackFilter, setTrackFilter] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const trackOpportunities = browsableOpportunities(trackId);
  const allOpportunities = OPPORTUNITIES as Opportunity[];

  // Determine the pool based on view
  let pool: Opportunity[];
  if (view === "pinned") {
    pool = allOpportunities.filter((op) => pinnedIds.includes(op.id));
  } else if (view === "all") {
    pool = allOpportunities;
  } else {
    pool = trackOpportunities;
  }

  // Apply category + track + search filters
  const shown = pool.filter((op) => {
    if (view === "all" && categoryFilter && op.category !== categoryFilter) return false;
    if (view === "all" && trackFilter && op.track !== trackFilter) return false;
    if (query) {
      const q = query.toLowerCase();
      const searchable = `${op.name} ${op.category} ${op.leverage ?? ""} ${op.timeframe ?? ""}`.toLowerCase();
      if (!searchable.includes(q)) return false;
    }
    return true;
  });

  return (
    <div className="mt-6">
      {/* Single unified nav bar */}
      <div className="flex items-center gap-1.5 rounded-full border bg-muted/50 p-1 w-fit">
        <button
          type="button"
          onClick={() => setView("track")}
          className={cn(
            "tap rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors",
            view === "track"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          My Track
        </button>
        <button
          type="button"
          onClick={() => setView("all")}
          className={cn(
            "tap rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors",
            view === "all"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          View All
        </button>
        <button
          type="button"
          onClick={() => setView("pinned")}
          className={cn(
            "tap rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors",
            view === "pinned"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          Pinned{pinnedIds.length ? ` (${pinnedIds.length})` : ""}
        </button>
      </div>

      {/* Search bar */}
      <div className="relative mt-3">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search programs, fellowships, deadlines..."
          className="pl-9 rounded-2xl"
        />
      </div>

      {/* Filter row — shown when viewing all */}
      {view === "all" && (
        <div className="mt-3 space-y-2">
          {/* Category filter */}
          <div className="flex flex-wrap items-center gap-1.5">
            <SlidersHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
            <button
              type="button"
              onClick={() => setCategoryFilter(null)}
              className={cn(
                "tap rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors",
                !categoryFilter
                  ? "bg-primary/10 text-primary"
                  : "bg-muted text-muted-foreground hover:text-foreground",
              )}
            >
              All Types
            </button>
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoryFilter(categoryFilter === cat ? null : cat)}
                className={cn(
                  "tap rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors",
                  categoryFilter === cat
                    ? "bg-primary/10 text-primary"
                    : "bg-muted text-muted-foreground hover:text-foreground",
                )}
              >
                {cat}
              </button>
            ))}
          </div>
          {/* Track filter */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="w-3.5" />
            <button
              type="button"
              onClick={() => setTrackFilter(null)}
              className={cn(
                "tap rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors",
                !trackFilter
                  ? "bg-primary/10 text-primary"
                  : "bg-muted text-muted-foreground hover:text-foreground",
              )}
            >
              All Tracks
            </button>
            {TRACKS.filter((t) => t.id !== "something-else").map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTrackFilter(trackFilter === t.id ? null : t.id)}
                className={cn(
                  "tap rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors",
                  trackFilter === t.id
                    ? "bg-primary/10 text-primary"
                    : "bg-muted text-muted-foreground hover:text-foreground",
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Helper text */}
      <p className="mt-3 text-xs text-muted-foreground">
        {view === "pinned"
          ? "Things you saved. Pinning is your own shortlist — it never changes what Sylo ranks as your next move."
          : view === "all"
            ? `${shown.length} programs, fellowships, and pipeline deadlines across all tracks. Pin the ones you don't want to miss.`
            : pool.some((op) => op.origin === "live")
              ? "Verified opportunities on this track, plus what search turned up for you. Pin the ones you want to keep close."
              : "Every verified opportunity on this track. Pin the ones you want to keep close."}
      </p>

      {/* Empty state */}
      {shown.length === 0 ? (
        <p className="mt-8 rounded-2xl border border-dashed p-6 text-sm text-muted-foreground">
          {view === "pinned"
            ? "Nothing pinned yet. Tap the pin on any card to save it here."
            : view === "all"
              ? "No opportunities match your current filters."
              : "Sylo hasn't found opportunities for this path yet. Try generating your roadmap again, or add your own steps on the dashboard."}
        </p>
      ) : (
        /* Pinterest-style masonry grid */
        <div className={cn(
          "mt-5 columns-1 gap-4 [column-fill:_balance] sm:columns-2 md:columns-3",
        )}>
          {shown.map((op) => {
            const pinned = pinnedIds.includes(op.id);
            const full = resolveOpportunity(op.id) ?? op;
            const isExternal = op.id.startsWith("pipe-");
            const trackLabel = view !== "track"
              ? TRACKS.find((t) => t.id === op.track)?.label
              : null;

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
                className="tap card-tonal mb-4 block break-inside-avoid cursor-pointer rounded-2xl border p-3.5 text-left transition-shadow hover:shadow-sm"
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
                  {trackLabel && <Tag>{trackLabel}</Tag>}
                  {isExternal && (
                    <span className="inline-flex items-center rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-800">
                      Curated
                    </span>
                  )}
                  {op.origin === "live" ? <FoundViaSearchBadge /> : null}
                </div>

                {/* Always show leverage for external pipeline programs */}
                {isExternal && full ? (
                  <p className="mt-3 border-t pt-3 text-xs leading-relaxed text-muted-foreground">
                    {full.leverage}
                  </p>
                ) : null}

                {/* Show leverage when pinned */}
                {!isExternal && pinned && full ? (
                  <p className="mt-3 border-t pt-3 text-xs leading-relaxed text-muted-foreground">
                    {full.leverage}
                  </p>
                ) : null}

                {pinned && view === "pinned" && full ? (
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
