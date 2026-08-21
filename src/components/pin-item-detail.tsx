import { useState } from "react";
import { CalendarPlus,
  X,
  Download,
  Trash2,
  Sparkles,
  CheckCircle2,
  Plus,
  Tag,
  Folder,
  Calendar,
  ShieldCheck,
} from "lucide-react";
import { DeadlinePill } from "@/components/deadline-badges";
import type { PinItem } from "@/lib/pin-store";
import type { Profile } from "@/lib/wayfind-store";
import { cn } from "@/lib/utils";
import { checkRequirement } from "@/lib/check-eligibility";

interface PinItemDetailProps {
  item: PinItem;
  profile: Profile | null;
  onClose: () => void;
  onUpdate: (id: string, patch: Partial<PinItem>) => void;
  onDelete: (id: string) => void;
  onAddToRoadmap: (item: PinItem) => void;
}

export function PinItemDetail({
  item,
  profile,
  onClose,
  onUpdate,
  onDelete,
  onAddToRoadmap,
}: PinItemDetailProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [editingTopic, setEditingTopic] = useState(false);
  const [titleDraft, setTitleDraft] = useState(item.title);
  const [topicDraft, setTopicDraft] = useState(item.topic);
  const [tagInput, setTagInput] = useState("");
  const [showEligibility, setShowEligibility] = useState(false);

  // Temporarily hide the Opportunity badge and "Am I eligible?" button on Pin
  // Drop. Flip this to `true` to bring both back.
  const SHOW_OPPORTUNITY_FEATURES: boolean = false;

  // Any pinned item can be added to the roadmap (roadmap steps carry notes), so
  // this is no longer gated on whether the item looks like a formal opportunity.
  const showAddButton = !item.linkedStepId;

  function handleAddToCalendar() {
    if (!item.detectedDate) return;
    const date = item.detectedDate.replace(/-/g, "");
    const title = item.opportunityDetails?.name || item.title;
    const description = item.opportunityDetails?.description || item.extractedText.slice(0, 200);
    const ics = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Sylo//Pin Drop//EN",
      "BEGIN:VEVENT",
      `DTSTART;VALUE=DATE:${date}`,
      `DTEND;VALUE=DATE:${date}`,
      `SUMMARY:${title}`,
      `DESCRIPTION:${description.replace(/\n/g, "\\n")}`,
      item.sourceUrl ? `URL:${item.sourceUrl}` : "",
      "END:VEVENT",
      "END:VCALENDAR",
    ].filter(Boolean).join("\r\n");
    const blob = new Blob([ics], { type: "text/calendar" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title.slice(0, 40).replace(/[^a-zA-Z0-9]/g, "-")}.ics`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleSaveTitle() {
    if (titleDraft.trim() && titleDraft !== item.title) {
      onUpdate(item.id, { title: titleDraft.trim() });
    }
    setEditingTitle(false);
  }

  function handleSaveTopic() {
    if (topicDraft.trim() && topicDraft !== item.topic) {
      onUpdate(item.id, { topic: topicDraft.trim() });
    }
    setEditingTopic(false);
  }

  function handleAddTag() {
    const newTag = tagInput.trim();
    if (newTag && !item.tags.includes(newTag)) {
      onUpdate(item.id, { tags: [...item.tags, newTag] });
    }
    setTagInput("");
  }

  function handleRemoveTag(tag: string) {
    onUpdate(item.id, { tags: item.tags.filter((t) => t !== tag) });
  }

  function handleDownload() {
    if (!item.imageThumbnailBase64) return;
    const dataUrl = item.imageThumbnailBase64.startsWith("data:")
      ? item.imageThumbnailBase64
      : `data:image/jpeg;base64,${item.imageThumbnailBase64}`;
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `pin-${item.id}.jpg`;
    a.click();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative z-10 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-2xl border bg-card p-5 shadow-xl sm:rounded-2xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            {SHOW_OPPORTUNITY_FEATURES && item.isOpportunityLike && (
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">
                <Sparkles className="h-2.5 w-2.5" />
                Opportunity
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Screenshot image */}
        {item.imageThumbnailBase64 && (
          <div className="mt-4">
            <img
              src={
                item.imageThumbnailBase64.startsWith("data:")
                  ? item.imageThumbnailBase64
                  : `data:image/jpeg;base64,${item.imageThumbnailBase64}`
              }
              alt={item.title}
              className="w-full rounded-lg border bg-muted object-contain"
              style={{ maxHeight: "300px" }}
            />
          </div>
        )}

        {/* Title (editable) */}
        <div className="mt-4">
          {editingTitle ? (
            <input
              type="text"
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              onBlur={handleSaveTitle}
              onKeyDown={(e) => { if (e.key === "Enter") handleSaveTitle(); if (e.key === "Escape") { setTitleDraft(item.title); setEditingTitle(false); } }}
              autoFocus
              className="w-full rounded-lg border px-3 py-1.5 text-base font-semibold outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
            />
          ) : (
            <h2
              onClick={() => setEditingTitle(true)}
              className="cursor-pointer text-base font-semibold tracking-tight hover:text-primary"
              title="Click to edit"
            >
              {item.title}
            </h2>
          )}
        </div>

        {/* Topic (editable) */}
        <div className="mt-3 flex items-center gap-2">
          <Folder className="h-3.5 w-3.5 text-muted-foreground" />
          {editingTopic ? (
            <input
              type="text"
              value={topicDraft}
              onChange={(e) => setTopicDraft(e.target.value)}
              onBlur={handleSaveTopic}
              onKeyDown={(e) => { if (e.key === "Enter") handleSaveTopic(); if (e.key === "Escape") { setTopicDraft(item.topic); setEditingTopic(false); } }}
              autoFocus
              className="flex-1 rounded-lg border px-2 py-1 text-sm outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
            />
          ) : (
            <span
              onClick={() => setEditingTopic(true)}
              className="cursor-pointer text-sm text-muted-foreground hover:text-primary"
              title="Click to change topic"
            >
              {item.topic}
            </span>
          )}
        </div>

        {/* Deadline */}
        {item.detectedDate && (
          <div className="mt-3 flex items-center gap-2">
            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
            <DeadlinePill deadline={item.detectedDate} />
          </div>
        )}

        {/* Tags (editable) */}
        <div className="mt-3">
          <div className="flex items-center gap-2">
            <Tag className="h-3.5 w-3.5 text-muted-foreground" />
            <div className="flex flex-wrap gap-1.5">
              {item.tags.map((tag) => (
                <span
                  key={tag}
                  className="group/tag inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground"
                >
                  {tag}
                  <button
                    onClick={() => handleRemoveTag(tag)}
                    className="hidden h-3 w-3 items-center justify-center rounded-full text-muted-foreground hover:text-red-500 group-hover/tag:inline-flex"
                    aria-label={`Remove tag ${tag}`}
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </span>
              ))}
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddTag(); } }}
                placeholder="+ add tag"
                className="w-20 bg-transparent text-[11px] outline-none placeholder:text-muted-foreground/50"
              />
            </div>
          </div>
        </div>


        {/* Source URL */}
        {item.sourceUrl && (
          <div className="mt-3 flex items-center gap-2">
            <a
              href={item.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline truncate"
            >
              <span className="shrink-0">🔗</span>
              {item.sourceUrl.replace(/^https?:\/\//, "").split("/")[0]}
            </a>
          </div>
        )}

        {/* Extracted text */}
        {item.extractedText && (
          <div className="mt-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Extracted text
            </p>
            <ul className="mt-1.5 max-h-40 overflow-y-scroll rounded-lg border bg-muted/30 px-3 py-2 space-y-1 list-none [\max-h-40 overflow-y-auto rounded-lg border bg-muted/30 px-3 py-2 space-y-1 list-none::-webkit-scrollbar]:w-1.5 [\max-h-40 overflow-y-auto rounded-lg border bg-muted/30 px-3 py-2 space-y-1 list-none::-webkit-scrollbar-thumb]:rounded-full [\max-h-40 overflow-y-auto rounded-lg border bg-muted/30 px-3 py-2 space-y-1 list-none::-webkit-scrollbar-thumb]:bg-muted-foreground/30">
              {item.extractedText.split("\n").filter(Boolean).map((line, i) => (
                <li key={i} className="flex gap-1.5 text-xs leading-relaxed text-foreground/80"><span className="shrink-0 text-muted-foreground">•</span><span>{line}</span></li>
              ))}
            </ul>
          </div>
        )}

        {/* Eligibility check — temporarily hidden on Pin Drop via SHOW_OPPORTUNITY_FEATURES. */}
        {SHOW_OPPORTUNITY_FEATURES && item.isOpportunityLike && item.opportunityDetails?.requirements && item.opportunityDetails.requirements.length > 0 && (
          <div className="mt-4">
            {!showEligibility ? (
              <button
                type="button"
                onClick={() => setShowEligibility(true)}
                className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 px-4 py-1.5 text-xs font-medium text-primary hover:bg-primary/5"
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                Am I eligible?
              </button>
            ) : (
              <div className="rounded-lg border bg-muted/30 p-3">
                <p className="text-xs font-semibold tracking-tight">Eligibility check</p>
                <ul className="mt-2 space-y-1.5">
                  {item.opportunityDetails.requirements.map((req) => {
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
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    Build your roadmap first so Sylo knows your major, year, and school.
                  </p>
                )}
                <button
                  type="button"
                  onClick={() => setShowEligibility(false)}
                  className="mt-2 text-[11px] font-medium text-muted-foreground hover:text-foreground"
                >
                  Hide
                </button>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="mt-5 flex items-center gap-2 border-t pt-4">
          {showAddButton && (
            <button
              type="button"
              onClick={() => onAddToRoadmap(item)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-1.5 text-xs font-medium text-primary-foreground",
                "transition-colors hover:bg-primary/90",
              )}
            >
              <Plus className="h-3.5 w-3.5" />
              Add & track
            </button>
          )}
          {item.linkedStepId && (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Added & tracked
            </span>
          )}
          {item.detectedDate && (
            <button
              type="button"
              onClick={handleAddToCalendar}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border border-primary/30 px-4 py-1.5 text-xs font-medium text-primary",
                "transition-colors hover:bg-primary/5",
              )}
            >
              <CalendarPlus className="h-3.5 w-3.5" />
              Add to calendar
            </button>
          )}

          <div className="ml-auto flex items-center gap-1">
            {item.imageThumbnailBase64 && (
              <button
                type="button"
                onClick={handleDownload}
                className="rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label="Download image"
              >
                <Download className="h-4 w-4" />
              </button>
            )}
            {confirmDelete ? (
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-red-600">Delete?</span>
                <button
                  type="button"
                  onClick={() => onDelete(item.id)}
                  className="rounded-full bg-red-100 px-2.5 py-1 text-[11px] font-medium text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-300"
                >
                  Yes
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground hover:bg-muted/80"
                >
                  No
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="rounded-full p-2 text-muted-foreground hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20"
                aria-label="Delete pin"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
