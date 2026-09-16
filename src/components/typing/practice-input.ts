import type { SettingsState } from "@/lib/typing-constants";
export { hasCompletedPrompt } from "../../../convex/lib/soloCompletion";

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
