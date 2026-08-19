import { useCallback, useEffect, useRef, useState } from "react";
import {
  Upload,
  Loader2,
  CheckCircle,
  AlertCircle,
  ImagePlus,
  PenLine,
  X,
} from "lucide-react";
import { validatePinImage } from "@/lib/pin-validation";
import {
  extractPinItem,
  type ExtractPinItemResult,
} from "@/lib/extractPinItem.functions";
import { generatePinId, type PinItem } from "@/lib/pin-store";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type FileStatus = "idle" | "processing" | "success" | "error";

interface TrackedFile {
  /** Internal tracking ID. */
  trackingId: string;
  /** Original filename. */
  filename: string;
  /** Status of the extraction pipeline. */
  status: FileStatus;
  /** Error message when status is "error". */
  errorMessage?: string;
  /** A small preview URL (object URL) for display during processing. */
  previewUrl?: string;
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ScreenshotUploaderProps {
  onItemProcessed: (item: PinItem) => void;
  /** Fallback for manual entry when extraction fails. */
  onFallback?: (filename: string) => void;
  disabled?: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generateTrackingId(): string {
  return `track-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * Reads a File as a base64-encoded data URL, then strips the prefix to return
 * just the raw base64 payload.
 */
function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      resolve(dataUrl.split(",")[1]);
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

/**
 * Generates a compressed JPEG thumbnail from an image file.
 * Canvas-resized to max 200px width, quality 0.6.
 * Returns a base64 data URL string (with prefix stripped).
 */
function generateThumbnail(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      const maxWidth = 200;
      const scale = Math.min(maxWidth / img.width, 1);
      const width = Math.round(img.width * scale);
      const height = Math.round(img.height * scale);

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        URL.revokeObjectURL(objectUrl);
        reject(new Error("Canvas context unavailable"));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.6);
      URL.revokeObjectURL(objectUrl);
      // Strip the data:image/jpeg;base64, prefix
      resolve(dataUrl.split(",")[1]);
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Failed to load image for thumbnail"));
    };

    img.src = objectUrl;
  });
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ScreenshotUploader({
  onItemProcessed,
  onFallback,
  disabled,
}: ScreenshotUploaderProps) {
  const [trackedFiles, setTrackedFiles] = useState<TrackedFile[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // --- Update a tracked file's state ---
  const updateTracked = useCallback(
    (trackingId: string, patch: Partial<TrackedFile>) => {
      setTrackedFiles((prev) =>
        prev.map((f) => (f.trackingId === trackingId ? { ...f, ...patch } : f)),
      );
    },
    [],
  );

  // --- Remove a tracked file card ---
  const dismissTracked = useCallback((trackingId: string) => {
    setTrackedFiles((prev) => {
      const item = prev.find((f) => f.trackingId === trackingId);
      if (item?.previewUrl) URL.revokeObjectURL(item.previewUrl);
      return prev.filter((f) => f.trackingId !== trackingId);
    });
  }, []);

  // --- Core processing pipeline for a single file ---
  const processFile = useCallback(
    async (file: File, trackingId: string) => {
      // 1. Validate
      const validation = validatePinImage(file);
      if (!validation.valid) {
        updateTracked(trackingId, {
          status: "error",
          errorMessage: validation.message,
        });
        return;
      }

      // 2. Mark as processing
      updateTracked(trackingId, { status: "processing" });

      try {
        // 3. Read file as base64 and generate thumbnail in parallel
        const [base64, thumbnailBase64] = await Promise.all([
          readFileAsBase64(file),
          generateThumbnail(file),
        ]);

        // 4. Call the extraction server function
        const result: ExtractPinItemResult = await extractPinItem({
          data: {
            imageBase64: base64,
            mediaType: file.type as "image/png" | "image/jpeg" | "image/webp",
            filename: file.name,
          },
        });

        // 5. Handle result
        if ("error" in result) {
          updateTracked(trackingId, {
            status: "error",
            errorMessage: result.error,
          });
          return;
        }

        // 6. Build the full PinItem
        const pinItem: PinItem = {
          id: generatePinId(),
          title: result.title,
          extractedText: result.extractedText,
          topic: result.topic,
          tags: result.tags,
          detectedDate: result.detectedDate,
          isOpportunityLike: result.isOpportunityLike,
          opportunityDetails: result.opportunityDetails,
          createdAt: new Date().toISOString(),
          imageThumbnailBase64: thumbnailBase64,
        };

        // 7. Signal success
        updateTracked(trackingId, { status: "success" });
        onItemProcessed(pinItem);
      } catch {
        updateTracked(trackingId, {
          status: "error",
          errorMessage: "Something went wrong. Try again.",
        });
      }
    },
    [onItemProcessed, updateTracked],
  );

  // --- Handle incoming files (from any source) ---
  const handleFiles = useCallback(
    (files: FileList | File[]) => {
      const fileArray = Array.from(files);
      if (fileArray.length === 0) return;

      const newTracked: TrackedFile[] = fileArray.map((file) => {
        const trackingId = generateTrackingId();
        const previewUrl = URL.createObjectURL(file);
        return {
          trackingId,
          filename: file.name,
          status: "idle" as const,
          previewUrl,
        };
      });

      setTrackedFiles((prev) => [...prev, ...newTracked]);

      // Kick off processing for each file independently
      fileArray.forEach((file, i) => {
        processFile(file, newTracked[i].trackingId);
      });
    },
    [processFile],
  );

  // --- Drag and drop handlers ---
  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!disabled) setIsDragOver(true);
    },
    [disabled],
  );

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);
      if (disabled) return;

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        handleFiles(files);
      }
    },
    [disabled, handleFiles],
  );

  // --- File input change ---
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        handleFiles(files);
      }
      // Reset so the same files can be re-selected
      e.target.value = "";
    },
    [handleFiles],
  );

  // --- Clipboard paste handler ---
  useEffect(() => {
    if (disabled) return;

    function handlePaste(e: ClipboardEvent) {
      const items = e.clipboardData?.files;
      if (!items || items.length === 0) return;

      // Filter to image files only
      const imageFiles = Array.from(items).filter((f) =>
        f.type.startsWith("image/"),
      );
      if (imageFiles.length > 0) {
        handleFiles(imageFiles);
      }
    }

    document.addEventListener("paste", handlePaste);
    return () => document.removeEventListener("paste", handlePaste);
  }, [disabled, handleFiles]);

  // --- Trigger the hidden file input ---
  const triggerFileSelect = useCallback(() => {
    inputRef.current?.click();
  }, []);

  // --- Check if any file is actively processing ---
  const isProcessing = trackedFiles.some((f) => f.status === "processing");

  return (
    <div className="w-full space-y-3">
      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        multiple
        className="hidden"
        onChange={handleInputChange}
        disabled={disabled}
      />

      {/* Drop zone */}
      <button
        type="button"
        onClick={triggerFileSelect}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        disabled={disabled}
        className={cn(
          "flex w-full cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed px-6 py-8 text-center transition-colors",
          isDragOver
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-primary/40 hover:bg-accent/50",
          disabled && "cursor-not-allowed opacity-50",
        )}
      >
        {isProcessing ? (
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        ) : (
          <ImagePlus className="h-8 w-8 text-muted-foreground" />
        )}
        <span className="text-sm font-medium text-foreground">
          {isDragOver
            ? "Drop screenshots here"
            : "Upload screenshots"}
        </span>
        <span className="text-xs text-muted-foreground">
          Drop, paste, or click &middot; PNG, JPEG, WebP &middot; max 8 MB
        </span>
      </button>

      {/* Per-file status cards */}
      {trackedFiles.length > 0 && (
        <div className="grid gap-2 sm:grid-cols-2">
          {trackedFiles.map((tracked) => (
            <div
              key={tracked.trackingId}
              className={cn(
                "relative flex items-center gap-3 rounded-lg border px-3 py-2.5",
                tracked.status === "processing" && "border-primary/20 bg-primary/[0.03]",
                tracked.status === "success" && "border-green-200 bg-green-50/50 dark:border-green-900 dark:bg-green-950/20",
                tracked.status === "error" && "border-red-200 bg-red-50/50 dark:border-red-900 dark:bg-red-950/20",
                tracked.status === "idle" && "border-muted",
              )}
            >
              {/* Thumbnail preview */}
              {tracked.previewUrl && (
                <img
                  src={tracked.previewUrl}
                  alt=""
                  className="h-10 w-10 shrink-0 rounded object-cover"
                />
              )}

              {/* Content */}
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-foreground">
                  {tracked.filename}
                </p>

                {tracked.status === "processing" && (
                  <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Analyzing&hellip;
                  </p>
                )}

                {tracked.status === "success" && (
                  <p className="flex items-center gap-1 text-[11px] text-green-700 dark:text-green-400">
                    <CheckCircle className="h-3 w-3" />
                    Captured
                  </p>
                )}

                {tracked.status === "error" && (
                  <div>
                    <p className="flex items-center gap-1 text-[11px] text-red-700 dark:text-red-400">
                      <AlertCircle className="h-3 w-3" />
                      {tracked.errorMessage}
                    </p>
                    {onFallback && (
                      <button
                        type="button"
                        onClick={() => {
                          onFallback(tracked.filename);
                          dismissTracked(tracked.trackingId);
                        }}
                        className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
                      >
                        <PenLine className="h-3 w-3" />
                        Add manually instead
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Dismiss button (for completed/errored files) */}
              {(tracked.status === "success" || tracked.status === "error") && (
                <button
                  type="button"
                  onClick={() => dismissTracked(tracked.trackingId)}
                  className="shrink-0 rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                  aria-label={`Dismiss ${tracked.filename}`}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
