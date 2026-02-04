import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type {
  ThemeColors,
  ThemeDefinition,
  ThemeMode,
  LegacyTheme,
} from "@/types/theme";
import { toLegacyTheme } from "@/types/theme";
import { fetchTheme, fetchThemeManifest, getDefaultTheme } from "@/lib/themes";

// Storage keys
const THEME_STORAGE_KEY = "typesetgo-theme-id";
const MODE_STORAGE_KEY = "typesetgo-theme-mode";

// Context value type
export type ThemeContextValue = {
  theme: ThemeDefinition | null;
  themeId: string;
  themeName: string;
  mode: ThemeMode;
  setTheme: (id: string) => Promise<void>;
  setMode: (mode: ThemeMode) => void;
  toggleMode: () => void;
  colors: ThemeColors | null;
  /** Legacy theme format for backward compatibility during migration */
  legacyTheme: LegacyTheme | null;
  supportsLightMode: boolean;
  isLoading: boolean;
};

// Create context with undefined default (will be provided by ThemeProvider)
export const ThemeContext = createContext<ThemeContextValue | undefined>(
  undefined
);

// CSS variable mapping from ThemeColors structure
function applyThemeCSS(colors: ThemeColors): void {
  const root = document.documentElement;

  // Surfaces
  root.style.setProperty("--theme-bg-base", colors.bg.base);
  root.style.setProperty("--theme-bg-surface", colors.bg.surface);
  root.style.setProperty("--theme-bg-elevated", colors.bg.elevated);
  root.style.setProperty("--theme-bg-overlay", colors.bg.overlay);

  // Text
  root.style.setProperty("--theme-text-primary", colors.text.primary);
  root.style.setProperty("--theme-text-secondary", colors.text.secondary);
  root.style.setProperty("--theme-text-muted", colors.text.muted);
  root.style.setProperty("--theme-text-inverse", colors.text.inverse);

  // Interactive - Primary
  root.style.setProperty("--theme-interactive-primary", colors.interactive.primary.DEFAULT);
  root.style.setProperty("--theme-interactive-primary-muted", colors.interactive.primary.muted);
  root.style.setProperty("--theme-interactive-primary-subtle", colors.interactive.primary.subtle);

  // Interactive - Secondary
  root.style.setProperty("--theme-interactive-secondary", colors.interactive.secondary.DEFAULT);
  root.style.setProperty("--theme-interactive-secondary-muted", colors.interactive.secondary.muted);
  root.style.setProperty("--theme-interactive-secondary-subtle", colors.interactive.secondary.subtle);

  // Interactive - Accent
  root.style.setProperty("--theme-interactive-accent", colors.interactive.accent.DEFAULT);
  root.style.setProperty("--theme-interactive-accent-muted", colors.interactive.accent.muted);
  root.style.setProperty("--theme-interactive-accent-subtle", colors.interactive.accent.subtle);

  // Status - Success
  root.style.setProperty("--theme-status-success", colors.status.success.DEFAULT);
  root.style.setProperty("--theme-status-success-muted", colors.status.success.muted);
  root.style.setProperty("--theme-status-success-subtle", colors.status.success.subtle);

  // Status - Error
  root.style.setProperty("--theme-status-error", colors.status.error.DEFAULT);
  root.style.setProperty("--theme-status-error-muted", colors.status.error.muted);
  root.style.setProperty("--theme-status-error-subtle", colors.status.error.subtle);

  // Status - Warning
  root.style.setProperty("--theme-status-warning", colors.status.warning.DEFAULT);
  root.style.setProperty("--theme-status-warning-muted", colors.status.warning.muted);
  root.style.setProperty("--theme-status-warning-subtle", colors.status.warning.subtle);

  // Borders
  root.style.setProperty("--theme-border-default", colors.border.default);
  root.style.setProperty("--theme-border-subtle", colors.border.subtle);
  root.style.setProperty("--theme-border-focus", colors.border.focus);

  // Typing
  root.style.setProperty("--theme-typing-cursor", colors.typing.cursor);
  root.style.setProperty("--theme-typing-cursor-ghost", colors.typing.cursorGhost);
  root.style.setProperty("--theme-typing-correct", colors.typing.correct);
  root.style.setProperty("--theme-typing-incorrect", colors.typing.incorrect);
  root.style.setProperty("--theme-typing-upcoming", colors.typing.upcoming);
  root.style.setProperty("--theme-typing-default", colors.typing.default);
}

// Provider props
type ThemeProviderProps = {
  children: ReactNode;
};

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [theme, setThemeState] = useState<ThemeDefinition | null>(null);
  const [themeId, setThemeId] = useState<string>("typesetgo");
  const [mode, setModeState] = useState<ThemeMode>("dark");
  const [isLoading, setIsLoading] = useState(true);

  // Initialize theme from localStorage or defaults
  useEffect(() => {
    async function initTheme() {
      setIsLoading(true);

      // Get stored preferences
      const storedThemeId = localStorage.getItem(THEME_STORAGE_KEY) || "typesetgo";
      const storedMode = (localStorage.getItem(MODE_STORAGE_KEY) as ThemeMode) || "dark";

      // Fetch manifest to ensure theme exists
      const manifest = await fetchThemeManifest();
      const validThemeId = manifest.themes.includes(storedThemeId)
        ? storedThemeId
        : manifest.default || "typesetgo";

      // Fetch the theme
      const loadedTheme = await fetchTheme(validThemeId);

      if (loadedTheme) {
        setThemeState(loadedTheme);
        setThemeId(validThemeId);

        // If stored mode is light but theme doesn't support it, fallback to dark
        const effectiveMode = storedMode === "light" && loadedTheme.light
          ? "light"
          : "dark";
        setModeState(effectiveMode);

        // Apply CSS variables
        const colors = effectiveMode === "light" && loadedTheme.light
          ? loadedTheme.light
          : loadedTheme.dark;
        applyThemeCSS(colors);
      } else {
        // Fallback to default theme
        const defaultTheme = getDefaultTheme();
        setThemeState(defaultTheme);
        setThemeId("typesetgo");
        setModeState("dark");
        applyThemeCSS(defaultTheme.dark);
      }

      setIsLoading(false);
    }

    initTheme();
  }, []);

  // Set theme by ID
  const setTheme = useCallback(async (id: string) => {
    const loadedTheme = await fetchTheme(id);

    if (loadedTheme) {
      setThemeState(loadedTheme);
      setThemeId(id);
      localStorage.setItem(THEME_STORAGE_KEY, id);

      // If current mode is light but new theme doesn't support it, switch to dark
      const effectiveMode = mode === "light" && loadedTheme.light
        ? "light"
        : "dark";

      if (effectiveMode !== mode) {
        setModeState(effectiveMode);
        localStorage.setItem(MODE_STORAGE_KEY, effectiveMode);
      }

      // Apply CSS variables
      const colors = effectiveMode === "light" && loadedTheme.light
        ? loadedTheme.light
        : loadedTheme.dark;
      applyThemeCSS(colors);
    }
  }, [mode]);

  // Set mode
  const setMode = useCallback((newMode: ThemeMode) => {
    // Only allow light mode if theme supports it
    if (newMode === "light" && !theme?.light) {
      return;
    }

    setModeState(newMode);
    localStorage.setItem(MODE_STORAGE_KEY, newMode);

    // Apply CSS variables for new mode
    if (theme) {
      const colors = newMode === "light" && theme.light
        ? theme.light
        : theme.dark;
      applyThemeCSS(colors);
    }
  }, [theme]);

  // Toggle mode
  const toggleMode = useCallback(() => {
    const newMode = mode === "dark" ? "light" : "dark";
    setMode(newMode);
  }, [mode, setMode]);

  // Compute current colors based on mode
  const colors = useMemo(() => {
    if (!theme) return null;
    return mode === "light" && theme.light ? theme.light : theme.dark;
  }, [theme, mode]);

  // Compute legacy theme for backward compatibility
  const legacyTheme = useMemo(() => {
    if (!colors) return null;
    return toLegacyTheme(colors);
  }, [colors]);

  // Check if current theme supports light mode
  const supportsLightMode = useMemo(() => {
    return theme?.light !== null && theme?.light !== undefined;
  }, [theme]);

  // Theme name for display
  const themeName = theme?.name || "TypeSetGo";

  // Context value
  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      themeId,
      themeName,
      mode,
      setTheme,
      setMode,
      toggleMode,
      colors,
      legacyTheme,
      supportsLightMode,
      isLoading,
    }),
    [theme, themeId, themeName, mode, setTheme, setMode, toggleMode, colors, legacyTheme, supportsLightMode, isLoading]
  );

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}
