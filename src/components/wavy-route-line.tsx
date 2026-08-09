import { useEffect, useRef, useState } from "react";

interface WavyRouteLineProps {
  className?: string;
  color?: string;
  height?: number;
  /** How long the draw animation takes in seconds */
  duration?: number;
  /** Delay before animation starts (seconds) */
  delay?: number;
}

/**
 * Vertical wavy route line that draws itself on like a Disney Channel wand.
 * Dotted, slow, and only starts when scrolled into view.
 */
export function WavyRouteLine({
  className = "",
  color = "currentColor",
  height = 192,
  duration = 3,
  delay = 0.3,
}: WavyRouteLineProps) {
  const w = 24;
  const mid = w / 2;
  const amplitude = w * 0.35;
  const segment = height / 4;

  const path = [
    `M${mid} 0`,
    `C${mid + amplitude} ${segment * 0.35}, ${mid + amplitude} ${segment * 0.65}, ${mid} ${segment}`,
    `C${mid - amplitude} ${segment * 1.35}, ${mid - amplitude} ${segment * 1.65}, ${mid} ${segment * 2}`,
    `C${mid + amplitude} ${segment * 2.35}, ${mid + amplitude} ${segment * 2.65}, ${mid} ${segment * 3}`,
    `C${mid - amplitude} ${segment * 3.35}, ${mid - amplitude} ${segment * 3.65}, ${mid} ${segment * 4}`,
  ].join(" ");

  const pathRef = useRef<SVGPathElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [length, setLength] = useState(0);
  const [drawing, setDrawing] = useState(false);

  // Measure the path length once mounted
  useEffect(() => {
    if (pathRef.current) {
      setLength(pathRef.current.getTotalLength());
    }
  }, [height]);

  // Trigger draw when scrolled into view
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setDrawing(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Dotted pattern: 4px dash, 10px gap
  // To animate a dotted line being "drawn", we overlay two paths:
  // 1. The dotted path (always visible once drawn)
  // 2. A mask path that reveals it progressively using a solid stroke clip

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${w} ${height}`}
      width={w}
      height={height}
      fill="none"
      className={className}
      aria-hidden="true"
      style={{ opacity: drawing ? 1 : 0, transition: "opacity 0.3s ease" }}
    >
      <defs>
        {/* Clip path that reveals progressively — solid stroke draw-on */}
        <mask id={`draw-mask-${height}`}>
          <path
            d={path}
            stroke="white"
            strokeWidth="20"
            strokeLinecap="round"
            fill="none"
            style={{
              strokeDasharray: length || 1000,
              strokeDashoffset: drawing ? 0 : length || 1000,
              transition: drawing
                ? `stroke-dashoffset ${duration}s cubic-bezier(0.25, 0.1, 0.25, 1) ${delay}s`
                : "none",
            }}
          />
        </mask>
      </defs>

      {/* The dotted line, revealed by the mask animating */}
      <path
        ref={pathRef}
        d={path}
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeDasharray="3 9"
        fill="none"
        mask={`url(#draw-mask-${height})`}
      />
    </svg>
  );
}
