import { useEffect, useId } from "react";
import { FlagCheckeredIcon, KeyboardIcon, RobotIcon } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import type { MockRace } from "./use-mock-race";

const SIZES = { sm: "text-base leading-8", md: "text-lg leading-9 sm:text-xl sm:leading-10", lg: "text-xl leading-10 sm:text-2xl sm:leading-[3rem]" };

/** Words split with their trailing space, so lines only break between words. */
function wordsOf(passage: string) {
  const words: { text: string; start: number }[] = [];
  let start = 0;
  for (const match of passage.matchAll(/\S+\s?/g)) {
    words.push({ text: match[0], start });
    start += match[0].length;
  }
  return words;
}

/**
 * The race text you type. A transparent input covers it, so a click or tap opens the keyboard; pressing any key
 * anywhere on the page also jumps into it. Typed letters turn to the theme's correct or incorrect colours.
 */
export function RacePassage({ race, size = "md", className, dimUntilStart = true }: { race: MockRace; size?: keyof typeof SIZES; className?: string; dimUntilStart?: boolean }) {
  const hintId = useId();
  const { passage, typed, phase, inputRef } = race;
  const locked = phase !== "racing" || race.you.finishMs !== null;

  useEffect(() => {
    const jumpIn = (event: KeyboardEvent) => {
      if (locked || event.key.length !== 1 || event.metaKey || event.ctrlKey || event.altKey) return;
      const active = document.activeElement;
      if (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement || active === inputRef.current) return;
      inputRef.current?.focus({ preventScroll: true });
    };
    window.addEventListener("keydown", jumpIn);
    return () => window.removeEventListener("keydown", jumpIn);
  }, [locked, inputRef]);

  return (
    <div className={cn("relative", className)}>
      <p aria-hidden="true" className={cn("select-none font-mono tracking-wide break-words transition-opacity", SIZES[size], dimUntilStart && phase === "countdown" && "opacity-40 blur-[1px]")}>
        {wordsOf(passage).map((word) => (
          <span key={word.start} className="inline-block whitespace-pre">
            {[...word.text].map((char, offset) => {
              const index = word.start + offset;
              const typedChar = typed[index];
              const state = typedChar === undefined ? "upcoming" : typedChar === char ? "correct" : "wrong";
              const caret = index === typed.length && !locked;
              return (
                <span key={index} className={cn("relative",
                  state === "upcoming" && "text-(--theme-typing-upcoming)",
                  state === "correct" && "text-(--theme-typing-correct)",
                  state === "wrong" && "rounded-sm bg-(--theme-typing-incorrect)/15 text-(--theme-typing-incorrect)",
                  caret && "before:absolute before:-left-px before:top-[18%] before:h-[64%] before:w-0.5 before:rounded-full before:bg-(--theme-typing-cursor) before:motion-safe:animate-pulse")}>
                  {state === "wrong" && char === " " ? "·" : char}
                </span>
              );
            })}
          </span>
        ))}
      </p>
      <label className="sr-only" htmlFor={`${hintId}-input`}>Type the race text</label>
      <input id={`${hintId}-input`} ref={inputRef} value={typed} disabled={locked} aria-describedby={hintId}
        onChange={(event) => race.onInput(event.target.value)}
        onSelect={(event) => { const input = event.currentTarget; input.setSelectionRange(input.value.length, input.value.length); }}
        onPaste={(event) => event.preventDefault()}
        autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false}
        className="absolute inset-0 size-full cursor-text resize-none bg-transparent text-base text-transparent caret-transparent opacity-0 outline-none disabled:cursor-default" />
      <p id={hintId} className="sr-only">{passage}</p>
    </div>
  );
}

/** Autoplay on/off, with a hint about taking over by typing. */
export function AutoplayToggle({ race, className, compact = false }: { race: MockRace; className?: string; compact?: boolean }) {
  const finished = race.you.finishMs !== null;
  const on = race.autoPlay && !finished;
  return (
    <div className={cn("flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground", className)}>
      <button type="button" aria-pressed={race.autoPlay} disabled={race.phase === "done" || finished} onClick={() => race.setAutoPlay(!race.autoPlay)}
        className={cn("inline-flex h-8 items-center gap-1.5 rounded-full border px-3 font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-50",
          on ? "border-primary/40 bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-accent hover:text-foreground")}>
        {finished ? <FlagCheckeredIcon weight="fill" className="size-4" aria-hidden="true" /> : on ? <RobotIcon weight="fill" className="size-4" aria-hidden="true" /> : <KeyboardIcon className="size-4" aria-hidden="true" />}
        {finished ? "Finished" : on ? "Autoplay on" : "You're typing"}
      </button>
      {!compact && !finished && <span>{on ? "Start typing to take over." : "Tap the text to bring up the keyboard."}</span>}
    </div>
  );
}
