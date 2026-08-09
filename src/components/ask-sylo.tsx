import { useState, useRef, useEffect, useCallback } from "react";
import {
  MessageCircle,
  X,
  Send,
  ExternalLink,
  TrendingUp,
  MessageSquare,
} from "lucide-react";
import { SyloMark } from "@/components/SyloMark";
import { cn } from "@/lib/utils";
import { askSyloSearch, type RedditSearchResult } from "@/lib/ask-sylo.functions";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Message = {
  id: string;
  role: "user" | "sylo";
  content: string;
  posts?: RedditSearchResult[];
  loading?: boolean;
};

// ---------------------------------------------------------------------------
// Suggested questions
// ---------------------------------------------------------------------------

const SUGGESTIONS = [
  "When does Goldman Sachs sophomore program open?",
  "Best diversity fellowship programs for CS?",
  "Is SEO Career worth applying to?",
  "REU application tips and timeline?",
  "How early do consulting firms recruit?",
];

// ---------------------------------------------------------------------------
// Chat widget
// ---------------------------------------------------------------------------

export function AskSylo() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "sylo",
      content:
        "Ask me anything about programs, deadlines, or pipelines. I search Reddit communities where students share real experiences — no AI credits used, just real answers from real people.",
    },
  ]);
  const [input, setInput] = useState("");
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

      // Search Reddit via server function (avoids CORS)
      const result = await askSyloSearch({ data: { query } });
      const posts = result.posts;

      const response: Message = {
        id: loadingMsg.id,
        role: "sylo",
        content: posts.length
          ? `Found ${posts.length} relevant discussions from Reddit:`
          : "I couldn't find relevant discussions for that query. Try rephrasing or asking about specific programs, deadlines, or experiences.",
        posts: posts.length ? posts : undefined,
      };

      setMessages((prev) =>
        prev.map((m) => (m.id === loadingMsg.id ? response : m)),
      );
    },
    [input],
  );

  return (
    <>
      {/* Floating button */}
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="tap fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary shadow-lg transition-transform hover:scale-105"
          aria-label="Ask Sylo"
        >
          <MessageCircle className="h-6 w-6 text-primary-foreground" />
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-6 right-6 z-50 flex h-[32rem] w-[22rem] flex-col rounded-2xl border bg-card shadow-2xl sm:w-[24rem]">
          {/* Header */}
          <div className="flex items-center justify-between border-b px-4 py-3">
            <div className="flex items-center gap-2">
              <SyloMark className="h-5 w-5" animated={false} />
              <div>
                <p className="text-sm font-semibold tracking-tight">Ask Sylo</p>
                <p className="text-[10px] text-muted-foreground">
                  Powered by Reddit · Free · No AI credits
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
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
                      <SyloMark className="h-3.5 w-3.5" animated={false} />
                    </div>
                    <div className="min-w-0 flex-1">
                      {msg.loading ? (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span className="animate-pulse">Searching Reddit...</span>
                        </div>
                      ) : (
                        <>
                          <p className="text-sm text-foreground">{msg.content}</p>
                          {msg.posts && (
                            <div className="mt-2 space-y-1.5">
                              {msg.posts.map((post) => (
                                <a
                                  key={post.id}
                                  href={post.permalink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="tap block rounded-lg border bg-muted/50 p-2.5 transition-colors hover:bg-muted"
                                >
                                  <p className="text-xs font-medium leading-snug text-foreground line-clamp-2">
                                    {post.title}
                                  </p>
                                  {post.selftext && (
                                    <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground line-clamp-2">
                                      {post.selftext}
                                    </p>
                                  )}
                                  <div className="mt-1.5 flex items-center gap-3 text-[10px] text-muted-foreground">
                                    <span className="font-medium text-orange-600">
                                      r/{post.subreddit}
                                    </span>
                                    <span className="flex items-center gap-0.5">
                                      <TrendingUp className="h-2.5 w-2.5" />
                                      {post.score}
                                    </span>
                                    <span className="flex items-center gap-0.5">
                                      <MessageSquare className="h-2.5 w-2.5" />
                                      {post.numComments}
                                    </span>
                                    <ExternalLink className="ml-auto h-2.5 w-2.5" />
                                  </div>
                                </a>
                              ))}
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
                placeholder="Ask about programs, deadlines..."
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
