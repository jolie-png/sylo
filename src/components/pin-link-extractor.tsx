import { useState } from "react";
import { Loader2, Link as LinkIcon, AlertCircle } from "lucide-react";
import { extractOpportunity, type ExtractedProgram } from "@/lib/extractOpportunity.functions";
import { generatePinId, type PinItem } from "@/lib/pin-store";
import { cn } from "@/lib/utils";

interface PinLinkExtractorProps {
  onItemProcessed: (item: PinItem) => void;
}

export function PinLinkExtractor({ onItemProcessed }: PinLinkExtractorProps) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleExtract() {
    const trimmed = url.trim();
    if (!trimmed) return;

    // Basic URL normalization
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

    try {
      const result = await extractOpportunity({ data: { url: normalizedUrl } });

      if ("error" in result) {
        setError(result.error);
        setLoading(false);
        return;
      }

      // Convert ExtractedProgram → PinItem
      const pinItem: PinItem = {
        id: generatePinId(),
        title: result.name,
        extractedText: [
          result.description,
          result.requirements.length > 0 ? `Requirements: ${result.requirements.join(", ")}` : "",
          result.contact ? `Contact: ${result.contact}` : "",
        ].filter(Boolean).join("\n"),
        topic: "Career & Internships",
        tags: [result.category, result.timeframe].filter(Boolean),
        detectedDate: result.deadline || undefined,
        isOpportunityLike: true,
        opportunityDetails: result,
        createdAt: new Date().toISOString(),
        sourceUrl: normalizedUrl,
        imageThumbnailBase64: "",
      };

      onItemProcessed(pinItem);
      setUrl("");
      setError(null);
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-primary/20 bg-primary/[0.03] p-3">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <LinkIcon className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/50" />
          <input
            type="url"
            value={url}
            onChange={(e) => { setUrl(e.target.value); setError(null); }}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleExtract(); } }}
            placeholder="Paste a link to an opportunity..."
            aria-label="URL to extract"
            disabled={loading}
            className="w-full rounded-lg border bg-background py-2 pl-9 pr-3 text-sm outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10 disabled:opacity-50"
          />
        </div>
        <button
          type="button"
          onClick={handleExtract}
          disabled={loading || !url.trim()}
          className="tap shrink-0 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Drop a Pin"}
        </button>
      </div>

      {error && (
        <div className="mt-2 flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-[12px] text-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
