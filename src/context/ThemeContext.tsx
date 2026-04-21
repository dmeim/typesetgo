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
  ThemeVariantDefinition,
} from "@/types/theme";
import { fetchTheme, fetchThemeManifest, getDefaultTheme } from "@/lib/themes";

// Storage keys
const THEME_STORAGE_KEY = "typesetgo-theme-id";
const VARIANT_STORAGE_KEY = "typesetgo-theme-variant-id";
const MODE_STORAGE_KEY = "typesetgo-theme-mode";

// Context value type
export type ThemeContextValue = {
  theme: ThemeDefinition;
  themeId: string;
  themeName: string;
  variantId: string;
  variant: ThemeVariantDefinition;
  mode: ThemeMode;
  setTheme: (id: string) => Promise<void>;
  setVariant: (variantId: string) => void;
  setThemeSelection: (selection: { themeId: string; variantId?: string; mode?: ThemeMode }) => Promise<void>;
  setMode: (mode: ThemeMode) => void;
  toggleMode: () => void;
  colors: ThemeColors;
  supportsLightMode: boolean;
  isLoading: boolean;
};

// Create context with undefined default (will be provided by ThemeProvider)
export const ThemeContext = createContext<ThemeContextValue | undefined>(
  undefined
);

function resolveVariant(theme: ThemeDefinition, requestedId: string): ThemeVariantDefinition {
  return theme.variants.find(v => v.id === requestedId)
    || theme.variants.find(v => v.id === theme.defaultVariantId)
    || theme.variants[0];
}

function resolveColors(variant: ThemeVariantDefinition, mode: ThemeMode): ThemeColors {
  return mode === "light" && variant.light ? variant.light : variant.dark;
}

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
  const [theme, setThemeState] = useState<ThemeDefinition>(getDefaultTheme());
  const [themeId, setThemeId] = useState<string>("typesetgo");
  const [variantId, setVariantIdState] = useState<string>("default");
  const [mode, setModeState] = useState<ThemeMode>("dark");
  const [isLoading, setIsLoading] = useState(true);

  // Initialize theme from localStorage or defaults
  useEffect(() => {
    async function initTheme() {
      setIsLoading(true);

      const storedThemeId = localStorage.getItem(THEME_STORAGE_KEY) || "typesetgo";
      const storedVariantId = localStorage.getItem(VARIANT_STORAGE_KEY) || "default";
      const storedMode = (localStorage.getItem(MODE_STORAGE_KEY) as ThemeMode) || "dark";

      const manifest = await fetchThemeManifest();
      const validThemeId = manifest.themes.includes(storedThemeId)
        ? storedThemeId
        : manifest.default || "typesetgo";

      const loadedTheme = await fetchTheme(validThemeId);
      const resolvedTheme = loadedTheme ?? getDefaultTheme();
      const resolvedId = loadedTheme ? validThemeId : "typesetgo";

      const variant = resolveVariant(resolvedTheme, storedVariantId);
      const effectiveMode = storedMode === "light" && variant.light ? "light" : "dark";

      setThemeState(resolvedTheme);
      setThemeId(resolvedId);
      setVariantIdState(variant.id);
      setModeState(effectiveMode);

      applyThemeCSS(resolveColors(variant, effectiveMode));
      setIsLoading(false);
    }

    initTheme();
  }, []);

  // Set theme by ID (resets variant to default)
  const setTheme = useCallback(async (id: string) => {
    const loadedTheme = await fetchTheme(id);
    if (!loadedTheme) return;

    const variant = resolveVariant(loadedTheme, loadedTheme.defaultVariantId);
    const effectiveMode = mode === "light" && variant.light ? "light" : "dark";

    setThemeState(loadedTheme);
    setThemeId(id);
    setVariantIdState(variant.id);
    localStorage.setItem(THEME_STORAGE_KEY, id);
    localStorage.setItem(VARIANT_STORAGE_KEY, variant.id);

    if (effectiveMode !== mode) {
      setModeState(effectiveMode);
      localStorage.setItem(MODE_STORAGE_KEY, effectiveMode);
    }

    applyThemeCSS(resolveColors(variant, effectiveMode));
  }, [mode]);

  // Set variant within current theme
  const setVariant = useCallback((newVariantId: string) => {
    const variant = resolveVariant(theme, newVariantId);
    const effectiveMode = mode === "light" && variant.light ? "light" : "dark";

    setVariantIdState(variant.id);
    localStorage.setItem(VARIANT_STORAGE_KEY, variant.id);

    if (effectiveMode !== mode) {
      setModeState(effectiveMode);
      localStorage.setItem(MODE_STORAGE_KEY, effectiveMode);
    }

    applyThemeCSS(resolveColors(variant, effectiveMode));
  }, [theme, mode]);

  // Atomic setter for theme + variant + mode
  const setThemeSelection = useCallback(async (selection: { themeId: string; variantId?: string; mode?: ThemeMode }) => {
    const loadedTheme = await fetchTheme(selection.themeId);
    if (!loadedTheme) return;

    const variant = resolveVariant(loadedTheme, selection.variantId || loadedTheme.defaultVariantId);
    const requestedMode = selection.mode || mode;
    const effectiveMode = requestedMode === "light" && variant.light ? "light" : "dark";

    setThemeState(loadedTheme);
    setThemeId(selection.themeId);
    setVariantIdState(variant.id);
    setModeState(effectiveMode);

    localStorage.setItem(THEME_STORAGE_KEY, selection.themeId);
    localStorage.setItem(VARIANT_STORAGE_KEY, variant.id);
    localStorage.setItem(MODE_STORAGE_KEY, effectiveMode);

    applyThemeCSS(resolveColors(variant, effectiveMode));
  }, [mode]);

  // Set mode
  const setMode = useCallback((newMode: ThemeMode) => {
    const variant = resolveVariant(theme, variantId);
    if (newMode === "light" && !variant.light) return;

    setModeState(newMode);
    localStorage.setItem(MODE_STORAGE_KEY, newMode);

    applyThemeCSS(resolveColors(variant, newMode));
  }, [theme, variantId]);

  // Toggle mode
  const toggleMode = useCallback(() => {
    const newMode = mode === "dark" ? "light" : "dark";
    setMode(newMode);
  }, [mode, setMode]);

  // Resolve active variant
  const variant = useMemo(() => {
    return resolveVariant(theme, variantId);
  }, [theme, variantId]);

  // Compute current colors from variant + mode
  const colors = useMemo(() => {
    return resolveColors(variant, mode);
  }, [variant, mode]);

  // Check if active variant supports light mode
  const supportsLightMode = useMemo(() => {
    return variant.light !== null && variant.light !== undefined;
  }, [variant]);

  const themeName = theme?.name || "TypeSetGo";

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      themeId,
      themeName,
      variantId,
      variant,
      mode,
      setTheme,
      setVariant,
      setThemeSelection,
      setMode,
      toggleMode,
      colors,
      supportsLightMode,
      isLoading,
    }),
    [theme, themeId, themeName, variantId, variant, mode, setTheme, setVariant, setThemeSelection, setMode, toggleMode, colors, supportsLightMode, isLoading]
  );

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}
