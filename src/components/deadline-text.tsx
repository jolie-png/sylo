/**
 * Renders a concise deadline label like
 *   "Typical deadline: Mid-January · Verify date"
 *   "Rolling admissions · Verify details"
 * The trailing "Verify …" segment becomes a subtle link when an official URL
 * exists, and stays plain muted text otherwise.
 */
export function DeadlineText({
  text,
  link,
  className,
}: {
  text?: string | null;
  link?: string | null;
  className?: string;
}) {
  if (!text) return null;

  const match = text.match(/^(.*?)\s·\s(Verify(?:\s\w+)?)\s*$/);
  if (!match) return <span className={className}>{text}</span>;

  const [, label, verify] = match;
  const isExternal = !!link && /^https?:\/\//i.test(link);

  return (
    <span className={className}>
      {label}
      {" · "}
      {isExternal ? (
        <a
          href={link!}
          target="_blank"
          rel="noreferrer"
          className="underline decoration-dotted underline-offset-2 opacity-70 transition-opacity hover:opacity-100"
          onClick={(e) => e.stopPropagation()}
        >
          {verify}
        </a>
      ) : (
        <span className="text-muted-foreground opacity-80">{verify}</span>
      )}
    </span>
  );
}
