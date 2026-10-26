// Fake finished-test data for /temp results mockups.
export interface WordAttempt {
  expected: string;
  typed: string;
}

export type CharStatus = "correct" | "incorrect" | "missed" | "extra";

export interface CharResult {
  char: string;
  status: CharStatus;
}

const PAIRS: [string, string][] = [
  ["the", "the"], ["little", "little"], ["robot", "robto"], ["found", "found"], ["a", "a"],
  ["bright", "bright"], ["green", "green"], ["leaf", "leaf"], ["near", "near"], ["the", "teh"],
  ["garden", "garden"], ["gate", "gate"], ["and", "and"], ["carried", "carried"], ["it", "it"],
  ["home", "home"], ["to", "to"], ["show", "show"], ["its", "its"], ["friends", "frends"],
  ["who", "who"], ["were", "were"], ["waiting", "waiting"], ["by", "by"], ["the", "the"],
  ["window", "windoww"], ["with", "with"], ["warm", "warm"], ["cocoa", "cocoa"], ["tonight", "tonight"],
];

export const MOCK_WORDS: WordAttempt[] = PAIRS.map(([expected, typed]) => ({ expected, typed }));

export const MOCK_SUMMARY = {
  wpm: 58,
  rawWpm: 62,
  accuracy: 94,
  durationSeconds: 30,
  mode: "time",
  settingsLabel: "time · 30s · beginner",
  personalBest: 64,
  recentAverage: 52,
};

// Per-second speed and errors are not tracked today; mockups that use them would need new data.
export const MOCK_HISTORY = [12, 31, 44, 52, 55, 57, 60, 61, 58, 54, 56, 59, 62, 63, 61, 57, 55, 58, 60, 62, 64, 63, 60, 59, 57, 58, 60, 61, 59, 58];
export const MOCK_ERROR_SECONDS = [4, 11, 19, 26];
// Running accuracy: about five letters a second, two wrong letters per mistake.
export const MOCK_ACCURACY_HISTORY = MOCK_HISTORY.map((_, second) => {
  const typed = (second + 1) * 5;
  const mistakes = MOCK_ERROR_SECONDS.filter((errorSecond) => errorSecond <= second).length;
  return Math.round(((typed - mistakes * 2) / typed) * 1000) / 10;
});

export function isCorrect(word: WordAttempt) {
  return word.expected === word.typed;
}

/** Letter-by-letter alignment (edit distance), so one skipped letter reads as missed instead of shifting the rest. */
export function diffWord({ expected, typed }: WordAttempt): CharResult[] {
  const cost = Array.from({ length: expected.length + 1 }, (_, i) =>
    Array.from({ length: typed.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)));
  for (let i = 1; i <= expected.length; i++) {
    for (let j = 1; j <= typed.length; j++) {
      const swap = cost[i - 1][j - 1] + (expected[i - 1] === typed[j - 1] ? 0 : 1);
      cost[i][j] = Math.min(swap, cost[i - 1][j] + 1, cost[i][j - 1] + 1);
    }
  }
  const result: CharResult[] = [];
  let i = expected.length;
  let j = typed.length;
  while (i > 0 || j > 0) {
    // On ties, surplus letters are marked at the end of the word rather than the middle.
    const extraFirst = j > i && cost[i][j] === cost[i][j - 1] + 1;
    const missedFirst = i > j && cost[i][j] === cost[i - 1][j] + 1;
    if (!extraFirst && !missedFirst && i > 0 && j > 0 && cost[i][j] === cost[i - 1][j - 1] + (expected[i - 1] === typed[j - 1] ? 0 : 1)) {
      result.unshift({ char: typed[j - 1], status: expected[i - 1] === typed[j - 1] ? "correct" : "incorrect" });
      i--; j--;
    } else if (!extraFirst && i > 0 && cost[i][j] === cost[i - 1][j] + 1) {
      result.unshift({ char: expected[i - 1], status: "missed" });
      i--;
    } else {
      result.unshift({ char: typed[j - 1], status: "extra" });
      j--;
    }
  }
  return result;
}

export function countCharacters(words: WordAttempt[]) {
  const totals = { correct: 0, incorrect: 0, missed: 0, extra: 0 };
  for (const word of words) {
    for (const { status } of diffWord(word)) totals[status] += 1;
  }
  return totals;
}

export const MOCK_CORRECT = MOCK_WORDS.filter(isCorrect);
export const MOCK_MISTAKES = MOCK_WORDS.filter((word) => !isCorrect(word));
export const MOCK_CHARACTERS = countCharacters(MOCK_WORDS);
