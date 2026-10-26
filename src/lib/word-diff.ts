export type CharStatus = "correct" | "incorrect" | "missed" | "extra";

export interface CharResult {
  char: string;
  status: CharStatus;
}

/** Letter-by-letter alignment (edit distance), so one skipped letter reads as missed instead of shifting the rest. */
export function diffWord({ expected, typed }: { expected: string; typed: string }): CharResult[] {
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
