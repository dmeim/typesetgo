import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
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
import { themeCSSVariables } from "@/lib/theme-css";
import { ThemeContext, type ThemeContextValue, type ThemeSelectionOptions } from "@/context/theme-context";

// Storage keys
const THEME_STORAGE_KEY = "typesetgo-theme-id";
const VARIANT_STORAGE_KEY = "typesetgo-theme-variant-id";
const MODE_STORAGE_KEY = "typesetgo-theme-mode";

function resolveVariant(theme: ThemeDefinition, requestedId: string): ThemeVariantDefinition {
  return theme.variants.find(v => v.id === requestedId)
    || theme.variants.find(v => v.id === theme.defaultVariantId)
    || theme.variants[0];
}

function resolveColors(variant: ThemeVariantDefinition, mode: ThemeMode): ThemeColors {
  return mode === "light" && variant.light ? variant.light : variant.dark;
}

// CSS variable mapping from ThemeColors structure
function applyThemeCSS(colors: ThemeColors, mode: ThemeMode): void {
  const root = document.documentElement;

  root.classList.toggle("dark", mode === "dark");
  root.dataset.themeMode = mode;
  root.style.colorScheme = mode;
  for (const [name, value] of Object.entries(themeCSSVariables(colors))) root.style.setProperty(name, value);
}

type ActiveTheme = {
  theme: ThemeDefinition;
  variant: ThemeVariantDefinition;
  mode: ThemeMode;
  colors: ThemeColors;
};

function resolveSelection(theme: ThemeDefinition, variantId: string, mode: ThemeMode): ActiveTheme {
  const variant = resolveVariant(theme, variantId);
  const effectiveMode = mode === "light" && variant.light ? "light" : "dark";
  return { theme, variant, mode: effectiveMode, colors: resolveColors(variant, effectiveMode) };
}

function readStoredSelection() {
  try {
    return {
      themeId: localStorage.getItem(THEME_STORAGE_KEY) || "typesetgo",
      variantId: localStorage.getItem(VARIANT_STORAGE_KEY) || "default",
      mode: localStorage.getItem(MODE_STORAGE_KEY) === "light" ? "light" as const : "dark" as const,
    };
  } catch {
    return { themeId: "typesetgo", variantId: "default", mode: "dark" as const };
  }
}

function persistSelection(selection: ActiveTheme): void {
  // Storage can be disabled or full; a valid in-memory theme must still work.
  try {
    localStorage.setItem(THEME_STORAGE_KEY, selection.theme.id);
    localStorage.setItem(VARIANT_STORAGE_KEY, selection.variant.id);
    localStorage.setItem(MODE_STORAGE_KEY, selection.mode);
  } catch { /* Selection remains usable for this session. */ }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState(() => resolveSelection(getDefaultTheme(), "default", "dark"));
  const current = useRef(active);
  const requestId = useRef(0);
  const userSelectionRevisionRef = useRef(0);
  const [userSelectionRevision, setUserSelectionRevision] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [selectionError, setSelectionError] = useState<string | null>(null);

  useLayoutEffect(() => {
    applyThemeCSS(active.colors, active.mode);
  }, [active]);

  const commit = useCallback((next: ActiveTheme) => {
    current.current = next;
    persistSelection(next);
    setActive(next);
    setIsLoading(false);
    setSelectionError(null);
  }, []);

  const advanceRequestId = useCallback(() => ++requestId.current, []);

  useEffect(() => {
    const id = advanceRequestId();
    const stored = readStoredSelection();
    async function initialize() {
      const manifest = await fetchThemeManifest();
      if (id !== requestId.current) return;
      // A failed manifest must not discard an otherwise fetchable saved theme.
      const themeId = manifest.themes.length && !manifest.themes.includes(stored.themeId)
        ? manifest.default : stored.themeId;
      const theme = await fetchTheme(themeId);
      if (id !== requestId.current) return;
      if (theme) {
        commit(resolveSelection(theme, stored.variantId, stored.mode));
      } else {
        // Keep the startup fallback usable without erasing a saved preference
        // because of a temporary network failure.
        setIsLoading(false);
        setSelectionError("Your saved theme could not be loaded. Try again.");
      }
    }
    void initialize();
    // Invalidate whichever request is pending when this provider is cleaned up,
    // including a user selection that began after initialization.
    return () => { advanceRequestId(); };
  }, [commit, advanceRequestId]);

  const recordUserSelection = useCallback(() => {
    // Update before React renders so a restoration using an older context
    // snapshot cannot overtake a user action from the same event turn.
    setUserSelectionRevision(++userSelectionRevisionRef.current);
  }, []);

  const setThemeSelection = useCallback(async (
    selection: { themeId: string; variantId?: string; mode?: ThemeMode },
    options: ThemeSelectionOptions = {},
  ) => {
    if (options.source === "preferences") {
      if (options.expectedUserSelectionRevision !== userSelectionRevisionRef.current) return;
    } else {
      recordUserSelection();
    }
    const id = advanceRequestId();
    const requestedMode = selection.mode ?? current.current.mode;
    setIsLoading(true);
    setSelectionError(null);
    const theme = await fetchTheme(selection.themeId);
    if (id !== requestId.current) return;
    if (!theme) {
      setIsLoading(false);
      setSelectionError("This theme could not be loaded. Try again.");
      return;
    }
    commit(resolveSelection(theme, selection.variantId ?? theme.defaultVariantId, requestedMode));
  }, [commit, recordUserSelection, advanceRequestId]);

  const setTheme = useCallback((themeId: string) => setThemeSelection({ themeId }), [setThemeSelection]);

  const setVariant = useCallback((variantId: string) => {
    recordUserSelection();
    advanceRequestId();
    const selection = current.current;
    commit(resolveSelection(selection.theme, variantId, selection.mode));
  }, [commit, recordUserSelection, advanceRequestId]);

  const setMode = useCallback((mode: ThemeMode) => {
    recordUserSelection();
    advanceRequestId();
    const selection = current.current;
    commit(resolveSelection(selection.theme, selection.variant.id, mode));
  }, [commit, recordUserSelection, advanceRequestId]);

  const toggleMode = useCallback(() => {
    setMode(current.current.mode === "dark" ? "light" : "dark");
  }, [setMode]);

  const value = useMemo<ThemeContextValue>(() => ({
    ...active,
    themeId: active.theme.id,
    themeName: active.theme.name,
    variantId: active.variant.id,
    supportsLightMode: active.variant.light != null,
    userSelectionRevision,
    setTheme,
    setVariant,
    setThemeSelection,
    setMode,
    toggleMode,
    isLoading,
    selectionError,
  }), [active, userSelectionRevision, setTheme, setVariant, setThemeSelection, setMode, toggleMode, isLoading, selectionError]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
