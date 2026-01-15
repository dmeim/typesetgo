import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { Quote, SettingsState, Theme } from "@/lib/typing-constants";
import { DEFAULT_THEME } from "@/lib/typing-constants";
import { fetchSoundManifest, getRandomSoundUrl, type SoundManifest } from "@/lib/sounds";
import { fetchTheme, fetchAllThemes, groupThemesByCategory, type ThemeDefinition, type GroupedThemes } from "@/lib/themes";
import ColorPicker from "./ColorPicker";
import { fetchWordsManifest, fetchWords, type WordsManifest } from "@/lib/words";
import { fetchQuotesManifest, fetchQuotes, type QuotesManifest } from "@/lib/quotes";
import {
  loadSettings,
  saveSettings,
  loadTheme,
  saveTheme,
  loadThemeName,
  saveThemeName,
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
import { useUser, useClerk } from "@clerk/clerk-react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";

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
  options: { punctuation: boolean; numbers: boolean }
) => {
  const words = [];
  if (pool.length === 0) return "";

  for (let i = 0; i < count; i++) {
    let word = pool[Math.floor(Math.random() * pool.length)];

    if (options.numbers && Math.random() < 0.15) {
      word =
        NUMBER_CHARS[Math.floor(Math.random() * NUMBER_CHARS.length)] +
        NUMBER_CHARS[Math.floor(Math.random() * NUMBER_CHARS.length)];
    }

    if (options.punctuation && Math.random() < 0.1 && i > 0) {
      word =
        word + PUNCTUATION_CHARS[Math.floor(Math.random() * PUNCTUATION_CHARS.length)];
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
  // External theme and modal control (lifted state from Home.tsx)
  theme?: Theme;
  setTheme?: (theme: Theme) => void;
  selectedThemeName?: string;
  setSelectedThemeName?: (name: string) => void;
  showSettings?: boolean;
  setShowSettings?: (show: boolean) => void;
  showThemeModal?: boolean;
  setShowThemeModal?: (show: boolean) => void;
  // Callback to notify parent of typing state changes
  onTypingStateChange?: (isTyping: boolean) => void;
}

export default function TypingPractice({
  connectMode = false,
  lockedSettings,
  isTestActive = true,
  onStatsUpdate,
  onLeave,
  // External state control (when used from Home.tsx)
  theme: externalTheme,
  setTheme: externalSetTheme,
  selectedThemeName: externalSelectedThemeName,
  setSelectedThemeName: externalSetSelectedThemeName,
  showSettings: externalShowSettings,
  setShowSettings: externalSetShowSettings,
  showThemeModal: externalShowThemeModal,
  setShowThemeModal: externalSetShowThemeModal,
  onTypingStateChange,
}: TypingPracticeProps) {
  // --- State ---
  const [settings, setSettings] = useState<SettingsState>({
    mode: "zen",
    duration: 30,
    wordTarget: 25,
    punctuation: false,
    numbers: false,
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
  const [internalTheme, setInternalTheme] = useState<Theme>(DEFAULT_THEME);
  const [internalSelectedThemeName, setInternalSelectedThemeName] = useState("TypeSetGo");
  const [internalShowSettings, setInternalShowSettings] = useState(false);
  const [internalShowThemeModal, setInternalShowThemeModal] = useState(false);

  // Resolve to external or internal state
  const theme = externalTheme ?? internalTheme;
  const setTheme = externalSetTheme ?? setInternalTheme;
  const selectedThemeName = externalSelectedThemeName ?? internalSelectedThemeName;
  const setSelectedThemeName = externalSetSelectedThemeName ?? setInternalSelectedThemeName;
  const showSettings = externalShowSettings ?? internalShowSettings;
  const setShowSettings = externalSetShowSettings ?? setInternalShowSettings;
  const showThemeModal = externalShowThemeModal ?? internalShowThemeModal;
  const setShowThemeModal = externalSetShowThemeModal ?? setInternalShowThemeModal;

  const [linePreview, setLinePreview] = useState(3);
  const [isCustomThemeOpen, setIsCustomThemeOpen] = useState(false);
  const [availableThemes, setAvailableThemes] = useState<ThemeDefinition[]>([]);
  const [groupedThemes, setGroupedThemes] = useState<GroupedThemes[]>([]);
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
  const pendingResultRef = useRef<{
    wpm: number;
    accuracy: number;
    mode: string;
    duration: number;
    wordCount: number;
    difficulty: string;
    punctuation: boolean;
    numbers: boolean;
    wordsCorrect: number;
    wordsIncorrect: number;
    charsMissed: number;
    charsExtra: number;
  } | null>(null);

  // Clerk auth hooks
  const { isSignedIn, user } = useUser();
  const { openSignIn } = useClerk();
  const saveResultMutation = useMutation(api.testResults.saveResult);
  const getOrCreateUser = useMutation(api.users.getOrCreateUser);

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
  const accuracy = typedText.length > 0 ? (stats.correct / typedText.length) * 100 : 100;
  const elapsedMinutes = elapsedMs / 60000 || 0.01;
  const wpm = (typedText.length / 5) / elapsedMinutes;

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

      // Only load theme from storage if not controlled externally
      if (!externalTheme) {
        const storedTheme = loadTheme();
        if (storedTheme) {
          setInternalTheme(storedTheme);
        }

        const storedThemeName = loadThemeName();
        if (storedThemeName) {
          setInternalSelectedThemeName(storedThemeName);
        }
      }
    });
  }, [externalTheme]);

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

  // --- Save Theme ---
  useEffect(() => {
    if (!hasLoadedFromStorage.current) return;
    saveTheme(theme);
    saveThemeName(selectedThemeName);
  }, [theme, selectedThemeName]);

  // --- Load Preferences from DB (for logged-in users) ---
  useEffect(() => {
    if (!dbPreferences || hasAppliedDbPrefs.current) return;
    hasAppliedDbPrefs.current = true;

    // Use requestAnimationFrame to defer state updates and avoid cascading renders
    requestAnimationFrame(() => {
      // Apply theme from DB
      if (!externalTheme) {
        if (dbPreferences.customTheme) {
          setInternalTheme(dbPreferences.customTheme);
        }
        setInternalSelectedThemeName(dbPreferences.themeName);
      }

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
  }, [dbPreferences, externalTheme]);

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
    inputRef.current?.focus();
  }, []);

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
  }, [isFinished, isPlanActive, isPlanSplash, plan, planIndex, planResults, typedText, words, elapsedMs]);

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

  // Save results to Convex
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

      // Save the result
      await saveResultMutation({
        clerkId: user.id,
        ...dataToSave,
      });
      setSaveState("saved");
      pendingResultRef.current = null;
    } catch (error) {
      console.error("Failed to save result:", error);
      setSaveState("error");
    }
  }, [user, wpm, accuracy, settings.mode, settings.difficulty, settings.punctuation, settings.numbers, elapsedMs, typedText.length, wordResults, stats, openSignIn, getOrCreateUser, saveResultMutation]);

  // Effect to save pending result after sign-in
  useEffect(() => {
    if (isSignedIn && user && pendingResultRef.current) {
      const pending = pendingResultRef.current;
      pendingResultRef.current = null;
      saveResults(pending);
    }
  }, [isSignedIn, user, saveResults]);

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
      })
    );
    resetSession(false);
  }, [
    settings.mode,
    settings.wordTarget,
    settings.punctuation,
    settings.numbers,
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
      // Spacebar to save results (only if not already saved/saving and not in connect mode)
      if (e.key === " " && !connectMode && saveState !== "saving" && saveState !== "saved") {
        e.preventDefault();
        saveResults();
      }
    };

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [isFinished, generateTest, resetSession, connectMode, saveState, saveResults]);

  const handlePresetSubmit = (text: string) => {
    const sanitized = text.replace(/[^\x20-\x7E\n]/g, "").replace(/\s+/g, " ").trim();
    if (sanitized.length > 0 && sanitized.length <= 10000) {
      updateSettings({ presetText: sanitized });
      setShowPresetInput(false);
    }
  };

  const handleThemeSelect = async (themeName: string) => {
    // First check if already loaded in availableThemes
    const cached = availableThemes.find(
      (t) => t.name.toLowerCase() === themeName.toLowerCase()
    );
    if (cached) {
      const { name, ...colors } = cached;
      setTheme(colors);
      setSelectedThemeName(name);
      return;
    }
    // Otherwise fetch it
    const themeData = await fetchTheme(themeName);
    if (themeData) {
      const { name, ...colors } = themeData;
      setTheme(colors);
      setSelectedThemeName(name);
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
          className="fixed top-[130px] md:top-[15%] left-0 w-full flex flex-col items-center justify-center gap-4 transition-all duration-300 z-20"
          style={{ fontSize: `${settings.iconFontSize}rem`, opacity: uiOpacity }}
        >
          {/* Modes Row: [modes] | [preset/plan] | [punctuation/numbers] | [sound/ghost] */}
          <div className="flex flex-wrap items-center justify-center gap-4 text-gray-400">
            {/* Group 1: Test Modes */}
            <div className="flex rounded-lg p-1" style={{ backgroundColor: theme.surfaceColor }}>
              {(["time", "words", "quote", "zen"] as const).map((m) => (
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

            {/* Group 2: Preset & Plan */}
            <div className="flex rounded-lg p-1" style={{ backgroundColor: theme.surfaceColor }}>
              {/* Preset Mode */}
              <button
                type="button"
                onClick={() => {
                  if (settings.mode === "preset") {
                    setShowPresetInput(true);
                  } else {
                    updateSettings({ mode: "preset" });
                  }
                }}
                className={`px-3 py-1 rounded transition ${settings.mode === "preset" ? "font-medium bg-gray-800" : "hover:text-gray-200"}`}
                style={{ color: settings.mode === "preset" ? theme.buttonSelected : undefined }}
              >
                preset
              </button>
              {/* Plan Mode */}
              <button
                type="button"
                onClick={() => setShowPlanBuilder(true)}
                className={`px-3 py-1 rounded transition hover:text-gray-200 ${isPlanActive ? "font-medium bg-gray-800" : ""}`}
                style={{ color: isPlanActive ? theme.buttonSelected : undefined }}
                title="Plan Mode"
              >
                plan
              </button>
            </div>

            <div className="w-px h-4 bg-gray-700"></div>

            {/* Group 3: Punctuation & Numbers */}
            <div className="flex gap-4 rounded-lg px-3 py-1.5" style={{ backgroundColor: theme.surfaceColor }}>
              <button
                type="button"
                onClick={() => updateSettings({ punctuation: !settings.punctuation })}
                className={`flex items-center gap-2 transition ${settings.punctuation ? "" : "hover:text-gray-200"}`}
                style={{ color: settings.punctuation ? theme.buttonSelected : undefined }}
                disabled={settings.mode === "preset"}
                title={settings.mode === "preset" ? "Not available in preset mode" : "Toggle punctuation"}
              >
                <span
                  className={settings.punctuation ? "text-gray-900 rounded px-1 text-[0.75em] font-bold" : "bg-gray-700 rounded px-1 text-[0.75em]"}
                  style={{ 
                    backgroundColor: settings.punctuation ? theme.buttonSelected : undefined,
                    opacity: settings.mode === "preset" ? 0.5 : 1
                  }}
                >
                  @
                </span>
                <span style={{ opacity: settings.mode === "preset" ? 0.5 : 1 }}>punctuation</span>
              </button>
              <button
                type="button"
                onClick={() => updateSettings({ numbers: !settings.numbers })}
                className={`flex items-center gap-2 transition ${settings.numbers ? "" : "hover:text-gray-200"}`}
                style={{ color: settings.numbers ? theme.buttonSelected : undefined }}
                disabled={settings.mode === "preset"}
                title={settings.mode === "preset" ? "Not available in preset mode" : "Toggle numbers"}
              >
                <span
                  className={settings.numbers ? "text-gray-900 rounded px-1 text-[0.75em] font-bold" : "bg-gray-700 rounded px-1 text-[0.75em]"}
                  style={{ 
                    backgroundColor: settings.numbers ? theme.buttonSelected : undefined,
                    opacity: settings.mode === "preset" ? 0.5 : 1
                  }}
                >
                  #
                </span>
                <span style={{ opacity: settings.mode === "preset" ? 0.5 : 1 }}>numbers</span>
              </button>
            </div>

            <div className="w-px h-4 bg-gray-700"></div>

            {/* Group 4: Sound & Ghost Writer */}
            <div className="flex items-center gap-2 rounded-lg px-3 py-1.5" style={{ backgroundColor: theme.surfaceColor }}>
              <SoundController
                settings={settings}
                onUpdateSettings={updateSettings}
                soundManifest={soundManifest}
                theme={theme}
              />
              <GhostWriterController
                settings={settings}
                onUpdateSettings={updateSettings}
                theme={theme}
              />
            </div>
          </div>

          {/* Line 3: Sub-settings */}
          <div className="flex flex-wrap items-center justify-center gap-2 text-gray-400">
            {/* Time Presets */}
            {settings.mode === "time" && (
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
                    {d}
                  </button>
                ))}
              </div>
            )}

            {/* Word Presets */}
            {settings.mode === "words" && (
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
            )}

            {/* Quote Length */}
            {settings.mode === "quote" && quotesManifest && (
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
            )}

            {/* Difficulty */}
            {settings.mode !== "quote" && settings.mode !== "preset" && wordsManifest && (
              <div className="flex rounded-lg p-1 ml-2" style={{ backgroundColor: theme.surfaceColor }}>
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
            )}

            {/* Edit Preset Button */}
            {settings.mode === "preset" && (
              <button
                type="button"
                onClick={() => setShowPresetInput(true)}
                className="ml-2 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-gray-200 transition flex items-center gap-2"
              >
                <span>✎</span> Edit Text
              </button>
            )}
          </div>
        </div>
      )}

      {/* Live Stats Floating Pills */}
      {isRunning && !isFinished && (
        <div className="fixed top-[80px] md:top-[20%] left-0 w-full flex flex-row flex-nowrap items-center justify-center gap-2 md:gap-4 select-none z-10 transition-opacity duration-500">
          {/* WPM Pill */}
          <div
            className="flex items-baseline gap-2 px-3 py-1.5 md:px-6 md:py-3 backdrop-blur-md rounded-full shadow-lg min-w-[70px] md:min-w-[100px] justify-center"
            style={{ backgroundColor: `${theme.surfaceColor}E6`, borderWidth: 1, borderColor: `${theme.defaultText}30` }}
          >
            <span className="text-xl md:text-3xl font-bold tabular-nums leading-none" style={{ color: theme.buttonSelected }}>
              {Math.round(wpm)}
            </span>
            <span className="text-[10px] md:text-xs font-semibold uppercase tracking-wider" style={{ color: theme.defaultText }}>wpm</span>
          </div>

          {/* Accuracy Pill */}
          <div
            className="flex items-baseline gap-2 px-3 py-1.5 md:px-6 md:py-3 backdrop-blur-md rounded-full shadow-lg min-w-[70px] md:min-w-[100px] justify-center"
            style={{ backgroundColor: `${theme.surfaceColor}E6`, borderWidth: 1, borderColor: `${theme.defaultText}30` }}
          >
            <span className="text-xl md:text-3xl font-bold tabular-nums leading-none" style={{ color: theme.buttonSelected }}>
              {Math.round(accuracy)}%
            </span>
            <span className="text-[10px] md:text-xs font-semibold uppercase tracking-wider" style={{ color: theme.defaultText }}>acc</span>
          </div>

          {/* Timer Pill */}
          {settings.mode === "time" && (
            <div
              className="flex items-baseline gap-2 px-3 py-1.5 md:px-6 md:py-3 backdrop-blur-md rounded-full shadow-lg min-w-[70px] md:min-w-[100px] justify-center"
              style={{ backgroundColor: `${theme.surfaceColor}E6`, borderWidth: 1, borderColor: `${theme.defaultText}30` }}
            >
              <span
                className="text-xl md:text-3xl font-bold tabular-nums leading-none"
                style={{ color: timeRemaining < 10 ? theme.incorrectText : theme.correctText }}
              >
                {formatTime(timeRemaining)}
              </span>
            </div>
          )}

          {/* Word Counter Pill */}
          {settings.mode === "words" && (
            <div
              className="flex items-baseline gap-2 px-3 py-1.5 md:px-6 md:py-3 backdrop-blur-md rounded-full shadow-lg min-w-[70px] md:min-w-[100px] justify-center"
              style={{ backgroundColor: `${theme.surfaceColor}E6`, borderWidth: 1, borderColor: `${theme.defaultText}30` }}
            >
              <span className="text-xl md:text-3xl font-bold tabular-nums leading-none" style={{ color: theme.correctText }}>
                {Math.min(typedText.trim() === "" ? 0 : typedText.trim().split(/\s+/).length, settings.wordTarget === 0 ? Infinity : settings.wordTarget)}
              </span>
              {settings.wordTarget > 0 && (
                <>
                  <span className="text-sm font-medium" style={{ color: theme.defaultText }}>/</span>
                  <span className="text-lg md:text-xl font-semibold tabular-nums leading-none" style={{ color: theme.defaultText }}>
                    {settings.wordTarget}
                  </span>
                </>
              )}
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
            <span className="text-sm" style={{ color: theme.defaultText }}>
              {currentQuote.source}, {currentQuote.date}
            </span>
          </div>
        </div>
      )}

      {/* Typing Area */}
      <div className="w-[95%] md:w-[80%] max-w-none">
        {!isFinished ? (
          <div className="relative">
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
          <div className="w-full max-w-4xl mx-auto animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {/* WPM */}
              <div
                className="relative overflow-hidden rounded-2xl p-6 md:p-10 flex flex-col items-center justify-center group transition-colors"
                style={{ backgroundColor: theme.surfaceColor, borderWidth: 1, borderColor: `${theme.defaultText}30` }}
              >
                <div className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: theme.defaultText }}>
                  Words Per Minute
                </div>
                <div
                  className="text-6xl md:text-8xl font-black tabular-nums leading-none tracking-tight"
                  style={{ color: theme.buttonSelected }}
                >
                  {Math.round(wpm)}
                </div>
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity" style={{ color: theme.correctText }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                </div>
              </div>

              {/* Accuracy */}
              <div
                className="relative overflow-hidden rounded-2xl p-6 md:p-10 flex flex-col items-center justify-center group transition-colors"
                style={{ backgroundColor: theme.surfaceColor, borderWidth: 1, borderColor: `${theme.defaultText}30` }}
              >
                <div className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: theme.defaultText }}>
                  Accuracy
                </div>
                <div
                  className="text-6xl md:text-8xl font-black tabular-nums leading-none tracking-tight"
                  style={{ color: theme.buttonSelected }}
                >
                  {Math.round(accuracy)}
                  <span className="text-2xl md:text-4xl align-top ml-1 opacity-50">%</span>
                </div>
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity" style={{ color: theme.correctText }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Secondary Stats - Grouped by Words and Characters */}
            <div className="flex flex-col md:flex-row gap-4 mb-12">
              {/* Words Group */}
              <div className="flex-1 rounded-xl p-4" style={{ backgroundColor: `${theme.surfaceColor}80`, borderWidth: 1, borderColor: `${theme.defaultText}20` }}>
                <div className="text-xs font-semibold uppercase tracking-wide text-center mb-3" style={{ color: theme.defaultText }}>Words</div>
                <div className="grid grid-cols-2 gap-4">
                  {/* Correct Words with Hover */}
                  <HoverCard openDelay={100} closeDelay={100}>
                    <HoverCardTrigger asChild>
                      <div className="flex flex-col items-center cursor-pointer hover:opacity-80 transition-opacity">
                        <div className="text-3xl font-bold mb-1" style={{ color: theme.correctText }}>{wordResults.correctWords.length}</div>
                        <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: theme.defaultText }}>Correct</div>
                      </div>
                    </HoverCardTrigger>
                    <HoverCardContent 
                      className="w-56 p-0"
                      style={{ backgroundColor: theme.surfaceColor, borderColor: `${theme.defaultText}30` }}
                    >
                      <div className="p-3" style={{ borderBottomWidth: 1, borderColor: `${theme.defaultText}30` }}>
                        <div className="text-sm font-semibold" style={{ color: theme.correctText }}>Correct Words</div>
                        <div className="text-xs" style={{ color: theme.defaultText }}>{wordResults.correctWords.length} words</div>
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
                          <div className="p-3 text-center text-sm" style={{ color: theme.defaultText }}>
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
                        <div className="text-3xl font-bold mb-1" style={{ color: theme.incorrectText }}>{wordResults.incorrectWords.length}</div>
                        <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: theme.defaultText }}>Incorrect</div>
                      </div>
                    </HoverCardTrigger>
                    <HoverCardContent 
                      className="w-64 p-0"
                      style={{ backgroundColor: theme.surfaceColor, borderColor: `${theme.defaultText}30` }}
                    >
                      <div className="p-3" style={{ borderBottomWidth: 1, borderColor: `${theme.defaultText}30` }}>
                        <div className="text-sm font-semibold" style={{ color: theme.correctText }}>Incorrect Words</div>
                        <div className="text-xs" style={{ color: theme.defaultText }}>{wordResults.incorrectWords.length} mistakes</div>
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
                                <span style={{ color: theme.incorrectText }}>{item.typed}</span>
                                <span style={{ color: theme.defaultText }}>→</span>
                                <span style={{ color: theme.buttonSelected }}>{item.expected}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="p-3 text-center text-sm" style={{ color: theme.defaultText }}>
                            No mistakes - perfect!
                          </div>
                        )}
                      </div>
                    </HoverCardContent>
                  </HoverCard>
                </div>
              </div>

              {/* Characters Group */}
              <div className="flex-1 rounded-xl p-4" style={{ backgroundColor: `${theme.surfaceColor}80`, borderWidth: 1, borderColor: `${theme.defaultText}20` }}>
                <div className="text-xs font-semibold uppercase tracking-wide text-center mb-3" style={{ color: theme.defaultText }}>Characters</div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col items-center">
                    <div className="text-3xl font-bold mb-1" style={{ color: theme.correctText }}>{stats.missed}</div>
                    <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: theme.defaultText }}>Missed</div>
                  </div>
                  <div className="flex flex-col items-center">
                    <div className="text-3xl font-bold mb-1" style={{ color: theme.correctText }}>{stats.extra}</div>
                    <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: theme.defaultText }}>Extra</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Quote Attribution */}
            {settings.mode === "quote" && currentQuote && (
              <div className="text-center mb-8" style={{ color: theme.defaultText }}>
                — {currentQuote.author}
                {currentQuote.source && `, ${currentQuote.source}`}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-4 justify-center">
              {/* Save Results Button */}
              {!connectMode && (
                <button
                  type="button"
                  onClick={() => saveResults()}
                  disabled={saveState === "saving" || saveState === "saved"}
                  className="group relative inline-flex items-center justify-center px-8 py-3 font-medium transition-all duration-200 rounded-lg hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-70 disabled:cursor-not-allowed"
                  style={{ 
                    backgroundColor: saveState === "saved" ? `${theme.correctText}20` : saveState === "error" ? `${theme.incorrectText}20` : theme.buttonSelected, 
                    color: saveState === "saved" ? theme.correctText : saveState === "error" ? theme.incorrectText : theme.backgroundColor 
                  }}
                >
                  {saveState === "idle" && (
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
                  {saveState === "saving" && (
                    <>
                      <div
                        className="h-4 w-4 rounded-full border-2 border-t-transparent animate-spin mr-2"
                        style={{ borderColor: "currentColor", borderTopColor: "transparent" }}
                      />
                      Saving...
                    </>
                  )}
                  {saveState === "saved" && (
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
                  {saveState === "error" && (
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
                  style={{ backgroundColor: theme.surfaceColor, color: theme.correctText }}
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
                  style={{ color: theme.incorrectText, backgroundColor: `${theme.incorrectText}20`, borderWidth: 1, borderColor: `${theme.incorrectText}50` }}
                >
                  Leave Room
                </button>
              )}
            </div>

            <div className="mt-6 text-center text-sm" style={{ color: theme.defaultText }}>
              <div>
                Press <kbd className="px-1.5 py-0.5 rounded font-sans" style={{ backgroundColor: theme.surfaceColor, color: theme.correctText }}>Space</kbd> to save
                {" · "}
                <kbd className="px-1.5 py-0.5 rounded font-sans" style={{ backgroundColor: theme.surfaceColor, color: theme.correctText }}>Enter</kbd> to continue
              </div>
              <div className="mt-1">
                Press <kbd className="px-1.5 py-0.5 rounded font-sans" style={{ backgroundColor: theme.surfaceColor, color: theme.correctText }}>Tab</kbd> to repeat this test
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Instructions */}
      {!isRunning && !isFinished && (
        <div
          className="fixed bottom-[15%] left-0 w-full text-center text-gray-600 transition-opacity duration-300"
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
            <h2 className="text-xl font-semibold text-gray-200 mb-4">Enter Custom Text</h2>
            <textarea
              value={tempPresetText}
              onChange={(e) => setTempPresetText(e.target.value)}
              className="w-full h-48 rounded bg-gray-700 px-3 py-2 text-gray-200 focus:outline-none focus:ring-2"
              style={{ "--tw-ring-color": theme.buttonSelected } as React.CSSProperties}
              placeholder="Paste or type your custom text here..."
            />
            <div className="flex justify-end gap-4 mt-4">
              <button onClick={() => setShowPresetInput(false)} className="px-4 py-2 text-gray-400 hover:text-gray-200">
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
          }}
        >
          <div
            className="w-full max-w-2xl rounded-lg p-6 shadow-xl mx-4 max-h-[90vh] flex flex-col"
            style={{ backgroundColor: theme.surfaceColor }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-200">Theme</h2>
              <button
                onClick={() => {
                  setShowThemeModal(false);
                  setIsCustomThemeOpen(false);
                }}
                className="text-gray-400 hover:text-gray-200"
              >
                ✕
              </button>
            </div>

            {/* Scrollable Content Area */}
            <div className="flex-1 overflow-y-auto pr-2">
              {/* Grouped Themes Grid */}
              {groupedThemes.map((group) => (
                <div key={group.category} className="mb-6 last:mb-0">
                  <h3 className="text-sm font-medium text-gray-400 mb-3 sticky top-0 py-1" style={{ backgroundColor: theme.surfaceColor }}>
                    {group.displayName}
                  </h3>
                  <div className="grid grid-cols-3 gap-2">
                    {group.themes.map((themeData) => (
                      <button
                        key={themeData.name}
                        onClick={() => {
                          handleThemeSelect(themeData.name);
                        }}
                        className={`p-3 rounded-lg border transition ${
                          selectedThemeName.toLowerCase() === themeData.name.toLowerCase()
                            ? "border-gray-400 ring-1 ring-gray-400"
                            : "border-gray-700 hover:border-gray-500"
                        }`}
                        style={{ backgroundColor: themeData.backgroundColor }}
                      >
                        <div className="flex items-center gap-1.5 mb-2">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: themeData.cursor }} />
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: themeData.buttonSelected }} />
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: themeData.correctText }} />
                        </div>
                        <div className="text-xs truncate" style={{ color: themeData.correctText }}>
                          {themeData.name}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}

              {/* Separator */}
              <div className="border-t border-gray-600 my-4" />

              {/* Custom Theme Dropdown */}
              <div className="border border-gray-600 rounded-lg overflow-hidden mb-4">
              <button
                type="button"
                onClick={() => setIsCustomThemeOpen(!isCustomThemeOpen)}
                className="w-full flex items-center justify-between px-4 py-3 bg-gray-700 hover:bg-gray-600 transition-colors"
              >
                <span className="text-sm font-medium text-gray-200">Custom Theme</span>
                <svg
                  className={`w-5 h-5 text-gray-400 transition-transform ${isCustomThemeOpen ? "rotate-180" : ""}`}
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
                <div className="p-4 bg-gray-800/50 space-y-3">
                  {/* Color Picker Grid */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-300">Background</span>
                      <div className="flex items-center gap-2">
                        <ColorPicker
                          value={theme.backgroundColor}
                          onChange={(color) => {
                            setTheme({ ...theme, backgroundColor: color });
                            setSelectedThemeName("Custom");
                          }}
                        />
                        <button
                          onClick={() => setTheme({ ...theme, backgroundColor: "#323437" })}
                          className="text-xs text-gray-500 hover:text-gray-300"
                          title="Reset"
                        >
                          ↺
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-300">Surface</span>
                      <div className="flex items-center gap-2">
                        <ColorPicker
                          value={theme.surfaceColor}
                          onChange={(color) => {
                            setTheme({ ...theme, surfaceColor: color });
                            setSelectedThemeName("Custom");
                          }}
                        />
                        <button
                          onClick={() => setTheme({ ...theme, surfaceColor: "#2c2e31" })}
                          className="text-xs text-gray-500 hover:text-gray-300"
                          title="Reset"
                        >
                          ↺
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-300">Cursor</span>
                      <div className="flex items-center gap-2">
                        <ColorPicker
                          value={theme.cursor}
                          onChange={(color) => {
                            setTheme({ ...theme, cursor: color });
                            setSelectedThemeName("Custom");
                          }}
                        />
                        <button
                          onClick={() => setTheme({ ...theme, cursor: "#3cb5ee" })}
                          className="text-xs text-gray-500 hover:text-gray-300"
                          title="Reset"
                        >
                          ↺
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-300">Ghost Cursor</span>
                      <div className="flex items-center gap-2">
                        <ColorPicker
                          value={theme.ghostCursor}
                          onChange={(color) => {
                            setTheme({ ...theme, ghostCursor: color });
                            setSelectedThemeName("Custom");
                          }}
                        />
                        <button
                          onClick={() => setTheme({ ...theme, ghostCursor: "#a855f7" })}
                          className="text-xs text-gray-500 hover:text-gray-300"
                          title="Reset"
                        >
                          ↺
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-300">Default Text</span>
                      <div className="flex items-center gap-2">
                        <ColorPicker
                          value={theme.defaultText}
                          onChange={(color) => {
                            setTheme({ ...theme, defaultText: color, upcomingText: color });
                            setSelectedThemeName("Custom");
                          }}
                        />
                        <button
                          onClick={() => setTheme({ ...theme, defaultText: "#4b5563", upcomingText: "#4b5563" })}
                          className="text-xs text-gray-500 hover:text-gray-300"
                          title="Reset"
                        >
                          ↺
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-300">Correct Text</span>
                      <div className="flex items-center gap-2">
                        <ColorPicker
                          value={theme.correctText}
                          onChange={(color) => {
                            setTheme({ ...theme, correctText: color });
                            setSelectedThemeName("Custom");
                          }}
                        />
                        <button
                          onClick={() => setTheme({ ...theme, correctText: "#d1d5db" })}
                          className="text-xs text-gray-500 hover:text-gray-300"
                          title="Reset"
                        >
                          ↺
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-300">Incorrect Text</span>
                      <div className="flex items-center gap-2">
                        <ColorPicker
                          value={theme.incorrectText}
                          onChange={(color) => {
                            setTheme({ ...theme, incorrectText: color });
                            setSelectedThemeName("Custom");
                          }}
                        />
                        <button
                          onClick={() => setTheme({ ...theme, incorrectText: "#ef4444" })}
                          className="text-xs text-gray-500 hover:text-gray-300"
                          title="Reset"
                        >
                          ↺
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-300">Btn Selected</span>
                      <div className="flex items-center gap-2">
                        <ColorPicker
                          value={theme.buttonSelected}
                          onChange={(color) => {
                            setTheme({ ...theme, buttonSelected: color });
                            setSelectedThemeName("Custom");
                          }}
                        />
                        <button
                          onClick={() => setTheme({ ...theme, buttonSelected: "#0097b2" })}
                          className="text-xs text-gray-500 hover:text-gray-300"
                          title="Reset"
                        >
                          ↺
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-300">Btn Unselected</span>
                      <div className="flex items-center gap-2">
                        <ColorPicker
                          value={theme.buttonUnselected}
                          onChange={(color) => {
                            setTheme({ ...theme, buttonUnselected: color });
                            setSelectedThemeName("Custom");
                          }}
                        />
                        <button
                          onClick={() => setTheme({ ...theme, buttonUnselected: "#3cb5ee" })}
                          className="text-xs text-gray-500 hover:text-gray-300"
                          title="Reset"
                        >
                          ↺
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Reset All Button */}
                  <button
                    onClick={() => {
                      setTheme({
                        backgroundColor: "#323437",
                        surfaceColor: "#2c2e31",
                        cursor: "#3cb5ee",
                        ghostCursor: "#a855f7",
                        defaultText: "#4b5563",
                        upcomingText: "#4b5563",
                        correctText: "#d1d5db",
                        incorrectText: "#ef4444",
                        buttonUnselected: "#3cb5ee",
                        buttonSelected: "#0097b2",
                      });
                      setSelectedThemeName("TypeSetGo");
                    }}
                    className="w-full py-2 mt-2 text-sm text-gray-400 hover:text-gray-200 border border-gray-600 rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    Reset All to Defaults
                  </button>
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
            className="w-full max-w-md rounded-lg p-6 shadow-xl mx-4"
            style={{ backgroundColor: theme.surfaceColor }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-200">Settings</h2>
              <button onClick={() => setShowSettings(false)} className="text-gray-400 hover:text-gray-200">
                ✕
              </button>
            </div>

            <div className="space-y-6">
              {/* Line Preview */}
              <div>
                <label className="mb-2 block text-sm text-gray-400">Lines to Preview</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((num) => (
                    <button
                      key={num}
                      onClick={() => setLinePreview(num)}
                      className={`rounded px-4 py-2 text-sm transition ${linePreview === num ? "font-medium bg-gray-800" : "bg-gray-700 hover:bg-gray-600"}`}
                      style={{ color: linePreview === num ? theme.buttonSelected : "#d1d5db" }}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>

              {/* Font Size */}
              <div>
                <label className="mb-2 block text-sm text-gray-400">Text Size (rem)</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  step="0.25"
                  value={settings.typingFontSize}
                  onChange={(e) => updateSettings({ typingFontSize: parseFloat(e.target.value) || 3 })}
                  className="w-full rounded bg-gray-700 px-3 py-2 text-gray-200 focus:outline-none focus:ring-2"
                  style={{ "--tw-ring-color": theme.buttonSelected } as React.CSSProperties}
                />
              </div>

              {/* Text Alignment */}
              <div>
                <label className="mb-2 block text-sm text-gray-400">Text Alignment</label>
                <div className="flex gap-2">
                  {(["left", "center", "right", "justify"] as const).map((align) => (
                    <button
                      key={align}
                      onClick={() => updateSettings({ textAlign: align })}
                      className={`rounded px-3 py-1 text-sm capitalize transition ${settings.textAlign === align ? "font-medium bg-gray-800" : "bg-gray-700 hover:bg-gray-600"}`}
                      style={{ color: settings.textAlign === align ? theme.buttonSelected : "#d1d5db" }}
                    >
                      {align}
                    </button>
                  ))}
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
              style={{ color: theme.defaultText }}
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
              style={{ backgroundColor: theme.surfaceColor, color: theme.correctText }}
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
