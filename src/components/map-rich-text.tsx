import { type ReactNode } from "react";
import { ProgramLinkedText } from "@/components/program-linker";

// Matches a Markdown-style inline link: [visible label](https://url)
// Only http/https URLs are accepted, so a stray "[a](b)" won't become a link.
const MD_LINK = /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g;

/**
 * Renders success-map text that may contain author-authored inline links written
 * as Markdown — `[label](https://url)`. Those become clickable anchors on the
 * exact words the author chose. Any text outside a link still runs through
 * ProgramLinkedText, so recognized program names keep auto-linking too.
 */
export function MapRichText({ text }: { text: string }) {
  if (!text) return null;

  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  let key = 0;
  let match: RegExpExecArray | null;
  MD_LINK.lastIndex = 0;

  while ((match = MD_LINK.exec(text)) !== null) {
    const [full, label, url] = match;
    if (match.index > lastIndex) {
      nodes.push(<ProgramLinkedText key={`t${key++}`} text={text.slice(lastIndex, match.index)} />);
    }
    nodes.push(
      <a
        key={`l${key++}`}
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className="font-medium text-primary underline decoration-primary/40 underline-offset-2 hover:decoration-primary/70 break-words"
      >
        {label}
      </a>,
    );
    lastIndex = match.index + full.length;
  }

  if (lastIndex < text.length) {
    nodes.push(<ProgramLinkedText key={`t${key++}`} text={text.slice(lastIndex)} />);
  }

  // No markdown links found — fall back to plain program-linking.
  return <>{nodes.length ? nodes : <ProgramLinkedText text={text} />}</>;
}
