import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { HINT_STYLE, TARGET, type Hint } from "./keyboard-mock";

/** A pill above the keyboard that says what to do; it keeps its height when empty so the keys never jump. */
export function HintPill({ hint, className }: { hint: Hint | null; className?: string }) {
  const style = hint ? HINT_STYLE[hint.tone] : null;
  return (
    <div role="status" className={cn("flex min-h-10 items-center justify-center", className)}>
      <AnimatePresence mode="wait" initial={false}>
        {hint && style && (
          <motion.div
            key={`${hint.tone}-${hint.title}`}
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1, x: hint.tone === "ignored" ? [0, -5, 5, -3, 0] : 0 }}
            exit={{ opacity: 0, y: -6, scale: 0.95, transition: { duration: 0.12 } }}
            transition={{ type: "spring", stiffness: 500, damping: 30, x: { duration: 0.4 } }}
            className={cn("inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm", style.pill)}
          >
            <style.Icon className="size-4 shrink-0" weight="bold" aria-hidden="true" />
            <span className="font-semibold">{hint.title}</span>
            <span className="hidden opacity-80 @min-[28rem]:inline">· {hint.detail}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

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
