import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Heart, Pin, PinOff, SlidersHorizontal, Search, Plus, Check } from "lucide-react";
import { Tag, FoundViaSearchBadge } from "@/components/workspace";
import { useWayfind } from "@/lib/sylo-store";
import { OPPORTUNITIES } from "@/lib/opportunities-db";
import { type Opportunity, type TrackId } from "@/lib/wayfind-data";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const CATEGORIES = ["Research", "Internship", "Fellowship", "Club", "Funding", "Advising", "Course"];

/** General track groupings — only tracks with data in the database. */
const TRACK_GROUPS: { id: string; label: string; trackIds: TrackId[] }[] = [
  { id: "healthcare", label: "Medicine", trackIds: ["physician-scientist"] },
  { id: "business", label: "Business", trackIds: ["product-manager"] },
  { id: "engineering", label: "Engineering", trackIds: ["software-engineer"] },
  { id: "finance", label: "Finance", trackIds: ["investment-banking"] },
  { id: "public-affairs", label: "Law", trackIds: ["public-affairs"] },
  { id: "design", label: "Design", trackIds: ["design"] },
];

/**
 * Browsable grid of opportunities with Pinterest-style pinning.
 *
 * Single nav bar: My Track | View All | Pinned
 * Plus category/track filtering when browsing all.
 */
export function OpportunityBrowser({ trackId }: { trackId: string }) {
  const navigate = useNavigate();
  const { pinnedIds, togglePinned, resolveOpportunity, browsableOpportunities, addCustomStep, customSteps, roadmap } = useWayfind();
  const [view, setView] = useState<"track" | "all" | "pinned">(() => {
    const saved = sessionStorage.getItem("opp-browser-tab");
    return saved === "all" || saved === "pinned" ? saved : "track";
  });
  const [categoryFilter, setCategoryFilter] = useState<string[]>([]);
  const [trackFilter, setTrackFilter] = useState<string[]>([]);
  const [query, setQuery] = useState("");

  // Persist active tab to sessionStorage for back-navigation
  const handleViewChange = (v: "track" | "all" | "pinned") => {
    setView(v);
    sessionStorage.setItem("opp-browser-tab", v);
  };

  const trackOpportunities = browsableOpportunities(trackId);
  // Include opportunities that are on the user's roadmap (even if from another track)
  const roadmapOpIds = roadmap?.steps.map((s) => s.opportunityId) ?? [];
  // Also include opportunities the user manually added via "Add to my roadmap" (stored as custom steps with matching titles)
  const customStepTitles = customSteps.map((s) => s.title);
  const roadmapOps = roadmapOpIds
    .map((id) => resolveOpportunity(id))
    .filter((op): op is Opportunity => op !== undefined && !trackOpportunities.some((t) => t.id === op.id));
  const customMatchedOps = OPPORTUNITIES.filter(
    (op) => customStepTitles.includes(op.name) && !trackOpportunities.some((t) => t.id === op.id) && !roadmapOps.some((r) => r.id === op.id)
  );
  const myTrackOpportunities = [...trackOpportunities, ...roadmapOps, ...customMatchedOps];
  // Include live opportunities so pinned live results show up
  const allOpportunities = [...new Map([...myTrackOpportunities, ...OPPORTUNITIES].map(op => [op.id, op])).values()] as Opportunity[];

  // Determine the pool based on view
  let pool: Opportunity[];
  if (view === "pinned") {
    pool = allOpportunities.filter((op) => pinnedIds.includes(op.id));
  } else if (view === "all") {
    pool = allOpportunities;
  } else {
    pool = myTrackOpportunities;
  }

  const pinnedCount = allOpportunities.filter((op) => pinnedIds.includes(op.id)).length;

  // Apply category + track + search filters
  const shown = pool.filter((op) => {
    if (view === "all" && categoryFilter.length > 0 && !categoryFilter.includes(op.category)) return false;
    if (view === "all" && trackFilter.length > 0) {
      const expandedTrackIds = trackFilter.flatMap((tf) => {
        const group = TRACK_GROUPS.find((g) => g.id === tf);
        return group ? group.trackIds : [];
      });
      if (!expandedTrackIds.includes(op.track as TrackId)) return false;
    }
    if (query) {
      const q = query.toLowerCase();
      const searchable = `${op.name} ${op.category} ${op.leverage ?? ""} ${op.timeframe ?? ""}`.toLowerCase();
      if (!searchable.includes(q)) return false;
    }
    return true;
  });

  return (
    <div className="mt-6">
      {/* Nav bar + Ask Sylo */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 rounded-full border bg-muted/50 p-1 w-fit">
        <button
          type="button"
          onClick={() => handleViewChange("track")}
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
          onClick={() => handleViewChange("all")}
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
          onClick={() => handleViewChange("pinned")}
          className={cn(
            "tap rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors",
            view === "pinned"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          Saved{pinnedCount ? ` (${pinnedCount})` : ""}
        </button>
      </div>
        {/* <button
          type="button"
          onClick={() => {
            window.dispatchEvent(new CustomEvent("open-ask-sylo", { detail: { query: "" } }));
          }}
          className="tap inline-flex items-center gap-1.5 rounded-full border border-primary/25 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/5"
        >
          <MessageCircle className="h-3.5 w-3.5" />
          Ask Sylo for more opportunities
        </button> */}
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
          {/* Category filter — multi-select */}
          <div className="flex flex-wrap items-center gap-1.5">
            <SlidersHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
            <button
              type="button"
              onClick={() => setCategoryFilter([])}
              className={cn(
                "tap rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors",
                categoryFilter.length === 0
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
                onClick={() =>
                  setCategoryFilter((prev) =>
                    prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat],
                  )
                }
                className={cn(
                  "tap rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors",
                  categoryFilter.includes(cat)
                    ? "bg-primary/10 text-primary"
                    : "bg-muted text-muted-foreground hover:text-foreground",
                )}
              >
                {cat}
              </button>
            ))}
          </div>
          {/* Track filter — general categories, multi-select */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="w-3.5" />
            <button
              type="button"
              onClick={() => setTrackFilter([])}
              className={cn(
                "tap rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors",
                trackFilter.length === 0
                  ? "bg-primary/10 text-primary"
                  : "bg-muted text-muted-foreground hover:text-foreground",
              )}
            >
              All Tracks
            </button>
            {TRACK_GROUPS.map((g) => (
              <button
                key={g.id}
                type="button"
                onClick={() =>
                  setTrackFilter((prev) =>
                    prev.includes(g.id) ? prev.filter((id) => id !== g.id) : [...prev, g.id],
                  )
                }
                className={cn(
                  "tap rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors",
                  trackFilter.includes(g.id)
                    ? "bg-primary/10 text-primary"
                    : "bg-muted text-muted-foreground hover:text-foreground",
                )}
              >
                {g.label}
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
            ? `${shown.length} programs, fellowships, and pipeline deadlines across all tracks. Save the ones you don't want to miss.`
            : pool.some((op) => op.origin === "live")
              ? "Verified opportunities on this track, plus what search turned up for you. Save the ones you want to keep close. Opportunities already on your roadmap are marked."
              : "Every verified opportunity on this track. Save the ones you want to keep close. Opportunities already on your roadmap are marked."}
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
            const onRoadmap = roadmap?.steps.some((s) => s.opportunityId === op.id) || false;
            const inCustomSteps = customSteps.some((s) => s.title === op.name);
            const alreadyAdded = onRoadmap || inCustomSteps;
            const trackLabel = view !== "track"
              ? TRACK_GROUPS.find((g) => g.trackIds.includes(op.track as TrackId))?.label
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
                  <div className="flex shrink-0 -mr-1 -mt-1">
                    {!alreadyAdded ? (
                      <button
                        type="button"
                        aria-label={`Add ${op.name} to roadmap`}
                        title="Add to roadmap"
                        onClick={(e) => {
                          e.stopPropagation();
                          addCustomStep({
                            title: op.name,
                            note: `${full?.leverage || op.leverage || ""}\n\nLink: ${op.link}`,
                            targetDate: op.deadline || undefined,
                          });
                        }}
                        className="tap rounded-full p-1.5 text-muted-foreground hover:text-foreground"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    ) : (
                      <span className="rounded-full p-1.5 text-emerald-600" title="On your roadmap">
                        <Check className="h-4 w-4" />
                      </span>
                    )}
                    <button
                      type="button"
                      aria-label={pinned ? `Unpin ${op.name}` : `Pin ${op.name}`}
                      title={pinned ? "Unpin" : "Pin"}
                      aria-pressed={pinned}
                      onClick={(e) => {
                        e.stopPropagation();
                        togglePinned(op.id);
                      }}
                      className={`tap rounded-full p-1.5 ${
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
                </div>

                <div className="mt-2.5 flex flex-wrap items-center gap-1.5 [&>*]:max-w-full [&>*]:whitespace-normal [&>*]:break-words">
                  <Tag tone="blue">{op.category}</Tag>
                  <Tag tone="amber">{op.timeframe}</Tag>
                  {trackLabel && <Tag tone="green">{trackLabel}</Tag>}
                  {op.origin === "live" ? <FoundViaSearchBadge /> : null}
                </div>

                {/* Always show leverage for external pipeline programs */}
                {/* Leverage + details — shown on all cards */}
                {full?.leverage ? (
                  <p className="mt-3 border-t pt-3 text-xs leading-relaxed text-muted-foreground">
                    {full.leverage}
                  </p>
                ) : null}

                {full && full.requirements.length > 0 ? (
                  <div className="mt-3 space-y-2">
                    <div className="flex flex-wrap gap-1.5 [&>*]:max-w-full [&>*]:whitespace-normal [&>*]:break-words">
                      {full.requirements.map((r) => (
                        <Tag key={r}>{r}</Tag>
                      ))}
                    </div>
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
