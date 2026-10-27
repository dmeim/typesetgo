// Fake finished-test data for the /temp results demo.
import type { TimelineSample } from "@/lib/result-timeline";
import { diffWord } from "@/lib/word-diff";
import type { ResultComparison } from "@/components/typing/results/result-stats";

const PAIRS: [string, string][] = [
  ["the", "the"], ["little", "little"], ["robot", "robto"], ["found", "found"], ["a", "a"],
  ["bright", "bright"], ["green", "green"], ["leaf", "leaf"], ["near", "near"], ["the", "teh"],
  ["garden", "garden"], ["gate", "gate"], ["and", "and"], ["carried", "carried"], ["it", "it"],
  ["home", "home"], ["to", "to"], ["show", "show"], ["its", "its"], ["friends", "frends"],
  ["who", "who"], ["were", "were"], ["waiting", "waiting"], ["by", "by"], ["the", "the"],
  ["window", "windoww"], ["with", "with"], ["warm", "warm"], ["cocoa", "cocoa"], ["tonight", "tonight"],
];

const SPEEDS = [12, 31, 44, 52, 55, 57, 60, 61, 58, 54, 56, 59, 62, 63, 61, 57, 55, 58, 60, 62, 64, 63, 60, 59, 57, 58, 60, 61, 59, 58];
const ERROR_SECONDS = [5, 12, 20, 27];

export const MOCK_WORD_RESULTS = {
  correctWords: PAIRS.filter(([expected, typed]) => expected === typed).map(([word]) => word),
  incorrectWords: PAIRS.filter(([expected, typed]) => expected !== typed).map(([expected, typed]) => ({ expected, typed })),
};

export const MOCK_STATS = PAIRS.reduce((totals, [expected, typed]) => {
  for (const { status } of diffWord({ expected, typed })) totals[status] += 1;
  return totals;
}, { correct: 0, incorrect: 0, missed: 0, extra: 0 });

// Running accuracy: about five letters a second, two wrong letters per mistake.
export const MOCK_TIMELINE: TimelineSample[] = SPEEDS.map((wpm, index) => {
  const second = index + 1;
  const errors = ERROR_SECONDS.filter((errorSecond) => errorSecond <= second).length * 2;
  return { second, wpm, accuracy: Math.round(((second * 5 - errors) / (second * 5)) * 1000) / 10, errors, mistake: ERROR_SECONDS.includes(second) };
});

export const MOCK_COMPARISON: ResultComparison = { tests: 50, averageWpm: 52, bestWpm: 64, averageAccuracy: 91.3, bestAccuracy: 97 };
