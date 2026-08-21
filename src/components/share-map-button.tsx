import { useMemo, useState } from "react";
import { Check, Share2 } from "lucide-react";
import type { PublishedMap } from "@/lib/published-maps";
import { buildShareUrl } from "@/lib/share-map";
import { cn } from "@/lib/utils";

/**
 * Copies a self-contained share link for a success map. The link encodes the
 * whole map, so it opens on any device without a backend. Falls back to a
 * selectable read-only field if the clipboard API is unavailable.
 */
export function ShareMapButton({
  map,
  label = "Share",
  className,
}: {
  map: PublishedMap;
  label?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  const [showLink, setShowLink] = useState(false);
  const url = useMemo(() => buildShareUrl(map), [map]);

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked — the link field below lets them copy manually */
    }
    setShowLink(true);
  };

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        type="button"
        onClick={handleShare}
        className={cn(
          "tap inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground",
          className,
        )}
        aria-label="Copy a shareable link to this success map"
      >
        {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Share2 className="h-3.5 w-3.5" />}
        {copied ? "Link copied" : label}
      </button>
      {showLink && (
        <input
          readOnly
          value={url}
          onFocus={(e) => e.currentTarget.select()}
          className="w-full max-w-md rounded-lg border bg-muted/40 px-2.5 py-1.5 text-[11px] text-muted-foreground outline-none"
          aria-label="Shareable link"
        />
      )}
    </div>
  );
}
