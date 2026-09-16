import type { Doc } from "../../../convex/_generated/dataModel";

export type ProfileTestResult = Pick<Doc<"testResults">,
  | "_id" | "wpm" | "accuracy" | "mode" | "duration" | "wordCount"
  | "difficulty" | "punctuation" | "numbers" | "capitalization"
  | "wordsCorrect" | "wordsIncorrect" | "charsMissed" | "charsExtra"
  | "isValid" | "invalidReason" | "createdAt"
>;

// The public profile query returns the latest 100 saved results, including invalid ones.
export const PROFILE_HISTORY_LIMIT = 100;

export function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

export function formatRecordedMetric(value: number | undefined): string {
  return value === undefined ? "Not recorded" : value.toLocaleString();
}

export function getTestTypeLabels(result: ProfileTestResult): string[] {
  const labels = [result.mode.charAt(0).toUpperCase() + result.mode.slice(1)];
  if (result.mode !== "quote" && result.mode !== "preset") {
    labels.push(result.difficulty.charAt(0).toUpperCase() + result.difficulty.slice(1));
  }
  if (result.mode === "time") labels.push(`${Math.round(result.duration / 1000)}s`);
  if (result.mode === "words") labels.push(`${result.wordCount} words`);
  if (result.capitalization) labels.push("caps");
  if (result.punctuation) labels.push("punctuation");
  if (result.numbers) labels.push("numbers");
  return labels;
}
