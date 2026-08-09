import { useState, useRef, useEffect, useCallback } from "react";
import {
  MessageCircle,
  X,
  Send,
  Plus,
  ExternalLink,
  Search,
} from "lucide-react";
import { SyloMark } from "@/components/SyloMark";
import { cn } from "@/lib/utils";
import { searchOpportunities, type OpportunityRecord } from "@/lib/opportunities-db";
import { useWayfind } from "@/lib/sylo-store";
import { askSyloWebSearch, type WebSearchResult } from "@/lib/ask-sylo.functions";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Message = {
  id: string;
  role: "user" | "sylo";
  content: string;
  results?: OpportunityRecord[];
  webResults?: WebSearchResult[];
  loading?: boolean;
};

// ---------------------------------------------------------------------------
// Suggested questions
// ---------------------------------------------------------------------------

const SUGGESTIONS = [
  "Diversity fellowship programs",
  "Freshman insight day programs",
  "Scholarships for STEM students",
  "Finance early pipeline deadlines",
  "Research opportunities PhD track",
];

// ---------------------------------------------------------------------------
// Chat widget
// ---------------------------------------------------------------------------

export function AskSylo() {
  const [open, setOpen] = useState(false);
  const { addCustomStep } = useWayfind();

  // Draggable position (bottom-right anchor)
  const [pos, setPos] = useState({ right: 24, bottom: 24 });
  const dragRef = useRef<{ startX: number; startY: number; startRight: number; startBottom: number } | null>(null);
  // Panel drag state (separate so dragging the panel doesn't move the button)
  const [panelPos, setPanelPos] = useState<{ right: number; bottom: number } | null>(null);
  const panelDragRef = useRef<{ startX: number; startY: number; startRight: number; startBottom: number } | null>(null);
  // Panel resize state
  const [panelSize, setPanelSize] = useState({ width: 352, height: 544 });
  const resizeRef = useRef<{ startX: number; startY: number; startW: number; startH: number } | null>(null);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "sylo",
      content:
        "Ask me about programs, deadlines, or pipelines. I'll search Sylo's curated database of fellowships, insight days, scholarships, and early-ID programs. Found something good? Add it to your roadmap.",
    },
  ]);
  const [input, setInput] = useState("");
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = useCallback(
    async (text?: string) => {
      const query = (text ?? input).trim();
      if (!query) return;
      setInput("");

      const userMsg: Message = {
        id: `user-${Date.now()}`,
        role: "user",
        content: query,
      };

      const loadingMsg: Message = {
        id: `sylo-${Date.now()}`,
        role: "sylo",
        content: "",
        loading: true,
      };

      setMessages((prev) => [...prev, userMsg, loadingMsg]);

      // Search local curated database (free, instant)
      const results = searchOpportunities({ query, limit: 6 });

      let response: Message;

      if (results.length > 0) {
        // Local results found — free, no AI cost
        response = {
          id: loadingMsg.id,
          role: "sylo",
          content: `Found ${results.length} programs in Sylo's database:`,
          results,
        };
      } else {
        // No local results — fall back to web search via Gemini Flash
        try {
          const webData = await askSyloWebSearch({ data: { query } });
          if (webData.results.length > 0) {
            response = {
              id: loadingMsg.id,
              role: "sylo",
              content: `Nothing in Sylo's curated database, but I found these online:`,
              webResults: webData.results,
            };
          } else {
            response = {
              id: loadingMsg.id,
              role: "sylo",
              content: `I couldn't find programs matching "${query}". Try specific names like "Goldman Sachs", "CodePath", "NSF REU", or categories like "scholarship", "fellowship", "insight day".`,
            };
          }
        } catch {
          response = {
            id: loadingMsg.id,
            role: "sylo",
            content: `I couldn't find programs matching "${query}". Try specific names or categories like "scholarship", "fellowship", "insight day".`,
          };
        }
      }

      setMessages((prev) =>
        prev.map((m) => (m.id === loadingMsg.id ? response : m)),
      );
    },
    [input],
  );

  // Allow other components to open the chat via a custom event
  useEffect(() => {
    const handler = (e: Event) => {
      setOpen(true);
      const query = (e as CustomEvent).detail?.query;
      if (query) {
        // Small delay so the panel renders before sending
        setTimeout(() => handleSend(query), 100);
      }
    };
    window.addEventListener("open-ask-sylo", handler);
    return () => window.removeEventListener("open-ask-sylo", handler);
  }, [handleSend]);

  const handleAddToRoadmap = useCallback(
    (op: OpportunityRecord) => {
      addCustomStep({
        title: op.name,
        note: `${op.leverage}\n\nDeadline: ${op.timeframe}\nLink: ${op.link}`,
        targetDate: op.deadline || undefined,
      });
      setAddedIds((prev) => new Set([...prev, op.id]));
    },
    [addCustomStep],
  );

  return (
    <>
      {/* Floating button — draggable anywhere */}
      {!open && (
        <button
          type="button"
          onPointerDown={(e) => {
            dragRef.current = { startX: e.clientX, startY: e.clientY, startRight: pos.right, startBottom: pos.bottom };
            (e.target as HTMLElement).setPointerCapture(e.pointerId);
          }}
          onPointerMove={(e) => {
            if (!dragRef.current) return;
            const dx = dragRef.current.startX - e.clientX;
            const dy = dragRef.current.startY - e.clientY;
            const newRight = Math.max(16, Math.min(window.innerWidth - 72, dragRef.current.startRight + dx));
            const newBottom = Math.max(16, Math.min(window.innerHeight - 72, dragRef.current.startBottom + dy));
            setPos({ right: newRight, bottom: newBottom });
          }}
          onPointerUp={(e) => {
            if (!dragRef.current) return;
            const moved = Math.abs(dragRef.current.startX - e.clientX) > 5 || Math.abs(dragRef.current.startY - e.clientY) > 5;
            dragRef.current = null;
            if (!moved) setOpen(true);
          }}
          style={{ right: `${pos.right}px`, bottom: `${pos.bottom}px` }}
          className="tap fixed z-50 flex h-14 w-14 cursor-grab items-center justify-center rounded-full bg-primary shadow-lg transition-none active:cursor-grabbing hover:scale-105"
          aria-label="Ask Sylo"
        >
          <MessageCircle className="h-6 w-6 text-primary-foreground" />
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <div style={{ right: `${(panelPos ?? pos).right}px`, bottom: `${(panelPos ?? pos).bottom}px`, width: `${panelSize.width}px`, height: `${panelSize.height}px` }} className="fixed z-50 flex flex-col rounded-2xl border bg-card shadow-2xl">
          {/* Resize handle — top-left corner (invisible) */}
          <div
            className="absolute -left-1 -top-1 z-10 h-4 w-4 cursor-nw-resize"
            style={{ touchAction: "none" }}
            onPointerDown={(e) => {
              resizeRef.current = { startX: e.clientX, startY: e.clientY, startW: panelSize.width, startH: panelSize.height };
              (e.target as HTMLElement).setPointerCapture(e.pointerId);
              e.preventDefault();
            }}
            onPointerMove={(e) => {
              if (!resizeRef.current) return;
              const dx = resizeRef.current.startX - e.clientX;
              const dy = resizeRef.current.startY - e.clientY;
              const newW = Math.max(280, Math.min(700, resizeRef.current.startW + dx));
              const newH = Math.max(300, Math.min(900, resizeRef.current.startH + dy));
              setPanelSize({ width: newW, height: newH });
            }}
            onPointerUp={(e) => {
              resizeRef.current = null;
              (e.target as HTMLElement).releasePointerCapture(e.pointerId);
            }}
          />
          {/* Header — drag handle */}
          <div
            className="flex cursor-grab items-center justify-between border-b px-4 py-3 select-none active:cursor-grabbing"
            style={{ touchAction: "none" }}
            onPointerDown={(e) => {
              // Only start drag from the header area, not the close button
              if ((e.target as HTMLElement).closest("button")) return;
              const p = panelPos ?? pos;
              panelDragRef.current = { startX: e.clientX, startY: e.clientY, startRight: p.right, startBottom: p.bottom };
              e.currentTarget.setPointerCapture(e.pointerId);
              e.preventDefault();
            }}
            onPointerMove={(e) => {
              if (!panelDragRef.current) return;
              const dx = panelDragRef.current.startX - e.clientX;
              const dy = panelDragRef.current.startY - e.clientY;
              const newRight = Math.max(0, panelDragRef.current.startRight + dx);
              const newBottom = Math.max(0, panelDragRef.current.startBottom + dy);
              setPanelPos({ right: newRight, bottom: newBottom });
            }}
            onPointerUp={(e) => {
              if (!panelDragRef.current) return;
              panelDragRef.current = null;
              e.currentTarget.releasePointerCapture(e.pointerId);
            }}
          >
            <div className="flex items-center gap-2">
              <SyloMark className="h-5 w-5" animated={true} />
              <div>
                <p className="text-sm font-semibold tracking-tight">Ask Sylo</p>
                <p className="text-[10px] text-muted-foreground">
                  Search programs · Add to roadmap
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => { setOpen(false); setPanelPos(null); }}
              className="tap rounded-full p-1.5 text-muted-foreground hover:text-foreground"
              aria-label="Close chat"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {messages.map((msg) => (
              <div key={msg.id}>
                {msg.role === "user" ? (
                  <div className="flex justify-end">
                    <div className="max-w-[80%] rounded-2xl rounded-br-md bg-primary px-3.5 py-2 text-sm text-primary-foreground">
                      {msg.content}
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted">
                      <SyloMark className="h-3.5 w-3.5" animated={true} />
                    </div>
                    <div className="min-w-0 flex-1">
                      {msg.loading ? (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Search className="h-3.5 w-3.5 animate-pulse" />
                          <span>Searching...</span>
                        </div>
                      ) : (
                        <>
                          <p className="text-sm text-foreground">{msg.content}</p>
                          {msg.results && (
                            <div className="mt-2 space-y-1.5">
                              {msg.results.map((op) => {
                                const added = addedIds.has(op.id);
                                return (
                                  <div
                                    key={op.id}
                                    className="rounded-lg border bg-muted/50 p-2.5"
                                  >
                                    <p className="text-xs font-medium leading-snug text-foreground line-clamp-2">
                                      {op.name}
                                    </p>
                                    <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground line-clamp-2">
                                      {op.leverage}
                                    </p>
                                    <div className="mt-1.5 flex items-center justify-between">
                                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                                        <span className="rounded-full bg-muted px-1.5 py-0.5 font-medium">
                                          {op.category}
                                        </span>
                                        {op.timeframe && (
                                          <span className="text-amber-700">
                                            {op.timeframe}
                                          </span>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-1">
                                        {op.link && (
                                          <a
                                            href={op.link}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="tap rounded-full p-1 text-muted-foreground hover:text-primary"
                                            aria-label="Open link"
                                          >
                                            <ExternalLink className="h-3 w-3" />
                                          </a>
                                        )}
                                        <button
                                          type="button"
                                          onClick={() => handleAddToRoadmap(op)}
                                          disabled={added}
                                          className={cn(
                                            "tap flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors",
                                            added
                                              ? "bg-emerald-100 text-emerald-700"
                                              : "bg-primary/10 text-primary hover:bg-primary/20",
                                          )}
                                        >
                                          {added ? (
                                            "Added ✓"
                                          ) : (
                                            <>
                                              <Plus className="h-2.5 w-2.5" /> Add
                                            </>
                                          )}
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                          {msg.webResults && (
                            <div className="mt-2 space-y-1.5">
                              {msg.webResults.map((wr, i) => (
                                <div
                                  key={`web-${i}`}
                                  className="rounded-lg border border-blue-100 bg-blue-50/30 p-2.5"
                                >
                                  <p className="text-xs font-medium leading-snug text-foreground line-clamp-2">
                                    {wr.title}
                                  </p>
                                  <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground line-clamp-2">
                                    {wr.snippet}
                                  </p>
                                  <div className="mt-1.5 flex items-center justify-between">
                                    <span className="rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-medium text-blue-700">
                                      {wr.source || "Web"}
                                    </span>
                                    <div className="flex items-center gap-1">
                                      {wr.link && (
                                        <a
                                          href={wr.link}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="tap flex items-center gap-0.5 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-700 hover:bg-blue-200"
                                        >
                                          Visit <ExternalLink className="h-2.5 w-2.5" />
                                        </a>
                                      )}
                                      <button
                                        type="button"
                                        onClick={() => {
                                          addCustomStep({
                                            title: wr.title,
                                            note: `${wr.snippet}\n\nLink: ${wr.link}`,
                                          });
                                          setAddedIds((prev) => new Set([...prev, `web-${i}`]));
                                        }}
                                        disabled={addedIds.has(`web-${i}`)}
                                        className={cn(
                                          "tap flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors",
                                          addedIds.has(`web-${i}`)
                                            ? "bg-emerald-100 text-emerald-700"
                                            : "bg-primary/10 text-primary hover:bg-primary/20",
                                        )}
                                      >
                                        {addedIds.has(`web-${i}`) ? "Added ✓" : <><Plus className="h-2.5 w-2.5" /> Add</>}
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              ))}
                              <p className="text-[9px] text-muted-foreground text-center pt-1">
                                Results via web search · May need verification
                              </p>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Suggestions (show only at start) */}
            {messages.length === 1 && (
              <div className="space-y-1.5 pt-2">
                <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  Try asking
                </p>
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => handleSend(s)}
                    className="tap block w-full rounded-lg border bg-muted/30 px-3 py-2 text-left text-xs text-foreground transition-colors hover:bg-muted"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="border-t px-3 py-3">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Search programs, deadlines..."
                className="flex-1 rounded-xl border bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus:border-primary/40"
              />
              <button
                type="submit"
                disabled={!input.trim()}
                className="tap flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-40"
                aria-label="Send"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </form>

          </div>
        </div>
      )}
    </>
  );
}
