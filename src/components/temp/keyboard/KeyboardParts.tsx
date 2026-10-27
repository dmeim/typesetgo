import { cn } from "@/lib/utils";
import { TARGET } from "./keyboard-mock";

export { HintPill } from "@/components/typing/keyboard/KeyboardHint";

/** The practice line: typed letters coloured right or wrong, with a caret. */
export function TypingLine({ typed }: { typed: string }) {
  const targetWords = TARGET.split(" ");
  const typedWords = typed.split(" ");
  const current = typedWords.length - 1;
  return (
    <p aria-label={`Practice text: ${TARGET}`} className="flex flex-wrap justify-center gap-x-[0.6em] gap-y-1 text-center font-mono text-xl leading-relaxed @min-[36rem]:text-2xl">
      {targetWords.map((word, wordIndex) => {
        const attempt = typedWords[wordIndex];
        const length = Math.max(word.length, attempt?.length ?? 0);
        return (
          <span key={wordIndex} aria-hidden="true" className="relative">
            {Array.from({ length }, (_, index) => {
              const wanted = word[index];
              const got = attempt?.[index];
              const tone = got === undefined ? "text-muted-foreground/60"
                : wanted === undefined ? "text-destructive/70"
                  : got === wanted ? "text-foreground" : "text-destructive underline decoration-2 underline-offset-4";
              return (
                <span key={index} className={cn("relative", tone)}>
                  {wordIndex === current && index === (attempt?.length ?? 0) && <Caret />}
                  {wanted === undefined ? got : got !== undefined && got !== wanted ? got : wanted}
                </span>
              );
            })}
            {wordIndex === current && (attempt?.length ?? 0) >= length && <Caret end />}
          </span>
        );
      })}
    </p>
  );
}

function Caret({ end = false }: { end?: boolean }) {
  return <span className={cn("absolute top-[0.2em] h-[1.1em] w-0.5 animate-pulse rounded bg-primary", end ? "-right-0.5" : "-left-px")} />;
}
