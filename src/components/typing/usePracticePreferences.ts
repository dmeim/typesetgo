import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type Dispatch, type RefObject, type SetStateAction } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useAccount } from "@/components/layout/useAccount";
import { useTheme } from "@/hooks/useTheme";
import type { SettingsState } from "@/lib/typing-constants";
import { loadLayoutSettings, saveLayoutSettings, saveSettings } from "@/lib/storage-utils";
import { fromAccountPreferences, toAccountPreferences } from "@/lib/practice-preferences";
import { PROMPT_SETTING_KEYS } from "./practice-config";

interface PreferenceOptions {
  userId: string | undefined;
  connectMode: boolean;
  settings: SettingsState;
  settingsRef: RefObject<SettingsState>;
  setSettings: Dispatch<SetStateAction<SettingsState>>;
  isRunningRef: RefObject<boolean>;
  isFinishedRef: RefObject<boolean>;
  composingRef: RefObject<boolean>;
}

/** Account hydration, edit precedence and persistence share one lifetime owner. */
export function usePracticePreferences({ userId, connectMode, settings, settingsRef, setSettings,
  isRunningRef, isFinishedRef, composingRef }: PreferenceOptions) {
  const { themeId: selectedThemeId, variantId: selectedVariantId, mode: selectedMode,
    userSelectionRevision, setThemeSelection } = useTheme();
  const [linePreview, setLinePreview] = useState(() => loadLayoutSettings()?.linePreview ?? 3);
  const [maxWordsPerLine, setMaxWordsPerLine] = useState(() => loadLayoutSettings()?.maxWordsPerLine ?? 7);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Account defaults arriving during an attempt belong to the next prompt, including while results are open.
  const [queuedPromptPreferences, setQueuedPromptPreferences] = useState<{
    accountId: string; settings: Partial<SettingsState>;
  } | null>(null);
  const pendingPromptPreferences = queuedPromptPreferences && queuedPromptPreferences.accountId === userId ? queuedPromptPreferences.settings : null;
  const preferredSettings = useMemo(() => pendingPromptPreferences
    ? { ...settings, ...pendingPromptPreferences } : settings, [settings, pendingPromptPreferences]);
  const preferenceEditsRef = useRef(new Set<string>());
  const themeEditedRef = useRef(false);
  const themeRevisionBaselineRef = useRef(userSelectionRevision);
  const themeRevisionRef = useRef(userSelectionRevision);
  useLayoutEffect(() => {
    themeRevisionRef.current = userSelectionRevision;
    if (userSelectionRevision !== themeRevisionBaselineRef.current) themeEditedRef.current = true;
  }, [userSelectionRevision]);

  const { status: accountStatus } = useAccount();
  // Preferences sync
  const dbPreferences = useQuery(
    api.preferences.getPreferences,
    userId && accountStatus === "ready" && !connectMode ? { clerkId: userId } : "skip"
  );
  const savePreferencesMutation = useMutation(api.preferences.savePreferences);
  const [observedAccountId, setObservedAccountId] = useState(userId ?? null);
  const [hydratedAccountId, setHydratedAccountId] = useState<string | null>(null);
  const hasResolvedDbPrefs = !userId || dbPreferences === null || hydratedAccountId === userId;
  const prefsDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // --- Save Settings ---
  useEffect(() => {
    if (connectMode) return;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      saveSettings(preferredSettings);
      saveLayoutSettings({ linePreview, maxWordsPerLine });
    }, 500);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [preferredSettings, linePreview, maxWordsPerLine, connectMode]);

  // Theme saving is now handled by ThemeContext

  // --- Preferences snapshot for dirty tracking ---
  const lastSavedPrefsRef = useRef<string | null>(null);
  const needsSnapshotStamp = useRef(false);

  const preferences = useMemo(() => toAccountPreferences(preferredSettings,
    { linePreview, maxWordsPerLine }, { themeId: selectedThemeId, themeVariantId: selectedVariantId, themeMode: selectedMode }),
  [preferredSettings, linePreview, maxWordsPerLine, selectedThemeId, selectedVariantId, selectedMode]);
  const currentSnapshot = JSON.stringify(preferences);

  // Anonymous edits follow the first sign-in. Edits from a previous account do not follow another account.
  const preferencesAccountRef = useRef<string | null>(null);
  useEffect(() => {
    if (preferencesAccountRef.current && preferencesAccountRef.current !== userId) {
      preferenceEditsRef.current.clear();
      themeEditedRef.current = false;
      themeRevisionBaselineRef.current = themeRevisionRef.current;
      lastSavedPrefsRef.current = null;
    }
    preferencesAccountRef.current = userId ?? null;
  }, [userId]);

  // --- Load Preferences from DB (for logged-in users) ---
  useEffect(() => {
    if (connectMode || !userId || hasResolvedDbPrefs || dbPreferences === undefined) return;

    // Local hydration is complete before the first render. Only event callbacks mark user edits.
    if (!dbPreferences) return;

    let isCancelled = false;

    // Use requestAnimationFrame to defer state updates and avoid cascading renders
    const hydrationFrame = requestAnimationFrame(() => {
      if (isCancelled) return;
      void (async () => {
        if (isCancelled) return;
        try {
          // Apply theme from DB using the context
          const dbThemeId = dbPreferences.themeId;
          const dbVariantId = dbPreferences.themeVariantId;
          const dbThemeMode = dbPreferences.themeMode;
          if (dbThemeId && !themeEditedRef.current) {
            try {
              await setThemeSelection({
                themeId: dbThemeId,
                variantId: dbVariantId || undefined,
                mode: dbThemeMode === "light" || dbThemeMode === "dark" ? dbThemeMode : undefined,
              }, { source: "preferences", expectedUserSelectionRevision: themeRevisionBaselineRef.current });
            } catch (error) {
              console.warn("Failed to apply theme from DB preferences:", error);
            }
          } else if (!themeEditedRef.current && dbPreferences.themeName && !dbPreferences.customTheme) {
            try {
              await setThemeSelection({ themeId: dbPreferences.themeName.toLowerCase().replace(/\s+/g, "-") },
                { source: "preferences", expectedUserSelectionRevision: themeRevisionBaselineRef.current });
            } catch (error) {
              console.warn("Failed to apply theme from DB preferences:", error);
            }
          }
          if (isCancelled) return;

          // Note: Custom themes are not currently supported in the new theme system
          // They would need to be stored as theme JSON files

          // Apply settings from DB
          {
            const prev = settingsRef.current;
            const restored = fromAccountPreferences(prev, dbPreferences);
            for (const key of preferenceEditsRef.current) {
              if (key in prev) Object.assign(restored, { [key]: prev[key as keyof SettingsState] });
            }
            if (isRunningRef.current || isFinishedRef.current || composingRef.current) {
              const pending: Partial<SettingsState> = {};
              for (const key of PROMPT_SETTING_KEYS) {
                if (restored[key] !== prev[key]) Object.assign(pending, { [key]: restored[key] });
                Object.assign(restored, { [key]: prev[key] });
              }
              setQueuedPromptPreferences(Object.keys(pending).length ? { accountId: userId, settings: pending } : null);
            }
            setSettings(restored);
          }

          if (!preferenceEditsRef.current.has("linePreview") && typeof dbPreferences.linePreview === "number") {
            setLinePreview(Math.max(1, Math.min(6, Math.round(dbPreferences.linePreview))));
          }

          if (!preferenceEditsRef.current.has("maxWordsPerLine") && typeof dbPreferences.maxWordsPerLine === "number") {
            setMaxWordsPerLine(Math.max(1, Math.min(10, Math.round(dbPreferences.maxWordsPerLine))));
          }
        } finally {
          if (!isCancelled) {
            needsSnapshotStamp.current = preferenceEditsRef.current.size === 0 && !themeEditedRef.current;
            setHydratedAccountId(userId);
          }
        }
      })();
    });

    return () => {
      isCancelled = true;
      cancelAnimationFrame(hydrationFrame);
    };
  }, [dbPreferences, hasResolvedDbPrefs, setThemeSelection, userId, connectMode, composingRef, isFinishedRef, isRunningRef, setSettings, settingsRef]);

  // --- Save Preferences to DB (debounced, dirty-checked, for logged-in users) ---
  useEffect(() => {
    if (connectMode || !userId || accountStatus !== "ready" || !hasResolvedDbPrefs) return;


    // After loading from DB, stamp the snapshot so we don't re-save what was just loaded
    if (needsSnapshotStamp.current || (dbPreferences === null && lastSavedPrefsRef.current === null
      && preferenceEditsRef.current.size === 0 && !themeEditedRef.current)) {
      needsSnapshotStamp.current = false;
      lastSavedPrefsRef.current = currentSnapshot;
      return;
    }

    if (currentSnapshot === lastSavedPrefsRef.current) return;

    if (prefsDebounceRef.current) {
      clearTimeout(prefsDebounceRef.current);
    }

    let cancelled = false;
    prefsDebounceRef.current = setTimeout(async () => {
      try {
        await savePreferencesMutation({
          clerkId: userId,
          preferences,
        });
        if (!cancelled) lastSavedPrefsRef.current = currentSnapshot;
      } catch (error) {
        console.warn("Failed to save preferences to DB:", error);
      }
    }, 1000);

    return () => {
      cancelled = true;
      if (prefsDebounceRef.current) {
        clearTimeout(prefsDebounceRef.current);
      }
    };
  }, [userId, hasResolvedDbPrefs, dbPreferences, currentSnapshot, preferences, savePreferencesMutation, connectMode, accountStatus]);

  // Resolution and queued defaults belong to one account visit, including signing back into the same account.
  if (observedAccountId !== (userId ?? null)) {
    setObservedAccountId(userId ?? null);
    setHydratedAccountId(null);
    if (observedAccountId !== null) setQueuedPromptPreferences(null);
  }

  const markEdited = useCallback((keys: string[]) => {
    keys.forEach((key) => preferenceEditsRef.current.add(key));
  }, []);
  const markThemeEdited = useCallback(() => { themeEditedRef.current = true; }, []);
  const updateLinePreview = useCallback((value: number) => {
    preferenceEditsRef.current.add("linePreview");
    setLinePreview(value);
  }, []);
  const updateMaxWordsPerLine = useCallback((value: number) => {
    preferenceEditsRef.current.add("maxWordsPerLine");
    setMaxWordsPerLine(value);
  }, []);
  return { pendingPromptPreferences, setQueuedPromptPreferences, markEdited, markThemeEdited,
    linePreview, maxWordsPerLine, updateLinePreview, updateMaxWordsPerLine };
}
