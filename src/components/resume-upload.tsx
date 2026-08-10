import { useCallback, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Upload, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { validateResumeFile, type ParsedResumeData } from "@/lib/resume-validation";
import { parseResume } from "@/lib/parseResume.functions";
import { cn } from "@/lib/utils";

type UploadStatus = "idle" | "uploading" | "processing" | "success" | "error";

interface ResumeUploadProps {
  onParsed: (data: ParsedResumeData) => void;
  onStatusChange?: (isParsing: boolean) => void;
  disabled?: boolean;
}

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      // Strip the data:...;base64, prefix
      resolve(dataUrl.split(",")[1]);
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

export function ResumeUpload({ onParsed, onStatusChange, disabled }: ResumeUploadProps) {
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [fileName, setFileName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const callParseResume = useServerFn(parseResume);

  const handleFileSelected = useCallback(
    async (file: File) => {
      setErrorMessage("");

      // 1. Validate
      const validation = validateResumeFile(file);
      if (!validation.valid) {
        setErrorMessage(validation.message);
        setStatus("error");
        return;
      }

      // 2. Read as base64
      setStatus("uploading");
      onStatusChange?.(true);
      setFileName(file.name);

      let base64: string;
      try {
        base64 = await readFileAsBase64(file);
      } catch {
        setErrorMessage("Failed to read file. Please try again.");
        setStatus("error");
        return;
      }

      // 3. Call server function
      setStatus("processing");
      try {
        const result = await callParseResume({
          data: { fileBase64: base64, filename: file.name },
        });

        // 4. Handle result
        if (result && "error" in result && result.error) {
          setErrorMessage((result as { error: true; message: string }).message);
          setStatus("error");
          onStatusChange?.(false);
          return;
        }

        onParsed(result as ParsedResumeData);
        setStatus("success");
        onStatusChange?.(false);
      } catch {
        setErrorMessage(
          "Could not upload your resume. Please check your connection and try again.",
        );
        setStatus("error");
        onStatusChange?.(false);
      }
    },
    [callParseResume, onParsed],
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleFileSelected(file);
      }
      // Reset input so the same file can be re-selected
      e.target.value = "";
    },
    [handleFileSelected],
  );

  const reset = useCallback(() => {
    setStatus("idle");
    setErrorMessage("");
    setFileName("");
  }, []);

  const triggerFileSelect = useCallback(() => {
    inputRef.current?.click();
  }, []);

  return (
    <div className="w-full">
      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        accept=".pdf"
        className="hidden"
        onChange={handleInputChange}
        disabled={disabled || status === "uploading" || status === "processing"}
      />

      {/* Idle state */}
      {status === "idle" && (
        <button
          type="button"
          onClick={triggerFileSelect}
          disabled={disabled}
          className={cn(
            "flex w-full cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-muted-foreground/25 px-6 py-8 text-center transition-colors hover:border-primary/40 hover:bg-accent/50",
            disabled && "cursor-not-allowed opacity-50",
          )}
        >
          <Upload className="h-8 w-8 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">Upload your resume</span>
          <span className="text-xs text-muted-foreground">PDF &middot; max 5 MB</span>
        </button>
      )}

      {/* Uploading state */}
      {status === "uploading" && (
        <div className="flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed border-primary/30 bg-accent/30 px-6 py-8 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="text-sm font-medium text-foreground">Uploading resume&hellip;</span>
          <button
            type="button"
            onClick={() => { reset(); onStatusChange?.(false); }}
            className="mt-1 text-xs font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Processing state */}
      {status === "processing" && (
        <div className="flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed border-primary/30 bg-accent/30 px-6 py-8 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="text-sm font-medium text-foreground">Analyzing your resume&hellip;</span>
          <button
            type="button"
            onClick={() => { reset(); onStatusChange?.(false); }}
            className="mt-1 text-xs font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Success state */}
      {status === "success" && (
        <div className="flex w-full flex-col items-center gap-2 rounded-xl border-2 border-solid border-green-200 bg-green-50/50 px-6 py-6 text-center dark:border-green-900 dark:bg-green-950/20">
          <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
          <span className="text-sm font-medium text-foreground">
            Resume analyzed — fields updated below
          </span>
          <span className="text-xs text-muted-foreground">{fileName}</span>
          <button
            type="button"
            onClick={reset}
            className="mt-1 text-xs font-medium text-primary underline-offset-2 hover:underline"
          >
            Upload different file
          </button>
        </div>
      )}

      {/* Error state */}
      {status === "error" && (
        <div className="flex w-full flex-col items-center gap-2 rounded-xl border-2 border-solid border-red-200 bg-red-50/50 px-6 py-6 text-center dark:border-red-900 dark:bg-red-950/20">
          <AlertCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
          <span className="text-sm font-medium text-foreground">{errorMessage}</span>
          <button
            type="button"
            onClick={reset}
            className="mt-1 text-xs font-medium text-primary underline-offset-2 hover:underline"
          >
            Try again
          </button>
        </div>
      )}
    </div>
  );
}
