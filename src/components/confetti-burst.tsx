import { useCallback, useRef } from "react";

/**
 * Lightweight confetti burst — purely CSS-driven, no dependencies.
 * Returns a trigger function and a portal element to mount anywhere.
 */
export function useConfettiBurst() {
  const containerRef = useRef<HTMLDivElement | null>(null);

  const burst = useCallback((origin?: { x: number; y: number }) => {
    const container = containerRef.current;
    if (!container) return;

    const colors = ["#22c55e", "#3b82f6", "#f59e0b", "#ec4899", "#8b5cf6"];
    const particleCount = 18;

    for (let i = 0; i < particleCount; i++) {
      const particle = document.createElement("div");
      const color = colors[i % colors.length];
      const angle = (360 / particleCount) * i + (Math.random() * 20 - 10);
      const velocity = 40 + Math.random() * 40;
      const size = 4 + Math.random() * 4;

      const rad = (angle * Math.PI) / 180;
      const dx = Math.cos(rad) * velocity;
      const dy = Math.sin(rad) * velocity;

      Object.assign(particle.style, {
        position: "absolute",
        left: `${origin?.x ?? 50}%`,
        top: `${origin?.y ?? 50}%`,
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: Math.random() > 0.5 ? "50%" : "1px",
        backgroundColor: color,
        pointerEvents: "none",
        transform: "translate(-50%, -50%) scale(1)",
        opacity: "1",
        transition: "none",
      });

      container.appendChild(particle);

      // Force reflow
      particle.getBoundingClientRect();

      Object.assign(particle.style, {
        transition: "all 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
        transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(0)`,
        opacity: "0",
      });

      setTimeout(() => particle.remove(), 700);
    }
  }, []);

  const ConfettiContainer = (
    <div
      ref={containerRef}
      className="pointer-events-none fixed inset-0 z-[9999] overflow-hidden"
      aria-hidden="true"
    />
  );

  return { burst, ConfettiContainer };
}
