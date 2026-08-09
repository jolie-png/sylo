import { useEffect, useState } from "react";

const PHRASES = [
  "to becoming a physician-scientist.",
  "to becoming a software engineer.",
  "to becoming a product manager.",
  "even without an insider network.",
];

const TYPE_MS = 45;
const DELETE_MS = 25;
const HOLD_MS = 1400;
const GAP_MS = 300;

export function TypingHero() {
  const [index, setIndex] = useState(0);
  const [text, setText] = useState("");
  const [phase, setPhase] = useState<"typing" | "holding" | "deleting" | "gap">("typing");

  useEffect(() => {
    const phrase = PHRASES[index]!;

    if (phase === "typing") {
      if (text.length < phrase.length) {
        const t = setTimeout(() => setText(phrase.slice(0, text.length + 1)), TYPE_MS);
        return () => clearTimeout(t);
      }
      const t = setTimeout(() => setPhase("holding"), 0);
      return () => clearTimeout(t);
    }

    if (phase === "holding") {
      const t = setTimeout(() => setPhase("deleting"), HOLD_MS);
      return () => clearTimeout(t);
    }

    if (phase === "deleting") {
      if (text.length > 0) {
        const t = setTimeout(() => setText(phrase.slice(0, text.length - 1)), DELETE_MS);
        return () => clearTimeout(t);
      }
      const t = setTimeout(() => setPhase("gap"), 0);
      return () => clearTimeout(t);
    }

    const t = setTimeout(() => {
      setIndex((i) => (i + 1) % PHRASES.length);
      setPhase("typing");
    }, GAP_MS);
    return () => clearTimeout(t);
  }, [text, phase, index]);

  return (
    <h1 className="mx-auto flex h-[3.3em] max-w-3xl items-start justify-center text-[40px] font-bold leading-[1.02] tracking-[-0.04em] sm:text-[56px]">
      <span className="block">
      The map for every student&apos;s path{" "}
      <span className="text-primary">
        {text}
        <span
          aria-hidden="true"
          className="ml-0.5 inline-block h-[0.8em] w-[2px] translate-y-[0.06em] rounded-full bg-primary/50 align-baseline animate-[pulse_1s_steps(2,start)_infinite]"
        />
      </span>
        <span className="sr-only">to becoming a physician-scientist, even without an insider network.</span>
      </span>
    </h1>
  );
}

export default TypingHero;
