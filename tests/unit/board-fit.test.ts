import { describe, expect, it } from "vitest";
import { boardHeightAt, fitCardScale, FIT_SIZE } from "@/components/connect/board/board-fit";

const board = { width: 1600, height: 900, cardHeight: 160, minCardWidth: 15, gap: 0.75 };

describe("fitCardScale", () => {
  it("picks the largest size at which every card fits", () => {
    for (const count of [1, 6, 12, 22, 36]) {
      const scale = fitCardScale({ ...board, count });
      expect(boardHeightAt(scale, { ...board, count })).toBeLessThanOrEqual(board.height);
      if (scale < FIT_SIZE.max) expect(boardHeightAt(scale + 0.02, { ...board, count })).toBeGreaterThan(board.height);
    }
  });

  it("gives fewer players bigger cards", () => {
    expect(fitCardScale({ ...board, count: 6 })).toBeGreaterThan(fitCardScale({ ...board, count: 22 }));
    expect(fitCardScale({ ...board, count: 22 })).toBeGreaterThan(fitCardScale({ ...board, count: 36 }));
  });

  it("stays within the Fit range", () => {
    expect(fitCardScale({ ...board, count: 1 })).toBe(FIT_SIZE.max);
    expect(fitCardScale({ ...board, count: 400 })).toBe(FIT_SIZE.min);
  });

  it("stacks a list in one column", () => {
    expect(boardHeightAt(1, { ...board, count: 4, cardHeight: 50, list: true })).toBe(4 * 50 + 3 * 12);
  });
});
