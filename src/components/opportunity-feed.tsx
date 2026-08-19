import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Heart, Pin, PinOff, Search } from "lucide-react";
import { Tag, FoundViaSearchBadge } from "@/components/workspace";
import { useWayfind } from "@/lib/sylo-store";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { OPPORTUNITIES } from "@/lib/opportunities-db";
import { type Opportunity, type TrackId } from "@/lib/wayfind-data";

/** General categories shown as filter pills in the opportunity feed.
 * Only tracks that have actual data in the database are included. */
const OPPORTUNITY_CATEGORIES: { id: string; label: string; trackIds: TrackId[] }[] = [
  { id: "healthcare", label: "Healthcare", trackIds: ["physician-scientist"] },
  { id: "business", label: "Business", trackIds: ["product-manager"] },
  { id: "engineering", label: "Engineering", trackIds: ["software-engineer"] },
  { id: "finance", label: "Finance", trackIds: ["investment-banking"] },
  { id: "science", label: "Science", trackIds: ["research-phd"] },
];

/**
 * Full opportunity feed — Pinterest-style masonry grid of ALL opportunities
 * across every track (curated seed + external database). Students scroll,
 * discover, and pin programs they don't want to miss.
 *
 * Uses the same pin mechanic as OpportunityBrowser but over the full dataset
 * rather than a single track.
 */
export function OpportunityFeed() {
  const navigate = useNavigate();
  const { pinnedIds, togglePinned, resolveOpportunity } = useWayfind();

  const [filter, setFilter] = useState<"all" | "pinned">("all");
  const [trackFilters, setTrackFilters] = useState<string[]>([]);
  const [query, setQuery] = useState("");

  // Full dataset: all curated + external opportunities
  const all = OPPORTUNITIES as Opportunity[];

  // Apply filters
  const filtered = all.filter((op) => {
    if (trackFilters.length > 0) {
      const matchesSomeCategory = trackFilters.some((tf) => {
        const cat = OPPORTUNITY_CATEGORIES.find((c) => c.id === tf);
        return cat && cat.trackIds.includes(op.track as TrackId);
      });
      if (!matchesSomeCategory) return false;
    }
    if (query) {
      const q = query.toLowerCase();
      const searchable = `${op.name} ${op.category} ${op.leverage ?? ""} ${op.timeframe ?? ""}`.toLowerCase();
      if (!searchable.includes(q)) return false;
    }
    return true;
  });

  const shown = filter === "pinned"
    ? filtered.filter((op) => pinnedIds.includes(op.id))
    : filtered;

  return (
    <div>
      {/* Search + filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search programs, fellowships, deadlines..."
            className="pl-9 rounded-2xl"
          />
        </div>

        <div className="flex items-center gap-1.5">
          {/* All / Pinned toggle */}
          <div className="flex items-center gap-1.5 rounded-full border bg-muted/50 p-1">
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
                {f === "pinned" ? `Saved${pinnedIds.length ? ` (${pinnedIds.length})` : ""}` : "All"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Track pills — multi-select */}
      <div className="mt-3 flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => setTrackFilters([])}
          className={cn(
            "tap rounded-full border px-3 py-1 text-xs font-medium transition-colors",
            trackFilters.length === 0
              ? "border-primary bg-primary/10 text-primary"
              : "border-transparent bg-muted text-muted-foreground hover:text-foreground",
          )}
        >
          All
        </button>
        {OPPORTUNITY_CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() =>
              setTrackFilters((prev) =>
                prev.includes(cat.id)
                  ? prev.filter((id) => id !== cat.id)
                  : [...prev, cat.id],
              )
            }
            className={cn(
              "tap rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              trackFilters.includes(cat.id)
                ? "border-primary bg-primary/10 text-primary"
                : "border-transparent bg-muted text-muted-foreground hover:text-foreground",
            )}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Helper text */}
      <p className="mt-4 text-xs text-muted-foreground">
        {filter === "pinned"
          ? "Your saved programs. Saving is your own shortlist — it never changes what Sylo ranks as your next move."
          : `${shown.length} programs, fellowships, and pipelines. Save the deadlines you don't want to miss.`}
      </p>

      {/* Empty state */}
      {shown.length === 0 ? (
        <p className="mt-8 rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">
          {filter === "pinned"
            ? "Nothing saved yet. Tap the heart on any card to save it here."
            : "No opportunities match your current filters. Try a different search or track."}
        </p>
      ) : (
        /* Pinterest-style masonry grid */
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((op) => {
            const pinned = pinnedIds.includes(op.id);
            const full = resolveOpportunity(op.id) ?? op;
            const isExternal = op.id.startsWith("pipe-");
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
                className="tap card-tonal block cursor-pointer rounded-2xl border p-5 text-left transition-shadow hover:shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold leading-snug tracking-tight">{op.name}</p>
                  <button
                    type="button"
                    aria-label={pinned ? `Unsave ${op.name}` : `Save ${op.name}`}
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
                      <Heart className="h-4 w-4" fill="currentColor" />
                    ) : (
                      <Heart className="h-4 w-4" />
                    )}
                  </button>
                </div>

                <div className="mt-2.5 flex flex-wrap items-center gap-1.5 [&>*]:max-w-full [&>*]:whitespace-normal [&>*]:break-words">
                  <Tag>{op.category}</Tag>
                  <Tag tone="amber">{op.timeframe}</Tag>
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

                {/* Hint on first unpinned card only */}
                {!pinned && full?.leverage &&
                  shown.filter((o) => !pinnedIds.includes(o.id)).indexOf(op) === 0 ? (
                  <p className="mt-3 border-t pt-3 text-[11px] text-muted-foreground/60">
                    <Heart className="mr-1 inline h-3 w-3" />Save to see why this matters
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
