import { readFileSync } from "fs";
import { describe, expect, it } from "vitest";

const WORD_LISTS = ["beginner", "easy", "medium", "hard", "expert"];

// Roots unambiguous enough to block anywhere inside a word, so compounds of these
// cannot slip past the exact-match filter list.
const BLOCKED_SUBSTRINGS = ["fuck", "cunt", "nigger", "faggot", "whore", "slut", "porno", "masturbat", "cocksuck", "bullshit"];

function readWords(name: string): string[] {
  return JSON.parse(readFileSync(`public/words/${name}.json`, "utf8")) as string[];
}

const filterWords = new Set(readWords("filter_words").map((word) => word.toLowerCase()));

// Mirrors the original filter script: exact matches plus simple plurals of filtered words.
function isFiltered(word: string): boolean {
  const lower = word.toLowerCase();
  if (filterWords.has(lower)) return true;
  if (lower.endsWith("ies") && filterWords.has(`${lower.slice(0, -3)}y`)) return true;
  if (lower.endsWith("es") && filterWords.has(lower.slice(0, -2))) return true;
  if (lower.endsWith("s") && filterWords.has(lower.slice(0, -1))) return true;
  return BLOCKED_SUBSTRINGS.some((root) => lower.includes(root));
}

describe("word lists", () => {
  it.each(WORD_LISTS)("%s.json contains no filtered words", (name) => {
    const flagged = readWords(name).filter(isFiltered);
    expect(flagged, `Remove these words from public/words/${name}.json`).toEqual([]);
  });
});
