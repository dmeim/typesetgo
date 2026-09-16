import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import type { Quote, SettingsState, Theme } from "@/lib/typing-constants";
import { fetchSoundManifest, getRandomSoundUrl, type SoundManifest } from "@/lib/sounds";
import { useTheme } from "@/hooks/useTheme";
import { tv } from "@/lib/theme-vars";
import { fetchWordsManifest, fetchWords, type WordsManifest } from "@/lib/words";
import { fetchQuotesManifest, fetchQuotes, type QuotesManifest } from "@/lib/quotes";
import {
  loadSettings,
  saveSettings,
  loadLayoutSettings,
  saveLayoutSettings,
} from "@/lib/storage-utils";
import { DEFAULT_TYPING_FONT, getTypingFontFamily } from "@/lib/typing-fonts";
import OnScreenKeyboard from "@/components/typing/keyboard/OnScreenKeyboard";
import type { KeyboardLayoutId } from "@/lib/keyboard-layouts";
import type { Plan, PlanItem, PlanStepResult } from "@/types/plan";
import PlanBuilderModal from "@/components/plan/PlanBuilderModal";
import PlanSplash from "@/components/plan/PlanSplash";
import PlanResultsModal from "@/components/plan/PlanResultsModal";
import { Progress } from "@/components/ui/progress";
import { useUser, useClerk } from "@clerk/clerk-react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { useNotifications } from "@/lib/notification-store";
import { getAchievementById, TIER_COLORS } from "@/lib/achievement-definitions";

import PracticeResults from "./PracticeResults";
import PracticeCountDialog from "./PracticeCountDialog";
import PracticePresetDialog from "./PracticePresetDialog";
import PracticeControls from "./PracticeControls";
import PracticeQuickSettingsDialog from "./PracticeQuickSettingsDialog";
import PracticeSettingsDialog from "./PracticeSettingsDialog";
import PracticeThemePicker from "./PracticeThemePicker";
import { TIME_PRESETS, WORD_PRESETS, type ModeSelectorOption } from "./practice-config";

// Constants
const PUNCTUATION_CHARS = [".", ",", "!", "?", ";", ":"];
const NUMBER_CHARS = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];
const LINE_HEIGHT = 1.6;

// Word generation helper
const generateWords = (
  count: number,
  pool: string[],
  options: { punctuation: boolean; numbers: boolean; capitalization: boolean }
) => {
  const words = [];
  if (pool.length === 0) return "";

  for (let i = 0; i < count; i++) {
    let word = pool[Math.floor(Math.random() * pool.length)];

    if (options.numbers && Math.random() < 0.2) {
      word =
        NUMBER_CHARS[Math.floor(Math.random() * NUMBER_CHARS.length)] +
        NUMBER_CHARS[Math.floor(Math.random() * NUMBER_CHARS.length)];
    }

    if (options.punctuation && Math.random() < 0.15 && i > 0) {
      word =
        word + PUNCTUATION_CHARS[Math.floor(Math.random() * PUNCTUATION_CHARS.length)];
    }

    // Apply capitalization: capitalize first letter of some words
    if (options.capitalization && Math.random() < 0.25) {
      word = word.charAt(0).toUpperCase() + word.slice(1);
    }

    words.push(word);
  }
  return words.join(" ");
};

// Stats computation
const computeStats = (typed: string, reference: string) => {
  const typedWords = typed.split(" ");
  const referenceWords = reference.split(" ");

  let correct = 0;
  let incorrect = 0;
  let missed = 0;
  let extra = 0;

  for (let i = 0; i < typedWords.length; i++) {
    const typedWord = typedWords[i];
    const refWord = referenceWords[i] || "";
    const isCurrentWord = i === typedWords.length - 1;

    if (isCurrentWord) {
      for (let j = 0; j < typedWord.length; j++) {
        if (j < refWord.length) {
          if (typedWord[j] === refWord[j]) {
            correct++;
          } else {
            incorrect++;
          }
        } else {
          extra++;
        }
      }
    } else {
      for (let j = 0; j < refWord.length; j++) {
        if (j < typedWord.length) {
          if (typedWord[j] === refWord[j]) {
            correct++;
          } else {
            incorrect++;
          }
        } else {
          missed++;
        }
      }

      if (typedWord.length > refWord.length) {
        extra += typedWord.length - refWord.length;
      }
    }

    if (i < typedWords.length - 1) {
      const refHasNextWord = i < referenceWords.length - 1;
      if (refHasNextWord) {
        if (typedWord.length >= refWord.length) {
          correct++;
        } else {
          incorrect++;
        }
      } else {
        const isSingleTrailingSpace =
          i === typedWords.length - 2 && typedWords[i + 1] === "";
        if (isSingleTrailingSpace) {
          correct++;
        } else {
          extra++;
        }
      }
    }
  }

  return { correct, incorrect, missed, extra };
};

// Word-level results computation
const computeWordResults = (typed: string, reference: string) => {
  const typedWords = typed.trim().split(" ").filter(w => w.length > 0);
  const referenceWords = reference.split(" ");
  
  const correctWords: string[] = [];
  const incorrectWords: { typed: string; expected: string }[] = [];
  
  for (let i = 0; i < typedWords.length; i++) {
    const typedWord = typedWords[i];
    const refWord = referenceWords[i] || "";
    
    if (typedWord === refWord) {
      correctWords.push(typedWord);
    } else if (refWord) {
      incorrectWords.push({ typed: typedWord, expected: refWord });
    }
  }
  
  return { correctWords, incorrectWords };
};

const formatTime = (seconds: number) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;

  if (h > 0) {
    return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }
  if (m > 0) {
    return `${m}:${s.toString().padStart(2, "0")}`;
  }
  return `${s}s`;
};

interface TypingPracticeProps {
  connectMode?: boolean;
  fitToParentHeight?: boolean;
  lockedSettings?: Partial<SettingsState>;
  isTestActive?: boolean;
  onStatsUpdate?: (
    stats: {
      wpm: number;
      accuracy: number;
      progress: number;
      wordsTyped: number;
      timeElapsed: number;
      isFinished: boolean;
    },
    typedText?: string,
    targetText?: string
  ) => void;
  onLeave?: () => void;
  // External modal control (lifted state from Home.tsx)
  showSettings?: boolean;
  setShowSettings?: (show: boolean) => void;
  showThemeModal?: boolean;
  setShowThemeModal?: (show: boolean) => void;
  // Callback to notify parent of typing state changes
  onTypingStateChange?: (isTyping: boolean) => void;
}

function getLocalCalendarFields() {
  const now = new Date();
  const dayOfWeek = now.getDay();
  return {
    localDate: now.toISOString().split("T")[0],
    localHour: now.getHours(),
    isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
    dayOfWeek,
    month: now.getMonth(),
    day: now.getDate(),
  };
}

export default function TypingPractice({
  connectMode = false,
  fitToParentHeight = false,
  lockedSettings,
  isTestActive = true,
  onStatsUpdate,
  onLeave,
  // External state control (when used from Home.tsx)
  showSettings: externalShowSettings,
  setShowSettings: externalSetShowSettings,
  showThemeModal: externalShowThemeModal,
  setShowThemeModal: externalSetShowThemeModal,
  onTypingStateChange,
}: TypingPracticeProps) {
  // Theme context (replaces props and internal state)
  const {
    colors,
    themeId: selectedThemeId,
    variantId: selectedVariantId,
    mode: selectedMode,
    setTheme: setThemeById,
    setThemeSelection,
  } = useTheme();
  // --- State ---
  const [settings, setSettings] = useState<SettingsState>({
    mode: "zen",
    duration: 30,
    wordTarget: 25,
    punctuation: false,
    numbers: false,
    capitalization: false,
    typingFontSize: 3.25,
    typingFontFamily: DEFAULT_TYPING_FONT,
    iconFontSize: 1,
    helpFontSize: 1,
    difficulty: "beginner",
    quoteLength: "all",
    textAlign: "center",
    ghostWriterSpeed: 40,
    ghostWriterEnabled: false,
    soundEnabled: true,
    typingSound: "creamy",
    warningSound: "clock",
    errorSound: "",
    presetText: "",
    presetModeType: "finish",
    showOnScreenKeyboard: false,
    keyboardLayout: "qwerty" as KeyboardLayoutId,
  });

  // Use external state if provided, otherwise use internal state
  const [internalShowSettings, setInternalShowSettings] = useState(false);
  const [internalShowThemeModal, setInternalShowThemeModal] = useState(false);

  // Resolve to external or internal state
  const showSettings = externalShowSettings ?? internalShowSettings;
  const setShowSettings = externalSetShowSettings ?? setInternalShowSettings;
  const showThemeModal = externalShowThemeModal ?? internalShowThemeModal;
  const setShowThemeModal = externalSetShowThemeModal ?? setInternalShowThemeModal;

  const [linePreview, setLinePreview] = useState(3);
  const [maxWordsPerLine, setMaxWordsPerLine] = useState(7);
  // Font option is now stored in settings.typingFontFamily
  const planTheme: Theme = useMemo(() => ({
    cursor: colors.typing.cursor,
    defaultText: colors.typing.default,
    upcomingText: colors.typing.upcoming,
    correctText: colors.typing.correct,
    incorrectText: colors.typing.incorrect,
    buttonUnselected: colors.interactive.primary.DEFAULT,
    buttonSelected: colors.interactive.secondary.DEFAULT,
    backgroundColor: colors.bg.base,
    surfaceColor: colors.bg.surface,
    ghostCursor: colors.typing.cursorGhost,
  }), [colors]);
  const [soundManifest, setSoundManifest] = useState<SoundManifest | null>(null);
  const [wordsManifest, setWordsManifest] = useState<WordsManifest | null>(null);
  const [quotesManifest, setQuotesManifest] = useState<QuotesManifest | null>(null);
  const [showPresetInput, setShowPresetInput] = useState(false);
  const [showCustomCountModal, setShowCustomCountModal] = useState(false);
  const [wordPool, setWordPool] = useState<string[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [currentQuote, setCurrentQuote] = useState<Quote | null>(null);
  const [words, setWords] = useState("");
  const [typedText, setTypedText] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [scrollOffset, setScrollOffset] = useState(0);
  const [isRepeated, setIsRepeated] = useState(false);
  const [ghostCharIndex, setGhostCharIndex] = useState(0);
  const [isFocused, setIsFocused] = useState(false);
  const [capsLockOn, setCapsLockOn] = useState(false);
  const [isWarningPlayed, setIsWarningPlayed] = useState(false);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const activeKeyTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [uiOpacity, setUiOpacity] = useState(1);

  // Compact Mode (for zoomed/narrow viewports)
  const [isCompactMode, setIsCompactMode] = useState(false);
  const [showQuickSettings, setShowQuickSettings] = useState(false);

  // Kid Mode State
  const [isKidMode, setIsKidMode] = useState(false);
  const [preKidModeSettings, setPreKidModeSettings] = useState<{
    mode: typeof settings.mode;
    typingFontSize: number;
    ghostWriterEnabled: boolean;
    linePreview: number;
    maxWordsPerLine: number;
    showOnScreenKeyboard: boolean;
  } | null>(null);

  // Plan Mode State
  const [plan, setPlan] = useState<Plan>([]);
  const [planIndex, setPlanIndex] = useState(0);
  const [isPlanActive, setIsPlanActive] = useState(false);
  const [isPlanSplash, setIsPlanSplash] = useState(false);
  const [showPlanBuilder, setShowPlanBuilder] = useState(false);
  const [planResults, setPlanResults] = useState<Record<string, PlanStepResult>>({});
  const [showPlanResultsModal, setShowPlanResultsModal] = useState(false);

  // Save Results State
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [lastResultIsValid, setLastResultIsValid] = useState<boolean | null>(null);
  const [lastResultInvalidReason, setLastResultInvalidReason] = useState<string | undefined>(undefined);
  const pendingResultRef = useRef<{
    wpm: number;
    accuracy: number;
    mode: string;
    duration: number;
    wordCount: number;
    difficulty: string;
    punctuation: boolean;
    numbers: boolean;
    capitalization: boolean;
    wordsCorrect: number;
    wordsIncorrect: number;
    charsMissed: number;
    charsExtra: number;
  } | null>(null);

  // Refs to decouple hot-path closures from render-cycle state
  const wordsRef = useRef(words);
  const typedTextRef = useRef(typedText);
  const elapsedMsRef = useRef(elapsedMs);
  const isRunningRef = useRef(isRunning);

  // Keep ref in sync with state
  useEffect(() => { wordsRef.current = words; }, [words]);
  useEffect(() => { typedTextRef.current = typedText; }, [typedText]);
  useEffect(() => { elapsedMsRef.current = elapsedMs; }, [elapsedMs]);
  useEffect(() => { isRunningRef.current = isRunning; }, [isRunning]);

  // Clerk auth hooks
  const { isSignedIn, user } = useUser();
  const { openSignIn } = useClerk();
  const saveResultMutation = useMutation(api.testResults.saveResult);
  const getOrCreateUser = useMutation(api.users.getOrCreateUser);
  const startSessionMutation = useMutation(api.typingSessions.startSession);
  const recordProgressMutation = useMutation(api.typingSessions.recordProgress);
  const finalizeSessionMutation = useMutation(api.typingSessions.finalizeSession);
  const cancelSessionMutation = useMutation(api.typingSessions.cancelSession);

  const sessionIdRef = useRef<Id<"typingSessions"> | null>(null);
  const startingSessionRef = useRef(false);
  const pendingTypedLengthRef = useRef(0);
  const finalizedRef = useRef(false);
  const savingRef = useRef(false);
  const sessionEpochRef = useRef(0);
  const [sessionEpoch, setSessionEpoch] = useState(0);
  const userRef = useRef(user);
  const connectModeRef = useRef(connectMode);
  const settingsRef = useRef(settings);
  const isFinishedRef = useRef(isFinished);
  const isSignedInRef = useRef(isSignedIn);

  useEffect(() => { userRef.current = user; }, [user]);
  useEffect(() => { connectModeRef.current = connectMode; }, [connectMode]);
  useEffect(() => { settingsRef.current = settings; }, [settings]);
  useEffect(() => { isFinishedRef.current = isFinished; }, [isFinished]);
  useEffect(() => { isSignedInRef.current = isSignedIn; }, [isSignedIn]);

  // Notification store for achievement toasts
  const { addNotification } = useNotifications();

  // Preferences sync
  const dbPreferences = useQuery(
    api.preferences.getPreferences,
    user ? { clerkId: user.id } : "skip"
  );
  const savePreferencesMutation = useMutation(api.preferences.savePreferences);
  const [hasResolvedDbPrefs, setHasResolvedDbPrefs] = useState(false);
  const prefsDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const inputRef = useRef<HTMLInputElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const activeWordRef = useRef<HTMLSpanElement | null>(null);
  const hasLoadedFromStorage = useRef(false);
  const initialPrefsSnapshot = useRef<string | null>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const topLayoutRef = useRef<HTMLDivElement | null>(null);
  const bottomLayoutRef = useRef<HTMLDivElement | null>(null);
  const [typingCenterOffset, setTypingCenterOffset] = useState(0);

  // --- Calculated Stats ---
  const stats = useMemo(() => computeStats(typedText, words), [typedText, words]);
  const wordResults = useMemo(() => computeWordResults(typedText, words), [typedText, words]);
  const typedWordCount = useMemo(() => {
    const trimmed = typedText.trim();
    if (trimmed === "") return 0;
    const typedWords = trimmed.split(/\s+/).length;
    return typedText.endsWith(" ") ? typedWords : Math.max(typedWords - 1, 0);
  }, [typedText]);
  const accuracy = typedText.length > 0 ? (stats.correct / typedText.length) * 100 : 100;
  const elapsedMinutes = elapsedMs / 60000 || 0.01;
  const wpm = (typedText.length / 5) / elapsedMinutes;
  const zenProgressGradient = useMemo(
    () => `linear-gradient(120deg, ${colors.interactive.secondary.DEFAULT} 0%, ${colors.interactive.accent.DEFAULT} 25%, ${colors.interactive.primary.DEFAULT} 50%, ${colors.interactive.accent.DEFAULT} 75%, ${colors.interactive.secondary.DEFAULT} 100%)`,
    [colors]
  );

  const timeRemaining =
    settings.mode === "time" ? Math.max(0, settings.duration - Math.floor(elapsedMs / 1000)) : 0;

  // --- Load Settings on Mount ---
  useEffect(() => {
    if (hasLoadedFromStorage.current) return;
    hasLoadedFromStorage.current = true;

    requestAnimationFrame(() => {
      const storedSettings = loadSettings();
      if (storedSettings) {
        setSettings((prev) => ({
          ...prev,
          ...storedSettings,
          presetText: "",
        }));
      }

      const storedLayout = loadLayoutSettings();
      if (storedLayout) {
        setLinePreview(storedLayout.linePreview);
        setMaxWordsPerLine(storedLayout.maxWordsPerLine);
      }

      // Theme is now managed by ThemeContext, no need to load here
    });
  }, []);

  // --- Save Settings ---
  useEffect(() => {
    if (!hasLoadedFromStorage.current) return;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      saveSettings(settings);
      saveLayoutSettings({ linePreview, maxWordsPerLine });
    }, 500);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [settings, linePreview, maxWordsPerLine]);

  // Theme saving is now handled by ThemeContext

  // --- Compact Mode Detection (for zoomed/narrow viewports) ---
  useEffect(() => {
    const COMPACT_WIDTH = 768;
    const COMPACT_HEIGHT = 600;
    
    const checkCompactMode = () => {
      // Trigger compact mode when viewport is narrow OR short (e.g. browser zoom)
      setIsCompactMode(window.innerWidth < COMPACT_WIDTH || window.innerHeight < COMPACT_HEIGHT);
    };
    
    // Check on mount
    checkCompactMode();
    
    // Listen for resize events (covers zoom changes which alter innerWidth/innerHeight)
    window.addEventListener("resize", checkCompactMode);
    return () => window.removeEventListener("resize", checkCompactMode);
  }, []);

  // --- Preferences snapshot for dirty tracking ---
  const lastSavedPrefsRef = useRef<string | null>(null);
  const needsSnapshotStamp = useRef(false);

  const buildPrefsSnapshot = useCallback(() => JSON.stringify({
    themeId: selectedThemeId,
    themeVariantId: selectedVariantId,
    themeMode: selectedMode,
    soundEnabled: settings.soundEnabled,
    typingSound: settings.typingSound,
    warningSound: settings.warningSound,
    errorSound: settings.errorSound,
    ghostWriterEnabled: settings.ghostWriterEnabled,
    ghostWriterSpeed: settings.ghostWriterSpeed,
    typingFontSize: settings.typingFontSize,
    typingFontFamily: settings.typingFontFamily,
    iconFontSize: settings.iconFontSize,
    helpFontSize: settings.helpFontSize,
    textAlign: settings.textAlign,
    defaultMode: settings.mode,
    defaultDuration: settings.duration,
    defaultWordTarget: settings.wordTarget,
    defaultDifficulty: settings.difficulty,
    defaultQuoteLength: settings.quoteLength,
    defaultPunctuation: settings.punctuation,
    defaultNumbers: settings.numbers,
    defaultCapitalization: settings.capitalization,
    defaultPresetModeType: settings.presetModeType,
    linePreview: Math.max(1, Math.min(6, linePreview)),
    maxWordsPerLine: Math.max(1, Math.min(10, maxWordsPerLine)),
    showOnScreenKeyboard: settings.showOnScreenKeyboard,
    keyboardLayout: settings.keyboardLayout,
  }), [
    selectedThemeId, selectedVariantId, selectedMode,
    settings.soundEnabled, settings.typingSound, settings.warningSound, settings.errorSound,
    settings.ghostWriterEnabled, settings.ghostWriterSpeed,
    settings.typingFontSize, settings.typingFontFamily,
    settings.iconFontSize, settings.helpFontSize, settings.textAlign,
    settings.mode, settings.duration, settings.wordTarget, settings.difficulty,
    settings.quoteLength, settings.punctuation, settings.numbers, settings.capitalization,
    settings.presetModeType, settings.showOnScreenKeyboard, settings.keyboardLayout,
    linePreview, maxWordsPerLine,
  ]);

  // --- Reset DB prefs sync state when user changes ---
  useEffect(() => {
    setHasResolvedDbPrefs(false);
  }, [user?.id]);

  // --- Capture initial prefs snapshot after mount to detect anonymous modifications ---
  useEffect(() => {
    if (!hasLoadedFromStorage.current || initialPrefsSnapshot.current !== null) return;
    initialPrefsSnapshot.current = buildPrefsSnapshot();
  }, [buildPrefsSnapshot]);

  // --- Load Preferences from DB (for logged-in users) ---
  useEffect(() => {
    if (!user?.id || hasResolvedDbPrefs || dbPreferences === undefined) return;

    // If user modified settings while anonymous, keep their local settings
    // and let the save effect push them to DB instead of overwriting with DB values
    const userModifiedWhileAnonymous =
      initialPrefsSnapshot.current !== null &&
      buildPrefsSnapshot() !== initialPrefsSnapshot.current;

    if (!dbPreferences || userModifiedWhileAnonymous) {
      needsSnapshotStamp.current = !userModifiedWhileAnonymous;
      setHasResolvedDbPrefs(true);
      return;
    }

    let isCancelled = false;

    // Use requestAnimationFrame to defer state updates and avoid cascading renders
    requestAnimationFrame(() => {
      (async () => {
        try {
          // Apply theme from DB using the context
          const dbThemeId = (dbPreferences as Record<string, unknown>).themeId as string | undefined;
          const dbVariantId = (dbPreferences as Record<string, unknown>).themeVariantId as string | undefined;
          const dbThemeMode = (dbPreferences as Record<string, unknown>).themeMode as string | undefined;
          if (dbThemeId) {
            try {
              await setThemeSelection({
                themeId: dbThemeId,
                variantId: dbVariantId || undefined,
                mode: (dbThemeMode as "light" | "dark") || undefined,
              });
            } catch (error) {
              console.warn("Failed to apply theme from DB preferences:", error);
            }
          } else if (dbPreferences.themeName && !dbPreferences.customTheme) {
            try {
              await setThemeById(dbPreferences.themeName.toLowerCase().replace(/\s+/g, "-"));
            } catch (error) {
              console.warn("Failed to apply theme from DB preferences:", error);
            }
          }
          if (isCancelled) return;

          // Note: Custom themes are not currently supported in the new theme system
          // They would need to be stored as theme JSON files

          // Apply settings from DB
          setSettings((prev) => ({
            ...prev,
            mode: dbPreferences.defaultMode as typeof prev.mode,
            duration: dbPreferences.defaultDuration,
            wordTarget: dbPreferences.defaultWordTarget,
            difficulty: dbPreferences.defaultDifficulty as typeof prev.difficulty,
            quoteLength: dbPreferences.defaultQuoteLength as typeof prev.quoteLength,
            punctuation: dbPreferences.defaultPunctuation,
            numbers: dbPreferences.defaultNumbers,
            capitalization: dbPreferences.defaultCapitalization ?? false,
            presetModeType: (dbPreferences.defaultPresetModeType as typeof prev.presetModeType) ?? prev.presetModeType,
            soundEnabled: dbPreferences.soundEnabled,
            typingSound: dbPreferences.typingSound,
            warningSound: dbPreferences.warningSound,
            errorSound: dbPreferences.errorSound,
            ghostWriterEnabled: dbPreferences.ghostWriterEnabled,
            ghostWriterSpeed: dbPreferences.ghostWriterSpeed,
            typingFontSize: dbPreferences.typingFontSize,
            typingFontFamily: ((dbPreferences as Record<string, unknown>).typingFontFamily as string) ?? DEFAULT_TYPING_FONT,
            iconFontSize: dbPreferences.iconFontSize,
            helpFontSize: dbPreferences.helpFontSize,
            textAlign: dbPreferences.textAlign as typeof prev.textAlign,
            showOnScreenKeyboard: (dbPreferences as Record<string, unknown>).showOnScreenKeyboard as boolean ?? prev.showOnScreenKeyboard,
            keyboardLayout: ((dbPreferences as Record<string, unknown>).keyboardLayout as KeyboardLayoutId) ?? prev.keyboardLayout,
          }));

          if (typeof dbPreferences.linePreview === "number") {
            setLinePreview(Math.max(1, Math.min(6, Math.round(dbPreferences.linePreview))));
          }

          if (typeof dbPreferences.maxWordsPerLine === "number") {
            setMaxWordsPerLine(Math.max(1, Math.min(10, Math.round(dbPreferences.maxWordsPerLine))));
          }
        } finally {
          if (!isCancelled) {
            needsSnapshotStamp.current = true;
            setHasResolvedDbPrefs(true);
          }
        }
      })();
    });

    return () => {
      isCancelled = true;
    };
  }, [dbPreferences, hasResolvedDbPrefs, setThemeById, buildPrefsSnapshot, user?.id]);

  // --- Save Preferences to DB (debounced, dirty-checked, for logged-in users) ---
  useEffect(() => {
    if (!user || !hasLoadedFromStorage.current || !hasResolvedDbPrefs) return;

    const currentSnapshot = buildPrefsSnapshot();

    // After loading from DB, stamp the snapshot so we don't re-save what was just loaded
    if (needsSnapshotStamp.current) {
      needsSnapshotStamp.current = false;
      lastSavedPrefsRef.current = currentSnapshot;
      return;
    }

    if (currentSnapshot === lastSavedPrefsRef.current) return;

    if (prefsDebounceRef.current) {
      clearTimeout(prefsDebounceRef.current);
    }

    prefsDebounceRef.current = setTimeout(async () => {
      try {
        await savePreferencesMutation({
          clerkId: user.id,
          preferences: JSON.parse(currentSnapshot),
        });
        lastSavedPrefsRef.current = currentSnapshot;
      } catch (error) {
        console.warn("Failed to save preferences to DB:", error);
      }
    }, 1000);

    return () => {
      if (prefsDebounceRef.current) {
        clearTimeout(prefsDebounceRef.current);
      }
    };
  }, [user, hasResolvedDbPrefs, buildPrefsSnapshot, savePreferencesMutation]);

  // --- Load sound manifest ---
  useEffect(() => {
    fetchSoundManifest().then(setSoundManifest);
  }, []);

  // --- Load words manifest ---
  useEffect(() => {
    fetchWordsManifest().then(setWordsManifest);
  }, []);

  // --- Load quotes manifest ---
  useEffect(() => {
    fetchQuotesManifest().then(setQuotesManifest);
  }, []);

  // --- Apply locked settings from connect mode ---
  useEffect(() => {
    if (connectMode && lockedSettings) {
      requestAnimationFrame(() => {
        setSettings((prev) => ({ ...prev, ...lockedSettings }));
      });
    }
  }, [connectMode, lockedSettings]);

  // --- Load word pool ---
  useEffect(() => {
    const difficulty = settings.difficulty || wordsManifest?.default || "medium";
    fetchWords(difficulty).then(setWordPool);
  }, [settings.difficulty, wordsManifest]);

  // --- Load quotes ---
  useEffect(() => {
    if (settings.mode !== "quote") return;
    const length = settings.quoteLength === "all" 
      ? (quotesManifest?.default || "medium") 
      : settings.quoteLength;
    fetchQuotes(length).then(setQuotes);
  }, [settings.mode, settings.quoteLength, quotesManifest]);

  // --- Callbacks ---
  const updateSettings = useCallback((updates: Partial<SettingsState>) => {
    setSettings((prev) => ({ ...prev, ...updates }));
  }, []);

  const openCustomCountModal = useCallback(() => {
    if (settings.mode === "time" || settings.mode === "words") setShowCustomCountModal(true);
  }, [settings.mode]);

  const resetSession = useCallback((isRepeat = false) => {
    const existingSessionId = sessionIdRef.current;
    sessionIdRef.current = null;
    pendingTypedLengthRef.current = 0;
    finalizedRef.current = false;
    savingRef.current = false;
    isFinishedRef.current = false;
    if (existingSessionId) {
      void cancelSessionMutation({ sessionId: existingSessionId });
    }
    sessionEpochRef.current += 1;
    setSessionEpoch(sessionEpochRef.current);

    setTypedText("");
    setIsRunning(false);
    setIsFinished(false);
    setStartTime(null);
    setElapsedMs(0);
    setScrollOffset(0);
    setGhostCharIndex(0);
    setIsRepeated(isRepeat);
    setIsFocused(true);
    setIsWarningPlayed(false);
    setUiOpacity(1);
    setSaveState("idle");
    setLastResultIsValid(null);
    setLastResultInvalidReason(undefined);
    inputRef.current?.focus();
  }, [cancelSessionMutation]);

  // Ref to store pending plan result
  const pendingPlanResultRef = useRef<{
    itemId: string;
    result: PlanStepResult;
  } | null>(null);

  const finishSession = useCallback(() => {
    if (isFinished) return;
    isFinishedRef.current = true;

    const currentTypedText = typedTextRef.current;
    const currentWords = wordsRef.current;
    const currentElapsedMs = elapsedMsRef.current;

    // If in plan mode, prepare the result to be recorded
    if (isPlanActive && !isPlanSplash) {
      const currentItem = plan[planIndex];
      if (currentItem && !planResults[currentItem.id]) {
        const currentWpm = (currentTypedText.length / 5) / (currentElapsedMs / 60000 || 0.01);
        const currentStats = computeStats(currentTypedText, currentWords);
        const currentAccuracy = currentTypedText.length > 0 ? (currentStats.correct / currentTypedText.length) * 100 : 100;

        pendingPlanResultRef.current = {
          itemId: currentItem.id,
          result: {
            wpm: Math.round(currentWpm) || 0,
            accuracy: currentAccuracy || 100,
            raw: Math.round(currentWpm) || 0,
            consistency: 0,
            time: currentElapsedMs,
            date: Date.now(),
            mode: currentItem.mode,
            metadata: currentItem.metadata,
          },
        };
      }
    }

    setIsFinished(true);
    setIsRunning(false);
    setUiOpacity(1);

    // Record plan result synchronously after state updates
    if (pendingPlanResultRef.current) {
      const { itemId, result } = pendingPlanResultRef.current;
      setPlanResults((prev) => ({
        ...prev,
        [itemId]: result,
      }));
      pendingPlanResultRef.current = null;
    }
  }, [isFinished, isPlanActive, isPlanSplash, plan, planIndex, planResults]);

  const finishSessionRef = useRef(finishSession);
  useEffect(() => { finishSessionRef.current = finishSession; }, [finishSession]);

  const playClickSound = useCallback(() => {
    if (!settings.soundEnabled || !settings.typingSound || !soundManifest) return;
    try {
      const soundUrl = getRandomSoundUrl(soundManifest, "typing", settings.typingSound);
      if (!soundUrl) return;
      const audio = new Audio(soundUrl);
      audio.volume = 0.5;
      audio.play().catch(() => {});
    } catch {
      // Ignore errors
    }
  }, [settings.soundEnabled, settings.typingSound, soundManifest]);

  const playWarningSound = useCallback(() => {
    if (!settings.soundEnabled || !settings.warningSound || !soundManifest) return;
    try {
      const soundUrl = getRandomSoundUrl(soundManifest, "warning", settings.warningSound);
      if (!soundUrl) return;
      const audio = new Audio(soundUrl);
      audio.volume = 0.5;
      audio.play().catch(() => {});
    } catch {
      // Ignore errors
    }
  }, [settings.soundEnabled, settings.warningSound, soundManifest]);

  // Save results to Convex via typingSessions.finalizeSession for ranked solo saves.
  const saveResults = useCallback(async (resultData?: typeof pendingResultRef.current) => {
    if (connectMode) return;

    const dataToSave = resultData || {
      wpm: Math.round(wpm),
      accuracy: Math.round(accuracy * 10) / 10,
      mode: settings.mode,
      duration: elapsedMs,
      wordCount: Math.floor(typedText.length / 5),
      difficulty: settings.difficulty,
      punctuation: settings.punctuation,
      numbers: settings.numbers,
      capitalization: settings.capitalization,
      wordsCorrect: wordResults.correctWords.length,
      wordsIncorrect: wordResults.incorrectWords.length,
      charsMissed: stats.missed,
      charsExtra: stats.extra,
    };

    if (!user) {
      pendingResultRef.current = dataToSave;
      openSignIn();
      return;
    }

    if (savingRef.current || (finalizedRef.current && saveState === "saved")) {
      return;
    }

    const sessionId = sessionIdRef.current;
    if (!sessionId && startingSessionRef.current) {
      setSaveState("saving");
      return;
    }

    savingRef.current = true;
    setSaveState("saving");
    try {
      await getOrCreateUser({
        clerkId: user.id,
        email: user.primaryEmailAddress?.emailAddress ?? "",
        username: user.username ?? user.firstName ?? "User",
        avatarUrl: user.imageUrl,
      });

      const calendar = getLocalCalendarFields();

      const showAchievementToasts = (achievementIds: string[]) => {
        for (const achievementId of achievementIds) {
          const achievement = getAchievementById(achievementId);
          if (achievement) {
            const tierColor = TIER_COLORS[achievement.tier]?.bg || "#FFD700";

            addNotification({
              type: "achievement",
              title: achievement.title,
              description: achievement.description,
              metadata: {
                achievementId: achievement.id,
                achievementTier: achievement.tier,
              },
            });

            toast.success(achievement.title, {
              description: achievement.description,
              icon: (
                <span
                  style={{
                    fontSize: "1.75rem",
                    display: "inline-block",
                    animation: "achievement-bounce 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)",
                  }}
                >
                  {achievement.icon}
                </span>
              ),
              duration: 5000,
              style: {
                borderLeft: `5px solid ${tierColor}`,
                borderTop: `2px solid ${tierColor}40`,
                borderRight: `2px solid ${tierColor}40`,
                borderBottom: `2px solid ${tierColor}40`,
                backgroundColor: tv.bg.surface,
                color: tv.text.primary,
                boxShadow: `0 0 20px ${tierColor}30`,
                animation: "achievement-glow 2s ease-in-out",
              },
              descriptionClassName: "!text-current opacity-70",
              action: {
                label: "Ok",
                onClick: () => {
                  // Dismisses the toast; details stay in the notification tray
                },
              },
            });
          }
        }
      };

      if (sessionId) {
        try {
          await recordProgressMutation({
            sessionId,
            typedLength: typedTextRef.current.length,
          });
        } catch {
          // Still finalize; progress is best-effort.
        }

        const result = await finalizeSessionMutation({
          sessionId,
          typedText: typedTextRef.current,
          clientElapsedMs: elapsedMsRef.current,
          localDate: calendar.localDate,
          localHour: calendar.localHour,
          dayOfWeek: calendar.dayOfWeek,
          month: calendar.month,
          day: calendar.day,
        });

        finalizedRef.current = true;
        sessionIdRef.current = null;
        setLastResultIsValid(result.isValid);
        setLastResultInvalidReason(result.invalidReason);
        setSaveState("saved");
        pendingResultRef.current = null;

        if (result.newAchievements && result.newAchievements.length > 0) {
          showAchievementToasts(result.newAchievements);
        }
        return;
      }

      // Guest-then-sign-in has no session: history-only saveResult (not ranked).
      if (resultData) {
        const result = await saveResultMutation({
          clerkId: user.id,
          ...dataToSave,
          ...calendar,
        });
        setLastResultIsValid(null);
        setSaveState("saved");
        pendingResultRef.current = null;

        if (result.newAchievements && result.newAchievements.length > 0) {
          showAchievementToasts(result.newAchievements);
        }
        return;
      }

      setLastResultIsValid(false);
      setLastResultInvalidReason("Session was not established");
      setSaveState("error");
    } catch (error) {
      console.error("Failed to save result:", error);
      setSaveState("error");
    } finally {
      savingRef.current = false;
    }
  }, [connectMode, user, wpm, accuracy, settings.mode, settings.difficulty, settings.punctuation, settings.numbers, settings.capitalization, elapsedMs, typedText, wordResults, stats, openSignIn, getOrCreateUser, saveResultMutation, finalizeSessionMutation, recordProgressMutation, addNotification, saveState]);

  // Effect to save pending result after sign-in
  useEffect(() => {
    if (isSignedIn && user && pendingResultRef.current) {
      const pending = pendingResultRef.current;
      pendingResultRef.current = null;
      saveResults(pending);
    }
  }, [isSignedIn, user, saveResults]);

  const saveResultsRef = useRef(saveResults);
  useEffect(() => { saveResultsRef.current = saveResults; }, [saveResults]);

  const ensureSoloSessionStarted = useCallback((targetText?: string) => {
    if (connectModeRef.current) return;
    const currentUser = userRef.current;
    if (!currentUser || !isSignedInRef.current) return;
    if (sessionIdRef.current || startingSessionRef.current || finalizedRef.current) return;

    const s = settingsRef.current;
    const needsClientPrompt = s.mode === "quote" || s.mode === "preset";
    const text = targetText || wordsRef.current;
    if (needsClientPrompt && !text) return;

    startingSessionRef.current = true;
    const epoch = sessionEpochRef.current;

    void getOrCreateUser({
      clerkId: currentUser.id,
      email: currentUser.primaryEmailAddress?.emailAddress ?? "",
      username: currentUser.username ?? currentUser.firstName ?? "User",
      avatarUrl: currentUser.imageUrl,
    })
      .then(() =>
        startSessionMutation({
          clerkId: currentUser.id,
          mode: s.mode,
          duration: s.duration,
          wordTarget: s.wordTarget,
          difficulty: s.difficulty,
          punctuation: s.punctuation,
          numbers: s.numbers,
          capitalization: s.capitalization,
          settings: {
            mode: s.mode,
            duration: s.duration,
            wordTarget: s.wordTarget,
            difficulty: s.difficulty,
            punctuation: s.punctuation,
            numbers: s.numbers,
            capitalization: s.capitalization,
          },
          ...(needsClientPrompt ? { targetText: text } : {}),
        })
      )
      .then((res) => {
        if (!res?.sessionId) return;
        if (sessionEpochRef.current !== epoch) {
          void cancelSessionMutation({ sessionId: res.sessionId });
          return;
        }
        sessionIdRef.current = res.sessionId;
        if (res.targetText && typedTextRef.current.length === 0) {
          wordsRef.current = res.targetText;
          setWords(res.targetText);
        }
        const len = Math.max(
          typedTextRef.current.length,
          pendingTypedLengthRef.current
        );
        if (len > 0) {
          pendingTypedLengthRef.current = 0;
          void recordProgressMutation({
            sessionId: res.sessionId,
            typedLength: len,
          });
        }
        if (isFinishedRef.current && !finalizedRef.current) {
          void saveResultsRef.current();
        }
      })
      .catch((error) => {
        console.warn("Failed to start typing session:", error);
      })
      .finally(() => {
        startingSessionRef.current = false;
        if (isFinishedRef.current && !finalizedRef.current && !sessionIdRef.current) {
          void saveResultsRef.current();
        }
      });
  }, [getOrCreateUser, startSessionMutation, cancelSessionMutation, recordProgressMutation]);

  const reportSoloProgress = useCallback((typedLength: number) => {
    if (connectModeRef.current) return;
    pendingTypedLengthRef.current = typedLength;
    const sessionId = sessionIdRef.current;
    if (!sessionId) return;
    pendingTypedLengthRef.current = 0;
    void recordProgressMutation({ sessionId, typedLength });
  }, [recordProgressMutation]);

  useEffect(() => {
    if (connectMode || !isSignedIn || !user || !words) return;
    ensureSoloSessionStarted(words);
  }, [sessionEpoch, connectMode, isSignedIn, user, words, ensureSoloSessionStarted]);

  useEffect(() => {
    if (!isFinished || connectMode || !isSignedIn) return;
    if (finalizedRef.current) return;
    void saveResults();
  }, [isFinished, connectMode, isSignedIn, saveResults]);

  const generateTest = useCallback(() => {
    if (settings.mode === "quote") {
      if (quotes.length === 0) return;
      const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
      if (randomQuote) {
        setCurrentQuote(randomQuote);
        setWords(randomQuote.quote);
        resetSession(false);
      }
      return;
    }

    if (settings.mode === "preset") {
      if (!settings.presetText) {
        setShowPresetInput(true);
        return;
      }
      setWords(settings.presetText);
      resetSession(false);
      return;
    }

    if (wordPool.length === 0) return;

    const wordCount = settings.mode === "words" && settings.wordTarget > 0 ? settings.wordTarget : 200;
    setWords(
      generateWords(wordCount, wordPool, {
        punctuation: settings.punctuation,
        numbers: settings.numbers,
        capitalization: settings.capitalization,
      })
    );
    resetSession(false);
  }, [
    settings.mode,
    settings.wordTarget,
    settings.punctuation,
    settings.numbers,
    settings.capitalization,
    settings.presetText,
    wordPool,
    quotes,
    resetSession,
  ]);

  const applyCustomCount = useCallback((value: number) => {
    if (settings.mode === "time") {
      if (settings.duration === value) generateTest();
      else updateSettings({ duration: value });
    } else if (settings.mode === "words") {
      if (settings.wordTarget === value) generateTest();
      else updateSettings({ wordTarget: value });
    }
  }, [generateTest, settings.duration, settings.mode, settings.wordTarget, updateSettings]);

  const enableKidMode = useCallback(() => {
    setPreKidModeSettings({
      mode: settings.mode,
      typingFontSize: settings.typingFontSize,
      ghostWriterEnabled: settings.ghostWriterEnabled,
      linePreview,
      maxWordsPerLine,
      showOnScreenKeyboard: settings.showOnScreenKeyboard,
    });
    updateSettings({
      mode: "zen",
      typingFontSize: 5.5,
      ghostWriterEnabled: false,
      showOnScreenKeyboard: true,
    });
    setLinePreview(2);
    setMaxWordsPerLine(5);
    setIsKidMode(true);
  }, [
    settings.mode,
    settings.typingFontSize,
    settings.ghostWriterEnabled,
    settings.showOnScreenKeyboard,
    linePreview,
    maxWordsPerLine,
    updateSettings,
  ]);

  const disableKidMode = useCallback((nextMode?: SettingsState["mode"]) => {
    if (preKidModeSettings) {
      updateSettings({
        mode: nextMode ?? preKidModeSettings.mode,
        typingFontSize: preKidModeSettings.typingFontSize,
        ghostWriterEnabled: preKidModeSettings.ghostWriterEnabled,
        showOnScreenKeyboard: preKidModeSettings.showOnScreenKeyboard,
      });
      setLinePreview(preKidModeSettings.linePreview);
      setMaxWordsPerLine(preKidModeSettings.maxWordsPerLine);
    } else {
      updateSettings({ mode: nextMode ?? "zen" });
    }
    setPreKidModeSettings(null);
    setIsKidMode(false);
  }, [preKidModeSettings, updateSettings]);

  const handleModeSelect = useCallback((mode: ModeSelectorOption) => {
    if (mode === "kid") {
      if (isKidMode) {
        disableKidMode();
      } else {
        enableKidMode();
      }
      return;
    }

    if (isKidMode) {
      disableKidMode(mode);
      return;
    }

    if (settings.mode === mode) {
      generateTest();
    } else {
      updateSettings({ mode });
    }
  }, [disableKidMode, enableKidMode, generateTest, isKidMode, settings.mode, updateSettings]);

  // Keep generateTest ref fresh without triggering the effect below
  const generateTestRef = useRef(generateTest);
  useEffect(() => { generateTestRef.current = generateTest; }, [generateTest]);

  // Generate test on mode/difficulty change (NOT on generateTest identity change)
  useEffect(() => {
    if (isRunningRef.current) return;
    if (wordPool.length > 0 || settings.mode === "quote" || settings.mode === "preset") {
      requestAnimationFrame(() => {
        generateTestRef.current();
      });
    }
  }, [settings.mode, settings.difficulty, wordPool.length, settings.punctuation, settings.numbers, settings.capitalization]);

  // --- Timer ---
  useEffect(() => {
    if (!isRunning || !startTime) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const elapsed = now - startTime;
      setElapsedMs(elapsed);

      if (settings.mode === "time" && elapsed >= settings.duration * 1000) {
        finishSessionRef.current();
      }

      if (
        settings.mode === "time" &&
        !isWarningPlayed &&
        elapsed >= (settings.duration - 5) * 1000 &&
        settings.duration >= 10
      ) {
        playWarningSound();
        setIsWarningPlayed(true);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [isRunning, startTime, settings.mode, settings.duration, playWarningSound, isWarningPlayed]);

  // --- Ghost Writer ---
  useEffect(() => {
    if (!settings.ghostWriterEnabled || !isRunning || isFinished) return;

    const charsPerSecond = (settings.ghostWriterSpeed * 5) / 60;
    const interval = setInterval(() => {
      setGhostCharIndex((prev) => {
        const next = prev + charsPerSecond / 10;
        return Math.min(next, words.length);
      });
    }, 100);

    return () => clearInterval(interval);
  }, [settings.ghostWriterEnabled, settings.ghostWriterSpeed, isRunning, isFinished, words.length]);

  // --- UI Fade while typing ---
  useEffect(() => {
    if (isRunning && !isFinished) {
      const timeout = setTimeout(() => {
        setUiOpacity(0);
      }, 2000);
      return () => clearTimeout(timeout);
    }
  }, [isRunning, isFinished, typedText]);

  // --- Notify parent of typing state ---
  useEffect(() => {
    if (onTypingStateChange) {
      onTypingStateChange(isRunning && !isFinished);
    }
  }, [isRunning, isFinished, onTypingStateChange]);

  // --- Report stats to parent (connect mode) ---
  useEffect(() => {
    if (onStatsUpdate) {
      onStatsUpdate(
        {
          wpm: Math.round(wpm) || 0,
          accuracy: accuracy || 100,
          progress: words.length > 0 ? (typedText.length / words.length) * 100 : 0,
          wordsTyped: Math.floor(typedText.length / 5),
          timeElapsed: elapsedMs,
          isFinished,
        },
        typedText,
        words
      );
    }
  }, [wpm, accuracy, typedText, words, elapsedMs, isFinished, onStatsUpdate]);

  // --- Input handling ---
  const handleInput = (value: string) => {
    if (isFinished) return;
    if (connectMode && !isTestActive) return;

    // Collapse consecutive spaces to prevent word-index misalignment
    const sanitized = value.replace(/  +/g, " ");

    if (!isRunning) {
      setIsRunning(true);
      setStartTime(Date.now());
    }

    if (!connectMode) {
      typedTextRef.current = sanitized;
      pendingTypedLengthRef.current = sanitized.length;
      ensureSoloSessionStarted();
      reportSoloProgress(sanitized.length);
    }

    setTypedText(sanitized);
    playClickSound();

    if (settings.mode === "quote" || settings.mode === "preset") {
      if (sanitized.length === words.length) {
        finishSession();
      }
      return;
    }

    if (settings.mode === "time" || settings.mode === "zen") {
      const currentWordCount = sanitized.trim().split(/\s+/).length;
      const totalWords = wordsRef.current.split(" ").length;
      if (totalWords - currentWordCount < 50) {
        const newWords = generateWords(50, wordPool, {
          punctuation: settings.punctuation,
          numbers: settings.numbers,
          capitalization: settings.capitalization,
        });
        if (newWords) {
          setWords((prev) => prev + " " + newWords);
        }
      }
    }

    if (settings.mode === "words" && settings.wordTarget > 0) {
      const typedWordCount = sanitized.trim().split(/\s+/).length;
      if (sanitized.endsWith(" ") && typedWordCount >= settings.wordTarget) {
        finishSession();
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Tab") {
      e.preventDefault();
      if (e.shiftKey) {
        resetSession(true);
      }
    }
    if (e.key === "Enter" && isFinished) {
      generateTest();
    }
    if (e.key === "Escape" && isRunning && !isFinished) {
      e.preventDefault();
      finishSession();
    }
  };

  const hasErrors = useMemo(() => {
    for (let i = 0; i < typedText.length; i++) {
      if (typedText[i] !== words[i]) return true;
    }
    return false;
  }, [typedText, words]);

  const nextChar = useMemo(() => {
    if (isFinished || !words) return null;
    if (hasErrors) return "Backspace";
    return words[typedText.length] ?? null;
  }, [typedText.length, words, isFinished, hasErrors]);

  useEffect(() => {
    const handleKeyEvent = (e: KeyboardEvent) => {
      setCapsLockOn(e.getModifierState("CapsLock"));
      if (e.type === "keydown" && (e.key.length === 1 || e.key === " " || e.key === "Backspace")) {
        setActiveKey(e.key);
        clearTimeout(activeKeyTimeoutRef.current);
        activeKeyTimeoutRef.current = setTimeout(() => setActiveKey(null), 150);
      }
    };
    window.addEventListener("keydown", handleKeyEvent);
    window.addEventListener("keyup", handleKeyEvent);
    return () => {
      window.removeEventListener("keydown", handleKeyEvent);
      window.removeEventListener("keyup", handleKeyEvent);
      clearTimeout(activeKeyTimeoutRef.current);
    };
  }, []);

  // --- Global keyboard listener for results screen ---
  useEffect(() => {
    if (!isFinished) return;

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        generateTest();
      }
      if (e.key === "Tab") {
        e.preventDefault();
        resetSession(true);
      }
      // Spacebar to save results (only if not already saved/saving, not invalid, and not in connect mode)
      if (e.key === " " && !connectMode && saveState !== "saving" && saveState !== "saved" && lastResultIsValid !== false) {
        e.preventDefault();
        saveResults();
      }
    };

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [isFinished, generateTest, resetSession, connectMode, saveState, saveResults, lastResultIsValid]);

  const handlePresetSubmit = (text: string) => {
    const sanitized = text.replace(/[^\x20-\x7E\n]/g, "").replace(/\s+/g, " ").trim();
    if (sanitized.length > 0 && sanitized.length <= 10000) {
      updateSettings({ presetText: sanitized });
      setShowPresetInput(false);
    }
  };

  // --- Plan Mode Handlers ---
  const applyPlanStep = useCallback((item: PlanItem) => {
    // Merge plan item settings into current settings
    setSettings((prev) => ({
      ...prev,
      ...item.settings,
      mode: item.mode,
    }));
  }, []);

  const handleStartPlan = (newPlan: Plan) => {
    if (newPlan.length === 0) return;
    setPlan(newPlan);
    setPlanIndex(0);
    setIsPlanActive(true);
    setIsPlanSplash(true);
    setPlanResults({});
  };

  const handlePlanStepStart = useCallback(() => {
    const item = plan[planIndex];
    if (!item) return;

    setIsPlanSplash(false);
    applyPlanStep(item);
    // Slight delay to allow settings to update before generating test
    setTimeout(() => {
      generateTest();
    }, 0);
  }, [plan, planIndex, applyPlanStep, generateTest]);

  const handlePlanNext = useCallback(() => {
    const nextIndex = planIndex + 1;

    if (nextIndex < plan.length) {
      setPlanIndex(nextIndex);
      setIsPlanSplash(true);
      setIsFinished(false);
      setIsRunning(false);
    } else {
      // Finished plan
      setShowPlanResultsModal(true);
    }
  }, [plan.length, planIndex]);

  const handlePlanPrev = useCallback(() => {
    if (planIndex > 0) {
      setPlanIndex(planIndex - 1);
      setIsPlanSplash(true);
      setIsFinished(false);
      setIsRunning(false);
    }
  }, [planIndex]);

  const exitPlanMode = useCallback(() => {
    setIsPlanActive(false);
    setIsPlanSplash(false);
    setPlan([]);
    setPlanIndex(0);
    setPlanResults({});
  }, []);

  // --- Scroll handling ---
  useLayoutEffect(() => {
    if (!containerRef.current || !activeWordRef.current) return;

    const container = containerRef.current;
    const activeWord = activeWordRef.current;
    const containerRect = container.getBoundingClientRect();
    const wordRect = activeWord.getBoundingClientRect();

    // Calculate relative position
    const relativeTop = wordRect.top - containerRect.top;
    const lineHeight = parseFloat(getComputedStyle(container).lineHeight || "0");

    // If word is on 3rd line or below (index 2+), scroll up
    // We want active line to be line 2 (index 1), unless we only have 1 line preview
    const targetTop = linePreview === 1 ? 0 : lineHeight;

    // Adjust scroll offset to keep the active word at the target position
    // We use a threshold to prevent jitter
    const diff = relativeTop - targetTop;

    if (Math.abs(diff) > 10) {
      setScrollOffset((prev) => Math.max(0, prev + diff));
    }
  }, [typedText, settings.typingFontSize, linePreview]);

  useLayoutEffect(() => {
    if (isCompactMode || isFinished) {
      setTypingCenterOffset(0);
      return;
    }

    const topEl = topLayoutRef.current;
    const bottomEl = bottomLayoutRef.current;
    if (!topEl || !bottomEl) return;

    const updateOffset = () => {
      const topHeight = topEl.getBoundingClientRect().height;
      const bottomHeight = bottomEl.getBoundingClientRect().height;
      const offset = (bottomHeight - topHeight) / 2;
      setTypingCenterOffset(Math.max(-180, Math.min(180, offset)));
    };

    updateOffset();

    const resizeObserver = new ResizeObserver(() => {
      updateOffset();
    });

    resizeObserver.observe(topEl);
    resizeObserver.observe(bottomEl);
    window.addEventListener("resize", updateOffset);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", updateOffset);
    };
  }, [
    isCompactMode,
    isFinished,
    isRunning,
    isKidMode,
    settings.mode,
    settings.helpFontSize,
    linePreview,
    showQuickSettings,
  ]);

  // --- Render Typing Area ---
  const renderTypingArea = () => {
    const wordsArray = words.split(" ");
    const typedWords = typedText.split(" ");
    const currentWordIndex = typedWords.length - 1;
    const initialCharIndex = 0;

    return wordsArray.reduce<{ nodes: React.ReactNode[]; currentIndex: number }>(
      (acc, word, wordIdx) => {
        const wordStartIndex = acc.currentIndex;
        const typedWord = typedWords[wordIdx] || "";
        const isCurrentWord = wordIdx === currentWordIndex;
        const isPastWord = wordIdx < currentWordIndex;

        const wordNode = (
          <span
            key={wordIdx}
            ref={isCurrentWord ? activeWordRef : null}
            className="inline-block mr-[0.5em] relative"
          >
            {word.split("").map((char, charIdx) => {
              const globalCharIndex = wordStartIndex + charIdx;
              const typedChar = typedWord[charIdx];
              const isTyped = typedChar !== undefined;
              const isCorrect = typedChar === char;
              const isCursor = isCurrentWord && charIdx === typedWord.length;
              const isGhost =
                settings.ghostWriterEnabled && Math.floor(ghostCharIndex) === globalCharIndex;

              let charColor: string = tv.typing.default;
              if (!isTyped) {
                if (isPastWord) charColor = tv.typing.incorrect;
                else if (isCursor) charColor = tv.typing.upcoming;
              } else {
                charColor = isCorrect ? tv.typing.correct : tv.typing.incorrect;
              }

              return (
                <span key={charIdx} className="relative" style={{ color: charColor }}>
                  {char}
                  {isCursor && (
                    <span
                      className="absolute left-0 top-0 h-full w-0.5 animate-pulse"
                      style={{ backgroundColor: tv.typing.cursor }}
                    />
                  )}
                  {isGhost && (
                    <span
                      className="absolute left-0 top-0 h-full w-0.5 opacity-70"
                      style={{ backgroundColor: tv.typing.cursorGhost }}
                    />
                  )}
                </span>
              );
            })}
            {(isCurrentWord || isPastWord) && typedWord.length > word.length && (
              <span style={{ color: tv.typing.incorrect }}>{typedWord.slice(word.length)}</span>
            )}
            {isCurrentWord && typedWord.length === word.length && (
              <span className="relative">
                <span
                  className="absolute left-0 top-0 h-full w-0.5 animate-pulse"
                  style={{ backgroundColor: tv.typing.cursor }}
                />
              </span>
            )}
          </span>
        );

        acc.nodes.push(wordNode);
        // Insert line break after every maxWordsPerLine words
        if ((wordIdx + 1) % maxWordsPerLine === 0 && wordIdx < wordsArray.length - 1) {
          acc.nodes.push(<br key={`br-${wordIdx}`} />);
        }
        acc.currentIndex += word.length + 1;
        return acc;
      },
      { nodes: [], currentIndex: initialCharIndex }
    ).nodes;
  };

  const selectedDurationPreset = TIME_PRESETS.find((preset) => preset === settings.duration);
  const selectedWordPreset = WORD_PRESETS.find((preset) => preset === settings.wordTarget);
  const isCustomDurationSelected = selectedDurationPreset === undefined;
  const isCustomWordTargetSelected = selectedWordPreset === undefined;
  const configurationProps = {
    settings, updateSettings, generateTest, isKidMode, handleModeSelect,
    wordsManifest, quotesManifest, openCustomCountModal,
    isCustomDurationSelected, isCustomWordTargetSelected,
  };

  return (
    <div
      className={`relative flex ${fitToParentHeight ? "h-full min-h-0" : "h-[100dvh]"} flex-col items-center overflow-y-auto px-4 transition-colors duration-300`}
      style={{ backgroundColor: tv.bg.base }}
    >
      <div ref={topLayoutRef} className="shrink-0 w-full flex flex-col items-center">
      {/* Header clearance spacer */}
      <div className={`shrink-0 w-full ${settings.showOnScreenKeyboard && isRunning && !isFinished ? "pt-8 md:pt-10" : "pt-20 md:pt-24"}`} />

      <PracticeControls
        {...configurationProps}
        connectMode={connectMode}
        isRunning={isRunning}
        isFinished={isFinished}
        isCompactMode={isCompactMode}
        uiOpacity={uiOpacity}
        setShowQuickSettings={setShowQuickSettings}
      />

      {/* Live Stats Widget - Unified 2-row layout */}
      {isRunning && !isFinished && (() => {
        const kb = settings.showOnScreenKeyboard;
        const pillCls = "flex items-baseline gap-2 px-3 py-1.5 md:px-6 md:py-3 backdrop-blur-md rounded-full shadow-lg min-w-[70px] md:min-w-[100px] justify-center";
        const numCls = "text-xl md:text-3xl font-bold tabular-nums leading-none";
        const labelCls = "text-[10px] md:text-xs font-semibold uppercase tracking-wider";
        const subNumCls = "text-lg md:text-xl font-semibold tabular-nums leading-none";
        const dividerCls = "text-sm font-medium";
        return (
        <div
          className={`shrink-0 w-full flex flex-col items-center gap-2 select-none transition-opacity duration-300 ${kb ? "pb-8" : "pb-2"}`}
        >
          {/* Row 1: WPM + Mode-specific stat + Accuracy - hidden in kid mode */}
          {!isKidMode && (
            <div className="flex gap-2 md:gap-3">
              {/* WPM Pill */}
              <div
                className={pillCls}
                style={{ backgroundColor: `${colors.bg.surface}E6`, borderWidth: 1, borderColor: tv.border.subtle }}
              >
                <span className={numCls} style={{ color: tv.interactive.secondary.DEFAULT }}>
                  {Math.round(wpm)}
                </span>
                <span className={labelCls} style={{ color: tv.text.secondary }}>wpm</span>
              </div>

              {/* Time Mode: Countdown Timer */}
              {settings.mode === "time" && (
                <div
                  className={pillCls}
                  style={{ backgroundColor: `${colors.bg.surface}E6`, borderWidth: 1, borderColor: tv.border.subtle }}
                >
                  <span
                    className={numCls}
                    style={{ color: timeRemaining < 10 ? tv.status.error.DEFAULT : tv.text.primary }}
                  >
                    {formatTime(timeRemaining)}
                  </span>
                </div>
              )}

              {/* Words Mode: Word Counter */}
              {settings.mode === "words" && (
                <div
                  className={pillCls}
                  style={{ backgroundColor: `${colors.bg.surface}E6`, borderWidth: 1, borderColor: tv.border.subtle }}
                >
                  <span className={numCls} style={{ color: tv.text.primary }}>
                    {Math.min(typedWordCount, settings.wordTarget === 0 ? Infinity : settings.wordTarget)}
                  </span>
                  {settings.wordTarget > 0 && (
                    <>
                      <span className={dividerCls} style={{ color: tv.text.secondary }}>/</span>
                      <span className={subNumCls} style={{ color: tv.text.secondary }}>
                        {settings.wordTarget}
                      </span>
                    </>
                  )}
                </div>
              )}

              {/* Zen Mode: Count-up Timer */}
              {settings.mode === "zen" && (
                <>
                  <div
                    className={pillCls}
                    style={{ backgroundColor: `${colors.bg.surface}E6`, borderWidth: 1, borderColor: tv.border.subtle }}
                  >
                    <span className={numCls} style={{ color: tv.text.primary }}>
                      {formatTime(Math.floor(elapsedMs / 1000))}
                    </span>
                  </div>

                  <div
                    className={pillCls}
                    style={{ backgroundColor: `${colors.bg.surface}E6`, borderWidth: 1, borderColor: tv.border.subtle }}
                  >
                    <span className={numCls} style={{ color: tv.text.primary }}>
                      {typedWordCount}
                    </span>
                    <span className={dividerCls} style={{ color: tv.text.secondary }}>/</span>
                    <span className={subNumCls} style={{ color: tv.text.secondary }}>
                      {"\u221E"}
                    </span>
                  </div>
                </>
              )}

              {/* Accuracy Pill */}
              <div
                className={pillCls}
                style={{ backgroundColor: `${colors.bg.surface}E6`, borderWidth: 1, borderColor: tv.border.subtle }}
              >
                <span className={numCls} style={{ color: tv.interactive.secondary.DEFAULT }}>
                  {Math.round(accuracy)}%
                </span>
                <span className={labelCls} style={{ color: tv.text.secondary }}>acc</span>
              </div>
            </div>
          )}

          {/* Row 2: Progress Bar - shown in time/words/zen modes, hidden in kid mode */}
          {(settings.mode === "time" || settings.mode === "words" || settings.mode === "zen") && !isKidMode && (
            <div className={`flex ${kb ? "gap-1.5" : "gap-2 md:gap-3"} items-center`}>
              <div
                className={kb ? "w-48 px-2.5 py-1.5 backdrop-blur-md rounded-full shadow-lg" : "w-56 md:w-80 px-3 py-2.5 md:px-4 md:py-4 backdrop-blur-md rounded-full shadow-lg"}
                style={{ backgroundColor: `${colors.bg.surface}E6`, borderWidth: 1, borderColor: tv.border.subtle }}
              >
                {settings.mode === "zen" ? (
                  <div
                    className={`relative ${kb ? "h-1.5" : "h-2 md:h-2.5"} w-full overflow-hidden rounded-full`}
                    style={{ backgroundColor: tv.border.subtle }}
                  >
                    <motion.div
                      className="absolute inset-0 w-[200%]"
                      animate={{ x: ["0%", "-50%"] }}
                      transition={{
                        duration: 2,
                        ease: "linear",
                        repeat: Infinity,
                      }}
                      style={{
                        backgroundImage: zenProgressGradient,
                        backgroundSize: "50% 100%",
                        backgroundPosition: "0% 50%",
                        backgroundRepeat: "repeat-x",
                      }}
                    />
                  </div>
                ) : (
                  <Progress
                    value={
                      settings.mode === "time"
                        ? settings.duration > 0 ? (timeRemaining / settings.duration) * 100 : 0
                        : settings.wordTarget > 0
                          ? Math.min((typedWordCount / settings.wordTarget) * 100, 100)
                          : 0
                    }
                    className={kb ? "h-1.5" : "h-2 md:h-2.5"}
                    style={{ backgroundColor: tv.border.subtle }}
                    indicatorStyle={{
                      backgroundColor: settings.mode === "time" && timeRemaining < 10
                        ? tv.status.error.DEFAULT
                        : tv.status.success.DEFAULT,
                    }}
                  />
                )}
              </div>
            </div>
          )}

          {/* Kid Mode: Count-up Timer + Infinite Word Counter */}
          {isKidMode && (
            <div className={`flex ${kb ? "gap-1.5" : "gap-2 md:gap-3"}`}>
              <div
                className={pillCls}
                style={{ backgroundColor: `${colors.bg.surface}E6`, borderWidth: 1, borderColor: tv.border.subtle }}
              >
                <span className={numCls} style={{ color: tv.text.primary }}>
                  {formatTime(Math.floor(elapsedMs / 1000))}
                </span>
              </div>

              <div
                className={pillCls}
                style={{ backgroundColor: `${colors.bg.surface}E6`, borderWidth: 1, borderColor: tv.border.subtle }}
              >
                <span className={numCls} style={{ color: tv.text.primary }}>
                  {typedWordCount}
                </span>
                <span className={dividerCls} style={{ color: tv.text.secondary }}>/</span>
                <span className={subNumCls} style={{ color: tv.text.secondary }}>
                  {"\u221E"}
                </span>
              </div>
            </div>
          )}
        </div>
        );
      })()}
      </div>

      {/* Flexible spacer - balances content vertically */}
      <div className={settings.showOnScreenKeyboard && !isFinished ? "shrink-0" : "flex-1"} />

      <div
        className="w-full flex flex-col items-center transition-transform duration-300"
        style={!isCompactMode && !isFinished && !settings.showOnScreenKeyboard ? { transform: `translateY(${typingCenterOffset}px)` } : undefined}
      >
        {/* Quote Info */}
        {settings.mode === "quote" && currentQuote && !isFinished && (
          <div
            className="mb-4 flex flex-col items-center text-center animate-fade-in transition-opacity duration-500"
            style={{ opacity: uiOpacity }}
          >
            <div className="text-xl font-medium" style={{ color: tv.interactive.secondary.DEFAULT }}>
              {currentQuote.author}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm" style={{ color: tv.text.secondary }}>
                {currentQuote.source}, {currentQuote.date}
              </span>
            </div>
          </div>
        )}

        {/* Typing Area */}
        <div 
          className="w-[95%] md:w-[80%] max-w-none relative z-0 transition-all duration-300"
        >
        {!isFinished ? (
          <div className="relative z-0">
            <input
              ref={inputRef}
              name="typing-test-input"
              type="text"
              value={typedText}
              onChange={(e) => handleInput(e.target.value)}
              onPaste={(e) => {
                if (!connectMode) {
                  e.preventDefault();
                }
              }}
              onKeyDown={handleKeyDown}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              autoFocus
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              data-lpignore="true"
              className="absolute left-0 top-0 -z-10 opacity-0"
              style={{ caretColor: "transparent", color: "transparent", appearance: "none" }}
              disabled={connectMode && !isTestActive}
            />

            <div
              ref={containerRef}
              className={`cursor-text overflow-hidden relative transition-all duration-300 ${!isFocused ? "blur-sm opacity-50" : ""}`}
              style={{
                fontSize: `${settings.typingFontSize}rem`,
                fontFamily: getTypingFontFamily(settings.typingFontFamily),
                lineHeight: LINE_HEIGHT,
                maxHeight: `${linePreview * settings.typingFontSize * LINE_HEIGHT}rem`,
                textAlign: settings.textAlign,
              }}
              onMouseDown={(e) => {
                // Prevent mousedown from stealing focus from the input
                if (isFocused) {
                  e.preventDefault();
                }
              }}
              onClick={() => inputRef.current?.focus()}
            >
              <div
                style={{ transform: `translateY(-${scrollOffset}px)`, transition: "transform 0.1s ease-out" }}
              >
                {renderTypingArea()}
              </div>
            </div>

            {/* Click to focus overlay */}
            {!isFocused && (
              <div
                className="absolute inset-0 flex items-center justify-center cursor-pointer"
                onClick={() => inputRef.current?.focus()}
              >
                <span className="text-gray-500 text-lg">Click here to start typing</span>
              </div>
            )}

            {capsLockOn && !settings.showOnScreenKeyboard && (
              <div
                className="mt-3 flex items-center justify-center gap-2 text-lg font-medium"
                style={{ color: tv.status.warning.DEFAULT }}
              >
                <span>&#9888;</span>
                <span>CAPS Lock is ON</span>
              </div>
            )}

            {settings.showOnScreenKeyboard && (
              <OnScreenKeyboard
                nextChar={nextChar}
                capsLockOn={capsLockOn}
                layoutId={settings.keyboardLayout}
                activeKey={activeKey}
                visible={isFocused}
              />
            )}
          </div>
        ) : (
          <PracticeResults
            wpm={wpm}
            accuracy={accuracy}
            stats={stats}
            wordResults={wordResults}
            settings={settings}
            currentQuote={currentQuote}
            lastResultIsValid={lastResultIsValid}
            lastResultInvalidReason={lastResultInvalidReason}
            connectMode={connectMode}
            saveState={saveState}
            saveResults={saveResults}
            generateTest={generateTest}
            onLeave={onLeave}
          />
        )}
        </div>
      </div>

      <div ref={bottomLayoutRef} className={`shrink-0 w-full flex flex-col items-center ${settings.showOnScreenKeyboard && !isFinished && isRunning ? "" : settings.showOnScreenKeyboard && !isFinished ? "pt-2" : "pt-10 md:pt-12"}`}>
        {/* Instructions */}
        {!isRunning && !isFinished && (
          <div
            className="text-center text-gray-600 transition-opacity duration-300"
            style={{ fontSize: `${settings.helpFontSize}rem`, opacity: uiOpacity }}
          >
            {isRepeated && <div className="mb-2 text-red-500 font-medium">REPEATED</div>}
            <div>
              Press <kbd className="bg-gray-800 px-1.5 py-0.5 rounded text-gray-400 font-sans">Tab</kbd> +{" "}
              <kbd className="bg-gray-800 px-1.5 py-0.5 rounded text-gray-400 font-sans">Shift</kbd> to restart
            </div>
            <div>Click on the text area and start typing</div>
          </div>
        )}

        {/* Bottom padding */}
        <div className={`shrink-0 ${settings.showOnScreenKeyboard && !isFinished && isRunning ? "h-0" : settings.showOnScreenKeyboard && !isFinished ? "h-1" : "h-8"}`} />
      </div>

      {/* Flexible spacer - keeps typing area vertically centered */}
      <div className={settings.showOnScreenKeyboard && !isFinished ? "shrink-0" : "flex-1"} />

      <PracticePresetDialog
        showPresetInput={showPresetInput}
        setShowPresetInput={setShowPresetInput}
        handlePresetSubmit={handlePresetSubmit}
      />

      <PracticeThemePicker showThemeModal={showThemeModal} setShowThemeModal={setShowThemeModal} />

      <PracticeSettingsDialog
        showSettings={showSettings}
        setShowSettings={setShowSettings}
        settings={settings}
        updateSettings={updateSettings}
        linePreview={linePreview}
        setLinePreview={setLinePreview}
        maxWordsPerLine={maxWordsPerLine}
        setMaxWordsPerLine={setMaxWordsPerLine}
        soundManifest={soundManifest}
      />

      {showCustomCountModal && (
        <PracticeCountDialog
          settings={settings}
          setShowCustomCountModal={setShowCustomCountModal}
          onApply={applyCustomCount}
        />
      )}

      <PracticeQuickSettingsDialog
        {...configurationProps}
        showQuickSettings={showQuickSettings}
        setShowQuickSettings={setShowQuickSettings}
        linePreview={linePreview}
        setLinePreview={setLinePreview}
        maxWordsPerLine={maxWordsPerLine}
        setMaxWordsPerLine={setMaxWordsPerLine}
      />

      {/* Plan Builder Modal */}
      {showPlanBuilder && (
        <PlanBuilderModal
          initialPlan={plan}
          onSave={handleStartPlan}
          onClose={() => setShowPlanBuilder(false)}
        />
      )}

      {/* Plan Splash Screen */}
      {isPlanActive && isPlanSplash && plan[planIndex] && (
        <div className="fixed inset-0 z-40 flex items-center justify-center" style={{ backgroundColor: tv.bg.base }}>
          <div className="absolute top-4 right-4">
            <button
              onClick={exitPlanMode}
              className="px-4 py-2 transition-colors hover:opacity-80"
              style={{ color: tv.text.secondary }}
            >
              Exit Plan
            </button>
          </div>
          <PlanSplash
            item={plan[planIndex]}
            progress={{ current: planIndex + 1, total: plan.length }}
            onStart={handlePlanStepStart}
            theme={planTheme}
          />
        </div>
      )}

      {/* Plan Results Modal */}
      {showPlanResultsModal && (
        <PlanResultsModal
          user={{ id: "local", name: "You" }}
          plan={plan}
          results={planResults}
          theme={planTheme}
          onClose={() => {
            setShowPlanResultsModal(false);
            exitPlanMode();
          }}
        />
      )}

      {/* Plan Navigation (shown when in plan mode and finished a step) */}
      {isPlanActive && !isPlanSplash && isFinished && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-30 flex gap-4">
          {planIndex > 0 && (
            <button
              onClick={handlePlanPrev}
              className="px-6 py-3 rounded-lg font-medium transition-colors hover:opacity-90"
              style={{ backgroundColor: tv.bg.surface, color: tv.text.primary }}
            >
              ← Previous
            </button>
          )}
          <button
            onClick={handlePlanNext}
            className="px-6 py-3 text-white rounded-lg font-medium transition-colors hover:opacity-90"
            style={{ backgroundColor: tv.interactive.secondary.DEFAULT }}
          >
            {planIndex < plan.length - 1 ? "Next →" : "View Results"}
          </button>
        </div>
      )}
    </div>
  );
}
