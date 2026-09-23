import { memo, useMemo, type RefObject } from "react";
import { tv } from "@/lib/theme-vars";

interface PracticeTextProps {
  targetText: string;
  typedText: string;
  caretRef: RefObject<HTMLSpanElement | null>;
  maxWordsPerLine?: number;
  feedingTape?: boolean;
  ghostPosition?: number;
  justifyLines?: boolean;
  maxVisibleWords?: number;
}

function Caret({ caretRef, ghost = false }: { caretRef: RefObject<HTMLSpanElement | null>; ghost?: boolean }) {
  // Center within the font's inline box, which includes ascent/descent beyond 1em.
  return <span ref={ghost ? undefined : caretRef} data-typing-caret={ghost ? undefined : "true"}
    data-ghost-caret={ghost ? "true" : undefined} aria-hidden="true"
    className={`absolute left-0 top-1/2 h-[1em] w-0.5 -translate-y-1/2 ${ghost ? "" : "motion-safe:animate-pulse"}`}
    style={{ backgroundColor: ghost ? tv.typing.cursorGhost : tv.typing.cursor }} />;
}

interface WordProps {
  word: string;
  typedWord: string;
  current: boolean;
  past: boolean;
  feedingTape: boolean;
  caretRef: RefObject<HTMLSpanElement | null>;
  ghostIndex: number | undefined;
}

const PracticeWord = memo(function PracticeWord({ word, typedWord, current, past, feedingTape, caretRef, ghostIndex }: WordProps) {

  const displayed = word + ((past || current) ? typedWord.slice(word.length) : "");
  return (
    <span data-typing-word className="relative inline-block align-top"
      style={{ maxWidth: feedingTape ? undefined : "100%", overflowWrap: feedingTape ? undefined : "anywhere",
        opacity: feedingTape && past ? 0.4 : 1 }}>
      {displayed.split("").map((char, index) => {
        const typed = typedWord[index];
        const active = current && index === typedWord.length;
        const color = index >= word.length || (typed !== undefined && typed !== char) || (past && typed === undefined)
          ? tv.typing.incorrect : typed !== undefined ? tv.typing.correct : active ? tv.typing.upcoming : tv.typing.default;
        return <span key={index} className="relative" style={{ color }}>
          {active && <Caret caretRef={caretRef} />}
          {ghostIndex === index && index < word.length && <Caret caretRef={caretRef} ghost />}
          {char}
        </span>;
      })}
      {current && typedWord.length >= word.length && <span className="relative"><Caret caretRef={caretRef} /></span>}
      {ghostIndex === word.length && <span className="relative"><Caret caretRef={caretRef} ghost /></span>}
    </span>
  );
});

const PracticeText = memo(function PracticeText({ targetText, typedText, caretRef, maxWordsPerLine = 10,
  feedingTape = false, ghostPosition, justifyLines = false, maxVisibleWords }: PracticeTextProps) {
  const typedWords = typedText.split(" ");
  const currentWordIndex = typedWords.length - 1;
  const { targetWords, wordStarts } = useMemo(() => {
    const targetWords = targetText.split(" ");
    const wordStarts: number[] = [];
    for (let index = 0, offset = 0; index < targetWords.length; index++) {
      wordStarts.push(offset);
      offset += targetWords[index].length + 1;
    }
    return { targetWords, wordStarts };
  }, [targetText]);

  // Long timed prompts stay whole for scoring, while the DOM only keeps the
  // nearby lines. Align the window with forced line groups to avoid partial rows.
  const groupSize = Number.isFinite(maxWordsPerLine) && maxWordsPerLine >= 1
    ? Math.floor(maxWordsPerLine) : targetWords.length;
  const windowed = maxVisibleWords !== undefined && targetWords.length > maxVisibleWords;
  const chunkWords = groupSize * 5;
  const backWords = groupSize * 10;
  const visibleWordCount = Math.max(groupSize * Math.floor((maxVisibleWords ?? 0) / groupSize),
    backWords + chunkWords + groupSize);
  const anchoredIndex = Math.min(currentWordIndex, targetWords.length - 1);
  const windowStart = windowed
    ? Math.floor(Math.max(0, anchoredIndex - backWords) / chunkWords) * chunkWords : 0;
  const windowEnd = windowed
    ? Math.min(targetWords.length, windowStart + visibleWordCount)
    : targetWords.length;

  const renderedWords = targetWords.slice(windowStart, windowEnd).map((word, index) => {
    const wordIndex = windowStart + index;
    const wordStart = wordStarts[wordIndex];
    const typedWord = typedWords[wordIndex] ?? "";
    const current = wordIndex === currentWordIndex;
    const past = wordIndex < currentWordIndex;
    const ghostIndex = ghostPosition !== undefined && ghostPosition >= wordStart && ghostPosition <= wordStart + word.length
      ? ghostPosition - wordStart : undefined;
    return <span key={wordIndex}>
      <PracticeWord word={word} typedWord={typedWord} current={current} past={past}
        feedingTape={feedingTape} caretRef={caretRef} ghostIndex={ghostIndex} />
      {wordIndex < targetWords.length - 1 && " "}
      {!feedingTape && !justifyLines && (wordIndex + 1) % maxWordsPerLine === 0 && wordIndex < targetWords.length - 1 && <br />}
    </span>;
  });
  const terminalCaret = currentWordIndex >= targetWords.length && <span className="relative"><Caret caretRef={caretRef} /></span>;

  if (!justifyLines || feedingTape) return <>{renderedWords}{terminalCaret}</>;

  // A forced <br> is a paragraph-ending line for CSS justification. Give each
  // capped group its own block so full groups fill the width, while a short
  // final group keeps natural spacing. Word indices and real spaces stay intact.
  const groups = [];
  for (let start = 0; start < renderedWords.length; start += groupSize) {
    const end = Math.min(start + groupSize, renderedWords.length);
    groups.push(
      <div key={windowStart + start} data-typing-line style={{ textAlignLast: end - start === groupSize ? "justify" : "start" }}>
        {renderedWords.slice(start, end)}
        {end === renderedWords.length && terminalCaret}
      </div>,
    );
  }
  return <>{groups}</>;
});

export default PracticeText;
