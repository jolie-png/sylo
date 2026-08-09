import { useEffect, useRef, useState } from "react";

/**
 * Lightweight Intersection Observer hook.
 * Returns a ref to attach and a boolean `inView` that flips to true once
 * the element enters the viewport (and stays true — no re-triggering).
 */
export function useInView<T extends HTMLElement = HTMLDivElement>(
  options?: IntersectionObserverInit,
) {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || inView) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15, ...options },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [inView, options]);

  return { ref, inView };
}
