import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { GLOBAL_COLORS } from "@/lib/colors";
import type { Difficulty, Quote, SettingsState, Theme } from "@/lib/typing-constants";
import { DEFAULT_THEME } from "@/lib/typing-constants";
import { SOUND_MANIFEST } from "@/lib/sounds";
import { getRandomSoundUrl } from "@/lib/sounds";
import { THEME_MANIFEST } from "@/lib/themes";
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
}

export default function TypingPractice({
  connectMode = false,
  lockedSettings,
  isTestActive = true,
  onStatsUpdate,
  onLeave,
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

  const [theme, setTheme] = useState<Theme>(DEFAULT_THEME);
  const [selectedThemeName, setSelectedThemeName] = useState("TypeSetGo");
  const [linePreview, setLinePreview] = useState(3);
  const [showSettings, setShowSettings] = useState(false);
  const [showThemeModal, setShowThemeModal] = useState(false);
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

      const storedTheme = loadTheme();
      if (storedTheme) {
        setTheme(storedTheme);
      }

      const storedThemeName = loadThemeName();
      if (storedThemeName) {
        setSelectedThemeName(storedThemeName);
      }
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

  // --- Save Theme ---
  useEffect(() => {
    if (!hasLoadedFromStorage.current) return;
    saveTheme(theme);
    saveThemeName(selectedThemeName);
  }, [theme, selectedThemeName]);

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
    const loadWordPool = async () => {
      try {
        const difficulty = settings.difficulty || "medium";
        const res = await fetch(`/words/${difficulty}.json`);
        if (res.ok) {
          const data = await res.json();
          setWordPool(data);
        }
      } catch (e) {
        console.error("Failed to load word pool:", e);
      }
    };
    loadWordPool();
  }, [settings.difficulty]);

  // --- Load quotes ---
  useEffect(() => {
    const loadQuotes = async () => {
      if (settings.mode !== "quote") return;
      try {
        const length = settings.quoteLength === "all" ? "medium" : settings.quoteLength;
        const res = await fetch(`/quotes/${length}.json`);
        if (res.ok) {
          const data = await res.json();
          setQuotes(data);
        }
      } catch (e) {
        console.error("Failed to load quotes:", e);
      }
    };
    loadQuotes();
  }, [settings.mode, settings.quoteLength]);

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
    if (!settings.soundEnabled || !settings.typingSound) return;
    try {
      const soundUrl = getRandomSoundUrl(SOUND_MANIFEST, "typing", settings.typingSound);
      if (!soundUrl) return;
      const audio = new Audio(soundUrl);
      audio.volume = 0.5;
      audio.play().catch(() => {});
    } catch {
      // Ignore errors
    }
  }, [settings.soundEnabled, settings.typingSound]);

  const playWarningSound = useCallback(() => {
    if (!settings.soundEnabled || !settings.warningSound) return;
    try {
      const soundUrl = getRandomSoundUrl(SOUND_MANIFEST, "warning", settings.warningSound);
      if (!soundUrl) return;
      const audio = new Audio(soundUrl);
      audio.volume = 0.5;
      audio.play().catch(() => {});
    } catch {
      // Ignore errors
    }
  }, [settings.soundEnabled, settings.warningSound]);

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

  const handlePresetSubmit = (text: string) => {
    const sanitized = text.replace(/[^\x20-\x7E\n]/g, "").replace(/\s+/g, " ").trim();
    if (sanitized.length > 0 && sanitized.length <= 10000) {
      updateSettings({ presetText: sanitized });
      setShowPresetInput(false);
    }
  };

  const handleThemeSelect = (themeName: string) => {
    const themeData = THEME_MANIFEST[themeName.toLowerCase()];
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
          className="fixed top-[100px] md:top-[10%] left-0 w-full flex flex-col items-center justify-center gap-4 transition-all duration-300 z-20"
          style={{ fontSize: `${settings.iconFontSize}rem`, opacity: uiOpacity }}
        >
          {/* Line 1: Toolbar */}
          <div
            className="flex items-center gap-4 px-6 py-2 rounded-full shadow-lg mb-2"
            style={{ backgroundColor: GLOBAL_COLORS.surface }}
          >
            {/* Connect Link */}
            <Link
              to="/connect"
              className="flex h-[1.5em] w-[1.5em] items-center justify-center rounded transition hover:opacity-75 hover:text-white"
              style={{ color: theme.buttonUnselected }}
              title="Multiplayer"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </Link>

            {/* Settings Icon */}
            <button
              type="button"
              onClick={() => setShowSettings(true)}
              className="flex h-[1.5em] w-[1.5em] items-center justify-center rounded transition hover:opacity-75 hover:text-white"
              style={{ color: theme.buttonUnselected }}
              title="Settings"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </button>

            {/* Theme Icon */}
            <button
              type="button"
              onClick={() => setShowThemeModal(true)}
              className="flex h-[1.5em] w-[1.5em] items-center justify-center rounded transition hover:opacity-75 hover:text-white"
              style={{ color: theme.buttonUnselected }}
              title="Theme"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="13.5" cy="6.5" r=".5" fill="currentColor" stroke="none" />
                <circle cx="17.5" cy="10.5" r=".5" fill="currentColor" stroke="none" />
                <circle cx="8.5" cy="7.5" r=".5" fill="currentColor" stroke="none" />
                <circle cx="6.5" cy="12.5" r=".5" fill="currentColor" stroke="none" />
                <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z" />
              </svg>
            </button>

            {/* Plan Mode Icon */}
            <button
              type="button"
              onClick={() => setShowPlanBuilder(true)}
              className={`flex h-[1.5em] w-[1.5em] items-center justify-center rounded transition hover:opacity-75 hover:text-white ${isPlanActive ? "ring-2 ring-sky-500" : ""}`}
              style={{ color: isPlanActive ? theme.buttonSelected : theme.buttonUnselected }}
              title="Plan Mode"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="8" y1="6" x2="21" y2="6" />
                <line x1="8" y1="12" x2="21" y2="12" />
                <line x1="8" y1="18" x2="21" y2="18" />
                <line x1="3" y1="6" x2="3.01" y2="6" />
                <line x1="3" y1="12" x2="3.01" y2="12" />
                <line x1="3" y1="18" x2="3.01" y2="18" />
              </svg>
            </button>

            <div className="w-px h-4 bg-gray-600"></div>

            <SoundController
              settings={settings}
              onUpdateSettings={updateSettings}
              soundManifest={SOUND_MANIFEST}
              theme={theme}
            />

            <GhostWriterController
              settings={settings}
              onUpdateSettings={updateSettings}
              theme={theme}
            />
          </div>

          {/* Line 2: Modes & Toggles */}
          <div className="flex flex-wrap items-center justify-center gap-4 text-gray-400">
            {/* Mode */}
            <div className="flex rounded-lg p-1" style={{ backgroundColor: GLOBAL_COLORS.surface }}>
              {(["time", "words", "quote", "zen", "preset"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => {
                    if (settings.mode === m) {
                      if (m === "preset") {
                        setShowPresetInput(true);
                      } else {
                        generateTest();
                      }
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

            {/* Toggles */}
            {settings.mode !== "preset" && (
              <div className="flex gap-4 rounded-lg px-3 py-1.5" style={{ backgroundColor: GLOBAL_COLORS.surface }}>
                <button
                  type="button"
                  onClick={() => updateSettings({ punctuation: !settings.punctuation })}
                  className={`flex items-center gap-2 transition ${settings.punctuation ? "" : "hover:text-gray-200"}`}
                  style={{ color: settings.punctuation ? theme.buttonSelected : undefined }}
                >
                  <span
                    className={settings.punctuation ? "text-gray-900 rounded px-1 text-[0.75em] font-bold" : "bg-gray-700 rounded px-1 text-[0.75em]"}
                    style={{ backgroundColor: settings.punctuation ? theme.buttonSelected : undefined }}
                  >
                    @
                  </span>
                  punctuation
                </button>
                <button
                  type="button"
                  onClick={() => updateSettings({ numbers: !settings.numbers })}
                  className={`flex items-center gap-2 transition ${settings.numbers ? "" : "hover:text-gray-200"}`}
                  style={{ color: settings.numbers ? theme.buttonSelected : undefined }}
                >
                  <span
                    className={settings.numbers ? "text-gray-900 rounded px-1 text-[0.75em] font-bold" : "bg-gray-700 rounded px-1 text-[0.75em]"}
                    style={{ backgroundColor: settings.numbers ? theme.buttonSelected : undefined }}
                  >
                    #
                  </span>
                  numbers
                </button>
              </div>
            )}
          </div>

          {/* Line 3: Sub-settings */}
          <div className="flex flex-wrap items-center justify-center gap-2 text-gray-400">
            {/* Time Presets */}
            {settings.mode === "time" && (
              <div className="flex rounded-lg p-1" style={{ backgroundColor: GLOBAL_COLORS.surface }}>
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
              <div className="flex rounded-lg p-1" style={{ backgroundColor: GLOBAL_COLORS.surface }}>
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
            {settings.mode === "quote" && (
              <div className="flex rounded-lg p-1" style={{ backgroundColor: GLOBAL_COLORS.surface }}>
                {(["all", "short", "medium", "long", "xl"] as const).map((l) => (
                  <button
                    key={l}
                    type="button"
                    onClick={() => {
                      if (settings.quoteLength === l) generateTest();
                      else updateSettings({ quoteLength: l });
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
            {settings.mode !== "quote" && settings.mode !== "preset" && (
              <div className="flex rounded-lg p-1 ml-2" style={{ backgroundColor: GLOBAL_COLORS.surface }}>
                {(["beginner", "easy", "medium", "hard", "expert"] as Difficulty[]).map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => {
                      if (settings.difficulty === d) generateTest();
                      else updateSettings({ difficulty: d });
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
            className="flex items-baseline gap-2 px-3 py-1.5 md:px-6 md:py-3 backdrop-blur-md rounded-full shadow-lg border border-gray-700/50 min-w-[70px] md:min-w-[100px] justify-center"
            style={{ backgroundColor: `${GLOBAL_COLORS.surface}E6` }}
          >
            <span className="text-xl md:text-3xl font-bold tabular-nums leading-none" style={{ color: theme.buttonSelected }}>
              {Math.round(wpm)}
            </span>
            <span className="text-[10px] md:text-xs font-semibold uppercase tracking-wider text-gray-500">wpm</span>
          </div>

          {/* Accuracy Pill */}
          <div
            className="flex items-baseline gap-2 px-3 py-1.5 md:px-6 md:py-3 backdrop-blur-md rounded-full shadow-lg border border-gray-700/50 min-w-[70px] md:min-w-[100px] justify-center"
            style={{ backgroundColor: `${GLOBAL_COLORS.surface}E6` }}
          >
            <span className="text-xl md:text-3xl font-bold tabular-nums leading-none" style={{ color: theme.buttonSelected }}>
              {Math.round(accuracy)}%
            </span>
            <span className="text-[10px] md:text-xs font-semibold uppercase tracking-wider text-gray-500">acc</span>
          </div>

          {/* Timer Pill */}
          {settings.mode === "time" && (
            <div
              className="flex items-baseline gap-2 px-3 py-1.5 md:px-6 md:py-3 backdrop-blur-md rounded-full shadow-lg border border-gray-700/50 min-w-[70px] md:min-w-[100px] justify-center"
              style={{ backgroundColor: `${GLOBAL_COLORS.surface}E6` }}
            >
              <span
                className={`text-xl md:text-3xl font-bold tabular-nums leading-none ${timeRemaining < 10 ? "" : "text-gray-200"}`}
                style={{ color: timeRemaining < 10 ? GLOBAL_COLORS.text.error : undefined }}
              >
                {formatTime(timeRemaining)}
              </span>
            </div>
          )}

          {/* Word Counter Pill */}
          {settings.mode === "words" && (
            <div
              className="flex items-baseline gap-2 px-3 py-1.5 md:px-6 md:py-3 backdrop-blur-md rounded-full shadow-lg border border-gray-700/50 min-w-[70px] md:min-w-[100px] justify-center"
              style={{ backgroundColor: `${GLOBAL_COLORS.surface}E6` }}
            >
              <span className="text-xl md:text-3xl font-bold text-gray-200 tabular-nums leading-none">
                {Math.min(typedText.trim() === "" ? 0 : typedText.trim().split(/\s+/).length, settings.wordTarget === 0 ? Infinity : settings.wordTarget)}
              </span>
              {settings.wordTarget > 0 && (
                <>
                  <span className="text-sm text-gray-500 font-medium">/</span>
                  <span className="text-lg md:text-xl font-semibold text-gray-500 tabular-nums leading-none">
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
            <span className="text-sm text-gray-400">
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
                className="relative overflow-hidden rounded-2xl p-6 md:p-10 flex flex-col items-center justify-center group border border-gray-800 hover:border-gray-700 transition-colors"
                style={{ backgroundColor: GLOBAL_COLORS.surface }}
              >
                <div className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">
                  Words Per Minute
                </div>
                <div
                  className="text-6xl md:text-8xl font-black tabular-nums leading-none tracking-tight"
                  style={{ color: theme.buttonSelected }}
                >
                  {Math.round(wpm)}
                </div>
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                </div>
              </div>

              {/* Accuracy */}
              <div
                className="relative overflow-hidden rounded-2xl p-6 md:p-10 flex flex-col items-center justify-center group border border-gray-800 hover:border-gray-700 transition-colors"
                style={{ backgroundColor: GLOBAL_COLORS.surface }}
              >
                <div className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">
                  Accuracy
                </div>
                <div
                  className="text-6xl md:text-8xl font-black tabular-nums leading-none tracking-tight"
                  style={{ color: theme.buttonSelected }}
                >
                  {Math.round(accuracy)}
                  <span className="text-2xl md:text-4xl align-top ml-1 opacity-50">%</span>
                </div>
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
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
              <div className="flex-1 rounded-xl border border-gray-800/50 p-4" style={{ backgroundColor: `${GLOBAL_COLORS.surface}80` }}>
                <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 text-center mb-3">Words</div>
                <div className="grid grid-cols-2 gap-4">
                  {/* Correct Words with Hover */}
                  <HoverCard openDelay={100} closeDelay={100}>
                    <HoverCardTrigger asChild>
                      <div className="flex flex-col items-center cursor-pointer hover:opacity-80 transition-opacity">
                        <div className="text-3xl font-bold text-gray-200 mb-1">{wordResults.correctWords.length}</div>
                        <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Correct</div>
                      </div>
                    </HoverCardTrigger>
                    <HoverCardContent 
                      className="w-56 p-0 border-gray-700"
                      style={{ backgroundColor: GLOBAL_COLORS.surface }}
                    >
                      <div className="p-3 border-b border-gray-700">
                        <div className="text-sm font-semibold text-gray-200">Correct Words</div>
                        <div className="text-xs text-gray-500">{wordResults.correctWords.length} words</div>
                      </div>
                      <div className="max-h-32 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700">
                        {wordResults.correctWords.length > 0 ? (
                          <div className="p-2 flex flex-wrap gap-1.5">
                            {wordResults.correctWords.map((word, idx) => (
                              <span 
                                key={idx}
                                className="px-2 py-0.5 bg-green-900/30 text-green-400 text-xs rounded-md font-mono"
                              >
                                {word}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <div className="p-3 text-center text-gray-500 text-sm">
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
                        <div className="text-3xl font-bold mb-1" style={{ color: GLOBAL_COLORS.text.error }}>{wordResults.incorrectWords.length}</div>
                        <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Incorrect</div>
                      </div>
                    </HoverCardTrigger>
                    <HoverCardContent 
                      className="w-64 p-0 border-gray-700"
                      style={{ backgroundColor: GLOBAL_COLORS.surface }}
                    >
                      <div className="p-3 border-b border-gray-700">
                        <div className="text-sm font-semibold text-gray-200">Incorrect Words</div>
                        <div className="text-xs text-gray-500">{wordResults.incorrectWords.length} mistakes</div>
                      </div>
                      <div className="max-h-40 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700">
                        {wordResults.incorrectWords.length > 0 ? (
                          <div className="p-2 space-y-1.5">
                            {wordResults.incorrectWords.map((item, idx) => (
                              <div 
                                key={idx}
                                className="flex items-center gap-2 px-2 py-1 bg-gray-800/50 rounded text-xs font-mono"
                              >
                                <span className="text-red-400">{item.typed}</span>
                                <span className="text-gray-500">→</span>
                                <span className="text-green-400">{item.expected}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="p-3 text-center text-gray-500 text-sm">
                            No mistakes - perfect!
                          </div>
                        )}
                      </div>
                    </HoverCardContent>
                  </HoverCard>
                </div>
              </div>

              {/* Characters Group */}
              <div className="flex-1 rounded-xl border border-gray-800/50 p-4" style={{ backgroundColor: `${GLOBAL_COLORS.surface}80` }}>
                <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 text-center mb-3">Characters</div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col items-center">
                    <div className="text-3xl font-bold text-gray-400 mb-1">{stats.missed}</div>
                    <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Missed</div>
                  </div>
                  <div className="flex flex-col items-center">
                    <div className="text-3xl font-bold text-gray-400 mb-1">{stats.extra}</div>
                    <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Extra</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Quote Attribution */}
            {settings.mode === "quote" && currentQuote && (
              <div className="text-center mb-8 text-gray-400">
                — {currentQuote.author}
                {currentQuote.source && `, ${currentQuote.source}`}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-4 justify-center">
              {!connectMode && (
                <button
                  type="button"
                  onClick={() => generateTest()}
                  className="group relative inline-flex items-center justify-center px-8 py-3 font-medium text-white transition-all duration-200 bg-gray-700 rounded-lg hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
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
                  className="px-8 py-3 font-medium text-red-400 transition-all duration-200 bg-red-900/20 border border-red-900/50 rounded-lg hover:bg-red-900/40 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  Leave Room
                </button>
              )}
            </div>

            <div className="mt-6 text-center text-sm text-gray-600">
              <div>
                Press <kbd className="bg-gray-800 px-1.5 py-0.5 rounded text-gray-400 font-sans">Enter</kbd> to continue
              </div>
              <div className="mt-1">
                Press <kbd className="bg-gray-800 px-1.5 py-0.5 rounded text-gray-400 font-sans">Tab</kbd> to repeat this test
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
            style={{ backgroundColor: GLOBAL_COLORS.surface }}
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
          onClick={() => setShowThemeModal(false)}
        >
          <div
            className="w-full max-w-md rounded-lg p-6 shadow-xl mx-4 max-h-[80vh] overflow-y-auto"
            style={{ backgroundColor: GLOBAL_COLORS.surface }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-200">Theme</h2>
              <button onClick={() => setShowThemeModal(false)} className="text-gray-400 hover:text-gray-200">
                ✕
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(THEME_MANIFEST).map(([key, themeData]) => (
                <button
                  key={key}
                  onClick={() => {
                    handleThemeSelect(key);
                    setShowThemeModal(false);
                  }}
                  className={`p-4 rounded-lg border transition ${
                    selectedThemeName.toLowerCase() === themeData.name.toLowerCase()
                      ? "border-gray-400"
                      : "border-gray-700 hover:border-gray-600"
                  }`}
                  style={{ backgroundColor: themeData.backgroundColor }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: themeData.cursor }} />
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: themeData.buttonSelected }} />
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: themeData.correctText }} />
                  </div>
                  <div className="text-sm" style={{ color: themeData.correctText }}>
                    {themeData.name}
                  </div>
                </button>
              ))}
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
            style={{ backgroundColor: GLOBAL_COLORS.surface }}
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
        <div className="fixed inset-0 z-40 flex items-center justify-center" style={{ backgroundColor: GLOBAL_COLORS.background }}>
          <div className="absolute top-4 right-4">
            <button
              onClick={exitPlanMode}
              className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
            >
              Exit Plan
            </button>
          </div>
          <PlanSplash
            item={plan[planIndex]}
            progress={{ current: planIndex + 1, total: plan.length }}
            onStart={handlePlanStepStart}
          />
        </div>
      )}

      {/* Plan Results Modal */}
      {showPlanResultsModal && (
        <PlanResultsModal
          user={{ id: "local", name: "You" }}
          plan={plan}
          results={planResults}
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
              className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
            >
              ← Previous
            </button>
          )}
          <button
            onClick={handlePlanNext}
            className="px-6 py-3 bg-sky-600 hover:bg-sky-500 text-white rounded-lg font-medium transition-colors"
          >
            {planIndex < plan.length - 1 ? "Next →" : "View Results"}
          </button>
        </div>
      )}
    </div>
  );
}
