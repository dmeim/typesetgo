import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Baby, Sun, Moon, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { useAnimatedCounter } from "@/hooks/useAnimatedCounter";
import type { Quote, SettingsState } from "@/lib/typing-constants";
import { fetchSoundManifest, getRandomSoundUrl, type SoundManifest } from "@/lib/sounds";
import { fetchAllThemes, groupThemesByCategory, CATEGORY_CONFIG, type ThemeDefinition, type GroupedThemes, type ThemeCategory } from "@/lib/themes";
import type { LegacyTheme, ThemeMode } from "@/types/theme";
import { toLegacyTheme } from "@/types/theme";
import { useTheme } from "@/hooks/useTheme";
import { fetchWordsManifest, fetchWords, type WordsManifest } from "@/lib/words";
import { fetchQuotesManifest, fetchQuotes, type QuotesManifest } from "@/lib/quotes";
import {
  loadSettings,
  saveSettings,
} from "@/lib/storage-utils";
import SoundController from "./SoundController";
import GhostWriterController from "./GhostWriterController";
import type { Plan, PlanItem, PlanStepResult } from "@/types/plan";
import PlanBuilderModal from "@/components/plan/PlanBuilderModal";
import PlanSplash from "@/components/plan/PlanSplash";
import PlanResultsModal from "@/components/plan/PlanResultsModal";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Progress } from "@/components/ui/progress";
import { useUser, useClerk } from "@clerk/clerk-react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import {
  PROGRESS_INTERVAL_MS,
  PROGRESS_CHAR_THRESHOLD,
} from "../../../convex/lib/antiCheatConstants";
import { useNotifications } from "@/lib/notification-store";
import { getAchievementById, TIER_COLORS } from "@/lib/achievement-definitions";

// Constants
const TIME_PRESETS = [15, 30, 60, 120, 300];
const WORD_PRESETS = [10, 25, 50, 100, 500];
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

// Animated counter display for WPM
function AnimatedWpmDisplay({ value, color }: { value: number; color: string }) {
  const animated = useAnimatedCounter(value, 1000, 200);
  return (
    <div
      className="text-6xl md:text-8xl font-black tabular-nums leading-none tracking-tight"
      style={{ color }}
    >
      {animated}
    </div>
  );
}

// Animated counter display for Accuracy
function AnimatedAccuracyDisplay({ value, color }: { value: number; color: string }) {
  const animated = useAnimatedCounter(value, 1000, 300);
  return (
    <div
      className="text-6xl md:text-8xl font-black tabular-nums leading-none tracking-tight"
      style={{ color }}
    >
      {animated}
      <span className="text-2xl md:text-4xl align-top ml-1 opacity-50">%</span>
    </div>
  );
}

export default function TypingPractice({
  connectMode = false,
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
    legacyTheme: contextTheme,
    themeName: selectedThemeName,
    setTheme: setThemeById,
    setMode,
  } = useTheme();

  // Fallback theme for when context is loading
  const theme: LegacyTheme = contextTheme ?? {
    cursor: "#3cb5ee",
    defaultText: "#4b5563",
    upcomingText: "#4b5563",
    correctText: "#d1d5db",
    incorrectText: "#ef4444",
    ghostCursor: "#a855f7",
    buttonUnselected: "#3cb5ee",
    buttonSelected: "#0097b2",
    accentColor: "#a855f7",
    accentMuted: "rgba(168, 85, 247, 0.3)",
    accentSubtle: "rgba(168, 85, 247, 0.1)",
    backgroundColor: "#323437",
    surfaceColor: "#2c2e31",
    elevatedColor: "#37383b",
    overlayColor: "rgba(0, 0, 0, 0.5)",
    textPrimary: "#d1d5db",
    textSecondary: "#4b5563",
    textMuted: "rgba(75, 85, 99, 0.6)",
    textInverse: "#ffffff",
    borderDefault: "rgba(75, 85, 99, 0.3)",
    borderSubtle: "rgba(75, 85, 99, 0.15)",
    borderFocus: "#3cb5ee",
    statusSuccess: "#22c55e",
    statusSuccessMuted: "rgba(34, 197, 94, 0.3)",
    statusError: "#ef4444",
    statusErrorMuted: "rgba(239, 68, 68, 0.3)",
    statusWarning: "#f59e0b",
    statusWarningMuted: "rgba(245, 158, 11, 0.3)",
  };
  // --- State ---
  const [settings, setSettings] = useState<SettingsState>({
    mode: "zen",
    duration: 30,
    wordTarget: 25,
    punctuation: false,
    numbers: false,
    capitalization: false,
    typingFontSize: 3.25,
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
  const [isCustomThemeOpen, setIsCustomThemeOpen] = useState(false);
  const [availableThemes, setAvailableThemes] = useState<ThemeDefinition[]>([]);
  const [groupedThemes, setGroupedThemes] = useState<GroupedThemes[]>([]);
  const [previewThemeDef, setPreviewThemeDef] = useState<(ThemeDefinition & { previewMode?: ThemeMode }) | null>(null);
  
  // Helper to set preview theme with optional mode
  const setPreviewTheme = useCallback((theme: ThemeDefinition | null, mode?: ThemeMode) => {
    if (!theme) {
      setPreviewThemeDef(null);
    } else {
      setPreviewThemeDef({ ...theme, previewMode: mode });
    }
  }, []);
  
  // Convert preview theme to legacy format for styling
  const previewTheme: LegacyTheme | null = useMemo(() => {
    if (!previewThemeDef) return null;
    // Use preview mode if specified, otherwise default to dark
    const colors = previewThemeDef.previewMode === "light" && previewThemeDef.light 
      ? previewThemeDef.light 
      : previewThemeDef.dark;
    return toLegacyTheme(colors);
  }, [previewThemeDef]);
  /*
   * TEMP_DISABLED_CATEGORIES_TAB
   * Keep categories mode wiring for easy restore; force all-themes mode for now.
   *
  const [themeViewMode, setThemeViewMode] = useState<"all" | "categories">("all");
   */
  const themeViewMode: "all" = "all";
  const [selectedCategory, setSelectedCategory] = useState<ThemeCategory | null>(null);
  const [themeSearchQuery, setThemeSearchQuery] = useState("");
  // Collapse state for "All Themes" view — all collapsed except "Featured" by default
  const getDefaultCollapsedCategories = useCallback(() => {
    const allCategoryKeys = Object.keys(CATEGORY_CONFIG) as ThemeCategory[];
    return new Set(allCategoryKeys.filter((c) => c !== "default"));
  }, []);
  const [collapsedCategories, setCollapsedCategories] = useState<Set<ThemeCategory>>(getDefaultCollapsedCategories);
  const normalizedThemeSearchQuery = themeSearchQuery.trim().toLowerCase();
  const filteredGroupedThemes = useMemo(() => {
    if (!normalizedThemeSearchQuery) return groupedThemes;

    return groupedThemes
      .map((group) => ({
        ...group,
        themes: (() => {
          const displayNameMatch = group.displayName.toLowerCase().includes(normalizedThemeSearchQuery);
          const categoryKeyMatch = group.category.toLowerCase().includes(normalizedThemeSearchQuery);

          if (displayNameMatch || categoryKeyMatch) {
            return group.themes;
          }

          return group.themes.filter((themeData) => {
            const nameMatch = themeData.name.toLowerCase().includes(normalizedThemeSearchQuery);
            const idMatch = themeData.id.toLowerCase().includes(normalizedThemeSearchQuery);
            return nameMatch || idMatch;
          });
        })(),
      }))
      .filter((group) => group.themes.length > 0);
  }, [groupedThemes, normalizedThemeSearchQuery]);
  /*
   * TEMP_DISABLED_CATEGORIES_TAB
   * Keeping category-only filtering logic in place for easy restore later.
   *
  const filteredCategoryGroups = useMemo(() => {
    if (!normalizedThemeSearchQuery) return groupedThemes;

    return groupedThemes.filter((group) => {
      const displayNameMatch = group.displayName.toLowerCase().includes(normalizedThemeSearchQuery);
      const categoryKeyMatch = group.category.toLowerCase().includes(normalizedThemeSearchQuery);
      return displayNameMatch || categoryKeyMatch;
    });
  }, [groupedThemes, normalizedThemeSearchQuery]);
  const filteredSelectedCategoryThemes = useMemo(() => {
    if (!selectedCategory) return [];

    const categoryThemes = groupedThemes.find((group) => group.category === selectedCategory)?.themes ?? [];
    if (!normalizedThemeSearchQuery) return categoryThemes;

    return categoryThemes.filter((themeData) => {
      const nameMatch = themeData.name.toLowerCase().includes(normalizedThemeSearchQuery);
      const idMatch = themeData.id.toLowerCase().includes(normalizedThemeSearchQuery);
      return nameMatch || idMatch;
    });
  }, [groupedThemes, selectedCategory, normalizedThemeSearchQuery]);
  */
  const [soundManifest, setSoundManifest] = useState<SoundManifest | null>(null);
  const [wordsManifest, setWordsManifest] = useState<WordsManifest | null>(null);
  const [quotesManifest, setQuotesManifest] = useState<QuotesManifest | null>(null);
  const [showPresetInput, setShowPresetInput] = useState(false);
  const [tempPresetText, setTempPresetText] = useState("");
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
  const [isWarningPlayed, setIsWarningPlayed] = useState(false);
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

  // Anti-cheat session state
  const [sessionId, setSessionId] = useState<Id<"typingSessions"> | null>(null);
  const sessionIdRef = useRef<Id<"typingSessions"> | null>(null); // Mirror for use in callbacks without causing re-renders
  const lastProgressRef = useRef<number>(0);
  const lastProgressTimeRef = useRef<number>(0);

  // Keep ref in sync with state
  useEffect(() => {
    sessionIdRef.current = sessionId;
  }, [sessionId]);

  // Clerk auth hooks
  const { isSignedIn, user } = useUser();
  const { openSignIn } = useClerk();
  const saveResultMutation = useMutation(api.testResults.saveResult);
  const getOrCreateUser = useMutation(api.users.getOrCreateUser);

  // Notification store for achievement toasts
  const { addNotification } = useNotifications();

  // Anti-cheat session mutations
  const startSessionMutation = useMutation(api.typingSessions.startSession);
  const recordProgressMutation = useMutation(api.typingSessions.recordProgress);
  const finalizeSessionMutation = useMutation(api.typingSessions.finalizeSession);
  const cancelSessionMutation = useMutation(api.typingSessions.cancelSession);

  // Preferences sync
  const dbPreferences = useQuery(
    api.preferences.getPreferences,
    user ? { clerkId: user.id } : "skip"
  );
  const savePreferencesMutation = useMutation(api.preferences.savePreferences);
  const hasAppliedDbPrefs = useRef(false);
  const prefsDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const inputRef = useRef<HTMLInputElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const activeWordRef = useRef<HTMLSpanElement | null>(null);
  const hasLoadedFromStorage = useRef(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    () => `linear-gradient(120deg, ${theme.buttonSelected} 0%, ${theme.accentColor} 25%, ${theme.buttonUnselected} 50%, ${theme.accentColor} 75%, ${theme.buttonSelected} 100%)`,
    [
      theme.buttonSelected,
      theme.accentColor,
      theme.buttonUnselected,
    ]
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
    }, 500);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [settings]);

  // Theme saving is now handled by ThemeContext

  // --- Compact Mode Detection (for zoomed/narrow viewports) ---
  useEffect(() => {
    const COMPACT_THRESHOLD = 768;
    
    const checkCompactMode = () => {
      setIsCompactMode(window.innerWidth < COMPACT_THRESHOLD);
    };
    
    // Check on mount
    checkCompactMode();
    
    // Listen for resize events
    window.addEventListener("resize", checkCompactMode);
    return () => window.removeEventListener("resize", checkCompactMode);
  }, []);

  // --- Reset DB prefs flag when user changes ---
  useEffect(() => {
    hasAppliedDbPrefs.current = false;
  }, [user?.id]);

  // --- Load Preferences from DB (for logged-in users) ---
  useEffect(() => {
    if (!dbPreferences || hasAppliedDbPrefs.current) return;
    hasAppliedDbPrefs.current = true;

    // Use requestAnimationFrame to defer state updates and avoid cascading renders
    requestAnimationFrame(async () => {
      // Apply theme from DB using the context
      if (dbPreferences.themeName && !dbPreferences.customTheme) {
        // Named theme: set via context (which handles loading and CSS variables)
        await setThemeById(dbPreferences.themeName.toLowerCase().replace(/\s+/g, "-"));
      }
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
        soundEnabled: dbPreferences.soundEnabled,
        typingSound: dbPreferences.typingSound,
        warningSound: dbPreferences.warningSound,
        errorSound: dbPreferences.errorSound,
        ghostWriterEnabled: dbPreferences.ghostWriterEnabled,
        ghostWriterSpeed: dbPreferences.ghostWriterSpeed,
        typingFontSize: dbPreferences.typingFontSize,
        iconFontSize: dbPreferences.iconFontSize,
        helpFontSize: dbPreferences.helpFontSize,
        textAlign: dbPreferences.textAlign as typeof prev.textAlign,
      }));
    });
  }, [dbPreferences, setThemeById, user?.id]);

  // --- Save Preferences to DB (debounced, for logged-in users) ---
  useEffect(() => {
    if (!user || !hasLoadedFromStorage.current) return;

    if (prefsDebounceRef.current) {
      clearTimeout(prefsDebounceRef.current);
    }

    prefsDebounceRef.current = setTimeout(async () => {
      try {
        // Ensure user exists in Convex first
        await getOrCreateUser({
          clerkId: user.id,
          email: user.primaryEmailAddress?.emailAddress ?? "",
          username: user.username ?? user.firstName ?? "User",
          avatarUrl: user.imageUrl,
        });

        await savePreferencesMutation({
          clerkId: user.id,
          preferences: {
            themeName: selectedThemeName,
            customTheme: selectedThemeName === "Custom" ? theme : undefined,
            soundEnabled: settings.soundEnabled,
            typingSound: settings.typingSound,
            warningSound: settings.warningSound,
            errorSound: settings.errorSound,
            ghostWriterEnabled: settings.ghostWriterEnabled,
            ghostWriterSpeed: settings.ghostWriterSpeed,
            typingFontSize: settings.typingFontSize,
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
          },
        });
      } catch (error) {
        console.warn("Failed to save preferences to DB:", error);
      }
    }, 1000);

    return () => {
      if (prefsDebounceRef.current) {
        clearTimeout(prefsDebounceRef.current);
      }
    };
  }, [
    user,
    settings.mode,
    settings.duration,
    settings.wordTarget,
    settings.difficulty,
    settings.quoteLength,
    settings.punctuation,
    settings.numbers,
    settings.capitalization,
    settings.soundEnabled,
    settings.typingSound,
    settings.warningSound,
    settings.errorSound,
    settings.ghostWriterEnabled,
    settings.ghostWriterSpeed,
    settings.typingFontSize,
    settings.iconFontSize,
    settings.helpFontSize,
    settings.textAlign,
    theme,
    selectedThemeName,
    getOrCreateUser,
    savePreferencesMutation,
  ]);

  // --- Load available themes ---
  useEffect(() => {
    fetchAllThemes().then((themes) => {
      setAvailableThemes(themes);
      setGroupedThemes(groupThemesByCategory(themes));
    });
  }, []);

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

  const resetSession = useCallback((isRepeat = false) => {
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
    // Cancel any existing session (use ref to avoid dependency cycle)
    if (sessionIdRef.current) {
      cancelSessionMutation({ sessionId: sessionIdRef.current }).catch(() => {});
    }
    setSessionId(null);
    lastProgressRef.current = 0;
    lastProgressTimeRef.current = 0;
    inputRef.current?.focus();
  }, [cancelSessionMutation]);

  // Ref to store pending plan result
  const pendingPlanResultRef = useRef<{
    itemId: string;
    result: PlanStepResult;
  } | null>(null);

  const finishSession = useCallback(() => {
    if (isFinished) return;

    // If in plan mode, prepare the result to be recorded
    if (isPlanActive && !isPlanSplash) {
      const currentItem = plan[planIndex];
      if (currentItem && !planResults[currentItem.id]) {
        const currentWpm = (typedText.length / 5) / (elapsedMs / 60000 || 0.01);
        const currentStats = computeStats(typedText, words);
        const currentAccuracy = typedText.length > 0 ? (currentStats.correct / typedText.length) * 100 : 100;

        pendingPlanResultRef.current = {
          itemId: currentItem.id,
          result: {
            wpm: Math.round(currentWpm) || 0,
            accuracy: currentAccuracy || 100,
            raw: Math.round(currentWpm) || 0,
            consistency: 0,
            time: elapsedMs,
            date: Date.now(),
            mode: currentItem.mode,
            metadata: currentItem.metadata,
          },
        };
      }
    }

    // Record final progress before finishing (use ref to avoid dependency cycle)
    if (sessionIdRef.current && typedText.length > lastProgressRef.current) {
      recordProgressMutation({ sessionId: sessionIdRef.current, typedTextLength: typedText.length })
        .catch(() => {}); // Silently ignore errors
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
  }, [isFinished, isPlanActive, isPlanSplash, plan, planIndex, planResults, typedText, words, elapsedMs, recordProgressMutation]);

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

  // Save results to Convex (using session-based flow when available)
  const saveResults = useCallback(async (resultData?: typeof pendingResultRef.current) => {
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
      // Store result and open sign-in
      pendingResultRef.current = dataToSave;
      openSignIn();
      return;
    }

    setSaveState("saving");
    try {
      // Ensure user exists in Convex
      await getOrCreateUser({
        clerkId: user.id,
        email: user.primaryEmailAddress?.emailAddress ?? "",
        username: user.username ?? user.firstName ?? "User",
        avatarUrl: user.imageUrl,
      });

      // Get local date/time info for streak and achievement tracking
      const now = new Date();
      const localDate = now.toISOString().split("T")[0]; // "YYYY-MM-DD"
      const localHour = now.getHours(); // 0-23
      const dayOfWeek = now.getDay(); // 0-6 (Sunday-Saturday)
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6; // Sunday or Saturday
      const month = now.getMonth(); // 0-11
      const day = now.getDate(); // 1-31

      // Helper function to show toasts for new achievements
      const showAchievementToasts = (achievementIds: string[]) => {
        for (const achievementId of achievementIds) {
          const achievement = getAchievementById(achievementId);
          if (achievement) {
            const tierColor = TIER_COLORS[achievement.tier]?.bg || "#FFD700";
            
            // Add to notification store
            addNotification({
              type: "achievement",
              title: achievement.title,
              description: achievement.description,
              metadata: {
                achievementId: achievement.id,
                achievementTier: achievement.tier,
              },
            });

            // Show toast notification with bounce animation on icon
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
                backgroundColor: theme.surfaceColor,
                color: theme.textPrimary,
                boxShadow: `0 0 20px ${tierColor}30`,
                animation: "achievement-glow 2s ease-in-out",
              },
              descriptionClassName: "!text-current opacity-70",
              action: {
                label: "Ok",
                onClick: () => {
                  // Just dismisses the toast - user can view achievement details from notification tray
                },
              },
            });
          }
        }
      };

      // If we have a session, try the new finalize flow (server-authoritative)
      if (sessionId) {
        try {
          const finalizeResult = await finalizeSessionMutation({
            sessionId,
            typedText,
            clientElapsedMs: elapsedMs,
            localDate,
            localHour,
            isWeekend,
            dayOfWeek,
            month,
            day,
          });
          setLastResultIsValid(finalizeResult.isValid);
          setLastResultInvalidReason(finalizeResult.invalidReason);
          setSessionId(null);
          setSaveState("saved");
          pendingResultRef.current = null;
          
          // Show toasts for new achievements
          if (finalizeResult.newAchievements && finalizeResult.newAchievements.length > 0) {
            showAchievementToasts(finalizeResult.newAchievements);
          }
          return;
        } catch (finalizeError) {
          // Session may have been cancelled or expired - fall back to legacy save
          console.warn("Finalize session failed, falling back to legacy save:", finalizeError);
          setSessionId(null);
        }
      }

      // Fall back to legacy save (no session or finalize failed) - result won't have server validation
      const legacyResult = await saveResultMutation({
        clerkId: user.id,
        ...dataToSave,
        localDate,
        localHour,
        isWeekend,
        dayOfWeek,
        month,
        day,
      });
      setSaveState("saved");
      pendingResultRef.current = null;
      
      // Show toasts for new achievements from legacy save
      if (legacyResult.newAchievements && legacyResult.newAchievements.length > 0) {
        showAchievementToasts(legacyResult.newAchievements);
      }
    } catch (error) {
      console.error("Failed to save result:", error);
      setSaveState("error");
    }
  }, [user, wpm, accuracy, settings.mode, settings.difficulty, settings.punctuation, settings.numbers, settings.capitalization, elapsedMs, typedText, wordResults, stats, openSignIn, getOrCreateUser, saveResultMutation, sessionId, finalizeSessionMutation, addNotification, theme.surfaceColor, theme.textPrimary]);

  // Effect to save pending result after sign-in
  useEffect(() => {
    if (isSignedIn && user && pendingResultRef.current) {
      const pending = pendingResultRef.current;
      pendingResultRef.current = null;
      saveResults(pending);
    }
  }, [isSignedIn, user, saveResults]);

  // Start anti-cheat session when test begins (for logged-in users)
  useEffect(() => {
    if (!isRunning || isFinished || !user || sessionId || connectMode) return;

    const startSession = async () => {
      try {
        const result = await startSessionMutation({
          clerkId: user.id,
          settings: {
            mode: settings.mode,
            duration: settings.mode === "time" ? settings.duration : undefined,
            wordTarget: settings.mode === "words" ? settings.wordTarget : undefined,
            difficulty: settings.difficulty,
            punctuation: settings.punctuation,
            numbers: settings.numbers,
            capitalization: settings.capitalization,
          },
          targetText: words,
        });
        setSessionId(result.sessionId);
        lastProgressTimeRef.current = Date.now();
      } catch (error) {
        console.warn("Failed to start session:", error);
        // Continue without session - result will be marked as unverified
      }
    };

    startSession();
  }, [
    isRunning,
    isFinished,
    user,
    sessionId,
    connectMode,
    startSessionMutation,
    settings.mode,
    settings.duration,
    settings.wordTarget,
    settings.difficulty,
    settings.punctuation,
    settings.numbers,
    settings.capitalization,
    words,
  ]);

  // Record progress periodically during typing (throttled)
  useEffect(() => {
    if (!isRunning || isFinished || !sessionId) return;

    const charsSinceLastReport = typedText.length - lastProgressRef.current;
    const timeSinceLastReport = Date.now() - lastProgressTimeRef.current;

    const shouldReport =
      charsSinceLastReport >= PROGRESS_CHAR_THRESHOLD ||
      timeSinceLastReport >= PROGRESS_INTERVAL_MS;

    if (shouldReport && charsSinceLastReport !== 0) {
      recordProgressMutation({ sessionId, typedTextLength: typedText.length })
        .then(() => {
          lastProgressRef.current = typedText.length;
          lastProgressTimeRef.current = Date.now();
        })
        .catch(() => {
          // Silently ignore progress recording errors
        });
    }
  }, [typedText, isRunning, isFinished, sessionId, recordProgressMutation]);

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

  // Generate test on mode/difficulty change
  useEffect(() => {
    if (wordPool.length > 0 || settings.mode === "quote" || settings.mode === "preset") {
      requestAnimationFrame(() => {
        generateTest();
      });
    }
  }, [settings.mode, settings.difficulty, wordPool.length, generateTest]);

  // --- Timer ---
  useEffect(() => {
    if (!isRunning || !startTime) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const elapsed = now - startTime;
      setElapsedMs(elapsed);

      if (settings.mode === "time" && elapsed >= settings.duration * 1000) {
        finishSession();
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
  }, [isRunning, startTime, settings.mode, settings.duration, finishSession, playWarningSound, isWarningPlayed]);

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

    if (!isRunning) {
      setIsRunning(true);
      setStartTime(Date.now());
    }

    setTypedText(value);
    playClickSound();

    if (settings.mode === "quote" || settings.mode === "preset") {
      if (value.length === words.length) {
        finishSession();
      }
      return;
    }

    if (settings.mode === "time" || settings.mode === "zen") {
      const currentWords = value.trim().split(/\s+/).length;
      const totalWords = words.split(" ").length;
      if (totalWords - currentWords < 50) {
        const newWords = generateWords(50, wordPool, {
          punctuation: settings.punctuation,
          numbers: settings.numbers,
          capitalization: settings.capitalization,
        });
        setWords((prev) => prev + " " + newWords);
      }
    }

    if (settings.mode === "words" && settings.wordTarget > 0) {
      const typedWords = value.trim().split(/\s+/).length;
      if (value.endsWith(" ") && typedWords >= settings.wordTarget) {
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

  const handleThemeSelect = async (themeName: string, mode?: ThemeMode) => {
    // Find the theme to get its ID
    const themeData = availableThemes.find(
      (t) => t.name.toLowerCase() === themeName.toLowerCase()
    );
    if (themeData) {
      // Use the theme ID (lowercase, hyphenated) for the context
      await setThemeById(themeData.id);
      // If a specific mode was requested and the theme supports it, set the mode
      if (mode) {
        // Only set light mode if the theme has a light variant
        if (mode === "light" && themeData.light) {
          setMode("light");
        } else if (mode === "dark") {
          setMode("dark");
        }
      }
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

              let charColor = theme.defaultText;
              if (!isTyped) {
                if (isPastWord) charColor = theme.incorrectText;
                else if (isCursor) charColor = theme.upcomingText;
              } else {
                charColor = isCorrect ? theme.correctText : theme.incorrectText;
              }

              return (
                <span key={charIdx} className="relative" style={{ color: charColor }}>
                  {char}
                  {isCursor && (
                    <span
                      className="absolute left-0 top-0 h-full w-0.5 animate-pulse"
                      style={{ backgroundColor: theme.cursor }}
                    />
                  )}
                  {isGhost && (
                    <span
                      className="absolute left-0 top-0 h-full w-0.5 opacity-70"
                      style={{ backgroundColor: theme.ghostCursor }}
                    />
                  )}
                </span>
              );
            })}
            {(isCurrentWord || isPastWord) && typedWord.length > word.length && (
              <span style={{ color: theme.incorrectText }}>{typedWord.slice(word.length)}</span>
            )}
            {isCurrentWord && typedWord.length === word.length && (
              <span className="relative">
                <span
                  className="absolute left-0 top-0 h-full w-0.5 animate-pulse"
                  style={{ backgroundColor: theme.cursor }}
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

  return (
    <div
      className="relative flex min-h-[100dvh] flex-col items-center justify-center px-4 pb-8 pt-8 transition-colors duration-300"
      style={{ backgroundColor: theme.backgroundColor }}
    >
      {/* Settings Controls - Fixed at top */}
      {!connectMode && !isRunning && !isFinished && (
        <div
          className="fixed inset-x-0 flex flex-col items-center justify-center gap-4 transition-opacity duration-300 z-30 pointer-events-none"
          style={{ 
            fontSize: `${settings.iconFontSize}rem`, 
            opacity: uiOpacity,
            // Fixed position below the header (which is ~80px tall with z-50)
            top: "140px",
          }}
        >
          {/* Row 1: Kid Mode, Sound, Ghost Writer, Theme, Settings */}
          <div className="flex items-center justify-center gap-4 text-gray-400 pointer-events-auto">
            <div className="flex items-center gap-3 rounded-lg px-4 py-2" style={{ backgroundColor: theme.surfaceColor }}>
              {/* Kid Mode Toggle Button */}
              <button
                type="button"
                onClick={() => {
                  if (isKidMode) {
                    // Toggle OFF: restore previous settings
                    if (preKidModeSettings) {
                      updateSettings({
                        mode: preKidModeSettings.mode,
                        typingFontSize: preKidModeSettings.typingFontSize,
                        ghostWriterEnabled: preKidModeSettings.ghostWriterEnabled,
                      });
                      setLinePreview(preKidModeSettings.linePreview);
                      setMaxWordsPerLine(preKidModeSettings.maxWordsPerLine);
                    }
                    setPreKidModeSettings(null);
                    setIsKidMode(false);
                  } else {
                    // Toggle ON: save current settings and apply kid presets
                    setPreKidModeSettings({
                      mode: settings.mode,
                      typingFontSize: settings.typingFontSize,
                      ghostWriterEnabled: settings.ghostWriterEnabled,
                      linePreview,
                      maxWordsPerLine,
                    });
                    updateSettings({
                      mode: "zen",
                      typingFontSize: 5.5,
                      ghostWriterEnabled: false,
                    });
                    setLinePreview(2);
                    setMaxWordsPerLine(5);
                    setIsKidMode(true);
                  }
                }}
                className="flex items-center gap-1 transition hover:opacity-75"
                style={{ color: isKidMode ? theme.buttonSelected : theme.buttonUnselected }}
                title={isKidMode ? "Exit Kid Mode" : "Kid Mode - Large text, simple layout, no timer"}
              >
                <Baby
                  size={20}
                  fill={isKidMode ? "currentColor" : "none"}
                  strokeWidth={1.5}
                />
              </button>
              <div className="w-px h-4 bg-gray-700"></div>
              <SoundController
                settings={settings}
                onUpdateSettings={updateSettings}
                soundManifest={soundManifest}
                theme={theme}
              />
              <div className="w-px h-4 bg-gray-700"></div>
              <GhostWriterController
                settings={settings}
                onUpdateSettings={updateSettings}
                theme={theme}
              />
              {/* Quick Settings Button (compact mode only) */}
              {isCompactMode && (
                <>
                  <div className="w-px h-4 bg-gray-700"></div>
                  <button
                    type="button"
                    onClick={() => setShowQuickSettings(true)}
                    className="flex items-center gap-2 transition hover:text-gray-200"
                    style={{ color: theme.buttonUnselected }}
                    title="Quick Settings"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <line x1="4" y1="21" x2="4" y2="14" />
                      <line x1="4" y1="10" x2="4" y2="3" />
                      <line x1="12" y1="21" x2="12" y2="12" />
                      <line x1="12" y1="8" x2="12" y2="3" />
                      <line x1="20" y1="21" x2="20" y2="16" />
                      <line x1="20" y1="12" x2="20" y2="3" />
                      <line x1="1" y1="14" x2="7" y2="14" />
                      <line x1="9" y1="8" x2="15" y2="8" />
                      <line x1="17" y1="16" x2="23" y2="16" />
                    </svg>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Row 2: Test Mode | Modifiers (hidden in compact mode or kid mode) */}
          {!isCompactMode && !isKidMode && (
          <div className="flex flex-wrap items-center justify-center gap-3 text-gray-400 pointer-events-auto">
            {/* Test Modes */}
            <span className="text-sm font-medium" style={{ color: theme.textSecondary }}>Mode</span>
            <div className="flex rounded-lg p-1" style={{ backgroundColor: theme.surfaceColor }}>
              {(["zen", "time", "words", "quote"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => {
                    if (settings.mode === m) {
                      generateTest();
                    } else {
                      updateSettings({ mode: m });
                    }
                  }}
                  className={`px-3 py-1 rounded transition ${settings.mode === m ? "font-medium bg-gray-800" : "hover:text-gray-200"}`}
                  style={{ color: settings.mode === m ? theme.buttonSelected : undefined }}
                >
                  {m}
                </button>
              ))}
            </div>

            <div className="w-px h-4 bg-gray-700"></div>

            {/* Modifiers: Caps, Punctuation & Numbers */}
            <span className="text-sm font-medium" style={{ color: theme.textSecondary }}>Modifiers</span>
            <div className="flex gap-4 rounded-lg px-3 py-1.5" style={{ backgroundColor: theme.surfaceColor }}>
              <button
                type="button"
                onClick={() => updateSettings({ capitalization: !settings.capitalization })}
                className={`flex items-center gap-2 transition ${settings.capitalization ? "" : "hover:text-gray-200"}`}
                style={{ color: settings.capitalization ? theme.buttonSelected : undefined }}
                disabled={settings.mode === "quote"}
                title={settings.mode === "quote" ? "Not available in quote mode" : "Toggle capitalization"}
              >
                <span
                  className={settings.capitalization ? "text-gray-900 rounded px-1 text-[0.75em] font-bold" : "bg-gray-700 rounded px-1 text-[0.75em]"}
                  style={{ 
                    backgroundColor: settings.capitalization ? theme.buttonSelected : undefined,
                    opacity: settings.mode === "quote" ? 0.5 : 1
                  }}
                >
                  Aa
                </span>
                <span style={{ opacity: settings.mode === "quote" ? 0.5 : 1 }}>caps</span>
              </button>
              <button
                type="button"
                onClick={() => updateSettings({ punctuation: !settings.punctuation })}
                className={`flex items-center gap-2 transition ${settings.punctuation ? "" : "hover:text-gray-200"}`}
                style={{ color: settings.punctuation ? theme.buttonSelected : undefined }}
                disabled={settings.mode === "quote"}
                title={settings.mode === "quote" ? "Not available in quote mode" : "Toggle punctuation"}
              >
                <span
                  className={settings.punctuation ? "text-gray-900 rounded px-1 text-[0.75em] font-bold" : "bg-gray-700 rounded px-1 text-[0.75em]"}
                  style={{ 
                    backgroundColor: settings.punctuation ? theme.buttonSelected : undefined,
                    opacity: settings.mode === "quote" ? 0.5 : 1
                  }}
                >
                  @
                </span>
                <span style={{ opacity: settings.mode === "quote" ? 0.5 : 1 }}>punctuation</span>
              </button>
              <button
                type="button"
                onClick={() => updateSettings({ numbers: !settings.numbers })}
                className={`flex items-center gap-2 transition ${settings.numbers ? "" : "hover:text-gray-200"}`}
                style={{ color: settings.numbers ? theme.buttonSelected : undefined }}
                disabled={settings.mode === "quote"}
                title={settings.mode === "quote" ? "Not available in quote mode" : "Toggle numbers"}
              >
                <span
                  className={settings.numbers ? "text-gray-900 rounded px-1 text-[0.75em] font-bold" : "bg-gray-700 rounded px-1 text-[0.75em]"}
                  style={{ 
                    backgroundColor: settings.numbers ? theme.buttonSelected : undefined,
                    opacity: settings.mode === "quote" ? 0.5 : 1
                  }}
                >
                  #
                </span>
                <span style={{ opacity: settings.mode === "quote" ? 0.5 : 1 }}>numbers</span>
              </button>
            </div>
          </div>
          )}

          {/* Row 3: Time/Word Count/Quote Length + Difficulty with labels (hidden in compact mode or kid mode) */}
          {!isCompactMode && !isKidMode && (
          <div className="flex flex-wrap items-center justify-center gap-3 text-gray-400 pointer-events-auto">
            {/* Time Duration */}
            {settings.mode === "time" && (
              <>
                <span className="text-sm font-medium" style={{ color: theme.textSecondary }}>Duration</span>
                <div className="flex rounded-lg p-1" style={{ backgroundColor: theme.surfaceColor }}>
                  {TIME_PRESETS.map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => {
                        if (settings.duration === d) generateTest();
                        else updateSettings({ duration: d });
                      }}
                      className={`px-3 py-1 rounded transition ${settings.duration === d ? "font-medium bg-gray-800" : "hover:text-gray-200"}`}
                      style={{ color: settings.duration === d ? theme.buttonSelected : undefined }}
                    >
                      {d}s
                    </button>
                  ))}
                </div>
              </>
            )}

            {/* Word Count */}
            {settings.mode === "words" && (
              <>
                <span className="text-sm font-medium" style={{ color: theme.textSecondary }}>Word Count</span>
                <div className="flex rounded-lg p-1" style={{ backgroundColor: theme.surfaceColor }}>
                  {WORD_PRESETS.map((w) => (
                    <button
                      key={w}
                      type="button"
                      onClick={() => {
                        if (settings.wordTarget === w) generateTest();
                        else updateSettings({ wordTarget: w });
                      }}
                      className={`px-3 py-1 rounded transition ${settings.wordTarget === w ? "font-medium bg-gray-800" : "hover:text-gray-200"}`}
                      style={{ color: settings.wordTarget === w ? theme.buttonSelected : undefined }}
                    >
                      {w}
                    </button>
                  ))}
                </div>
              </>
            )}

            {/* Quote Length */}
            {settings.mode === "quote" && quotesManifest && (
              <>
                <span className="text-sm font-medium" style={{ color: theme.textSecondary }}>Quote Length</span>
                <div className="flex rounded-lg p-1" style={{ backgroundColor: theme.surfaceColor }}>
                  {["all", ...quotesManifest.lengths].map((l) => (
                    <button
                      key={l}
                      type="button"
                      onClick={() => {
                        if (settings.quoteLength === l) generateTest();
                        else updateSettings({ quoteLength: l as typeof settings.quoteLength });
                      }}
                      className={`px-3 py-1 rounded transition ${settings.quoteLength === l ? "font-medium bg-gray-800" : "hover:text-gray-200"}`}
                      style={{ color: settings.quoteLength === l ? theme.buttonSelected : undefined }}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </>
            )}

            {/* Zen mode - show infinity symbol */}
            {settings.mode === "zen" && (
              <>
                <span className="text-sm font-medium" style={{ color: theme.textSecondary }}>Duration</span>
                <div className="flex rounded-lg px-4 py-1.5" style={{ backgroundColor: theme.surfaceColor }}>
                  <span className="text-lg" style={{ color: theme.buttonSelected }}>∞</span>
                </div>
              </>
            )}

            {/* Difficulty (shown for time, words, zen modes) */}
            {settings.mode !== "quote" && wordsManifest && (
              <>
                <div className="w-px h-4 bg-gray-700"></div>
                <span className="text-sm font-medium" style={{ color: theme.textSecondary }}>Difficulty</span>
                <div className="flex rounded-lg p-1" style={{ backgroundColor: theme.surfaceColor }}>
                  {wordsManifest.difficulties.map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => {
                        if (settings.difficulty === d) generateTest();
                        else updateSettings({ difficulty: d as typeof settings.difficulty });
                      }}
                      className={`px-3 py-1 rounded transition ${settings.difficulty === d ? "font-medium bg-gray-800" : "hover:text-gray-200"}`}
                      style={{ color: settings.difficulty === d ? theme.buttonSelected : undefined }}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
          )}
        </div>
      )}

      {/* Live Stats Widget - Unified 2-row layout */}
      {isRunning && !isFinished && (
        <div 
          className="fixed inset-x-0 flex flex-col items-center gap-2 select-none z-30 transition-opacity duration-300 pointer-events-none"
          style={{ top: "140px" }}
        >
          {/* Row 1: WPM + Mode-specific stat + Accuracy - hidden in kid mode */}
          {!isKidMode && (
            <div className="flex gap-2 md:gap-3">
              {/* WPM Pill */}
              <div
                className="flex items-baseline gap-2 px-3 py-1.5 md:px-6 md:py-3 backdrop-blur-md rounded-full shadow-lg min-w-[70px] md:min-w-[100px] justify-center"
                style={{ backgroundColor: `${theme.surfaceColor}E6`, borderWidth: 1, borderColor: theme.borderSubtle }}
              >
                <span className="text-xl md:text-3xl font-bold tabular-nums leading-none" style={{ color: theme.buttonSelected }}>
                  {Math.round(wpm)}
                </span>
                <span className="text-[10px] md:text-xs font-semibold uppercase tracking-wider" style={{ color: theme.textSecondary }}>wpm</span>
              </div>

              {/* Time Mode: Countdown Timer */}
              {settings.mode === "time" && (
                <div
                  className="flex items-baseline gap-2 px-3 py-1.5 md:px-6 md:py-3 backdrop-blur-md rounded-full shadow-lg min-w-[70px] md:min-w-[100px] justify-center"
                  style={{ backgroundColor: `${theme.surfaceColor}E6`, borderWidth: 1, borderColor: theme.borderSubtle }}
                >
                  <span
                    className="text-xl md:text-3xl font-bold tabular-nums leading-none"
                    style={{ color: timeRemaining < 10 ? theme.statusError : theme.textPrimary }}
                  >
                    {formatTime(timeRemaining)}
                  </span>
                </div>
              )}

              {/* Words Mode: Word Counter */}
              {settings.mode === "words" && (
                <div
                  className="flex items-baseline gap-2 px-3 py-1.5 md:px-6 md:py-3 backdrop-blur-md rounded-full shadow-lg min-w-[70px] md:min-w-[100px] justify-center"
                  style={{ backgroundColor: `${theme.surfaceColor}E6`, borderWidth: 1, borderColor: theme.borderSubtle }}
                >
                  <span className="text-xl md:text-3xl font-bold tabular-nums leading-none" style={{ color: theme.textPrimary }}>
                    {Math.min(typedWordCount, settings.wordTarget === 0 ? Infinity : settings.wordTarget)}
                  </span>
                  {settings.wordTarget > 0 && (
                    <>
                      <span className="text-sm font-medium" style={{ color: theme.textSecondary }}>/</span>
                      <span className="text-lg md:text-xl font-semibold tabular-nums leading-none" style={{ color: theme.textSecondary }}>
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
                    className="flex items-baseline gap-2 px-3 py-1.5 md:px-6 md:py-3 backdrop-blur-md rounded-full shadow-lg min-w-[70px] md:min-w-[100px] justify-center"
                    style={{ backgroundColor: `${theme.surfaceColor}E6`, borderWidth: 1, borderColor: theme.borderSubtle }}
                  >
                    <span className="text-xl md:text-3xl font-bold tabular-nums leading-none" style={{ color: theme.textPrimary }}>
                      {formatTime(Math.floor(elapsedMs / 1000))}
                    </span>
                  </div>

                  <div
                    className="flex items-baseline gap-2 px-3 py-1.5 md:px-6 md:py-3 backdrop-blur-md rounded-full shadow-lg min-w-[70px] md:min-w-[100px] justify-center"
                    style={{ backgroundColor: `${theme.surfaceColor}E6`, borderWidth: 1, borderColor: theme.borderSubtle }}
                  >
                    <span className="text-xl md:text-3xl font-bold tabular-nums leading-none" style={{ color: theme.textPrimary }}>
                      {typedWordCount}
                    </span>
                    <span className="text-sm font-medium" style={{ color: theme.textSecondary }}>/</span>
                    <span className="text-lg md:text-xl font-semibold leading-none" style={{ color: theme.textSecondary }}>
                      {"\u221E"}
                    </span>
                  </div>
                </>
              )}

              {/* Accuracy Pill */}
              <div
                className="flex items-baseline gap-2 px-3 py-1.5 md:px-6 md:py-3 backdrop-blur-md rounded-full shadow-lg min-w-[70px] md:min-w-[100px] justify-center"
                style={{ backgroundColor: `${theme.surfaceColor}E6`, borderWidth: 1, borderColor: theme.borderSubtle }}
              >
                <span className="text-xl md:text-3xl font-bold tabular-nums leading-none" style={{ color: theme.buttonSelected }}>
                  {Math.round(accuracy)}%
                </span>
                <span className="text-[10px] md:text-xs font-semibold uppercase tracking-wider" style={{ color: theme.textSecondary }}>acc</span>
              </div>
            </div>
          )}

          {/* Row 2: Progress Bar - shown in time/words/zen modes, hidden in kid mode */}
          {(settings.mode === "time" || settings.mode === "words" || settings.mode === "zen") && !isKidMode && (
            <div className="flex gap-2 md:gap-3 items-center">
              <div
                className="w-56 md:w-80 px-3 py-2.5 md:px-4 md:py-4 backdrop-blur-md rounded-full shadow-lg"
                style={{ backgroundColor: `${theme.surfaceColor}E6`, borderWidth: 1, borderColor: theme.borderSubtle }}
              >
                {settings.mode === "zen" ? (
                  <div
                    className="relative h-2 md:h-2.5 w-full overflow-hidden rounded-full"
                    style={{ backgroundColor: theme.borderSubtle }}
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
                    className="h-2 md:h-2.5"
                    style={{ backgroundColor: theme.borderSubtle }}
                    indicatorStyle={{
                      backgroundColor: settings.mode === "time" && timeRemaining < 10
                        ? theme.statusError
                        : theme.statusSuccess,
                    }}
                  />
                )}
              </div>
            </div>
          )}

          {/* Kid Mode: Count-up Timer only */}
          {isKidMode && (
            <div className="flex gap-2 md:gap-3">
              <div
                className="flex items-baseline gap-2 px-3 py-1.5 md:px-6 md:py-3 backdrop-blur-md rounded-full shadow-lg min-w-[70px] md:min-w-[100px] justify-center"
                style={{ backgroundColor: `${theme.surfaceColor}E6`, borderWidth: 1, borderColor: theme.borderSubtle }}
              >
                <span className="text-xl md:text-3xl font-bold tabular-nums leading-none" style={{ color: theme.textPrimary }}>
                  {formatTime(Math.floor(elapsedMs / 1000))}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Quote Info */}
      {settings.mode === "quote" && currentQuote && !isFinished && (
        <div
          className="mb-8 flex flex-col items-center text-center animate-fade-in transition-opacity duration-500"
          style={{ opacity: uiOpacity }}
        >
          <div className="text-xl font-medium" style={{ color: theme.buttonSelected }}>
            {currentQuote.author}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-sm" style={{ color: theme.textSecondary }}>
              {currentQuote.source}, {currentQuote.date}
            </span>
          </div>
        </div>
      )}

      {/* Typing Area */}
      <div 
        className="w-[95%] md:w-[80%] max-w-none relative z-0 transition-all duration-300"
        style={{ marginTop: isKidMode ? "-6rem" : undefined }}
      >
        {!isFinished ? (
          <div className="relative z-0">
            <input
              ref={inputRef}
              name="typing-test-input"
              type="text"
              value={typedText}
              onChange={(e) => handleInput(e.target.value)}
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
              className={`cursor-text font-mono overflow-hidden relative transition-all duration-300 ${!isFocused ? "blur-sm opacity-50" : ""}`}
              style={{
                fontSize: `${settings.typingFontSize}rem`,
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
          </div>
        ) : (
          // Results Screen
          <div className="w-full max-w-4xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {/* WPM */}
              <motion.div
                className="relative overflow-hidden rounded-2xl p-6 md:p-10 flex flex-col items-center justify-center group transition-colors"
                style={{ backgroundColor: theme.surfaceColor, borderWidth: 1, borderColor: theme.borderSubtle }}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
              >
                <div className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: theme.textSecondary }}>
                  Words Per Minute
                </div>
                <AnimatedWpmDisplay value={Math.round(wpm)} color={theme.buttonSelected} />
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity" style={{ color: theme.textPrimary }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                </div>
              </motion.div>

              {/* Accuracy */}
              <motion.div
                className="relative overflow-hidden rounded-2xl p-6 md:p-10 flex flex-col items-center justify-center group transition-colors"
                style={{ backgroundColor: theme.surfaceColor, borderWidth: 1, borderColor: theme.borderSubtle }}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1, ease: "easeOut" }}
              >
                <div className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: theme.textSecondary }}>
                  Accuracy
                </div>
                <AnimatedAccuracyDisplay value={Math.round(accuracy)} color={theme.buttonSelected} />
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity" style={{ color: theme.textPrimary }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                </div>
              </motion.div>
            </div>

            {/* Secondary Stats - Grouped by Words and Characters */}
            <motion.div
              className="flex flex-col md:flex-row gap-4 mb-12"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.3, ease: "easeOut" }}
            >
              {/* Words Group */}
              <div className="flex-1 rounded-xl p-4" style={{ backgroundColor: `${theme.surfaceColor}80`, borderWidth: 1, borderColor: theme.borderSubtle }}>
                <div className="text-xs font-semibold uppercase tracking-wide text-center mb-3" style={{ color: theme.textSecondary }}>Words</div>
                <div className="grid grid-cols-2 gap-4">
                  {/* Correct Words with Hover */}
                  <HoverCard openDelay={100} closeDelay={100}>
                    <HoverCardTrigger asChild>
                      <div className="flex flex-col items-center cursor-pointer hover:opacity-80 transition-opacity">
                        <div className="text-3xl font-bold mb-1" style={{ color: theme.statusSuccess }}>{wordResults.correctWords.length}</div>
                        <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: theme.textSecondary }}>Correct</div>
                      </div>
                    </HoverCardTrigger>
                    <HoverCardContent 
                      className="w-56 p-0"
                      style={{ backgroundColor: theme.surfaceColor, borderColor: theme.borderSubtle }}
                    >
                      <div className="p-3" style={{ borderBottomWidth: 1, borderColor: theme.borderSubtle }}>
                        <div className="text-sm font-semibold" style={{ color: theme.textPrimary }}>Correct Words</div>
                        <div className="text-xs" style={{ color: theme.textSecondary }}>{wordResults.correctWords.length} words</div>
                      </div>
                      <div className="max-h-32 overflow-y-auto">
                        {wordResults.correctWords.length > 0 ? (
                          <div className="p-2 flex flex-wrap gap-1.5">
                            {wordResults.correctWords.map((word, idx) => (
                              <span 
                                key={idx}
                                className="px-2 py-0.5 text-xs rounded-md font-mono"
                                style={{ backgroundColor: `${theme.buttonSelected}30`, color: theme.buttonSelected }}
                              >
                                {word}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <div className="p-3 text-center text-sm" style={{ color: theme.textSecondary }}>
                            No correct words
                          </div>
                        )}
                      </div>
                    </HoverCardContent>
                  </HoverCard>

                  {/* Incorrect Words with Hover */}
                  <HoverCard openDelay={100} closeDelay={100}>
                    <HoverCardTrigger asChild>
                      <div className="flex flex-col items-center cursor-pointer hover:opacity-80 transition-opacity">
                        <div className="text-3xl font-bold mb-1" style={{ color: theme.statusError }}>{wordResults.incorrectWords.length}</div>
                        <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: theme.textSecondary }}>Incorrect</div>
                      </div>
                    </HoverCardTrigger>
                    <HoverCardContent 
                      className="w-64 p-0"
                      style={{ backgroundColor: theme.surfaceColor, borderColor: theme.borderSubtle }}
                    >
                      <div className="p-3" style={{ borderBottomWidth: 1, borderColor: theme.borderSubtle }}>
                        <div className="text-sm font-semibold" style={{ color: theme.textPrimary }}>Incorrect Words</div>
                        <div className="text-xs" style={{ color: theme.textSecondary }}>{wordResults.incorrectWords.length} mistakes</div>
                      </div>
                      <div className="max-h-40 overflow-y-auto">
                        {wordResults.incorrectWords.length > 0 ? (
                          <div className="p-2 space-y-1.5">
                            {wordResults.incorrectWords.map((item, idx) => (
                              <div 
                                key={idx}
                                className="flex items-center gap-2 px-2 py-1 rounded text-xs font-mono"
                                style={{ backgroundColor: `${theme.surfaceColor}` }}
                              >
                                <span style={{ color: theme.statusError }}>{item.typed}</span>
                                <span style={{ color: theme.textSecondary }}>→</span>
                                <span style={{ color: theme.buttonSelected }}>{item.expected}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="p-3 text-center text-sm" style={{ color: theme.textSecondary }}>
                            No mistakes - perfect!
                          </div>
                        )}
                      </div>
                    </HoverCardContent>
                  </HoverCard>
                </div>
              </div>

              {/* Characters Group */}
              <div className="flex-1 rounded-xl p-4" style={{ backgroundColor: `${theme.surfaceColor}80`, borderWidth: 1, borderColor: theme.borderSubtle }}>
                <div className="text-xs font-semibold uppercase tracking-wide text-center mb-3" style={{ color: theme.textSecondary }}>Characters</div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col items-center">
                    <div className="text-3xl font-bold mb-1" style={{ color: theme.textPrimary }}>{stats.missed}</div>
                    <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: theme.textSecondary }}>Missed</div>
                  </div>
                  <div className="flex flex-col items-center">
                    <div className="text-3xl font-bold mb-1" style={{ color: theme.textPrimary }}>{stats.extra}</div>
                    <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: theme.textSecondary }}>Extra</div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Quote Attribution */}
            {settings.mode === "quote" && currentQuote && (
              <div className="text-center mb-8" style={{ color: theme.textSecondary }}>
                — {currentQuote.author}
                {currentQuote.source && `, ${currentQuote.source}`}
              </div>
            )}

            {/* Unverified Test Warning */}
            {lastResultIsValid === false && (
              <div
                className="w-full mb-6 p-4 rounded-lg border"
                style={{
                  backgroundColor: theme.statusErrorMuted,
                  borderColor: theme.statusError,
                }}
              >
                <div className="flex items-center gap-3">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="flex-shrink-0"
                    style={{ color: theme.statusError }}
                  >
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <div className="flex-1">
                    <span className="font-medium" style={{ color: theme.statusError }}>
                      Unverified
                    </span>
                    <span className="text-sm ml-2" style={{ color: theme.textSecondary }}>
                      {lastResultInvalidReason?.includes("progress events")
                        ? "Not enough typing activity detected (need 3+ check-ins)"
                        : lastResultInvalidReason?.includes("WPM exceeds")
                          ? "Speed exceeded human limits (max 300 WPM)"
                          : lastResultInvalidReason?.includes("Burst chars")
                            ? "Text appeared too quickly (max 50 chars at once)"
                            : lastResultInvalidReason?.includes("too fast")
                              ? "Test completed too quickly (need full duration)"
                              : "Could not verify real-time typing"}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <motion.div
              className="flex gap-4 justify-center"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.5, ease: "easeOut" }}
            >
              {/* Save Results Button */}
              {!connectMode && (
                <button
                  type="button"
                  onClick={() => saveResults()}
                  disabled={saveState === "saving" || saveState === "saved" || lastResultIsValid === false}
                  className="group relative inline-flex items-center justify-center px-8 py-3 font-medium transition-all duration-200 rounded-lg hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-70 disabled:cursor-not-allowed"
                  style={{ 
                    backgroundColor: lastResultIsValid === false 
                      ? theme.statusErrorMuted 
                      : saveState === "saved" 
                        ? theme.statusSuccessMuted 
                        : saveState === "error" 
                          ? theme.statusErrorMuted 
                          : theme.buttonSelected, 
                    color: lastResultIsValid === false 
                      ? theme.statusError 
                      : saveState === "saved" 
                        ? theme.statusSuccess 
                        : saveState === "error" 
                          ? theme.statusError 
                          : theme.textInverse 
                  }}
                >
                  {lastResultIsValid === false && (
                    <>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="mr-2"
                      >
                        <circle cx="12" cy="12" r="10" />
                        <line x1="15" y1="9" x2="9" y2="15" />
                        <line x1="9" y1="9" x2="15" y2="15" />
                      </svg>
                      Invalid
                    </>
                  )}
                  {lastResultIsValid !== false && saveState === "idle" && (
                    <>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="mr-2"
                      >
                        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                        <polyline points="17 21 17 13 7 13 7 21" />
                        <polyline points="7 3 7 8 15 8" />
                      </svg>
                      Save Results
                    </>
                  )}
                  {lastResultIsValid !== false && saveState === "saving" && (
                    <>
                      <div
                        className="h-4 w-4 rounded-full border-2 border-t-transparent animate-spin mr-2"
                        style={{ borderColor: "currentColor", borderTopColor: "transparent" }}
                      />
                      Saving...
                    </>
                  )}
                  {lastResultIsValid !== false && saveState === "saved" && (
                    <>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="mr-2"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      Saved
                    </>
                  )}
                  {lastResultIsValid !== false && saveState === "error" && (
                    <>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="mr-2"
                      >
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="8" x2="12" y2="12" />
                        <line x1="12" y1="16" x2="12.01" y2="16" />
                      </svg>
                      Error - Try Again
                    </>
                  )}
                </button>
              )}
              {!connectMode && (
                <button
                  type="button"
                  onClick={() => generateTest()}
                  className="group relative inline-flex items-center justify-center px-8 py-3 font-medium transition-all duration-200 rounded-lg hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2"
                  style={{ backgroundColor: theme.surfaceColor, color: theme.textPrimary }}
                >
                  <span className="mr-2 transition-transform group-hover:rotate-180">↻</span>
                  Next Test
                  <div className="absolute bottom-0 left-0 h-1 w-full scale-x-0 transition-transform duration-200 group-hover:scale-x-100 rounded-b-lg" style={{ backgroundColor: theme.buttonSelected }}></div>
                </button>
              )}
              {connectMode && onLeave && (
                <button
                  type="button"
                  onClick={onLeave}
                  className="px-8 py-3 font-medium transition-all duration-200 rounded-lg hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-offset-2"
                  style={{ color: theme.statusError, backgroundColor: theme.statusErrorMuted, borderWidth: 1, borderColor: theme.statusError }}
                >
                  Leave Room
                </button>
              )}
            </motion.div>

            <motion.div
              className="mt-6 text-center text-sm"
              style={{ color: theme.textSecondary }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.7 }}
            >
              <div>
                {lastResultIsValid !== false && (
                  <>
                    Press <kbd className="px-1.5 py-0.5 rounded font-sans" style={{ backgroundColor: theme.surfaceColor, color: theme.textPrimary }}>Space</kbd> to save
                    {" · "}
                  </>
                )}
                <kbd className="px-1.5 py-0.5 rounded font-sans" style={{ backgroundColor: theme.surfaceColor, color: theme.textPrimary }}>Enter</kbd> to continue
              </div>
              <div className="mt-1">
                Press <kbd className="px-1.5 py-0.5 rounded font-sans" style={{ backgroundColor: theme.surfaceColor, color: theme.textPrimary }}>Tab</kbd> to repeat this test
              </div>
            </motion.div>
          </div>
        )}
      </div>

      {/* Instructions */}
      {!isRunning && !isFinished && (
        <div
          className="fixed bottom-[15%] inset-x-0 text-center text-gray-600 transition-opacity duration-300 pointer-events-none"
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

      {/* Preset Input Modal */}
      {showPresetInput && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setShowPresetInput(false)}
        >
          <div
            className="w-full max-w-xl rounded-lg p-6 shadow-xl mx-4"
            style={{ backgroundColor: theme.surfaceColor }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-semibold mb-4" style={{ color: theme.textPrimary }}>Enter Custom Text</h2>
            <textarea
              value={tempPresetText}
              onChange={(e) => setTempPresetText(e.target.value)}
              className="w-full h-48 rounded px-3 py-2 focus:outline-none focus:ring-2"
              style={{ backgroundColor: theme.backgroundColor, color: theme.textPrimary, "--tw-ring-color": theme.buttonSelected } as React.CSSProperties}
              placeholder="Paste or type your custom text here..."
            />
            <div className="flex justify-end gap-4 mt-4">
              <button onClick={() => setShowPresetInput(false)} className="px-4 py-2 hover:opacity-80 transition-opacity" style={{ color: theme.textSecondary }}>
                Cancel
              </button>
              <button
                onClick={() => handlePresetSubmit(tempPresetText)}
                className="px-4 py-2 rounded text-white"
                style={{ backgroundColor: theme.buttonSelected }}
              >
                Start
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Theme Modal */}
      {showThemeModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => {
            setShowThemeModal(false);
            setIsCustomThemeOpen(false);
            setPreviewTheme(null);
            setSelectedCategory(null);
            setThemeSearchQuery("");
            setCollapsedCategories(getDefaultCollapsedCategories());
          }}
        >
          <div
            className="w-[calc(100vw-1.5rem)] sm:w-[calc(100vw-2rem)] lg:w-[calc(100vw-3rem)] h-[85vh] rounded-lg shadow-xl flex overflow-hidden"
            style={{ backgroundColor: theme.surfaceColor }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Left: Preview Panel (40%) - Realistic Homepage Preview */}
            <div 
              className="w-2/5 overflow-hidden relative"
              style={{ backgroundColor: (previewTheme ?? theme).backgroundColor }}
            >
              {/* Mini Header - Absolute positioned at top */}
              <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-6 py-4 z-10">
                {/* Theme name */}
                <div 
                  className="text-lg font-semibold"
                  style={{ color: (previewTheme ?? theme).buttonSelected }}
                >
                  {previewThemeDef?.name ?? selectedThemeName}
                </div>
                {/* Header icons */}
                <div className="flex items-center gap-3">
                  {/* Trophy icon */}
                  <div 
                    className="w-8 h-8 flex items-center justify-center rounded"
                    style={{ color: (previewTheme ?? theme).buttonUnselected }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
                      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
                      <path d="M4 22h16" />
                      <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
                      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
                      <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
                    </svg>
                  </div>
                  {/* User avatar placeholder */}
                  <div 
                    className="w-8 h-8 rounded-full"
                    style={{ backgroundColor: (previewTheme ?? theme).surfaceColor, border: `2px solid ${(previewTheme ?? theme).defaultText}40` }}
                  />
                </div>
              </div>

              {/* Settings Controls Area - Absolute positioned below header */}
              <div className="absolute top-16 left-0 right-0 flex flex-col items-center gap-2 px-6 py-2 z-10">
                {/* Row 1: Quick Settings Icons */}
                <div 
                  className="flex items-center gap-2 rounded-lg px-3 py-1.5"
                  style={{ backgroundColor: (previewTheme ?? theme).surfaceColor }}
                >
                  {/* Kid Mode (Baby) icon */}
                  <div style={{ color: (previewTheme ?? theme).buttonUnselected }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 12h.01" />
                      <path d="M15 12h.01" />
                      <path d="M10 16c.5.3 1.2.5 2 .5s1.5-.2 2-.5" />
                      <path d="M19 6.3a9 9 0 0 1 1.8 3.9 2 2 0 0 1 0 3.6 9 9 0 0 1-17.6 0 2 2 0 0 1 0-3.6A9 9 0 0 1 12 3c2 0 3.5 1.1 3.5 2.5s-.9 2.5-2 2.5c-.8 0-1.5-.4-1.5-1" />
                    </svg>
                  </div>
                  <div className="w-px h-3" style={{ backgroundColor: (previewTheme ?? theme).defaultText, opacity: 0.3 }} />
                  {/* Sound icon */}
                  <div style={{ color: (previewTheme ?? theme).buttonUnselected }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                    </svg>
                  </div>
                  <div className="w-px h-3" style={{ backgroundColor: (previewTheme ?? theme).defaultText, opacity: 0.3 }} />
                  {/* Ghost writer icon */}
                  <div style={{ color: (previewTheme ?? theme).buttonSelected }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 10h.01" />
                      <path d="M15 10h.01" />
                      <path d="M12 2a8 8 0 0 0-8 8v12l3-3 2.5 2.5L12 19l2.5 2.5L17 19l3 3V10a8 8 0 0 0-8-8z" />
                    </svg>
                  </div>
                  <div className="w-px h-3" style={{ backgroundColor: (previewTheme ?? theme).defaultText, opacity: 0.3 }} />
                  {/* Theme palette icon */}
                  <div style={{ color: (previewTheme ?? theme).buttonUnselected }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="13.5" cy="6.5" r=".5" fill="currentColor" stroke="none" />
                      <circle cx="17.5" cy="10.5" r=".5" fill="currentColor" stroke="none" />
                      <circle cx="8.5" cy="7.5" r=".5" fill="currentColor" stroke="none" />
                      <circle cx="6.5" cy="12.5" r=".5" fill="currentColor" stroke="none" />
                      <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z" />
                    </svg>
                  </div>
                  <div className="w-px h-3" style={{ backgroundColor: (previewTheme ?? theme).defaultText, opacity: 0.3 }} />
                  {/* Settings gear icon */}
                  <div style={{ color: (previewTheme ?? theme).buttonUnselected }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="3" />
                      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                    </svg>
                  </div>
                </div>

                {/* Row 2: Mode Selector */}
                <div className="flex items-center gap-3">
                  <span className="text-xs font-medium" style={{ color: (previewTheme ?? theme).defaultText }}>Mode</span>
                  <div 
                    className="flex rounded-lg p-1"
                    style={{ backgroundColor: (previewTheme ?? theme).surfaceColor }}
                  >
                    {(["zen", "time", "words", "quote"] as const).map((m, idx) => (
                      <span
                        key={m}
                        className="px-3 py-1 rounded text-xs"
                        style={{ 
                          color: idx === 0 ? (previewTheme ?? theme).buttonSelected : (previewTheme ?? theme).buttonUnselected,
                          backgroundColor: idx === 0 ? (previewTheme ?? theme).backgroundColor : "transparent",
                          fontWeight: idx === 0 ? 500 : 400
                        }}
                      >
                        {m}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Row 3: Zen infinity + Difficulty */}
                <div className="flex items-center gap-3">
                  <span className="text-xs font-medium" style={{ color: (previewTheme ?? theme).defaultText }}>Duration</span>
                  <div 
                    className="flex rounded-lg px-4 py-1.5"
                    style={{ backgroundColor: (previewTheme ?? theme).surfaceColor }}
                  >
                    <span className="text-base" style={{ color: (previewTheme ?? theme).buttonSelected }}>∞</span>
                  </div>
                  <div className="w-px h-4" style={{ backgroundColor: (previewTheme ?? theme).defaultText, opacity: 0.3 }} />
                  <span className="text-xs font-medium" style={{ color: (previewTheme ?? theme).defaultText }}>Difficulty</span>
                  <div 
                    className="flex rounded-lg p-1"
                    style={{ backgroundColor: (previewTheme ?? theme).surfaceColor }}
                  >
                    {["easy", "medium", "hard"].map((d, idx) => (
                      <span
                        key={d}
                        className="px-3 py-1 rounded text-xs"
                        style={{ 
                          color: idx === 1 ? (previewTheme ?? theme).buttonSelected : (previewTheme ?? theme).buttonUnselected,
                          backgroundColor: idx === 1 ? (previewTheme ?? theme).backgroundColor : "transparent",
                          fontWeight: idx === 1 ? 500 : 400
                        }}
                      >
                        {d}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Main Typing Area - Full height, vertically centered */}
              <div className="absolute inset-0 flex items-center justify-center px-8">
                {/* Sample Typing Text */}
                <div className="text-2xl font-mono leading-loose text-center">
                  {/* Line 1: correctly typed */}
                  <span style={{ color: (previewTheme ?? theme).correctText }}>the quick brown fox </span>
                  {/* Line 1: error */}
                  <span style={{ color: (previewTheme ?? theme).incorrectText }}>jum</span>
                  {/* Cursor */}
                  <span 
                    className="inline-block w-0.5 h-6 align-middle animate-pulse"
                    style={{ backgroundColor: (previewTheme ?? theme).cursor }}
                  />
                  {/* Line 1: untyped */}
                  <span style={{ color: (previewTheme ?? theme).defaultText }}>ps over the lazy dog</span>
                </div>
              </div>

              {/* Color Swatches - Absolute positioned at bottom */}
              <div 
                className="absolute bottom-0 left-0 right-0 flex items-center justify-center gap-4 px-6 py-4 border-t"
                style={{ 
                  backgroundColor: (previewTheme ?? theme).surfaceColor,
                  borderColor: `${(previewTheme ?? theme).defaultText}20`
                }}
              >
                <div className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: (previewTheme ?? theme).cursor }} />
                  <span className="text-xs" style={{ color: (previewTheme ?? theme).defaultText }}>cursor</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: (previewTheme ?? theme).correctText }} />
                  <span className="text-xs" style={{ color: (previewTheme ?? theme).defaultText }}>correct</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: (previewTheme ?? theme).incorrectText }} />
                  <span className="text-xs" style={{ color: (previewTheme ?? theme).defaultText }}>incorrect</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: (previewTheme ?? theme).defaultText }} />
                  <span className="text-xs" style={{ color: (previewTheme ?? theme).defaultText }}>untyped</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: (previewTheme ?? theme).buttonSelected }} />
                  <span className="text-xs" style={{ color: (previewTheme ?? theme).defaultText }}>selected</span>
                </div>
              </div>

            </div>

            {/* Right: Theme Browser (60%) */}
            <div className="w-3/5 p-6 flex flex-col overflow-hidden border-l" style={{ borderColor: theme.borderSubtle }}>
              {/* Header with close button */}
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold" style={{ color: theme.textPrimary }}>Theme</h2>
                <button
                  onClick={() => {
                    setShowThemeModal(false);
                    setIsCustomThemeOpen(false);
                    setPreviewTheme(null);
                    setSelectedCategory(null);
                    setThemeSearchQuery("");
                    setCollapsedCategories(getDefaultCollapsedCategories());
                  }}
                  className="hover:opacity-80 transition-opacity"
                  style={{ color: theme.textMuted }}
                >
                  ✕
                </button>
              </div>

              {/* TEMP_DISABLED_CATEGORIES_TAB: view mode toggle hidden while only all-themes mode is active */}

              <div className="mb-4 flex items-center gap-2">
                <input
                  type="text"
                  value={themeSearchQuery}
                  onChange={(e) => setThemeSearchQuery(e.target.value)}
                  placeholder={
                    themeViewMode === "all"
                      ? "Search themes or categories..."
                      : selectedCategory
                        ? `Search ${CATEGORY_CONFIG[selectedCategory].displayName} themes...`
                        : "Search categories..."
                  }
                  className="flex-1 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2"
                  style={{
                    backgroundColor: theme.backgroundColor,
                    color: theme.textPrimary,
                    border: `1px solid ${theme.borderSubtle}`,
                    "--tw-ring-color": theme.buttonSelected,
                  } as React.CSSProperties}
                />
                {themeViewMode === "all" && (
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => setCollapsedCategories(new Set())}
                      className="px-2.5 py-2 rounded-lg text-xs font-medium transition-colors hover:opacity-80 whitespace-nowrap"
                      style={{
                        backgroundColor: theme.backgroundColor,
                        color: theme.textSecondary,
                        border: `1px solid ${theme.borderSubtle}`,
                      }}
                    >
                      Expand All
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const all = new Set(filteredGroupedThemes.map((g) => g.category));
                        setCollapsedCategories(all);
                      }}
                      className="px-2.5 py-2 rounded-lg text-xs font-medium transition-colors hover:opacity-80 whitespace-nowrap"
                      style={{
                        backgroundColor: theme.backgroundColor,
                        color: theme.textSecondary,
                        border: `1px solid ${theme.borderSubtle}`,
                      }}
                    >
                      Collapse All
                    </button>
                  </div>
                )}
              </div>

              {/* Scrollable Content Area */}
              <div className="flex-1 overflow-y-auto pr-2">
                {/* All Themes View */}
                {themeViewMode === "all" && (
                  <>
                    {filteredGroupedThemes.length === 0 && (
                      <div className="text-sm py-6 text-center" style={{ color: theme.textMuted }}>
                        No themes found for "{themeSearchQuery.trim()}".
                      </div>
                    )}
                    {filteredGroupedThemes.map((group, index) => {
                      const isSearchActive = normalizedThemeSearchQuery.length > 0;
                      const isExpanded = isSearchActive || !collapsedCategories.has(group.category);
                      return (
                        <div
                          key={group.category}
                          className={`last:mb-0 ${index === 0 ? "" : "mt-4 pt-4 border-t"}`}
                          style={index === 0 ? undefined : { borderColor: theme.borderSubtle }}
                        >
                          {/* Collapsible category header */}
                          <button
                            type="button"
                            onClick={() => {
                              if (isSearchActive) return;
                              setCollapsedCategories((prev) => {
                                const next = new Set(prev);
                                if (next.has(group.category)) {
                                  next.delete(group.category);
                                } else {
                                  next.add(group.category);
                                }
                                return next;
                              });
                            }}
                            className={`w-full flex items-center justify-between text-sm font-medium py-2 px-2 rounded-md sticky top-0 z-10 transition-colors ${
                              isSearchActive ? "cursor-default" : "cursor-pointer hover:opacity-80"
                            }`}
                            style={{ backgroundColor: theme.surfaceColor, color: theme.textSecondary }}
                          >
                            <span className="flex items-center gap-2">
                              {group.displayName}
                              <span className="text-xs font-normal" style={{ color: theme.textMuted }}>
                                ({group.themes.length})
                              </span>
                            </span>
                            {!isSearchActive && (
                              <ChevronDown
                                className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? "rotate-0" : "-rotate-90"}`}
                                style={{ color: theme.textMuted }}
                              />
                            )}
                          </button>

                          {/* Collapsible theme grid */}
                          <div
                            className={`overflow-hidden transition-all duration-200 ease-in-out ${
                              isExpanded ? "max-h-[5000px] opacity-100 mt-2" : "max-h-0 opacity-0"
                            }`}
                          >
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
                              {group.themes.map((themeData) => (
                                <div
                                  key={themeData.name}
                                  className={`flex rounded-lg border transition overflow-hidden min-h-[64px] ${
                                    selectedThemeName.toLowerCase() === themeData.name.toLowerCase()
                                      ? "border-gray-400 ring-1 ring-gray-400"
                                      : "border-gray-700 hover:border-gray-500"
                                  }`}
                                  style={{ backgroundColor: themeData.dark.bg.base }}
                                >
                                  {/* Left column - theme info */}
                                  <button
                                    onClick={() => handleThemeSelect(themeData.name)}
                                    onMouseEnter={() => setPreviewTheme(themeData)}
                                    onMouseLeave={() => setPreviewTheme(null)}
                                    className="flex-1 min-w-0 p-2 text-left"
                                  >
                                    <div className="flex items-center gap-1.5 mb-2">
                                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: themeData.dark.typing.cursor }} />
                                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: themeData.dark.interactive.secondary.DEFAULT }} />
                                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: themeData.dark.typing.correct }} />
                                    </div>
                                    <div className="text-xs whitespace-normal break-words leading-tight" style={{ color: themeData.dark.typing.correct }}>
                                      {themeData.name}
                                    </div>
                                  </button>
                                  
                                  {/* Right column - mode toggles (fixed width) */}
                                  <div className="w-10 shrink-0 flex flex-col border-l" style={{ borderColor: `${themeData.dark.typing.correct}30` }}>
                                    {/* Light mode button */}
                                    <button
                                      onClick={(e) => { 
                                        e.stopPropagation(); 
                                        if (themeData.light) handleThemeSelect(themeData.name, "light"); 
                                      }}
                                      onMouseEnter={() => themeData.light && setPreviewTheme(themeData, "light")}
                                      onMouseLeave={() => setPreviewTheme(null)}
                                      disabled={!themeData.light}
                                      className={`flex-1 flex items-center justify-center transition-colors ${
                                        !themeData.light 
                                          ? "opacity-30 cursor-not-allowed" 
                                          : "hover:bg-white/10 cursor-pointer"
                                      }`}
                                      title={themeData.light ? "Light mode" : "Light mode not available"}
                                    >
                                      <Sun className="w-3 h-3" style={{ color: themeData.dark.typing.correct }} />
                                    </button>
                                    
                                    {/* Dark mode button */}
                                    <button
                                      onClick={(e) => { 
                                        e.stopPropagation(); 
                                        handleThemeSelect(themeData.name, "dark"); 
                                      }}
                                      onMouseEnter={() => setPreviewTheme(themeData, "dark")}
                                      onMouseLeave={() => setPreviewTheme(null)}
                                      className="flex-1 flex items-center justify-center hover:bg-white/10 cursor-pointer transition-colors"
                                      title="Dark mode"
                                    >
                                      <Moon className="w-3 h-3" style={{ color: themeData.dark.typing.correct }} />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </>
                )}

                {/*
                  TEMP_DISABLED_CATEGORIES_TAB

                Categories View
                {themeViewMode === "categories" && !selectedCategory && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
                    {filteredCategoryGroups.map((group) => (
                      <button
                        key={group.category}
                        onClick={() => setSelectedCategory(group.category)}
                        className="p-4 rounded-lg border transition text-left hover:opacity-90"
                        style={{ backgroundColor: theme.backgroundColor, borderColor: theme.borderSubtle }}
                      >
                        <div className="text-sm font-medium mb-1" style={{ color: theme.textPrimary }}>
                          {group.displayName}
                        </div>
                        <div className="text-xs" style={{ color: theme.textMuted }}>
                          {group.themes.length} theme{group.themes.length !== 1 ? "s" : ""}
                        </div>
                        {group.themes[0] && (
                          <div className="flex items-center gap-1 mt-2">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: group.themes[0].dark.typing.cursor }} />
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: group.themes[0].dark.interactive.secondary.DEFAULT }} />
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: group.themes[0].dark.typing.correct }} />
                          </div>
                        )}
                      </button>
                    ))}
                    {filteredCategoryGroups.length === 0 && (
                      <div className="col-span-full text-sm py-6 text-center" style={{ color: theme.textMuted }}>
                        No categories found for "{themeSearchQuery.trim()}".
                      </div>
                    )}
                  </div>
                )}

                Single Category View
                {themeViewMode === "categories" && selectedCategory && (
                  <>
                    <button
                      onClick={() => setSelectedCategory(null)}
                      className="flex items-center gap-2 text-sm mb-4 transition hover:opacity-80"
                      style={{ color: theme.textSecondary }}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                      Back to Categories
                    </button>
                    <h3 className="text-sm font-medium mb-3" style={{ color: theme.textSecondary }}>
                      {CATEGORY_CONFIG[selectedCategory].displayName}
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
                      {filteredSelectedCategoryThemes.map((themeData) => (
                          <div
                            key={themeData.name}
                            className={`flex rounded-lg border transition overflow-hidden min-h-[64px] ${
                              selectedThemeName.toLowerCase() === themeData.name.toLowerCase()
                                ? "border-gray-400 ring-1 ring-gray-400"
                                : "border-gray-700 hover:border-gray-500"
                            }`}
                            style={{ backgroundColor: themeData.dark.bg.base }}
                          >
                            <button
                              onClick={() => handleThemeSelect(themeData.name)}
                              onMouseEnter={() => setPreviewTheme(themeData)}
                              onMouseLeave={() => setPreviewTheme(null)}
                              className="flex-1 min-w-0 p-2 text-left"
                            >
                              <div className="flex items-center gap-1.5 mb-2">
                                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: themeData.dark.typing.cursor }} />
                                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: themeData.dark.interactive.secondary.DEFAULT }} />
                                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: themeData.dark.typing.correct }} />
                              </div>
                              <div className="text-xs whitespace-normal break-words leading-tight" style={{ color: themeData.dark.typing.correct }}>
                                {themeData.name}
                              </div>
                            </button>

                            <div className="w-10 shrink-0 flex flex-col border-l" style={{ borderColor: `${themeData.dark.typing.correct}30` }}>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (themeData.light) handleThemeSelect(themeData.name, "light");
                                }}
                                onMouseEnter={() => themeData.light && setPreviewTheme(themeData, "light")}
                                onMouseLeave={() => setPreviewTheme(null)}
                                disabled={!themeData.light}
                                className={`flex-1 flex items-center justify-center transition-colors ${
                                  !themeData.light
                                    ? "opacity-30 cursor-not-allowed"
                                    : "hover:bg-white/10 cursor-pointer"
                                }`}
                                title={themeData.light ? "Light mode" : "Light mode not available"}
                              >
                                <Sun className="w-3 h-3" style={{ color: themeData.dark.typing.correct }} />
                              </button>

                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleThemeSelect(themeData.name, "dark");
                                }}
                                onMouseEnter={() => setPreviewTheme(themeData, "dark")}
                                onMouseLeave={() => setPreviewTheme(null)}
                                className="flex-1 flex items-center justify-center hover:bg-white/10 cursor-pointer transition-colors"
                                title="Dark mode"
                              >
                                <Moon className="w-3 h-3" style={{ color: themeData.dark.typing.correct }} />
                              </button>
                            </div>
                          </div>
                        ))}
                      {filteredSelectedCategoryThemes.length === 0 && (
                        <div className="col-span-full text-sm py-6 text-center" style={{ color: theme.textMuted }}>
                          No themes found for "{themeSearchQuery.trim()}".
                        </div>
                      )}
                    </div>
                  </>
                )}
                */}

                {/* Separator */}
                <div className="border-t border-gray-600 my-4" />

                {/* Custom Theme Dropdown */}
                <div className="border rounded-lg overflow-hidden mb-4" style={{ borderColor: theme.borderSubtle }}>
                  <button
                    type="button"
                    onClick={() => setIsCustomThemeOpen(!isCustomThemeOpen)}
                    className="w-full flex items-center justify-between px-4 py-3 transition-colors hover:opacity-90"
                    style={{ backgroundColor: theme.backgroundColor }}
                  >
                    <span className="text-sm font-medium" style={{ color: theme.textPrimary }}>Custom Theme</span>
                    <svg
                      className={`w-5 h-5 transition-transform ${isCustomThemeOpen ? "rotate-180" : ""}`}
                      style={{ color: theme.textMuted }}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </button>

                  <div
                    className={`transition-all duration-300 ease-in-out overflow-hidden ${
                      isCustomThemeOpen
                        ? "max-h-[500px] opacity-100"
                        : "max-h-0 opacity-0"
                    }`}
                  >
                    <div className="p-4 space-y-3" style={{ backgroundColor: theme.elevatedColor }}>
                      {/* Current Theme Colors (Read-only preview) */}
                      <p className="text-sm text-center mb-4" style={{ color: theme.textSecondary }}>
                        Current theme colors (read-only)
                      </p>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm" style={{ color: theme.textSecondary }}>Background</span>
                          <div
                            className="w-8 h-8 rounded border"
                            style={{ backgroundColor: theme.backgroundColor, borderColor: theme.borderSubtle }}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm" style={{ color: theme.textSecondary }}>Surface</span>
                          <div
                            className="w-8 h-8 rounded border"
                            style={{ backgroundColor: theme.surfaceColor, borderColor: theme.borderSubtle }}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm" style={{ color: theme.textSecondary }}>Cursor</span>
                          <div
                            className="w-8 h-8 rounded border"
                            style={{ backgroundColor: theme.cursor, borderColor: theme.borderSubtle }}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm" style={{ color: theme.textSecondary }}>Ghost Cursor</span>
                          <div
                            className="w-8 h-8 rounded border"
                            style={{ backgroundColor: theme.ghostCursor, borderColor: theme.borderSubtle }}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm" style={{ color: theme.textSecondary }}>Default Text</span>
                          <div
                            className="w-8 h-8 rounded border"
                            style={{ backgroundColor: theme.defaultText, borderColor: theme.borderSubtle }}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm" style={{ color: theme.textSecondary }}>Correct Text</span>
                          <div
                            className="w-8 h-8 rounded border"
                            style={{ backgroundColor: theme.correctText, borderColor: theme.borderSubtle }}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm" style={{ color: theme.textSecondary }}>Incorrect Text</span>
                          <div
                            className="w-8 h-8 rounded border"
                            style={{ backgroundColor: theme.incorrectText, borderColor: theme.borderSubtle }}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm" style={{ color: theme.textSecondary }}>Btn Selected</span>
                          <div
                            className="w-8 h-8 rounded border"
                            style={{ backgroundColor: theme.buttonSelected, borderColor: theme.borderSubtle }}
                          />
                        </div>
                      </div>

                      {/* Reset to Default Button */}
                      <button
                        onClick={() => setThemeById("typesetgo")}
                        className="w-full py-2 mt-2 text-sm border rounded-lg transition-colors hover:opacity-80"
                        style={{ color: theme.textSecondary, borderColor: theme.borderSubtle, backgroundColor: "transparent" }}
                      >
                        Reset to TypeSetGo Theme
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setShowSettings(false)}
        >
          <div
            className="w-full max-w-xl rounded-lg p-6 shadow-xl mx-4"
            style={{ backgroundColor: theme.surfaceColor }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold" style={{ color: theme.textPrimary }}>Settings</h2>
              <button onClick={() => setShowSettings(false)} className="hover:opacity-80 transition-opacity" style={{ color: theme.textMuted }}>
                ✕
              </button>
            </div>

            <div className="space-y-6">
              {/* Line Preview */}
              <div className="text-center">
                <label className="mb-2 block text-sm" style={{ color: theme.textSecondary }}>Lines to Preview</label>
                <div className="flex gap-2 flex-wrap justify-center">
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((num) => (
                    <button
                      key={num}
                      onClick={() => setLinePreview(num)}
                      className={`rounded px-4 py-2 text-sm transition ${linePreview === num ? "font-medium" : "hover:opacity-80"}`}
                      style={{ 
                        color: linePreview === num ? theme.buttonSelected : theme.textSecondary,
                        backgroundColor: linePreview === num ? theme.elevatedColor : theme.backgroundColor
                      }}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>

              {/* Max Words per Line */}
              <div className="text-center">
                <label className="mb-2 block text-sm" style={{ color: theme.textSecondary }}>Max Words per Line</label>
                <div className="flex gap-2 flex-wrap justify-center">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                    <button
                      key={num}
                      onClick={() => setMaxWordsPerLine(num)}
                      className={`rounded px-4 py-2 text-sm transition ${maxWordsPerLine === num ? "font-medium" : "hover:opacity-80"}`}
                      style={{ 
                        color: maxWordsPerLine === num ? theme.buttonSelected : theme.textSecondary,
                        backgroundColor: maxWordsPerLine === num ? theme.elevatedColor : theme.backgroundColor
                      }}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>

              {/* Font Size & Text Alignment */}
              <div className="flex gap-4 justify-center">
                <div className="text-center">
                  <label className="mb-2 block text-sm" style={{ color: theme.textSecondary }}>Text Size (rem)</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    step="0.25"
                    value={settings.typingFontSize}
                    onChange={(e) => updateSettings({ typingFontSize: parseFloat(e.target.value) || 3 })}
                    className="w-28 rounded px-3 py-2 text-center focus:outline-none focus:ring-2"
                    style={{ backgroundColor: theme.backgroundColor, color: theme.textPrimary, "--tw-ring-color": theme.buttonSelected } as React.CSSProperties}
                  />
                </div>
                <div className="text-center">
                  <label className="mb-2 block text-sm" style={{ color: theme.textSecondary }}>Text Alignment</label>
                  <div className="flex gap-2 justify-center">
                    {(["left", "center", "right", "justify"] as const).map((align) => (
                      <button
                        key={align}
                        onClick={() => updateSettings({ textAlign: align })}
                        className={`rounded px-3 py-2 text-sm capitalize transition ${settings.textAlign === align ? "font-medium" : "hover:opacity-80"}`}
                        style={{ 
                          color: settings.textAlign === align ? theme.buttonSelected : theme.textSecondary,
                          backgroundColor: settings.textAlign === align ? theme.elevatedColor : theme.backgroundColor
                        }}
                      >
                        {align}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Settings Modal (for compact/zoomed mode) */}
      {showQuickSettings && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setShowQuickSettings(false)}
        >
          <div
            className="w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-lg p-6 shadow-xl mx-4"
            style={{ backgroundColor: theme.surfaceColor }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold" style={{ color: theme.textPrimary }}>Quick Settings</h2>
              <button onClick={() => setShowQuickSettings(false)} className="hover:opacity-80 transition-opacity" style={{ color: theme.textMuted }}>
                ✕
              </button>
            </div>

            <div className="space-y-6">
              {/* Test Mode */}
              <div className="text-center">
                <label className="mb-2 block text-sm" style={{ color: theme.textSecondary }}>Mode</label>
                <div className="flex gap-2 flex-wrap justify-center">
                  {(["zen", "time", "words", "quote"] as const).map((m) => (
                    <button
                      key={m}
                      onClick={() => {
                        if (settings.mode === m) {
                          generateTest();
                        } else {
                          updateSettings({ mode: m });
                        }
                      }}
                      className={`rounded px-4 py-2 text-sm capitalize transition ${settings.mode === m ? "font-medium" : "hover:opacity-80"}`}
                      style={{ 
                        color: settings.mode === m ? theme.buttonSelected : theme.textSecondary,
                        backgroundColor: settings.mode === m ? theme.elevatedColor : theme.backgroundColor
                      }}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              {/* Duration / Word Count / Quote Length */}
              {settings.mode === "time" && (
                <div className="text-center">
                  <label className="mb-2 block text-sm" style={{ color: theme.textSecondary }}>Duration</label>
                  <div className="flex gap-2 flex-wrap justify-center">
                    {TIME_PRESETS.map((d) => (
                      <button
                        key={d}
                        onClick={() => {
                          if (settings.duration === d) generateTest();
                          else updateSettings({ duration: d });
                        }}
                        className={`rounded px-4 py-2 text-sm transition ${settings.duration === d ? "font-medium" : "hover:opacity-80"}`}
                        style={{ 
                          color: settings.duration === d ? theme.buttonSelected : theme.textSecondary,
                          backgroundColor: settings.duration === d ? theme.elevatedColor : theme.backgroundColor
                        }}
                      >
                        {d}s
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {settings.mode === "words" && (
                <div className="text-center">
                  <label className="mb-2 block text-sm" style={{ color: theme.textSecondary }}>Word Count</label>
                  <div className="flex gap-2 flex-wrap justify-center">
                    {WORD_PRESETS.map((w) => (
                      <button
                        key={w}
                        onClick={() => {
                          if (settings.wordTarget === w) generateTest();
                          else updateSettings({ wordTarget: w });
                        }}
                        className={`rounded px-4 py-2 text-sm transition ${settings.wordTarget === w ? "font-medium" : "hover:opacity-80"}`}
                        style={{ 
                          color: settings.wordTarget === w ? theme.buttonSelected : theme.textSecondary,
                          backgroundColor: settings.wordTarget === w ? theme.elevatedColor : theme.backgroundColor
                        }}
                      >
                        {w}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {settings.mode === "quote" && quotesManifest && (
                <div className="text-center">
                  <label className="mb-2 block text-sm" style={{ color: theme.textSecondary }}>Quote Length</label>
                  <div className="flex gap-2 flex-wrap justify-center">
                    {["all", ...quotesManifest.lengths].map((l) => (
                      <button
                        key={l}
                        onClick={() => {
                          if (settings.quoteLength === l) generateTest();
                          else updateSettings({ quoteLength: l as typeof settings.quoteLength });
                        }}
                        className={`rounded px-4 py-2 text-sm transition ${settings.quoteLength === l ? "font-medium" : "hover:opacity-80"}`}
                        style={{ 
                          color: settings.quoteLength === l ? theme.buttonSelected : theme.textSecondary,
                          backgroundColor: settings.quoteLength === l ? theme.elevatedColor : theme.backgroundColor
                        }}
                      >
                        {l}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Difficulty */}
              {settings.mode !== "quote" && wordsManifest && (
                <div className="text-center">
                  <label className="mb-2 block text-sm" style={{ color: theme.textSecondary }}>Difficulty</label>
                  <div className="flex gap-2 flex-wrap justify-center">
                    {wordsManifest.difficulties.map((d) => (
                      <button
                        key={d}
                        onClick={() => {
                          if (settings.difficulty === d) generateTest();
                          else updateSettings({ difficulty: d as typeof settings.difficulty });
                        }}
                        className={`rounded px-4 py-2 text-sm capitalize transition ${settings.difficulty === d ? "font-medium" : "hover:opacity-80"}`}
                        style={{ 
                          color: settings.difficulty === d ? theme.buttonSelected : theme.textSecondary,
                          backgroundColor: settings.difficulty === d ? theme.elevatedColor : theme.backgroundColor
                        }}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Modifiers */}
              <div className="text-center">
                <label className="mb-2 block text-sm" style={{ color: theme.textSecondary }}>Modifiers</label>
                <div className="flex gap-3 flex-wrap justify-center">
                  <button
                    onClick={() => updateSettings({ capitalization: !settings.capitalization })}
                    disabled={settings.mode === "quote"}
                    className={`rounded px-4 py-2 text-sm transition ${settings.capitalization ? "font-medium" : "hover:opacity-80"}`}
                    style={{ 
                      color: settings.capitalization ? theme.buttonSelected : theme.textSecondary,
                      backgroundColor: settings.capitalization ? theme.elevatedColor : theme.backgroundColor,
                      opacity: settings.mode === "quote" ? 0.5 : 1
                    }}
                  >
                    Aa caps
                  </button>
                  <button
                    onClick={() => updateSettings({ punctuation: !settings.punctuation })}
                    disabled={settings.mode === "quote"}
                    className={`rounded px-4 py-2 text-sm transition ${settings.punctuation ? "font-medium" : "hover:opacity-80"}`}
                    style={{ 
                      color: settings.punctuation ? theme.buttonSelected : theme.textSecondary,
                      backgroundColor: settings.punctuation ? theme.elevatedColor : theme.backgroundColor,
                      opacity: settings.mode === "quote" ? 0.5 : 1
                    }}
                  >
                    @ punctuation
                  </button>
                  <button
                    onClick={() => updateSettings({ numbers: !settings.numbers })}
                    disabled={settings.mode === "quote"}
                    className={`rounded px-4 py-2 text-sm transition ${settings.numbers ? "font-medium" : "hover:opacity-80"}`}
                    style={{ 
                      color: settings.numbers ? theme.buttonSelected : theme.textSecondary,
                      backgroundColor: settings.numbers ? theme.elevatedColor : theme.backgroundColor,
                      opacity: settings.mode === "quote" ? 0.5 : 1
                    }}
                  >
                    # numbers
                  </button>
                </div>
              </div>

              {/* Line Preview */}
              <div className="text-center">
                <label className="mb-2 block text-sm" style={{ color: theme.textSecondary }}>Lines to Preview</label>
                <div className="flex gap-2 flex-wrap justify-center">
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((num) => (
                    <button
                      key={num}
                      onClick={() => setLinePreview(num)}
                      className={`rounded px-3 py-2 text-sm transition ${linePreview === num ? "font-medium" : "hover:opacity-80"}`}
                      style={{ 
                        color: linePreview === num ? theme.buttonSelected : theme.textSecondary,
                        backgroundColor: linePreview === num ? theme.elevatedColor : theme.backgroundColor
                      }}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>

              {/* Max Words per Line */}
              <div className="text-center">
                <label className="mb-2 block text-sm" style={{ color: theme.textSecondary }}>Max Words per Line</label>
                <div className="flex gap-2 flex-wrap justify-center">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                    <button
                      key={num}
                      onClick={() => setMaxWordsPerLine(num)}
                      className={`rounded px-3 py-2 text-sm transition ${maxWordsPerLine === num ? "font-medium" : "hover:opacity-80"}`}
                      style={{ 
                        color: maxWordsPerLine === num ? theme.buttonSelected : theme.textSecondary,
                        backgroundColor: maxWordsPerLine === num ? theme.elevatedColor : theme.backgroundColor
                      }}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>

              {/* Font Size & Text Alignment */}
              <div className="flex gap-4 justify-center flex-wrap">
                <div className="text-center">
                  <label className="mb-2 block text-sm" style={{ color: theme.textSecondary }}>Text Size (rem)</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    step="0.25"
                    value={settings.typingFontSize}
                    onChange={(e) => updateSettings({ typingFontSize: parseFloat(e.target.value) || 3 })}
                    className="w-28 rounded px-3 py-2 text-center focus:outline-none focus:ring-2"
                    style={{ backgroundColor: theme.backgroundColor, color: theme.textPrimary, "--tw-ring-color": theme.buttonSelected } as React.CSSProperties}
                  />
                </div>
                <div className="text-center">
                  <label className="mb-2 block text-sm" style={{ color: theme.textSecondary }}>Text Alignment</label>
                  <div className="flex gap-2 justify-center">
                    {(["left", "center", "right"] as const).map((align) => (
                      <button
                        key={align}
                        onClick={() => updateSettings({ textAlign: align })}
                        className={`rounded px-3 py-2 text-sm capitalize transition ${settings.textAlign === align ? "font-medium" : "hover:opacity-80"}`}
                        style={{ 
                          color: settings.textAlign === align ? theme.buttonSelected : theme.textSecondary,
                          backgroundColor: settings.textAlign === align ? theme.elevatedColor : theme.backgroundColor
                        }}
                      >
                        {align}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

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
        <div className="fixed inset-0 z-40 flex items-center justify-center" style={{ backgroundColor: theme.backgroundColor }}>
          <div className="absolute top-4 right-4">
            <button
              onClick={exitPlanMode}
              className="px-4 py-2 transition-colors hover:opacity-80"
              style={{ color: theme.textSecondary }}
            >
              Exit Plan
            </button>
          </div>
          <PlanSplash
            item={plan[planIndex]}
            progress={{ current: planIndex + 1, total: plan.length }}
            onStart={handlePlanStepStart}
            theme={theme}
          />
        </div>
      )}

      {/* Plan Results Modal */}
      {showPlanResultsModal && (
        <PlanResultsModal
          user={{ id: "local", name: "You" }}
          plan={plan}
          results={planResults}
          theme={theme}
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
              style={{ backgroundColor: theme.surfaceColor, color: theme.textPrimary }}
            >
              ← Previous
            </button>
          )}
          <button
            onClick={handlePlanNext}
            className="px-6 py-3 text-white rounded-lg font-medium transition-colors hover:opacity-90"
            style={{ backgroundColor: theme.buttonSelected }}
          >
            {planIndex < plan.length - 1 ? "Next →" : "View Results"}
          </button>
        </div>
      )}
    </div>
  );
}
