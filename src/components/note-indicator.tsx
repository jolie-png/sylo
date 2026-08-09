import { StickyNote } from "lucide-react";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { LinkifyText } from "@/components/linkify-text";

type NoteIndicatorProps = {
  note: string;
};

/**
 * A compact note badge that reveals the full note text in a popover on click.
 * Designed to sit inside a Step_Card without taking up layout space.
 */
export function NoteIndicator({ note }: NoteIndicatorProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="View note"
          title="View note"
          className="inline-flex items-center justify-center rounded p-0.5 text-amber-500 hover:text-amber-600 transition-colors"
        >
          <StickyNote className="h-3.5 w-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3" side="top" align="start">
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Note
        </p>
        <p className="text-sm leading-relaxed whitespace-pre-wrap break-all">
          <LinkifyText text={note} />
        </p>
      </PopoverContent>
    </Popover>
  );
}
