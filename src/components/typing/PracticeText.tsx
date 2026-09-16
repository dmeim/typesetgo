import type { RefObject } from "react";
import { tv } from "@/lib/theme-vars";

interface PracticeTextProps {
  targetText: string;
  typedText: string;
  caretRef: RefObject<HTMLSpanElement | null>;
  maxWordsPerLine?: number;
  feedingTape?: boolean;
  ghostPosition?: number;
}

export default function PracticeText({ targetText, typedText, caretRef, maxWordsPerLine = 10,
  feedingTape = false, ghostPosition }: PracticeTextProps) {
  const typedWords = typedText.split(" ");
  const currentWordIndex = typedWords.length - 1;
  const targetWords = targetText.split(" ");
  let referenceOffset = 0;
  const caret = (ghost = false) => (
    <span
      ref={ghost ? undefined : caretRef}
      data-typing-caret={ghost ? undefined : "true"}
      data-ghost-caret={ghost ? "true" : undefined}
      aria-hidden="true"
      className={`absolute left-0 top-0 h-[1em] w-0.5 ${ghost ? "opacity-70" : "motion-safe:animate-pulse"}`}
      style={{ backgroundColor: ghost ? tv.typing.cursorGhost : tv.typing.cursor }}
    />
  );

  return <>{targetWords.map((word, wordIndex) => {
    const wordStart = referenceOffset;
    referenceOffset += word.length + 1;
    const typedWord = typedWords[wordIndex] ?? "";
    const current = wordIndex === currentWordIndex;
    const past = wordIndex < currentWordIndex;
    const displayed = word + ((past || current) ? typedWord.slice(word.length) : "");
    return <span key={wordIndex}>
      <span data-typing-word className="relative inline-block align-top"
        style={{ maxWidth: feedingTape ? undefined : "100%", overflowWrap: feedingTape ? undefined : "anywhere",
          opacity: feedingTape && past ? 0.4 : 1 }}>
        {displayed.split("").map((char, index) => {
          const typed = typedWord[index];
          const active = current && index === typedWord.length;
          const color = index >= word.length || (typed !== undefined && typed !== char) || (past && typed === undefined)
            ? tv.typing.incorrect : typed !== undefined ? tv.typing.correct : active ? tv.typing.upcoming : tv.typing.default;
          return <span key={index} className="relative" style={{ color }}>
            {active && caret()}
            {ghostPosition === wordStart + index && index < word.length && caret(true)}
            {char}
          </span>;
        })}
        {current && typedWord.length >= word.length && <span className="relative">{caret()}</span>}
        {ghostPosition === wordStart + word.length && <span className="relative">{caret(true)}</span>}
      </span>
      {wordIndex < targetWords.length - 1 && " "}
      {!feedingTape && (wordIndex + 1) % maxWordsPerLine === 0 && wordIndex < targetWords.length - 1 && <br />}
    </span>;
  })}
    {currentWordIndex >= targetWords.length && <span className="relative">{caret()}</span>}
  </>;
}
