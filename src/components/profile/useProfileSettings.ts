import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useAccount } from "@/components/layout/useAccount";
import { useAppAuth } from "@/components/layout/useAppAuth";
import { useTheme } from "@/hooks/useTheme";
import { toAccountPreferences } from "@/lib/practice-preferences";
import type { ThemeMode } from "@/types/theme";
import {
  hydrateProfileSettings, mergeProfileSettings, persistProfileSettings, readProfileSettings, splitProfileSettings,
  type ProfileSettings,
} from "./profile-settings";
import type { ThemeSelection } from "./theme-catalog";

/** Short, so a quick edit followed by a reload or a trip to Home still reaches the account. */
const ACCOUNT_SAVE_DELAY_MS = 400;

type PendingSave = { clerkId: string; preferences: ReturnType<typeof toAccountPreferences>; snapshot: string };

/**
 * The persisted practice settings and site theme, edited from the Profile page.
 * Every edit is written to localStorage straight away (Home reads it on mount). Signed in, account
 * defaults load first, and edits are saved to the account the same way Home saves them.
 */
export function useProfileSettings() {
  const { user } = useAppAuth();
  const { status: accountStatus } = useAccount();
  const theme = useTheme();
  const { themeId, variantId, mode, userSelectionRevision, setThemeSelection, setVariant, setMode } = theme;
  const clerkId = accountStatus === "ready" ? user?.id ?? null : null;

  const [settings, setSettings] = useState(readProfileSettings);
  const [edited, setEdited] = useState<ReadonlySet<string>>(() => new Set());
  const [themeBaseline, setThemeBaseline] = useState(userSelectionRevision);
  const [owner, setOwner] = useState(clerkId);
  const [hydratedFor, setHydratedFor] = useState<string | null>(null);
  const themeEdited = userSelectionRevision !== themeBaseline;

  const stored = useQuery(api.preferences.getPreferences, clerkId ? { clerkId } : "skip");
  const savePreferences = useMutation(api.preferences.savePreferences);

  // Edits made while signed out follow the first sign-in; edits from one account never follow another.
  if (owner !== clerkId) {
    setOwner(clerkId);
    if (owner !== null) {
      setEdited(new Set());
      setThemeBaseline(userSelectionRevision);
    }
  }

  if (clerkId && stored !== undefined && hydratedFor !== clerkId) {
    setHydratedFor(clerkId);
    if (stored) setSettings((current) => hydrateProfileSettings(current, stored, edited));
  }
  const hydrated = !!clerkId && hydratedFor === clerkId;

  // Local copy: written after every change so Home and a reload see it.
  const initialSettings = useRef(settings);
  useEffect(() => {
    if (settings !== initialSettings.current) persistProfileSettings(settings);
  }, [settings]);

  // Account copy: debounced, dirty-checked and flushed when the page closes or unmounts.
  const preferences = useMemo(() => {
    const [practice, layout] = splitProfileSettings(settings);
    return toAccountPreferences(practice, layout, { themeId, themeVariantId: variantId, themeMode: mode });
  }, [settings, themeId, variantId, mode]);
  const snapshot = JSON.stringify(preferences);
  const lastSaved = useRef<string | null>(null);
  const pending = useRef<PendingSave | null>(null);

  const flush = useCallback(() => {
    const save = pending.current;
    if (!save) return;
    pending.current = null;
    savePreferences({ clerkId: save.clerkId, preferences: save.preferences })
      .then(() => { lastSaved.current = save.snapshot; })
      .catch((error: unknown) => console.warn("Failed to save profile settings to the account:", error));
  }, [savePreferences]);

  const dirty = edited.size > 0 || themeEdited;
  useEffect(() => {
    if (!clerkId || !hydrated) return;
    if (!dirty) {
      lastSaved.current = snapshot;
      return;
    }
    if (snapshot === lastSaved.current) {
      pending.current = null;
      return;
    }
    pending.current = { clerkId, preferences, snapshot };
    const timer = setTimeout(flush, ACCOUNT_SAVE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [clerkId, hydrated, dirty, snapshot, preferences, flush]);

  useEffect(() => {
    window.addEventListener("pagehide", flush);
    return () => {
      window.removeEventListener("pagehide", flush);
      flush();
    };
  }, [flush]);

  const update = useCallback((changes: Partial<ProfileSettings>) => {
    setSettings((current) => mergeProfileSettings(current, changes));
    setEdited((current) => {
      const keys = Object.keys(changes).filter((key) => !current.has(key));
      return keys.length ? new Set([...current, ...keys]) : current;
    });
  }, []);

  // A new theme loads before it applies; show the pick straight away so the gallery feels instant.
  const [requested, setRequested] = useState<ThemeSelection | null>(null);
  const selectTheme = useCallback((selection: ThemeSelection) => {
    if (selection.themeId === themeId) {
      if (selection.variantId !== variantId) setVariant(selection.variantId);
      if (selection.mode !== mode) setMode(selection.mode);
      return;
    }
    setRequested(selection);
    setThemeSelection(selection).catch((error: unknown) => console.warn("Failed to apply the selected theme:", error));
  }, [themeId, variantId, mode, setThemeSelection, setVariant, setMode]);

  const selectMode = useCallback((next: ThemeMode) => setMode(next), [setMode]);

  const current = useMemo<ThemeSelection>(() => ({ themeId, variantId, mode }), [themeId, variantId, mode]);
  const shown = theme.isLoading && requested ? requested : current;

  return { settings, update, theme: shown, selectTheme, selectMode, colors: theme.colors, themeName: theme.themeName,
    themeLoading: theme.isLoading, themeError: theme.selectionError, syncing: !!clerkId && !hydrated };
}

export type ProfileSettingsState = ReturnType<typeof useProfileSettings>;
