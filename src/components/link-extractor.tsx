import { useState } from "react";
import { Loader2, Link as LinkIcon, Sparkles, AlertCircle, PenLine } from "lucide-react";
import { extractOpportunity, type ExtractedProgram } from "@/lib/extractOpportunity.functions";

interface LinkExtractorProps {
  onExtracted: (details: ExtractedProgram) => void;
  /** Fallback: pre-fill the manual form with the URL so the user isn't stuck */
  onFallback?: (url: string) => void;
}

export function LinkExtractor({ onExtracted, onFallback }: LinkExtractorProps) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<ExtractedProgram | null>(null);
  const [failedUrl, setFailedUrl] = useState<string | null>(null);

  async function handleExtract() {
    const trimmed = url.trim();
    if (!trimmed) return;

    // Basic URL validation
    let normalizedUrl: string;
    try {
      const parsed = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
      normalizedUrl = parsed.href;
    } catch {
      setError("That doesn't look like a valid URL.");
      return;
    }

    setLoading(true);
    setError(null);
    setPreview(null);
    setFailedUrl(null);

    try {
      const result = await extractOpportunity({ data: { url: normalizedUrl } });

      if ("error" in result) {
        setError(result.error);
        setFailedUrl(normalizedUrl);
      } else {
        setPreview(result);
      }
    } catch {
      setError("Something went wrong. Try again or add the step manually.");
      setFailedUrl(normalizedUrl);
    } finally {
      setLoading(false);
    }
  }

  function handleConfirm() {
    if (preview) {
      onExtracted(preview);
      setUrl("");
      setPreview(null);
      setError(null);
      setFailedUrl(null);
    }
  }

  function handleFallbackToManual() {
    if (failedUrl && onFallback) {
      onFallback(failedUrl);
    }
    setUrl("");
    setError(null);
    setFailedUrl(null);
  }

  return (
    <div className="rounded-2xl border border-primary/20 bg-primary/[0.03] p-4">
      <div className="flex items-center gap-2 text-[13px] font-semibold text-primary/80">
        <Sparkles className="h-3.5 w-3.5" />
        Paste a link — Sylo extracts the details
      </div>

      <div className="mt-3 flex gap-2">
        <div className="relative flex-1">
          <LinkIcon className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/50" />
          <input
            type="url"
            value={url}
            onChange={(e) => { setUrl(e.target.value); setError(null); setPreview(null); setFailedUrl(null); }}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleExtract(); } }}
            placeholder="https://undergradresearch.gatech.edu/pura-salary"
            aria-label="Program URL"
            disabled={loading}
            className="w-full rounded-xl border bg-background py-2 pl-9 pr-3 text-sm outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10 disabled:opacity-50"
          />
        </div>
        <button
          type="button"
          onClick={handleExtract}
          disabled={loading || !url.trim()}
          className="tap shrink-0 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Extract"}
        </button>
      </div>

      {/* Error state with graceful fallback to manual entry */}
      {error && (
        <div className="mt-3 space-y-2">
          <div className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-[13px] text-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>{error}</span>
          </div>
          {failedUrl && onFallback && (
            <button
              type="button"
              onClick={handleFallbackToManual}
              className="tap inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-medium text-primary hover:bg-primary/5"
            >
              <PenLine className="h-3.5 w-3.5" />
              Add it manually instead — I'll include the link
            </button>
          )}
        </div>
      )}

      {/* Success preview */}
      {preview && (
        <div className="mt-3 rounded-xl border bg-card p-4">
          <p className="text-sm font-semibold tracking-tight">{preview.name}</p>
          <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">{preview.description}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {preview.deadline && (
              <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                Deadline: {preview.deadline}
              </span>
            )}
            <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
              {preview.category}
            </span>
            {preview.timeframe && (
              <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                {preview.timeframe}
              </span>
            )}
          </div>
          {preview.requirements.length > 0 && (
            <p className="mt-2 text-[12px] text-muted-foreground">
              <span className="font-medium">Requirements:</span> {preview.requirements.join(" · ")}
            </p>
          )}
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={handleConfirm}
              className="tap rounded-full bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground"
            >
              Add to my steps
            </button>
            <button
              type="button"
              onClick={() => { setPreview(null); setUrl(""); }}
              className="tap tap-surface rounded-full border px-4 py-1.5 text-sm font-medium"
            >
              Discard
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
