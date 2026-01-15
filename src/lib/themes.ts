import type { Theme } from "@/lib/typing-constants";

export type ThemeDefinition = Theme & {
  name: string;
};

// Static theme manifest - no need for API call
export const THEME_MANIFEST: Record<string, ThemeDefinition> = {
  typesetgo: {
    name: "TypeSetGo",
    cursor: "#3cb5ee",
    defaultText: "#4b5563",
    upcomingText: "#4b5563",
    correctText: "#d1d5db",
    incorrectText: "#ef4444",
    buttonUnselected: "#3cb5ee",
    buttonSelected: "#0097b2",
    backgroundColor: "#323437",
    surfaceColor: "#2c2e31",
    ghostCursor: "#a855f7",
  },
  christmas: {
    name: "Christmas",
    cursor: "#c41e3a",
    defaultText: "#2d5a27",
    upcomingText: "#2d5a27",
    correctText: "#f5f5dc",
    incorrectText: "#8b0000",
    buttonUnselected: "#c41e3a",
    buttonSelected: "#165b33",
    backgroundColor: "#1a1a1a",
    surfaceColor: "#141414",
    ghostCursor: "#ffd700",
  },
  easter: {
    name: "Easter",
    cursor: "#ffb6c1",
    defaultText: "#98d8c8",
    upcomingText: "#98d8c8",
    correctText: "#fff5ee",
    incorrectText: "#ff6b6b",
    buttonUnselected: "#ffb6c1",
    buttonSelected: "#dda0dd",
    backgroundColor: "#2d2d44",
    surfaceColor: "#252538",
    ghostCursor: "#ffeaa7",
  },
  ocean: {
    name: "Ocean",
    cursor: "#00bcd4",
    defaultText: "#4dd0e1",
    upcomingText: "#4dd0e1",
    correctText: "#e0f7fa",
    incorrectText: "#ff5252",
    buttonUnselected: "#00bcd4",
    buttonSelected: "#0097a7",
    backgroundColor: "#1a237e",
    surfaceColor: "#151c6a",
    ghostCursor: "#64ffda",
  },
  sunset: {
    name: "Sunset",
    cursor: "#ff7043",
    defaultText: "#ffab91",
    upcomingText: "#ffab91",
    correctText: "#fff3e0",
    incorrectText: "#d32f2f",
    buttonUnselected: "#ff7043",
    buttonSelected: "#ff5722",
    backgroundColor: "#3e2723",
    surfaceColor: "#33201c",
    ghostCursor: "#ffc107",
  },
  thanksgiving: {
    name: "Thanksgiving",
    cursor: "#d2691e",
    defaultText: "#cd853f",
    upcomingText: "#cd853f",
    correctText: "#faebd7",
    incorrectText: "#8b0000",
    buttonUnselected: "#d2691e",
    buttonSelected: "#a0522d",
    backgroundColor: "#2f1810",
    surfaceColor: "#26130c",
    ghostCursor: "#daa520",
  },
};

export const THEME_LIST = Object.keys(THEME_MANIFEST);
