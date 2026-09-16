import { createContext } from "react";
import type {
  ThemeColors,
  ThemeDefinition,
  ThemeMode,
  ThemeVariantDefinition,
} from "@/types/theme";

export type ThemeSelectionOptions = {
  source?: "user" | "preferences";
  /** Preferences must supply the user revision captured before loading them. */
  expectedUserSelectionRevision?: number;
};

// Context value type
export type ThemeContextValue = {
  theme: ThemeDefinition;
  themeId: string;
  themeName: string;
  variantId: string;
  variant: ThemeVariantDefinition;
  mode: ThemeMode;
  userSelectionRevision: number;
  setTheme: (id: string) => Promise<void>;
  setVariant: (variantId: string) => void;
  setThemeSelection: (selection: { themeId: string; variantId?: string; mode?: ThemeMode }, options?: ThemeSelectionOptions) => Promise<void>;
  setMode: (mode: ThemeMode) => void;
  toggleMode: () => void;
  colors: ThemeColors;
  supportsLightMode: boolean;
  isLoading: boolean;
  selectionError: string | null;
};

// Create context with undefined default (will be provided by ThemeProvider)
export const ThemeContext = createContext<ThemeContextValue | undefined>(
  undefined
);
