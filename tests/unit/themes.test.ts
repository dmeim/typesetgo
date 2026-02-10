import { describe, expect, it } from "vitest";
import { CATEGORY_CONFIG, groupThemesByCategory } from "@/lib/themes";
import type { ThemeColors, ThemeDefinition } from "@/types/theme";

const COLORS: ThemeColors = {
  bg: {
    base: "#000000",
    surface: "#111111",
    elevated: "#222222",
    overlay: "rgba(0, 0, 0, 0.5)",
  },
  text: {
    primary: "#ffffff",
    secondary: "#bbbbbb",
    muted: "rgba(187, 187, 187, 0.6)",
    inverse: "#000000",
  },
  interactive: {
    primary: {
      DEFAULT: "#3cb5ee",
      muted: "rgba(60, 181, 238, 0.3)",
      subtle: "rgba(60, 181, 238, 0.1)",
    },
    secondary: {
      DEFAULT: "#0097b2",
      muted: "rgba(0, 151, 178, 0.3)",
      subtle: "rgba(0, 151, 178, 0.1)",
    },
    accent: {
      DEFAULT: "#a855f7",
      muted: "rgba(168, 85, 247, 0.3)",
      subtle: "rgba(168, 85, 247, 0.1)",
    },
  },
  status: {
    success: {
      DEFAULT: "#22c55e",
      muted: "rgba(34, 197, 94, 0.3)",
      subtle: "rgba(34, 197, 94, 0.1)",
    },
    error: {
      DEFAULT: "#ef4444",
      muted: "rgba(239, 68, 68, 0.3)",
      subtle: "rgba(239, 68, 68, 0.1)",
    },
    warning: {
      DEFAULT: "#f59e0b",
      muted: "rgba(245, 158, 11, 0.3)",
      subtle: "rgba(245, 158, 11, 0.1)",
    },
  },
  border: {
    default: "rgba(75, 85, 99, 0.3)",
    subtle: "rgba(75, 85, 99, 0.15)",
    focus: "#3cb5ee",
  },
  typing: {
    cursor: "#3cb5ee",
    cursorGhost: "#a855f7",
    correct: "#d1d5db",
    incorrect: "#ef4444",
    upcoming: "#4b5563",
    default: "#4b5563",
  },
};

const createTheme = (id: string, category: ThemeDefinition["category"]): ThemeDefinition => ({
  id,
  name: id,
  category,
  dark: COLORS,
  light: null,
});

describe("theme categories", () => {
  it("includes new categories in CATEGORY_CONFIG", () => {
    expect(CATEGORY_CONFIG.books.displayName).toBe("Books");
    expect(CATEGORY_CONFIG.mythology.displayName).toBe("Mythology");
    expect(CATEGORY_CONFIG.cities.displayName).toBe("Cities");
    expect(CATEGORY_CONFIG.subject.displayName).toBe("School Subjects");
  });

  it("groups themes by new categories in configured order", () => {
    const themes: ThemeDefinition[] = [
      createTheme("zeta", "gaming"),
      createTheme("beta", "books"),
      createTheme("alpha", "books"),
      createTheme("gamma", "subject"),
      createTheme("delta", "cities"),
      createTheme("omega", "mythology"),
    ];

    const groups = groupThemesByCategory(themes);
    expect(groups.map((g) => g.category)).toEqual([
      "books",
      "mythology",
      "cities",
      "subject",
      "gaming",
    ]);
    expect(groups.find((g) => g.category === "books")?.themes.map((t) => t.name)).toEqual([
      "alpha",
      "beta",
    ]);
  });

  it("falls back unknown runtime category to default", () => {
    const malformedTheme = {
      ...createTheme("malformed", "books"),
      category: "unknown-category",
    } as ThemeDefinition;

    const groups = groupThemesByCategory([malformedTheme]);
    expect(groups).toHaveLength(1);
    expect(groups[0].category).toBe("default");
    expect(groups[0].themes[0].id).toBe("malformed");
  });
});
