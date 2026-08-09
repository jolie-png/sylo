import { Fragment } from "react";

const URL_REGEX = /(https?:\/\/[^\s]+)/g;

/**
 * Renders text with URLs auto-linked as clickable anchors.
 */
export function LinkifyText({ text, className }: { text: string; className?: string }) {
  const parts = text.split(URL_REGEX);

  return (
    <span className={className}>
      {parts.map((part, i) =>
        URL_REGEX.test(part) ? (
          <a
            key={i}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-primary underline hover:text-primary/80 break-all"
          >
            {part}
          </a>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        ),
      )}
    </span>
  );
}
