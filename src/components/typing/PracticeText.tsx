import type { RefObject } from "react";
import { tv } from "@/lib/theme-vars";

interface PracticeTextProps {
  targetText: string;
  typedText: string;
  caretRef: RefObject<HTMLSpanElement | null>;
  maxWordsPerLine?: number;
  feedingTape?: boolean;
  ghostPosition?: number;
  justifyLines?: boolean;
}

export default function PracticeText({ targetText, typedText, caretRef, maxWordsPerLine = 10,
  feedingTape = false, ghostPosition, justifyLines = false }: PracticeTextProps) {
  const typedWords = typedText.split(" ");
  const currentWordIndex = typedWords.length - 1;
  const targetWords = targetText.split(" ");
  const wordStarts: number[] = [];
  for (let index = 0, offset = 0; index < targetWords.length; index++) {
    wordStarts.push(offset);
    offset += targetWords[index].length + 1;
  }
  // Inline character boxes include font ascent/descent beyond 1em. Center the
  // cursor within that box so its position follows the selected font metrics.
  const caret = (ghost = false) => (
    <span
      ref={ghost ? undefined : caretRef}
      data-typing-caret={ghost ? undefined : "true"}
      data-ghost-caret={ghost ? "true" : undefined}
      aria-hidden="true"
      className={`absolute left-0 top-1/2 h-[1em] w-0.5 -translate-y-1/2 ${ghost ? "" : "motion-safe:animate-pulse"}`}
      style={{ backgroundColor: ghost ? tv.typing.cursorGhost : tv.typing.cursor }}
    />
  );

  const renderedWords = targetWords.map((word, wordIndex) => {
    const wordStart = wordStarts[wordIndex];
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
      {!feedingTape && !justifyLines && (wordIndex + 1) % maxWordsPerLine === 0 && wordIndex < targetWords.length - 1 && <br />}
    </span>;
  });
  const terminalCaret = currentWordIndex >= targetWords.length && <span className="relative">{caret()}</span>;

  if (!justifyLines || feedingTape) return <>{renderedWords}{terminalCaret}</>;

  // A forced <br> is a paragraph-ending line for CSS justification. Give each
  // capped group its own block so full groups fill the width, while a short
  // final group keeps natural spacing. Word indices and real spaces stay intact.
  const groupSize = Number.isFinite(maxWordsPerLine) && maxWordsPerLine >= 1
    ? Math.floor(maxWordsPerLine) : targetWords.length;
  const groups = [];
  for (let start = 0; start < renderedWords.length; start += groupSize) {
    const end = Math.min(start + groupSize, renderedWords.length);
    groups.push(
      <div key={start} data-typing-line style={{ textAlignLast: end - start === groupSize ? "justify" : "start" }}>
        {renderedWords.slice(start, end)}
        {end === renderedWords.length && terminalCaret}
      </div>,
    );
  }
  return <>{groups}</>;
}
