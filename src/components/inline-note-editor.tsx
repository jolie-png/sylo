import { useRef, useState, useEffect } from "react";
import { useWayfind } from "@/lib/sylo-store";

type InlineNoteEditorProps = {
  opportunityId: string;
  existingNote: string | undefined;
  existingReasoningOverride: string | undefined;
  reasoning: string; // original Sylo reasoning
  onClose: () => void;
};

export function InlineNoteEditor({
  opportunityId,
  existingNote,
  existingReasoningOverride,
  reasoning,
  onClose,
}: InlineNoteEditorProps) {
  const { setStepNote, setStepReasoning } = useWayfind();
  const [noteValue, setNoteValue] = useState(existingNote ?? "");
  const [reasoningValue, setReasoningValue] = useState(existingReasoningOverride ?? reasoning);
  const reasoningRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    reasoningRef.current?.focus();
  }, []);

  function handleSave() {
    const trimmedNote = noteValue.trim();
    setStepNote(opportunityId, trimmedNote || null);

    // Only save reasoning override if it differs from the original
    const trimmedReasoning = reasoningValue.trim();
    if (trimmedReasoning === reasoning.trim() || !trimmedReasoning) {
      setStepReasoning(opportunityId, null); // reset to original
    } else {
      setStepReasoning(opportunityId, trimmedReasoning);
    }
    onClose();
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border bg-background p-3">
      <div>
        <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Reasoning / headline
        </label>
        <input
          ref={reasoningRef}
          value={reasoningValue}
          onChange={(e) => setReasoningValue(e.target.value)}
          className="mt-1 w-full rounded-lg border bg-transparent px-3 py-2 text-sm outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
        />
        {existingReasoningOverride ? (
          <p className="mt-1 text-[11px] text-muted-foreground/50">
            Original: {reasoning}
          </p>
        ) : null}
      </div>

      <div>
        <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Your note
        </label>
        <textarea
          value={noteValue}
          onChange={(e) => setNoteValue(e.target.value)}
          placeholder="Add your note..."
          rows={3}
          className="mt-1 w-full resize-y rounded-lg border bg-transparent px-3 py-2 text-sm outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
        />
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleSave}
          className="tap rounded-full bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground"
        >
          Save
        </button>
        <button
          type="button"
          onClick={onClose}
          className="tap tap-surface rounded-full border px-4 py-1.5 text-sm font-medium"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
