import { useState, useMemo, useCallback, useEffect } from "react";
import {
  Search,
  ExternalLink,
  Clock,
  AlertTriangle,
  Filter,
  X,
  ChevronDown,
  CheckCircle2,
  MessageCircle,
  TrendingUp,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  searchOpportunities,
  getAllTags,
  OPPORTUNITY_COUNT,
  type OpportunityRecord,
  type OpportunityFilters,
} from "@/lib/opportunities-db";
import { type TrackId } from "@/lib/wayfind-data";

/** General categories shown as filter pills in the opportunity browser.
 * Only categories whose tracks have actual opportunities in the database are included.
 * This prevents showing empty filters that make the product feel incomplete. */
const OPPORTUNITY_CATEGORIES: { id: string; label: string; trackIds: TrackId[] }[] = [
  { id: "healthcare", label: "Medicine", trackIds: ["physician-scientist"] },
  { id: "business", label: "Business", trackIds: ["product-manager"] },
  { id: "engineering", label: "Engineering", trackIds: ["software-engineer"] },
  { id: "finance", label: "Finance", trackIds: ["investment-banking"] },
  { id: "science", label: "Science", trackIds: ["research-phd"] },
];

/** Map track IDs to general category labels for display. */
const TRACK_TO_CATEGORY: Record<string, string> = Object.fromEntries(
  OPPORTUNITY_CATEGORIES.flatMap((c) => c.trackIds.map((tid) => [tid, c.label])),
);
import {
  searchRedditOpportunities,
  type RedditOpportunityPost,
} from "@/lib/reddit-opportunities";

// ---------------------------------------------------------------------------
// Confidence badge colors
// ---------------------------------------------------------------------------

function ConfidenceBadge({ confidence }: { confidence: string }) {
  const styles = {
    estimated: "bg-muted text-muted-foreground border-border",
    curated: "bg-emerald-100 text-emerald-800 border-emerald-200",
    live: "bg-blue-100 text-blue-800 border-blue-200",
    community: "bg-amber-100 text-amber-800 border-amber-200",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide",
        styles[confidence as keyof typeof styles] ?? styles.community,
      )}
    >
      {confidence === "verified" && <CheckCircle2 className="h-2.5 w-2.5" />}
      {confidence === "estimated" ? "date estimated" : confidence}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Deadline status helpers
// ---------------------------------------------------------------------------

function getDeadlineStatus(deadline: string, recurring: boolean) {
  if (!deadline) return { label: "Rolling", state: "open" as const };
  const dl = new Date(deadline);
  const now = new Date();
  if (dl < now) {
    if (recurring) {
      const next = new Date(dl);
      next.setFullYear(next.getFullYear() + 1);
      return {
        label: `Next cycle ~${next.toLocaleDateString("en-US", { month: "short", year: "numeric" })}`,
        state: "recurring" as const,
      };
    }
    return { label: "Deadline passed", state: "expired" as const };
  }
  const days = Math.ceil((dl.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (days <= 14) return { label: `Due in ${days}d`, state: "urgent" as const };
  if (days <= 30) return { label: `Due in ${days}d`, state: "soon" as const };
  return {
    label: `Due by ${dl.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`,
    state: "open" as const,
  };
}

function DeadlinePill({
  deadline,
  recurring,
  unverified = false,
}: {
  deadline: string;
  recurring: boolean;
  /** Date we have not confirmed on the official page — show it as reported, not as a countdown. */
  unverified?: boolean;
}) {
  if (!deadline) return null;
  if (unverified) {
    const dl = /^\d{4}-\d{2}-\d{2}$/.test(deadline) ? new Date(`${deadline}T00:00:00`) : new Date(deadline);
    const formatted = Number.isNaN(dl.getTime())
      ? deadline
      : dl.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
        <Clock className="h-2.5 w-2.5" />
        Listed {formatted} · verify
      </span>
    );
  }
  const { label, state } = getDeadlineStatus(deadline, recurring);
  const colors = {
    urgent: "bg-red-100 text-red-800",
    soon: "bg-amber-100 text-amber-800",
    open: "bg-muted text-muted-foreground",
    expired: "bg-muted/50 text-muted-foreground line-through",
    recurring: "bg-blue-50 text-blue-700",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
        colors[state],
      )}
    >
      <Clock className="h-2.5 w-2.5" />
      {label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Staleness indicator
// ---------------------------------------------------------------------------

function StalenessIndicator({ lastVerified }: { lastVerified: string }) {
  if (!lastVerified) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] text-amber-600">
        <AlertTriangle className="h-2.5 w-2.5" /> May be outdated
      </span>
    );
  }
  const verified = new Date(lastVerified);
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  if (verified < sixMonthsAgo) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] text-amber-600">
        <AlertTriangle className="h-2.5 w-2.5" /> May be outdated
      </span>
    );
  }
  return null;
}

// ---------------------------------------------------------------------------
// Filter panel
// ---------------------------------------------------------------------------

const CATEGORIES = ["Research", "Internship", "Fellowship", "Club", "Funding", "Advising", "Course"];
const DEADLINE_WINDOWS = [
  { label: "Next 30 days", value: 30 },
  { label: "Next 60 days", value: 60 },
  { label: "Next 90 days", value: 90 },
  { label: "All", value: null },
] as const;

// ---------------------------------------------------------------------------
// Main browser component
// ---------------------------------------------------------------------------

export function OpportunityDatabaseBrowser() {
  const [query, setQuery] = useState("");
  const [selectedTracks, setSelectedTracks] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [deadlineWindow, setDeadlineWindow] = useState<30 | 60 | 90 | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [redditPosts, setRedditPosts] = useState<RedditOpportunityPost[]>([]);
  const [redditLoading, setRedditLoading] = useState(false);
  const [showReddit, setShowReddit] = useState(false);

  const allTags = useMemo(() => getAllTags(), []);

  const filters: OpportunityFilters = useMemo(
    () => {
      // Expand category selections into their component track IDs
      const expandedTracks = selectedTracks.flatMap((sel) => {
        const cat = OPPORTUNITY_CATEGORIES.find((c) => c.id === sel);
        return cat ? cat.trackIds : [sel];
      });
      return {
        query: query || undefined,
        track: expandedTracks.length ? (expandedTracks as any) : undefined,
        category: selectedCategories.length ? selectedCategories : undefined,
        deadlineWindow: deadlineWindow,
        tags: selectedTags.length ? selectedTags : undefined,
        limit: 100,
      };
    },
    [query, selectedTracks, selectedCategories, deadlineWindow, selectedTags],
  );

  const results = useMemo(() => searchOpportunities(filters), [filters]);
  const selectedRecord = useMemo(
    () => (selectedId ? results.find((r) => r.id === selectedId) : null),
    [selectedId, results],
  );

  const toggleTrack = useCallback((id: string) => {
    setSelectedTracks((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id],
    );
  }, []);

  const toggleCategory = useCallback((cat: string) => {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat],
    );
  }, []);

  const toggleTag = useCallback((tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  }, []);

  const hasActiveFilters =
    selectedTracks.length > 0 ||
    selectedCategories.length > 0 ||
    deadlineWindow !== null ||
    selectedTags.length > 0;

  const clearFilters = useCallback(() => {
    setSelectedTracks([]);
    setSelectedCategories([]);
    setDeadlineWindow(null);
    setSelectedTags([]);
  }, []);

  const [redditError, setRedditError] = useState(false);

  const loadRedditPosts = useCallback(async () => {
    if (redditLoading) return;
    setRedditLoading(true);
    setRedditError(false);
    try {
      const result = await searchRedditOpportunities({
        data: {
          query: query || "program deadline fellowship application",
          limit: 5,
        },
      });
      setRedditPosts(result.posts);
      setShowReddit(true);
    } catch (err) {
      console.warn("[reddit] Failed to load posts:", err);
      setRedditError(true);
      setShowReddit(true);
    } finally {
      setRedditLoading(false);
    }
  }, [query, redditLoading]);

  return (
    <div className="flex h-full flex-col">
      {/* Search bar */}
      <div className="sticky top-0 z-10 border-b bg-card px-4 py-3 sm:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={`Search ${OPPORTUNITY_COUNT} programs, fellowships, and pipelines...`}
                className="pl-9 rounded-xl"
              />
            </div>
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className={cn(
                "tap flex items-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-medium transition-colors",
                showFilters || hasActiveFilters
                  ? "border-primary/40 bg-primary/5 text-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Filter className="h-4 w-4" />
              Filters
              {hasActiveFilters && (
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                  {selectedTracks.length + selectedCategories.length + selectedTags.length + (deadlineWindow ? 1 : 0)}
                </span>
              )}
            </button>
          </div>

          {/* Filter panel */}
          {showFilters && (
            <div className="mt-3 space-y-3 rounded-xl border bg-muted/30 p-4">
              {/* Tracks */}
              <div>
                <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Track
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {OPPORTUNITY_CATEGORIES.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => toggleTrack(cat.id)}
                      className={cn(
                        "tap rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                        selectedTracks.includes(cat.id)
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-transparent bg-muted text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Categories */}
              <div>
                <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Category
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => toggleCategory(cat)}
                      className={cn(
                        "tap rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                        selectedCategories.includes(cat)
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-transparent bg-muted text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Deadline window */}
              <div>
                <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Deadline
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {DEADLINE_WINDOWS.map((dw) => (
                    <button
                      key={dw.label}
                      type="button"
                      onClick={() => setDeadlineWindow(dw.value)}
                      className={cn(
                        "tap rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                        deadlineWindow === dw.value
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-transparent bg-muted text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {dw.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Popular tags */}
              <div>
                <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Tags
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {allTags.slice(0, 15).map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTag(tag)}
                      className={cn(
                        "tap rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                        selectedTags.includes(tag)
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-transparent bg-muted text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="tap flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3 w-3" /> Clear all filters
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-8">
        <div className="mx-auto max-w-6xl">
          <p className="mb-4 text-xs text-muted-foreground">
            {results.length} {results.length === 1 ? "opportunity" : "opportunities"} found
            {hasActiveFilters && " (filtered)"}
          </p>

          {results.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-foreground/15 bg-muted/40 p-8 text-center">
              <p className="text-sm font-medium text-muted-foreground">
                No opportunities match your current filters.
              </p>
              <p className="mt-1.5 text-xs text-muted-foreground">
                Try broadening your search or removing some filters.
              </p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {results.map((op) => (
                <OpportunityCard
                  key={op.id}
                  record={op}
                  isSelected={selectedId === op.id}
                  onSelect={() => setSelectedId(selectedId === op.id ? null : op.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Reddit Intel section */}
      <div className="border-t bg-muted/20 px-4 py-4 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4 text-orange-500" />
              <h3 className="text-sm font-semibold tracking-tight">Reddit Intel</h3>
              <span className="text-[10px] text-muted-foreground">
                What students are saying about programs &amp; deadlines right now
              </span>
            </div>
            <button
              type="button"
              onClick={loadRedditPosts}
              disabled={redditLoading}
              className="tap rounded-lg border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground disabled:opacity-50"
            >
              {redditLoading ? "Scanning..." : showReddit ? "Refresh" : "Load Reddit Intel"}
            </button>
          </div>

          {showReddit && redditPosts.length > 0 && (
            <div className="mt-3 space-y-2">
              {redditPosts.map((post) => (
                <a
                  key={post.id}
                  href={post.permalink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="tap block rounded-lg border bg-card p-3 transition-colors hover:border-orange-200 hover:bg-orange-50/30"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium leading-snug">{post.title}</p>
                    <div className="flex shrink-0 items-center gap-2 text-[10px] text-muted-foreground">
                      <span className="flex items-center gap-0.5">
                        <TrendingUp className="h-2.5 w-2.5" /> {post.score}
                      </span>
                      <span className="flex items-center gap-0.5">
                        <MessageCircle className="h-2.5 w-2.5" /> {post.numComments}
                      </span>
                    </div>
                  </div>
                  <div className="mt-1.5 flex items-center gap-2">
                    <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-medium text-orange-700">
                      r/{post.subreddit}
                    </span>
                    <span className="text-[10px] text-muted-foreground">{post.insight}</span>
                  </div>
                </a>
              ))}
            </div>
          )}

          {showReddit && redditPosts.length === 0 && !redditLoading && (
            <p className="mt-3 text-xs text-muted-foreground">
              {redditError
                ? "Couldn't reach Reddit right now. Try again in a moment."
                : "No relevant posts found right now. Try a different search term."}
            </p>
          )}
        </div>
      </div>

      {/* Detail panel (slides up on mobile) */}
      {selectedRecord && (
        <OpportunityDetailPanel record={selectedRecord} onClose={() => setSelectedId(null)} />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Card component
// ---------------------------------------------------------------------------

function OpportunityCard({
  record,
  isSelected,
  onSelect,
}: {
  record: OpportunityRecord;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const deadlineStatus = getDeadlineStatus(record.deadline, record.recurring);

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "tap w-full rounded-xl border p-5 text-left transition-all",
        isSelected
          ? "border-primary/40 bg-primary/5 shadow-sm"
          : "bg-card hover:border-primary/20 hover:shadow-sm",
        deadlineStatus.state === "expired" && "opacity-60",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-sm font-semibold tracking-tight">{record.name}</h3>
          </div>
          <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{record.leverage}</p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <ConfidenceBadge confidence={record.confidence} />
          <DeadlinePill deadline={record.deadline} recurring={record.recurring} unverified={record.confidence !== "verified"} />
        </div>
      </div>
      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
          {record.category}
        </span>
        <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
          {TRACK_TO_CATEGORY[record.track] ?? record.track}
        </span>
        {record.yearRelevance.length > 0 && (
          <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
            {record.yearRelevance.join(", ")}
          </span>
        )}
        <StalenessIndicator lastVerified={record.lastVerified} />
      </div>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Detail panel
// ---------------------------------------------------------------------------

function OpportunityDetailPanel({
  record,
  onClose,
}: {
  record: OpportunityRecord;
  onClose: () => void;
}) {
  return (
    <div className="border-t bg-card px-4 py-5 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold tracking-tight">{record.name}</h2>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              <ConfidenceBadge confidence={record.confidence} />
              <DeadlinePill deadline={record.deadline} recurring={record.recurring} unverified={record.confidence !== "verified"} />
              <StalenessIndicator lastVerified={record.lastVerified} />
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="tap rounded-full p-1.5 text-muted-foreground hover:text-foreground"
            aria-label="Close details"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{record.leverage}</p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {/* Requirements */}
          {record.requirements.length > 0 && (
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Requirements
              </p>
              <ul className="mt-1.5 space-y-1">
                {record.requirements.map((req) => (
                  <li key={req} className="text-sm text-foreground">
                    • {req}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Timeline */}
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Timeline
            </p>
            <p className="mt-1.5 text-sm text-foreground">{record.timeline || record.timeframe}</p>

            {record.contact && (
              <>
                <p className="mt-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Contact
                </p>
                <p className="mt-1 text-sm text-foreground">{record.contact}</p>
              </>
            )}
          </div>
        </div>

        {/* Tags */}
        {record.tags.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {record.tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-[10px]">
                {tag}
              </Badge>
            ))}
          </div>
        )}

        {/* Source & Link */}
        <div className="mt-4 flex items-center gap-3">
          {record.link && (
            <a
              href={record.link}
              target="_blank"
              rel="noopener noreferrer"
              className="tap inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90"
            >
              Apply / Learn More <ExternalLink className="h-3 w-3" />
            </a>
          )}
          {record.source && (
            <span className="text-[10px] text-muted-foreground">
              Source: {record.source}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
