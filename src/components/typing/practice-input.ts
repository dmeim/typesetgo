import { MAX_CONNECT_TEXT_LENGTH } from "@/lib/practice-limits";
import type { SettingsState } from "@/lib/typing-constants";
import { hasCompletedPrompt } from "../../../convex/lib/soloCompletion";
export { hasCompletedPrompt };

export function sanitizeTypingInput(value: string): string {
  return value.replace(/\s/g, " ").replace(/ {2,}/g, " ").replace(/^ /, "");
}

export function getInputPosition(typedText: string, targetText: string) {
  const typedWords = typedText.split(" ");
  const targetWords = targetText.split(" ");
  const wordIndex = typedWords.length - 1;
  const typedWord = typedWords[wordIndex];
  const targetWord = targetWords[wordIndex] ?? "";
  const referenceOffset = targetWords.slice(0, wordIndex).reduce((sum, word) => sum + word.length + 1, 0);
  return { wordIndex, typedWord, targetWord, referenceOffset,
    referencePosition: Math.min(targetText.length, referenceOffset + Math.min(typedWord.length, targetWord.length)),
  };
}

export function getNextTypingKey(typedText: string, targetText: string, strict = false): string | null {
  if (!targetText) return null;
  if (strict) return targetText.startsWith(typedText) ? targetText[typedText.length] ?? null : "Backspace";
  const { wordIndex, typedWord, targetWord } = getInputPosition(typedText, targetText);
  if (wordIndex >= targetText.split(" ").length) return null;
  if (!targetWord.startsWith(typedWord)) return "Backspace";
  return targetWord[typedWord.length] ?? " ";
}

/** Letters typed past the last correct one in the current word: how many deletes fix it. */
export function getWrongLetterCount(typedText: string, targetText: string, strict = false): number {
  if (!targetText || getNextTypingKey(typedText, targetText, strict) !== "Backspace") return 0;
  const { typedWord, targetWord } = strict ? { typedWord: typedText, targetWord: targetText } : getInputPosition(typedText, targetText);
  let common = 0;
  while (common < typedWord.length && typedWord[common] === targetWord[common]) common++;
  return typedWord.length - common;
}

/** Words finished with a space that exactly match the target; the word still being typed doesn't count yet. */
export function countCorrectWords(typedText: string, targetText: string): number {
  const typed = typedText.split(" ");
  const target = targetText.split(" ");
  let count = 0;
  for (let index = 0; index < typed.length - 1; index++) if (typed[index] === target[index]) count++;
  return count;
}

/** Words finished with a space; the word still being typed doesn't count yet. */
export function countTypedWords(typedText: string): number {
  const trimmed = typedText.trim();
  if (trimmed === "") return 0;
  const typedWords = trimmed.split(/\s+/).length;
  return typedText.endsWith(" ") ? typedWords : typedWords - 1;
}

/** The count a test reports: a last word that completes the prompt counts without its space. */
export function countReportedWords(typedText: string, targetText: string): number {
  return countTypedWords(typedText) + (hasCompletedPrompt(typedText, targetText) && !typedText.endsWith(" ") && typedText.trim() ? 1 : 0);
}

const SNAPSHOT_WORDS_BACK = 50;
const SNAPSHOT_WORDS_AHEAD = 100;
// Longer than any real word, so a held-down key can't push a snapshot past the server's limit.
const SNAPSHOT_MAX_WORD_LENGTH = 200;

/** Only the words around the caret, with typed and target words still lined up. */
export function rollingSnapshot(typedText: string, targetText: string, wordsAhead = SNAPSHOT_WORDS_AHEAD) {
  const typed = typedText.split(" ");
  const start = Math.max(0, typed.length - 1 - SNAPSHOT_WORDS_BACK);
  return {
    typedText: typed.slice(start).map((word) => word.slice(0, SNAPSHOT_MAX_WORD_LENGTH)).join(" "),
    targetText: targetText.split(" ").slice(start, typed.length + wordsAhead).join(" "),
  };
}

/**
 * The whole text while the server can hold it, so ordinary tests restore exactly, then a rolling snapshot.
 * A prompt that can't grow more words after a refresh keeps every word ahead, or it would end early.
 */
export function connectSnapshot(typedText: string, targetText: string, promptGrows: boolean) {
  if (typedText.length <= MAX_CONNECT_TEXT_LENGTH && targetText.length <= MAX_CONNECT_TEXT_LENGTH) return { typedText, targetText };
  return rollingSnapshot(typedText, targetText, promptGrows ? SNAPSHOT_WORDS_AHEAD : Infinity);
}

export type SnapshotCarry = { words: number; characters: number; correct: number };
const NO_CARRY: SnapshotCarry = { words: 0, characters: 0, correct: 0 };

/** What a saved rolling snapshot left out, worked out from the stats saved with it. */
export function snapshotCarry(
  saved: { typedText: string; targetText: string; elapsedMs: number; wordsTyped?: number; wpm?: number; accuracy?: number } | undefined,
  isGoal: boolean,
): SnapshotCarry {
  if (saved?.wordsTyped === undefined) return NO_CARRY;
  const words = saved.wordsTyped - (isGoal ? countCorrectWords : countReportedWords)(saved.typedText, saved.targetText);
  // Whole text came back: it's exact, so the rounded stats mustn't nudge it. A word goal's text is always cut down.
  if (!isGoal && words <= 0) return NO_CARRY;
  const characters = Math.max(0, Math.round((saved.wpm ?? 0) * 5 * saved.elapsedMs / 60000) - saved.typedText.length);
  const correct = Math.round((saved.accuracy ?? 100) / 100 * (characters + saved.typedText.length)) - computeStats(saved.typedText, saved.targetText).correct;
  return { words: Math.max(0, words), characters, correct: Math.max(0, Math.min(characters, correct)) };
}

export function isTimedPractice(settings: Pick<SettingsState, "mode" | "presetModeType">): boolean {
  return settings.mode === "time" || (settings.mode === "preset" && settings.presetModeType === "time");
}

/** Typing practice supports append/backspace editing. Native selection must match its painted caret. */
export function placeCaretAtEnd(input: HTMLInputElement): void {
  const end = input.value.length;
  if (input.selectionStart !== end || input.selectionEnd !== end) input.setSelectionRange(end, end);
}

export function constrainEditingKey(event: React.KeyboardEvent<HTMLInputElement>): void {
  if (event.nativeEvent.isComposing) return;
  if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].includes(event.key) ||
      ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "a")) {
    event.preventDefault();
    placeCaretAtEnd(event.currentTarget);
  }
}

// Stats computation
export const computeStats = (typed: string, reference: string) => {
  const typedWords = typed.split(" ");
  const referenceWords = reference.split(" ");

  let correct = 0;
  let incorrect = 0;
  let missed = 0;
  let extra = 0;

  for (let i = 0; i < typedWords.length; i++) {
    const typedWord = typedWords[i];
    const refWord = referenceWords[i] || "";
    const isCurrentWord = i === typedWords.length - 1;

    if (isCurrentWord) {
      for (let j = 0; j < typedWord.length; j++) {
        if (j < refWord.length) {
          if (typedWord[j] === refWord[j]) {
            correct++;
          } else {
            incorrect++;
          }
        } else {
          extra++;
        }
      }
    } else {
      for (let j = 0; j < refWord.length; j++) {
        if (j < typedWord.length) {
          if (typedWord[j] === refWord[j]) {
            correct++;
          } else {
            incorrect++;
          }
        } else {
          missed++;
        }
      }

      if (typedWord.length > refWord.length) {
        extra += typedWord.length - refWord.length;
      }
    }

    if (i < typedWords.length - 1) {
      const refHasNextWord = i < referenceWords.length - 1;
      if (refHasNextWord) {
        if (typedWord.length >= refWord.length) {
          correct++;
        } else {
          incorrect++;
        }
      } else {
        const isSingleTrailingSpace =
          i === typedWords.length - 2 && typedWords[i + 1] === "";
        if (isSingleTrailingSpace) {
          correct++;
        } else {
          extra++;
        }
      }
    }
  }

  return { correct, incorrect, missed, extra };
};

/** Stats for the whole attempt. Carried characters have no letter-by-letter detail, so any that weren't correct count as wrong. */
export const computeCarriedStats = (typed: string, reference: string, carry: SnapshotCarry) => {
  const stats = computeStats(typed, reference);
  return { ...stats, correct: stats.correct + carry.correct, incorrect: stats.incorrect + carry.characters - carry.correct };
};

// Word-level results computation
export const computeWordResults = (typed: string, reference: string) => {
  const typedWords = typed.trim().split(" ").filter(w => w.length > 0);
  const referenceWords = reference.split(" ");

  const correctWords: string[] = [];
  const incorrectWords: { typed: string; expected: string }[] = [];

  for (let i = 0; i < typedWords.length; i++) {
    const typedWord = typedWords[i];
    const refWord = referenceWords[i] || "";

    if (typedWord === refWord) {
      correctWords.push(typedWord);
    } else if (refWord) {
      incorrectWords.push({ typed: typedWord, expected: refWord });
    }
  }

  return { correctWords, incorrectWords };
};
