import {
  ArrowFatLineUpIcon,
  ArrowsClockwiseIcon,
} from "@phosphor-icons/react";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useMutation } from "convex/react";
import { MAX_PRESET_TEXT_LENGTH, SOLO_PREPARED_SESSION_TTL_MS } from "@/lib/practice-limits";
import { toast } from "@/lib/toast-manager";
import { normalizePracticeSettings, type Quote, type SettingsState } from "@/lib/typing-constants";
import { fetchSoundManifest, getRandomSoundUrl, type SoundManifest } from "@/lib/sounds";
import { useTheme } from "@/hooks/useTheme";
import { tv } from "@/lib/theme-vars";
import { fetchWordsManifest, type WordsManifest } from "@/lib/words";
import { fetchQuotesManifest, type QuotesManifest } from "@/lib/quotes";
import {
  DEFAULT_SETTINGS,
  loadSettings,
} from "@/lib/storage-utils";
import { getTypingFontFamily } from "@/lib/typing-fonts";
import OnScreenKeyboard from "@/components/typing/keyboard/OnScreenKeyboard";
import { Progress } from "@/components/ui/progress";
import { useAppAuth } from "@/components/layout/useAppAuth";
import { useAccount } from "@/components/layout/useAccount";
import { getLocalCalendarFields } from "@/lib/activity-calendar";
import { calculateAccuracy, calculateWpm } from "@/lib/typing-metrics";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { useNotify } from "@/hooks/useNotify";
import { getAchievementById } from "@/lib/achievement-definitions";
import { computeStats, computeWordResults, sanitizeTypingInput, getInputPosition, getNextTypingKey,
  hasCompletedPrompt, isTimedPractice, placeCaretAtEnd, constrainEditingKey } from "./practice-input";
import { usePracticePreferences } from "./usePracticePreferences";
import { usePracticeClock } from "./usePracticeClock";
import { usePracticeDataset } from "./usePracticeDataset";
import { useTypingScroll } from "./useTypingScroll";
import PracticeText from "./PracticeText";
import PracticeResults from "./PracticeResults";
import PracticeCountDialog from "./PracticeCountDialog";
import PracticePresetDialog from "./PracticePresetDialog";
import PracticeControls from "./PracticeControls";
import PracticeQuickSettingsDialog from "./PracticeQuickSettingsDialog";
import PracticeSettingsDialog from "./PracticeSettingsDialog";
import PracticeThemePicker from "./PracticeThemePicker";
import { PROMPT_SETTING_KEYS, TIME_PRESETS, WORD_PRESETS, type ModeSelectorOption } from "./practice-config";

// Constants
const PUNCTUATION_CHARS = [".", ",", "!", "?", ";", ":"];
const NUMBER_CHARS = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];
const LINE_HEIGHT = 1.6;

// Word generation helper
const generateWords = (
  count: number,
  pool: string[],
  options: { punctuation: boolean; numbers: boolean; capitalization: boolean },
  random: () => number = Math.random
) => {
  const words = [];
  if (pool.length === 0) return "";

  for (let i = 0; i < count; i++) {
    let word = pool[Math.floor(random() * pool.length)];

    if (options.numbers && random() < 0.2) {
      word =
        NUMBER_CHARS[Math.floor(random() * NUMBER_CHARS.length)] +
        NUMBER_CHARS[Math.floor(random() * NUMBER_CHARS.length)];
    }

    if (options.punctuation && random() < 0.15 && i > 0) {
      word =
        word + PUNCTUATION_CHARS[Math.floor(random() * PUNCTUATION_CHARS.length)];
    }

    // Apply capitalization: capitalize first letter of some words
    if (options.capitalization && random() < 0.25) {
      word = word.charAt(0).toUpperCase() + word.slice(1);
    }

    words.push(word);
  }
  return words.join(" ");
};

// Prompt rendering is deterministic for a request; user actions sample a fresh seed.
const createPromptRandom = (seed: number) => {
  let value = seed >>> 0;
  return () => {
    value = (Math.imul(value, 1664525) + 1013904223) >>> 0;
    return value / 4294967296;
  };
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
  const { isSignedIn, user, openSignIn, status: authStatus } = useAppAuth();
  const { ensureAccount, status: accountStatus } = useAccount();
  const { colors } = useTheme();
  // --- State ---
  const [localSettings, setSettings] = useState<SettingsState>(() => {
    const restored = normalizePracticeSettings({ ...DEFAULT_SETTINGS, ...loadSettings(), presetText: "",
      ...(connectMode ? lockedSettings : {}) });
    // Solo plans were never exposed; old preferences resume ordinary practice.
    return !connectMode && restored.mode === "plan" ? { ...restored, mode: "zen" } : restored;
  });
  const settings = useMemo(() => connectMode && lockedSettings
    ? normalizePracticeSettings({ ...localSettings, ...lockedSettings }) : localSettings,
  [connectMode, lockedSettings, localSettings]);
  // Use external state if provided, otherwise use internal state
  const [internalShowSettings, setInternalShowSettings] = useState(false);
  const [internalShowThemeModal, setInternalShowThemeModal] = useState(false);

  // Resolve to external or internal state
  const showSettings = externalShowSettings ?? internalShowSettings;
  const setShowSettings = externalSetShowSettings ?? setInternalShowSettings;
  const showThemeModal = externalShowThemeModal ?? internalShowThemeModal;
  const setShowThemeModal = externalSetShowThemeModal ?? setInternalShowThemeModal;

  const [soundManifest, setSoundManifest] = useState<SoundManifest | null>(null);
  const [wordsManifest, setWordsManifest] = useState<WordsManifest | null>(null);
  const [quotesManifest, setQuotesManifest] = useState<QuotesManifest | null>(null);
  const [showPresetInput, setShowPresetInput] = useState(settings.mode === "preset" && !settings.presetText);
  const [showCustomCountModal, setShowCustomCountModal] = useState(false);
  const dataset = usePracticeDataset(settings, quotesManifest);
  const { wordPool, quotes } = dataset;
  const promptConfigKey = JSON.stringify(PROMPT_SETTING_KEYS.map((key) => settings[key]));
  const [promptSeed, setPromptSeed] = useState(() => ({ value: Math.floor(Math.random() * 4294967296) }));
  const preparedPrompt = useMemo(() => {
    const prompt = { configKey: promptConfigKey, seed: promptSeed, datasetStatus: dataset.status,
      wordPool, quotes, text: "", quote: null as Quote | null, needsPreset: false };
    if (dataset.status !== "ready") return prompt;
    const random = createPromptRandom(promptSeed.value);
    if (settings.mode === "quote") {
      prompt.quote = quotes[Math.floor(random() * quotes.length)] ?? null;
      prompt.text = prompt.quote?.quote.replace(/\s+/g, " ").trim() ?? "";
    } else if (settings.mode === "preset") {
      prompt.text = settings.presetText.replace(/\s+/g, " ").trim();
      prompt.needsPreset = !prompt.text;
    } else {
      prompt.text = generateWords(settings.mode === "words" ? settings.wordTarget : 200, wordPool, {
        punctuation: settings.punctuation, numbers: settings.numbers, capitalization: settings.capitalization,
      }, random);
    }
    return prompt;
  }, [dataset.status, promptConfigKey, promptSeed, settings.mode, settings.presetText,
    settings.wordTarget, settings.punctuation, settings.numbers, settings.capitalization, wordPool, quotes]);
  const [activePrompt, setActivePrompt] = useState(preparedPrompt);
  const matchesPromptRequest = activePrompt.configKey === promptConfigKey && activePrompt.seed === promptSeed
    && activePrompt.datasetStatus === dataset.status && activePrompt.wordPool === wordPool && activePrompt.quotes === quotes;
  const [currentQuote, setCurrentQuote] = useState<Quote | null>(preparedPrompt.quote);
  const [words, setWords] = useState(preparedPrompt.text);
  const [typedText, setTypedText] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const { elapsedMs: clockElapsedMs, readElapsed, resetClock } = usePracticeClock(isRunning && (!connectMode || isTestActive));
  // A fresh attempt has no elapsed time, including the commit that resets the external clock store.
  const elapsedMs = isRunning || isFinished ? clockElapsedMs : 0;
  const [isRepeated, setIsRepeated] = useState(false);
  const ghostCharIndex = Math.min(words.length, Math.floor(elapsedMs * settings.ghostWriterSpeed * 5 / 60000));
  const repeatRef = useRef(false);
  const attemptedSessionEpochRef = useRef(-1);
  const [rankingStatus, setRankingStatus] = useState<"pending" | "ranked" | "unranked">("unranked");
  const [isFocused, setIsFocused] = useState(false);
  const [capsLockOn, setCapsLockOn] = useState(false);
  const warningPlayedRef = useRef(false);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const activeKeyTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const uiOpacity = isRunning && isFocused && !isFinished && (!connectMode || isTestActive) ? 0 : 1;

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

  const overlayOpenRef = useRef(false);
  useLayoutEffect(() => {
    overlayOpenRef.current = showSettings || showThemeModal || showQuickSettings || showCustomCountModal || showPresetInput;
  }, [showSettings, showThemeModal, showQuickSettings, showCustomCountModal, showPresetInput]);

  // Save Results State
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [lastResultIsValid, setLastResultIsValid] = useState<boolean | null>(null);
  const [lastResultInvalidReason, setLastResultInvalidReason] = useState<string | undefined>(undefined);
  const pendingResultRef = useRef<{
    attemptEpoch: number;
    completedAt: number;
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
  useLayoutEffect(() => { wordsRef.current = words; }, [words]);
  useLayoutEffect(() => { typedTextRef.current = typedText; }, [typedText]);
  useLayoutEffect(() => { elapsedMsRef.current = elapsedMs; }, [elapsedMs]);
  useLayoutEffect(() => { isRunningRef.current = isRunning; }, [isRunning]);

  // Clerk auth hooks
  const saveResultMutation = useMutation(api.testResults.saveResult);
  const startSessionMutation = useMutation(api.typingSessions.startSession);
  const recordProgressMutation = useMutation(api.typingSessions.recordProgress);
  const finalizeSessionMutation = useMutation(api.typingSessions.finalizeSession);
  const cancelSessionMutation = useMutation(api.typingSessions.cancelSession);

  const sessionPreparedAtRef = useRef(0);
  const completedAtRef = useRef<number | null>(null);
  const sessionIdRef = useRef<Id<"typingSessions"> | null>(null);
  const startingSessionRef = useRef(false);
  const finalizedRef = useRef(false);
  const savingRef = useRef(false);
  const autoSaveAttemptedEpochRef = useRef(-1);
  const sessionEpochRef = useRef(0);
  const [sessionEpoch, setSessionEpoch] = useState(0);
  const userRef = useRef(user);
  const connectModeRef = useRef(connectMode);
  const settingsRef = useRef(settings);
  const isFinishedRef = useRef(isFinished);
  const isSignedInRef = useRef(isSignedIn);

  useLayoutEffect(() => { userRef.current = user; }, [user]);
  useLayoutEffect(() => { connectModeRef.current = connectMode; }, [connectMode]);
  useLayoutEffect(() => { settingsRef.current = settings; }, [settings]);
  useLayoutEffect(() => { isFinishedRef.current = isFinished; }, [isFinished]);
  useLayoutEffect(() => { isSignedInRef.current = isSignedIn; }, [isSignedIn]);

  // New achievement events go to the toast and browser notification history.
  const notify = useNotify();

  const inputRef = useRef<HTMLInputElement | null>(null);
  const focusRequestedRef = useRef(true);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const caretRef = useRef<HTMLSpanElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const composingRef = useRef(false);
  const [compositionDraft, setCompositionDraft] = useState<string | null>(null);
  const { pendingPromptPreferences, setQueuedPromptPreferences, markEdited, markThemeEdited,
    linePreview, maxWordsPerLine, updateLinePreview, updateMaxWordsPerLine } = usePracticePreferences({
    userId: user?.id, connectMode, settings, settingsRef, setSettings, isRunningRef, isFinishedRef, composingRef,
  });
  const scrollOffset = useTypingScroll({ viewportRef: containerRef, contentRef, caretRef,
    layoutKey: JSON.stringify([typedText, compositionDraft, words, settings.typingFontSize, settings.typingFontFamily, settings.textAlign, maxWordsPerLine, isFinished]),
    visibleLines: linePreview });
  const topLayoutRef = useRef<HTMLDivElement | null>(null);
  const bottomLayoutRef = useRef<HTMLDivElement | null>(null);
  const [typingCenterOffset, setTypingCenterOffset] = useState(0);

  const promptReady = dataset.status === "ready" && matchesPromptRequest && words.length > 0;

  // Prompt replacement and explicit restart share the same runtime cleanup.
  const resetAttemptRuntime = useCallback((epoch: number, isRepeat: boolean) => {
    const previousSessionId = sessionIdRef.current;
    sessionEpochRef.current = epoch;
    sessionIdRef.current = null;
    sessionPreparedAtRef.current = 0;
    completedAtRef.current = null;
    pendingResultRef.current = null;
    finalizedRef.current = false;
    savingRef.current = false;
    repeatRef.current = isRepeat;
    startingSessionRef.current = false;
    composingRef.current = false;
    warningPlayedRef.current = false;
    isFinishedRef.current = false;
    isRunningRef.current = false;
    typedTextRef.current = "";
    elapsedMsRef.current = 0;
    focusRequestedRef.current = !overlayOpenRef.current;
    resetClock();
    if (previousSessionId) void cancelSessionMutation({ sessionId: previousSessionId }).catch(() => {});
  }, [resetClock, cancelSessionMutation]);

  const resetAttemptView = useCallback((isRepeat: boolean, ranked: boolean) => {
    setTypedText("");
    setCompositionDraft(null);
    setIsRunning(false);
    setIsFinished(false);
    setIsRepeated(isRepeat);
    setIsFocused(false);
    setRankingStatus(ranked ? "pending" : "unranked");
    setSaveState("idle");
    setLastResultIsValid(null);
    setLastResultInvalidReason(undefined);
  }, []);

  useLayoutEffect(() => {
    if (sessionEpochRef.current !== sessionEpoch) resetAttemptRuntime(sessionEpoch, false);
  }, [sessionEpoch, resetAttemptRuntime]);

  useLayoutEffect(() => {
    if (promptReady && focusRequestedRef.current && !overlayOpenRef.current && !isFinished && (!connectMode || isTestActive)) {
      inputRef.current?.focus();
      setIsFocused(document.activeElement === inputRef.current);
      focusRequestedRef.current = false;
    }
  }, [promptReady, sessionEpoch, isFinished, connectMode, isTestActive]);

  // --- Calculated Stats ---
  const stats = useMemo(() => computeStats(typedText, words), [typedText, words]);
  const wordResults = useMemo(() => computeWordResults(typedText, words), [typedText, words]);
  const typedWordCount = useMemo(() => {
    const trimmed = typedText.trim();
    if (trimmed === "") return 0;
    const typedWords = trimmed.split(/\s+/).length;
    return typedText.endsWith(" ") ? typedWords : Math.max(typedWords - 1, 0);
  }, [typedText]);
  const accuracy = calculateAccuracy(stats.correct, typedText.length);
  const wpm = calculateWpm(typedText.length, elapsedMs);
  const zenProgressGradient = useMemo(
    () => `linear-gradient(120deg, ${colors.interactive.secondary.DEFAULT} 0%, ${colors.interactive.accent.DEFAULT} 25%, ${colors.interactive.primary.DEFAULT} 50%, ${colors.interactive.accent.DEFAULT} 75%, ${colors.interactive.secondary.DEFAULT} 100%)`,
    [colors]
  );

  const timeRemaining =
    isTimedPractice(settings) ? Math.max(0, settings.duration - Math.floor(elapsedMs / 1000)) : 0;

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

  // --- Callbacks ---
  const updateSettings = useCallback((updates: Partial<SettingsState>) => {
    markEdited(Object.keys(updates));
    // Explicit prompt edits start a new attempt, so apply queued account defaults at that boundary too.
    const startsPrompt = PROMPT_SETTING_KEYS.some((key) => key in updates);
    if (startsPrompt) {
      setQueuedPromptPreferences(null);
      setPromptSeed({ value: Math.floor(Math.random() * 4294967296) });
    }
    setSettings((prev) => normalizePracticeSettings({ ...prev, ...(startsPrompt ? pendingPromptPreferences : {}), ...updates }));
  }, [pendingPromptPreferences, markEdited, setQueuedPromptPreferences]);

  const openCustomCountModal = useCallback(() => {
    if (settings.mode === "time" || settings.mode === "words") setShowCustomCountModal(true);
  }, [settings.mode]);

  const resetSession = useCallback((isRepeat = false) => {
    const epoch = sessionEpochRef.current + 1;
    resetAttemptRuntime(epoch, isRepeat);
    setSessionEpoch(epoch);
    resetAttemptView(isRepeat, !isRepeat && isSignedInRef.current && settingsRef.current.mode !== "zen");
  }, [resetAttemptRuntime, resetAttemptView]);

  const attemptAccountRef = useRef(user?.id ?? null);
  useLayoutEffect(() => {
    const next = user?.id ?? null;
    // Guest completion may survive its first sign-in; authenticated attempts never cross accounts.
    if (!connectMode && attemptAccountRef.current !== null && attemptAccountRef.current !== next) resetSession();
    attemptAccountRef.current = next;
  }, [user?.id, resetSession, connectMode]);

  const finishSession = useCallback(() => {
    if (isFinishedRef.current) return;
    isFinishedRef.current = true;
    completedAtRef.current = Date.now();
    elapsedMsRef.current = readElapsed();
    setIsFinished(true);
    setIsRunning(false);
  }, [readElapsed]);

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

    if (resultData && resultData.attemptEpoch !== sessionEpochRef.current) return;
    const dataToSave = resultData || {
      attemptEpoch: sessionEpochRef.current,
      completedAt: completedAtRef.current ?? Date.now(),
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
      const pendingEpoch = sessionEpochRef.current;
      const opened = await openSignIn();
      if (sessionEpochRef.current !== pendingEpoch || userRef.current) return;
      if (!opened) {
        setSaveState("error");
        toast.add({ type: "error", title: authStatus === "loading"
          ? "Sign-in is still loading. Your result is kept here; try saving again shortly."
          : authStatus === "unavailable"
            ? "Sign-in is unavailable. Your result is kept here; try saving again when sign-in is available."
            : "Could not open sign-in. Your result is kept here; try saving again." });
      } else {
        setSaveState("idle");
      }
      return;
    }

    if (savingRef.current || (finalizedRef.current && saveState === "saved")) {
      return;
    }

    const epoch = sessionEpochRef.current;
    const isCurrentAttempt = () => sessionEpochRef.current === epoch && userRef.current?.id === user.id;
    const finalTypedText = typedTextRef.current;
    const finalElapsedMs = readElapsed();
    const sessionId = resultData ? null : sessionIdRef.current;
    if (!resultData && !sessionId && startingSessionRef.current) {
      setSaveState("saving");
      return;
    }

    savingRef.current = true;
    setSaveState("saving");
    try {
      await ensureAccount();

      if (!isCurrentAttempt()) return;
      const { attemptEpoch, completedAt, ...snapshot } = dataToSave;
      if (attemptEpoch !== epoch) return;
      const calendar = getLocalCalendarFields(completedAt);

      const showAchievementToasts = (achievementIds: string[]) => {
        for (const achievementId of new Set(achievementIds)) {
          const achievement = getAchievementById(achievementId);
          if (achievement) {
            notify({
              type: "achievement",
              title: achievement.title,
              description: achievement.description,
              metadata: {
                achievementId: achievement.id,
                achievementTier: achievement.tier,
              },
            });
          }
        }
      };

      if (sessionId) {
        try {
          await recordProgressMutation({
            sessionId,
            typedLength: finalTypedText.length,
          });
        } catch {
          // Still finalize; progress is best-effort.
        }

        if (!isCurrentAttempt()) return;
        const result = await finalizeSessionMutation({
          sessionId,
          typedText: finalTypedText,
          clientElapsedMs: finalElapsedMs,
          localDate: calendar.localDate,
          localHour: calendar.localHour,
          dayOfWeek: calendar.dayOfWeek,
          month: calendar.month,
          day: calendar.day,
        });

        if (!isCurrentAttempt()) return;
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

      // No matching server-owned prompt: history only; this server endpoint always sets rankedEligible:false.
      const result = await saveResultMutation({
        clerkId: user.id,
        ...snapshot,
        ...calendar,
      });
      if (!isCurrentAttempt()) return;
      finalizedRef.current = true;
      setLastResultIsValid(null);
      setSaveState("saved");
      pendingResultRef.current = null;

      if (result.newAchievements && result.newAchievements.length > 0) {
        showAchievementToasts(result.newAchievements);
      }
    } catch (error) {
      console.error("Failed to save result:", error);
      if (isCurrentAttempt()) setSaveState("error");
    } finally {
      if (isCurrentAttempt()) savingRef.current = false;
    }
  }, [connectMode, user, wpm, accuracy, settings.mode, settings.difficulty, settings.punctuation, settings.numbers, settings.capitalization, elapsedMs, typedText, wordResults, stats, openSignIn, authStatus, ensureAccount, saveResultMutation, finalizeSessionMutation, recordProgressMutation, notify, saveState, readElapsed]);

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
    if (connectModeRef.current || composingRef.current || repeatRef.current || isRunningRef.current || typedTextRef.current || isFinishedRef.current) return;
    const currentUser = userRef.current;
    if (!currentUser || !isSignedInRef.current || accountStatus !== "ready") return;
    if (sessionIdRef.current && Date.now() - sessionPreparedAtRef.current >= SOLO_PREPARED_SESSION_TTL_MS) {
      void cancelSessionMutation({ sessionId: sessionIdRef.current }).catch(() => {});
      sessionIdRef.current = null;
      attemptedSessionEpochRef.current = -1;
    }
    if (sessionIdRef.current || startingSessionRef.current || finalizedRef.current) return;

    const s = settingsRef.current;
    if (s.mode === "zen" || attemptedSessionEpochRef.current === sessionEpochRef.current) return;
    attemptedSessionEpochRef.current = sessionEpochRef.current;
    const needsClientPrompt = s.mode === "quote" || s.mode === "preset";
    const text = targetText || wordsRef.current;
    if (needsClientPrompt && !text) return;

    startingSessionRef.current = true;
    setRankingStatus("pending");
    const epoch = sessionEpochRef.current;

    const preparedAt = Date.now();
    void ensureAccount()
      .then(() => {
        if (sessionEpochRef.current !== epoch || composingRef.current || isRunningRef.current || typedTextRef.current || userRef.current?.id !== currentUser.id) return null;
        return startSessionMutation({
          mode: s.mode,
          duration: s.duration,
          wordTarget: s.wordTarget,
          difficulty: s.difficulty,
          punctuation: s.punctuation,
          numbers: s.numbers,
          capitalization: s.capitalization,
          ...(needsClientPrompt ? { targetText: text } : {}),
        });
      })
      .then((res) => {
        if (!res?.sessionId) return;
        if (sessionEpochRef.current !== epoch || userRef.current?.id !== currentUser.id || composingRef.current || isRunningRef.current || typedTextRef.current.length > 0 || repeatRef.current || isFinishedRef.current) {
          void cancelSessionMutation({ sessionId: res.sessionId }).catch(() => {});
          return;
        }
        // Commit both identities before input can start; no client text is attached to a different server prompt.
        wordsRef.current = res.targetText;
        sessionIdRef.current = res.sessionId;
        sessionPreparedAtRef.current = preparedAt;
        setWords(res.targetText);
        setRankingStatus("ranked");
      })
      .catch((error) => {
        console.warn("Failed to start typing session:", error);
        if (sessionEpochRef.current === epoch) setRankingStatus("unranked");
      })
      .finally(() => {
        if (sessionEpochRef.current !== epoch) return;
        startingSessionRef.current = false;
        if (isFinishedRef.current && !finalizedRef.current && !sessionIdRef.current) {
          void saveResultsRef.current();
        }
      });
  }, [accountStatus, ensureAccount, startSessionMutation, cancelSessionMutation]);

  const reportSoloProgress = useCallback((typedLength: number) => {
    if (connectModeRef.current) return;
    const sessionId = sessionIdRef.current;
    if (!sessionId) return;
    void recordProgressMutation({ sessionId, typedLength }).catch(() => {});
  }, [recordProgressMutation]);

  useEffect(() => {
    if (connectMode || !isSignedIn || !user || !promptReady) return;
    ensureSoloSessionStarted(words);
    const renew = () => ensureSoloSessionStarted(wordsRef.current);
    const interval = setInterval(renew, 60_000);
    window.addEventListener("focus", renew);
    return () => { clearInterval(interval); window.removeEventListener("focus", renew); };
  }, [sessionEpoch, connectMode, isSignedIn, user, words, ensureSoloSessionStarted, promptReady, accountStatus]);

  useEffect(() => {
    if (!isFinished || connectMode || !isSignedIn) return;
    if (finalizedRef.current || autoSaveAttemptedEpochRef.current === sessionEpochRef.current) return;
    autoSaveAttemptedEpochRef.current = sessionEpochRef.current;
    void saveResults();
  }, [isFinished, connectMode, isSignedIn, saveResults]);

  const generateTest = useCallback(() => {
    // Object identity makes this a new attempt even when two random samples happen to match.
    setPromptSeed({ value: Math.floor(Math.random() * 4294967296) });
    if (pendingPromptPreferences) {
      setSettings((prev) => normalizePracticeSettings({ ...prev, ...pendingPromptPreferences }));
      setQueuedPromptPreferences(null);
      return; // The resolved configuration/dataset effect generates the next prompt.
    }
  }, [pendingPromptPreferences, setQueuedPromptPreferences]);

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
    updateLinePreview(2);
    updateMaxWordsPerLine(5);
    setIsKidMode(true);
  }, [
    settings.mode,
    settings.typingFontSize,
    settings.ghostWriterEnabled,
    settings.showOnScreenKeyboard,
    linePreview,
    maxWordsPerLine,
    updateSettings,
    updateLinePreview,
    updateMaxWordsPerLine,
  ]);

  const disableKidMode = useCallback((nextMode?: SettingsState["mode"]) => {
    if (preKidModeSettings) {
      updateSettings({
        mode: nextMode ?? preKidModeSettings.mode,
        typingFontSize: preKidModeSettings.typingFontSize,
        ghostWriterEnabled: preKidModeSettings.ghostWriterEnabled,
        showOnScreenKeyboard: preKidModeSettings.showOnScreenKeyboard,
      });
      updateLinePreview(preKidModeSettings.linePreview);
      updateMaxWordsPerLine(preKidModeSettings.maxWordsPerLine);
    } else {
      updateSettings({ mode: nextMode ?? "zen" });
    }
    setPreKidModeSettings(null);
    setIsKidMode(false);
  }, [preKidModeSettings, updateSettings, updateLinePreview, updateMaxWordsPerLine]);

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

  // The clock owns elapsed time; ghost position derives from that same elapsed value, including spaces.
  useEffect(() => {
    if (!isRunning || (connectMode && !isTestActive) || !isTimedPractice(settings)) return;
    if (elapsedMs >= settings.duration * 1000) finishSessionRef.current();
    if (!warningPlayedRef.current && elapsedMs >= (settings.duration - 5) * 1000 && settings.duration >= 10) {
      playWarningSound();
      warningPlayedRef.current = true;
    }
  }, [elapsedMs, isRunning, connectMode, isTestActive, settings, playWarningSound]);

  // --- Notify parent of typing state ---
  useEffect(() => {
    if (onTypingStateChange) {
      onTypingStateChange(isRunning && !isFinished && isFocused && (!connectMode || isTestActive));
    }
  }, [isRunning, isFinished, isFocused, connectMode, isTestActive, onTypingStateChange]);

  const onStatsUpdateRef = useRef(onStatsUpdate);
  useLayoutEffect(() => { onStatsUpdateRef.current = onStatsUpdate; }, [onStatsUpdate]);
  // --- Report stats to parent (connect mode) ---
  useEffect(() => {
    if (!promptReady || (connectMode && !isTestActive)) return;
    if (onStatsUpdateRef.current) {
      onStatsUpdateRef.current(
        {
          wpm: Math.round(wpm) || 0,
          accuracy,
          progress: words.length > 0 ? getInputPosition(typedText, words).referencePosition / words.length * 100 : 0,
          wordsTyped: Math.floor(typedText.length / 5),
          timeElapsed: elapsedMs,
          isFinished,
        },
        typedText,
        words
      );
    }
  }, [wpm, accuracy, typedText, words, elapsedMs, isFinished, connectMode, isTestActive, promptReady]);

  const handleInput = (value: string) => {
    if (isFinishedRef.current || !promptReady || (connectMode && !isTestActive)) return;
    const sanitized = sanitizeTypingInput(value);
    // A suspended tab may resume past expiry before the renewal timer runs.
    if (!isRunningRef.current && sessionIdRef.current && Date.now() - sessionPreparedAtRef.current >= SOLO_PREPARED_SESSION_TTL_MS) {
      void cancelSessionMutation({ sessionId: sessionIdRef.current }).catch(() => {});
      sessionIdRef.current = null;
    }
    isRunningRef.current = true;
    if (!isRunning) setIsRunning(true);
    typedTextRef.current = sanitized;
    setTypedText(sanitized);
    if (!connectMode) {
      if (!sessionIdRef.current) setRankingStatus("unranked");
      reportSoloProgress(sanitized.length);
    }
    playClickSound();
    if (settings.mode === "quote" || settings.mode === "preset") {
      if (hasCompletedPrompt(sanitized, wordsRef.current)) finishSession();
      return;
    }
    if (settings.mode === "time" || settings.mode === "zen") {
      const remaining = wordsRef.current.split(" ").length - sanitized.split(" ").length;
      if (remaining < 50 && !sessionIdRef.current) {
        const addition = generateWords(50, wordPool, settings);
        if (addition) { wordsRef.current += " " + addition; setWords(wordsRef.current); }
      }
    }
    if (settings.mode === "words" && sanitized.endsWith(" ") && hasCompletedPrompt(sanitized, wordsRef.current)) finishSession();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (composingRef.current) return;
    constrainEditingKey(event);
    if (event.nativeEvent.isComposing) return;
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter" && !connectMode) {
      event.preventDefault();
      resetSession(true);
    }
    if (event.key === "Escape" && isRunning && !isFinished) {
      event.preventDefault();
      finishSession();
    }
  };

  const nextChar = isFinished ? null : getNextTypingKey(typedText, words);

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

  const handlePresetSubmit = (text: string) => {
    const sanitized = text.replace(/[^\x20-\x7E\n]/g, "").replace(/\s+/g, " ").trim();
    if (sanitized.length > 0 && sanitized.length <= MAX_PRESET_TEXT_LENGTH) {
      updateSettings({ presetText: sanitized });
      setShowPresetInput(false);
    }
  };

  useLayoutEffect(() => {
    if (isCompactMode || isFinished) return;

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

  const selectedDurationPreset = TIME_PRESETS.find((preset) => preset === settings.duration);
  const selectedWordPreset = WORD_PRESETS.find((preset) => preset === settings.wordTarget);
  const isCustomDurationSelected = selectedDurationPreset === undefined;
  const isCustomWordTargetSelected = selectedWordPreset === undefined;
  const configurationProps = {
    settings, updateSettings, generateTest, isKidMode, handleModeSelect,
    wordsManifest, quotesManifest, openCustomCountModal,
    isCustomDurationSelected, isCustomWordTargetSelected,
  };

  // A new resolved configuration is a new attempt. Reset before children can observe old input
  // against the new prompt; external session/clock cleanup follows the committed epoch below.
  if (!matchesPromptRequest) {
    setActivePrompt(preparedPrompt);
    setCurrentQuote(preparedPrompt.quote);
    setWords(preparedPrompt.text);
    setSessionEpoch((epoch) => epoch + 1);
    resetAttemptView(false, isSignedIn && settings.mode !== "zen");
    if (preparedPrompt.needsPreset) setShowPresetInput(true);
  }

  return (
    <div
      className={`relative flex ${fitToParentHeight ? "h-full min-h-0" : "h-[100dvh]"} flex-col items-center overflow-y-auto px-4 transition-colors duration-300`}
      style={{ backgroundColor: tv.ui.background }}
    >
      <div ref={topLayoutRef} className="shrink-0 w-full flex flex-col items-center">
      <div className="h-4 shrink-0" />

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
                style={{ backgroundColor: tv.ui.card, borderWidth: 1, borderColor: tv.border.subtle }}
              >
                <span className={numCls} style={{ color: tv.ui.secondaryEmphasis }}>
                  {Math.round(wpm)}
                </span>
                <span className={labelCls} style={{ color: tv.ui.mutedForeground }}>wpm</span>
              </div>

              {/* Time Mode: Countdown Timer */}
              {isTimedPractice(settings) && (
                <div
                  className={pillCls}
                  style={{ backgroundColor: tv.ui.card, borderWidth: 1, borderColor: tv.border.subtle }}
                >
                  <span
                    className={numCls}
                    style={{ color: timeRemaining < 10 ? tv.ui.destructive : tv.ui.foreground }}
                  >
                    {formatTime(timeRemaining)}
                  </span>
                </div>
              )}

              {/* Words Mode: Word Counter */}
              {settings.mode === "words" && (
                <div
                  className={pillCls}
                  style={{ backgroundColor: tv.ui.card, borderWidth: 1, borderColor: tv.border.subtle }}
                >
                  <span className={numCls} style={{ color: tv.ui.foreground }}>
                    {Math.min(typedWordCount, settings.wordTarget === 0 ? Infinity : settings.wordTarget)}
                  </span>
                  {settings.wordTarget > 0 && (
                    <>
                      <span className={dividerCls} style={{ color: tv.ui.mutedForeground }}>/</span>
                      <span className={subNumCls} style={{ color: tv.ui.mutedForeground }}>
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
                    style={{ backgroundColor: tv.ui.card, borderWidth: 1, borderColor: tv.border.subtle }}
                  >
                    <span className={numCls} style={{ color: tv.ui.foreground }}>
                      {formatTime(Math.floor(elapsedMs / 1000))}
                    </span>
                  </div>

                  <div
                    className={pillCls}
                    style={{ backgroundColor: tv.ui.card, borderWidth: 1, borderColor: tv.border.subtle }}
                  >
                    <span className={numCls} style={{ color: tv.ui.foreground }}>
                      {typedWordCount}
                    </span>
                    <span className={dividerCls} style={{ color: tv.ui.mutedForeground }}>/</span>
                    <span className={subNumCls} style={{ color: tv.ui.mutedForeground }}>
                      {"\u221E"}
                    </span>
                  </div>
                </>
              )}

              {/* Accuracy Pill */}
              <div
                className={pillCls}
                style={{ backgroundColor: tv.ui.card, borderWidth: 1, borderColor: tv.border.subtle }}
              >
                <span className={numCls} style={{ color: tv.ui.secondaryEmphasis }}>
                  {Math.round(accuracy)}%
                </span>
                <span className={labelCls} style={{ color: tv.ui.mutedForeground }}>acc</span>
              </div>
            </div>
          )}

          {/* Row 2: Progress Bar - shown in time/words/zen modes, hidden in kid mode */}
          {(isTimedPractice(settings) || settings.mode === "words" || settings.mode === "zen") && !isKidMode && (
            <div className={`flex ${kb ? "gap-1.5" : "gap-2 md:gap-3"} items-center`}>
              <div
                className={kb ? "w-48 px-2.5 py-1.5 backdrop-blur-md rounded-full shadow-lg" : "w-56 md:w-80 px-3 py-2.5 md:px-4 md:py-4 backdrop-blur-md rounded-full shadow-lg"}
                style={{ backgroundColor: tv.ui.card, borderWidth: 1, borderColor: tv.border.subtle }}
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
                      backgroundColor: isTimedPractice(settings) && timeRemaining < 10
                        ? tv.ui.destructive
                        : tv.ui.success,
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
                style={{ backgroundColor: tv.ui.card, borderWidth: 1, borderColor: tv.border.subtle }}
              >
                <span className={numCls} style={{ color: tv.ui.foreground }}>
                  {formatTime(Math.floor(elapsedMs / 1000))}
                </span>
              </div>

              <div
                className={pillCls}
                style={{ backgroundColor: tv.ui.card, borderWidth: 1, borderColor: tv.border.subtle }}
              >
                <span className={numCls} style={{ color: tv.ui.foreground }}>
                  {typedWordCount}
                </span>
                <span className={dividerCls} style={{ color: tv.ui.mutedForeground }}>/</span>
                <span className={subNumCls} style={{ color: tv.ui.mutedForeground }}>
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
            className="mb-4 flex flex-col items-center text-center transition-opacity motion-reduce:transition-none duration-300"
            style={{ opacity: uiOpacity }}
          >
            <div className="text-xl font-medium" style={{ color: tv.ui.secondaryEmphasis }}>
              {currentQuote.author}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm" style={{ color: tv.ui.mutedForeground }}>
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
              value={compositionDraft ?? typedText}
              aria-label="Typing practice"
              aria-describedby="practice-editing-help"
              onChange={(event) => { if (composingRef.current) setCompositionDraft(event.target.value); else handleInput(event.target.value); }}
              onCompositionStart={(event) => { composingRef.current = true; setCompositionDraft(event.currentTarget.value); }}
              onCompositionEnd={(event) => { composingRef.current = false; setCompositionDraft(null); handleInput(event.currentTarget.value); placeCaretAtEnd(event.currentTarget); }}
              onSelect={(event) => { if (!composingRef.current) placeCaretAtEnd(event.currentTarget); }}
              onPaste={(e) => {
                if (!connectMode) {
                  e.preventDefault();
                }
              }}
              onKeyDown={handleKeyDown}
              onFocus={(event) => { setIsFocused(true); placeCaretAtEnd(event.currentTarget); }}
              onBlur={() => setIsFocused(false)}
              autoFocus
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              data-lpignore="true"
              className="absolute left-0 top-0 -z-10 opacity-0"
              style={{ caretColor: "transparent", color: "transparent", appearance: "none" }}
              disabled={!promptReady || (connectMode && !isTestActive)}
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
              <div ref={contentRef} className="relative motion-safe:transition-transform motion-safe:duration-100"
                style={{ transform: `translateY(-${scrollOffset}px)` }}>
                {promptReady && <PracticeText targetText={words} typedText={compositionDraft ?? typedText} caretRef={caretRef}
                  maxWordsPerLine={maxWordsPerLine} justifyLines={settings.textAlign === "justify"}
                  ghostPosition={settings.ghostWriterEnabled ? ghostCharIndex : undefined} />}
              </div>
            </div>

            {!promptReady && <div role="status" className="py-8 text-center" style={{ color: tv.ui.mutedForeground }}>
              {dataset.status === "error" ? <>Could not load this prompt. <button type="button" onClick={() => { if (settings.mode === "quote") void fetchQuotesManifest().then(setQuotesManifest); dataset.retry(); }} className="inline-flex items-center justify-center gap-2">
                <ArrowsClockwiseIcon className="size-4 shrink-0" aria-hidden="true" />
                Retry
              </button></>
                : "Loading prompt…"}
            </div>}
            <span id="practice-editing-help" className="sr-only">Type at the end of the text. Use Backspace to correct the current word. Tab moves to the next control.</span>
            {/* Click to focus overlay */}
            {!isFocused && promptReady && (
              <div
                className="absolute inset-0 flex items-center justify-center cursor-pointer"
                onClick={() => inputRef.current?.focus()}
              >
                <span className="text-muted-foreground text-lg">Click here to start typing</span>
              </div>
            )}

            {capsLockOn && !settings.showOnScreenKeyboard && (
              <div
                className="mt-3 flex items-center justify-center gap-2 text-lg font-medium"
                style={{ color: tv.ui.warning }}
              >
                <ArrowFatLineUpIcon className="size-5 shrink-0" aria-hidden="true" />
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
            {...{ repeatTest: () => resetSession(true), rankingStatus, isRepeated }}
          />
        )}
        </div>
      </div>

      <div ref={bottomLayoutRef} className={`shrink-0 w-full flex flex-col items-center ${settings.showOnScreenKeyboard && !isFinished && isRunning ? "" : settings.showOnScreenKeyboard && !isFinished ? "pt-2" : "pt-10 md:pt-12"}`}>
        {/* Instructions */}
        {!isRunning && !isFinished && (
          <div
            className="text-center text-muted-foreground transition-opacity duration-300"
            style={{ fontSize: `${settings.helpFontSize}rem`, opacity: uiOpacity }}
          >
            {isRepeated && <div className="mb-2 text-destructive font-medium">REPEATED</div>}
            <div>
              Press <kbd>Ctrl</kbd>/<kbd>⌘</kbd> + <kbd>Enter</kbd> to repeat · <kbd>Tab</kbd> to move focus
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

      <PracticeThemePicker showThemeModal={showThemeModal} setShowThemeModal={setShowThemeModal} onUserSelection={markThemeEdited} />

      <PracticeSettingsDialog
        showSettings={showSettings}
        setShowSettings={setShowSettings}
        settings={settings}
        updateSettings={updateSettings}
        linePreview={linePreview}
        setLinePreview={updateLinePreview}
        maxWordsPerLine={maxWordsPerLine}
        setMaxWordsPerLine={updateMaxWordsPerLine}
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
        setLinePreview={updateLinePreview}
        maxWordsPerLine={maxWordsPerLine}
        setMaxWordsPerLine={updateMaxWordsPerLine}
      />


    </div>
  );
}
