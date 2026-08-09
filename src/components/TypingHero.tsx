import { useEffect, useState, useRef } from "react";

const PHRASES = [
  "physician-scientist.",
  "product manager.",
  "software engineer.",
  "investment banker.",
];

const TYPE_MS = 55;
const DELETE_MS = 30;
const HOLD_MS = 2000;
const GAP_MS = 400;

export function TypingHero() {
  const [index, setIndex] = useState(0);
  const [text, setText] = useState("");
  const [phase, setPhase] = useState<"typing" | "holding" | "deleting" | "gap">("typing");
  const frameRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    const phrase = PHRASES[index]!;

    if (phase === "typing") {
      if (text.length < phrase.length) {
        frameRef.current = setTimeout(() => setText(phrase.slice(0, text.length + 1)), TYPE_MS);
      } else {
        frameRef.current = setTimeout(() => setPhase("holding"), 0);
      }
    } else if (phase === "holding") {
      frameRef.current = setTimeout(() => setPhase("deleting"), HOLD_MS);
    } else if (phase === "deleting") {
      if (text.length > 0) {
        frameRef.current = setTimeout(() => setText(text.slice(0, -1)), DELETE_MS);
      } else {
        frameRef.current = setTimeout(() => setPhase("gap"), 0);
      }
    } else {
      frameRef.current = setTimeout(() => {
        setIndex((i) => (i + 1) % PHRASES.length);
        setPhase("typing");
      }, GAP_MS);
    }

    return () => clearTimeout(frameRef.current);
  }, [text, phase, index]);

  return (
    <h1 className="mx-auto max-w-3xl text-center text-[40px] font-bold leading-[1.02] tracking-[-0.04em] sm:text-[56px]">
      The map to becoming a{" "}
      <span className="text-primary">
        {text}
        <span
          aria-hidden="true"
          className="ml-0.5 inline-block h-[0.8em] w-[2px] translate-y-[0.06em] rounded-full bg-primary/50 align-baseline animate-[pulse_1s_steps(2,start)_infinite]"
        />
      </span>
      <span className="sr-only">{PHRASES.join(", ")}</span>
    </h1>
  );
}

export default TypingHero;
