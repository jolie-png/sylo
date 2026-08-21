import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, ImagePlus, MapPin, Pencil, Check, ArrowRight } from "lucide-react";
import { Workspace, PageHeader } from "@/components/workspace";
import { usePin, type PinItem } from "@/lib/pin-store";
import { MAYA_PINS, ALEX_PINS } from "@/lib/pin-demo-data";
import { useWayfind } from "@/lib/wayfind-store";
import { ScreenshotUploader } from "@/components/screenshot-uploader";
import { PinItemCard } from "@/components/pin-item-card";
import { PinLinkExtractor } from "@/components/pin-link-extractor";
import { PinItemDetail } from "@/components/pin-item-detail";
import { PinEligibilityPopup } from "@/components/pin-eligibility-popup";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/pin")({
  head: () => ({
    meta: [
      { title: "Pin Drop — Sylo" },
      {
        name: "description",
        content:
          "Drop a pin on anything you find. Upload screenshots and Sylo reads, categorizes, and adds them to your map.",
      },
      { property: "og:title", content: "Pin Drop — Sylo" },
      {
        property: "og:description",
        content:
          "Drop a pin on anything you find — Sylo reads it and adds it to your map.",
      },
    ],
  }),
  component: PinPage,
});

function PinPage() {
  const { items, addItem, updateItem, deleteItem, seedItems, linkToRoadmap } = usePin();
  const { profile, addCustomStep } = useWayfind();
  const [collapsedTopics, setCollapsedTopics] = useState<Record<string, boolean>>({});
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [editingTopic, setEditingTopic] = useState<string | null>(null);
  const [topicDraft, setTopicDraft] = useState("");
  const [movingItemId, setMovingItemId] = useState<string | null>(null);
  const [draggingPinId, setDraggingPinId] = useState<string | null>(null);
  const [dropTargetTopic, setDropTargetTopic] = useState<string | null>(null);
  const [eligibilityItemId, setEligibilityItemId] = useState<string | null>(null);

  // Seed demo pins when persona is loaded and pin store is empty
  useEffect(() => {
    if (items.length > 0) return;
    if (!profile?.personaName) return;
    const pins = profile.personaName === "Maya" ? MAYA_PINS : profile.personaName === "Alex" ? ALEX_PINS : [];
    if (pins.length > 0) seedItems(pins);
  }, [profile?.personaName, items.length, seedItems]);

  // "Add to roadmap" creates a roadmap addition from the pin (a "pin-drop" custom
  // step, which shows in the dashboard's "Your additions" section and on the
  // progress board), then links the pin to that step so the button flips to
  // "Added to roadmap" and the pin leaves the "From Pin Drop" tray.
  const handleAddToRoadmap = useCallback(
    (item: PinItem) => {
      const title = item.opportunityDetails?.name || item.title;
      const noteLines: string[] = [];
      if (item.opportunityDetails) {
        if (item.opportunityDetails.description) noteLines.push(item.opportunityDetails.description);
        if (item.opportunityDetails.requirements.length > 0) {
          noteLines.push(`Requirements: ${item.opportunityDetails.requirements.join(", ")}`);
        }
        if (item.opportunityDetails.contact) noteLines.push(`Contact: ${item.opportunityDetails.contact}`);
      }
      // Fall back to the text Sylo already extracted from the screenshot/link so
      // the step still carries context when there are no structured details
      // (e.g. a resource list or a reminder with no description). It's line-based,
      // so render each line as a bullet for readability.
      const extractedBullets = item.extractedText
        ? item.extractedText.split("\n").map((l) => l.trim()).filter(Boolean).slice(0, 12).map((l) => `• ${l}`).join("\n")
        : "";
      const note = noteLines.join("\n").trim() || extractedBullets || undefined;
      const step = addCustomStep({
        title,
        note,
        targetDate: item.opportunityDetails?.deadline || item.detectedDate || undefined,
        source: "pin-drop",
      });
      linkToRoadmap(item.id, step.id);
    },
    [addCustomStep, linkToRoadmap],
  );

  // Group items by topic
  const topicGroups = useMemo(() => {
    const groups: Record<string, PinItem[]> = {};
    for (const item of items) {
      const topic = item.topic || "Uncategorized";
      if (!groups[topic]) groups[topic] = [];
      groups[topic].push(item);
    }
    return Object.entries(groups).sort(([, a], [, b]) => {
      const latestA = a.reduce((max, item) => (item.createdAt > max ? item.createdAt : max), "");
      const latestB = b.reduce((max, item) => (item.createdAt > max ? item.createdAt : max), "");
      return latestB.localeCompare(latestA);
    });
  }, [items]);

  const allTopics = useMemo(() => topicGroups.map(([t]) => t), [topicGroups]);

  const toggleTopic = (topic: string) => {
    setCollapsedTopics((prev) => ({ ...prev, [topic]: !prev[topic] }));
  };

  // Rename a topic (updates all items with that topic)
  const handleRenameTopic = (oldTopic: string) => {
    const newName = topicDraft.trim();
    if (newName && newName !== oldTopic) {
      // Update all items that have the old topic
      items.forEach((item) => {
        if (item.topic === oldTopic) {
          updateItem(item.id, { topic: newName });
        }
      });
    }
    setEditingTopic(null);
    setTopicDraft("");
  };

  // Move a pin to a different topic
  const handleMoveToTopic = (itemId: string, newTopic: string) => {
    updateItem(itemId, { topic: newTopic });
    setMovingItemId(null);
  };

  const selectedItem = selectedItemId ? items.find((i) => i.id === selectedItemId) : null;

  return (
    <Workspace wide>
      <PageHeader
        icon={<MapPin className="h-5 w-5" />}
        title="Pin Drop"
        subtitle={
          <>
            Screenshot or paste a link to anything — a program, a deadline, a reminder. Sylo extracts the title, deadline, and details, and when the item lists requirements it checks whether you&apos;re eligible. Add any of it to your{" "}
            <Link to="/dashboard" className="font-medium text-primary underline-offset-4 hover:underline">roadmap</Link>
            {" "}and track it in your{" "}
            <Link to="/progress" className="font-medium text-primary underline-offset-4 hover:underline">progress board</Link>.
          </>
        }
      />

      {/* Upload zone */}
      <section className="mt-6">
        <ScreenshotUploader onItemProcessed={addItem} />
        <div className="mt-3">
          <PinLinkExtractor onItemProcessed={addItem} />
        </div>
      </section>

      {/* Items grouped by topic */}
      {items.length === 0 ? (
        <div className="mt-12 flex flex-col items-center text-center">
          <ImagePlus className="h-12 w-12 text-muted-foreground/40" />
          <h2 className="mt-4 text-lg font-semibold tracking-tight">
            No pins yet
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Upload a screenshot or paste a link to get started.
          </p>
        </div>
      ) : (
        <div className="mt-8 space-y-6">
          {topicGroups.map(([topic, topicItems]) => {
            const isCollapsed = collapsedTopics[topic] ?? false;
            const isEditingThis = editingTopic === topic;

            return (
              <section
                key={topic}
                onDragOver={(e) => { e.preventDefault(); setDropTargetTopic(topic); }}
                onDragLeave={() => setDropTargetTopic((t) => t === topic ? null : t)}
                onDrop={(e) => {
                  e.preventDefault();
                  if (draggingPinId && draggingPinId !== null) {
                    const draggedItem = items.find((i) => i.id === draggingPinId);
                    if (draggedItem && draggedItem.topic !== topic) {
                      updateItem(draggingPinId, { topic });
                    }
                  }
                  setDraggingPinId(null);
                  setDropTargetTopic(null);
                }}
                className={cn(dropTargetTopic === topic && draggingPinId && "rounded-xl ring-2 ring-primary/40 bg-primary/[0.03]")}
              >
                {/* Topic header — editable */}
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => toggleTopic(topic)}
                    className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-accent/50"
                  >
                    {isCollapsed ? (
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                    )}
                  </button>

                  {isEditingThis ? (
                    <div className="flex flex-1 items-center gap-1.5">
                      <input
                        type="text"
                        value={topicDraft}
                        onChange={(e) => setTopicDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleRenameTopic(topic);
                          if (e.key === "Escape") { setEditingTopic(null); setTopicDraft(""); }
                        }}
                        autoFocus
                        className="flex-1 rounded-lg border px-2 py-1 text-sm font-semibold outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
                      />
                      <button
                        type="button"
                        onClick={() => handleRenameTopic(topic)}
                        className="rounded-full p-1 text-primary hover:bg-primary/10"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-1 items-center gap-2">
                      <span className="text-sm font-semibold tracking-tight">
                        {topic}
                      </span>
                      <button
                        type="button"
                        onClick={() => { setEditingTopic(topic); setTopicDraft(topic); }}
                        className="rounded-full p-1 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-primary hover:bg-primary/5 transition-opacity"
                        style={{ opacity: 0.4 }}
                        aria-label={`Rename ${topic}`}
                      >
                        <Pencil className="h-3 w-3" />
                      </button>
                      <span className="ml-auto text-xs text-muted-foreground">
                        {topicItems.length} {topicItems.length === 1 ? "pin" : "pins"}
                      </span>
                    </div>
                  )}
                </div>

                {/* Items grid */}
                {!isCollapsed && (
                  <div className="mt-2 grid gap-3 sm:grid-cols-2">
                    {topicItems.map((item) => (
                      <div
                          key={item.id}
                          className={cn("relative", draggingPinId === item.id && "opacity-50")}
                          draggable
                          onDragStart={() => setDraggingPinId(item.id)}
                          onDragEnd={() => { setDraggingPinId(null); setDropTargetTopic(null); }}
                        >
                        <PinItemCard
                          item={item}
                          onSelect={(id) => setSelectedItemId(id)}
                          onAddToRoadmap={handleAddToRoadmap}
                          onCheckEligibility={(i) => setEligibilityItemId(i.id)}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}

      {/* Detail modal */}
      {selectedItem && (
        <PinItemDetail
          item={selectedItem}
          profile={profile}
          onClose={() => setSelectedItemId(null)}
          onUpdate={updateItem}
          onDelete={(id) => { deleteItem(id); setSelectedItemId(null); }}
          onAddToRoadmap={handleAddToRoadmap}
        />
      )}

      {/* Eligibility popup */}
      {eligibilityItemId && (() => {
        const eligItem = items.find((i) => i.id === eligibilityItemId);
        if (!eligItem) return null;
        return (
          <PinEligibilityPopup
            item={eligItem}
            profile={profile}
            onClose={() => setEligibilityItemId(null)}
          />
        );
      })()}
    </Workspace>
  );
}
