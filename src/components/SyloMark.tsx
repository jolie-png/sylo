import { cn } from "@/lib/utils";

/**
 * Sylo logo mark — a curved path connecting a solid starting dot to a pulsing destination dot.
 * Inherits color via currentColor so it themes with design tokens.
 */
export function SyloMark({
  className,
  animated = false,
}: {
  className?: string;
  animated?: boolean;
}) {
  return (
    <svg
      viewBox="0 0 150 150"
      className={cn("h-6 w-6 text-primary", className)}
      role="img"
      aria-label="Sylo"
    >
      <path
        d="M35 45 Q105 45 95 78 Q85 111 115 111"
        fill="none"
        stroke="currentColor"
        strokeWidth="8"
        strokeLinecap="round"
      />
      <circle cx="35" cy="45" r="9" fill="currentColor" />
      {animated ? (
        <circle cx="115" cy="111" r="9" fill="currentColor" opacity="0.35">
          <animate attributeName="r" values="9;20;9" dur="1.8s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.35;0;0.35" dur="1.8s" repeatCount="indefinite" />
        </circle>
      ) : null}
      <circle cx="115" cy="111" r="9" fill="currentColor" />
    </svg>
  );
}
