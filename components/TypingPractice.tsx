"use client";

import Link from "next/link";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { GLOBAL_COLORS } from "@/lib/colors";
import { Plan, PlanItem, PlanStepResult } from "@/types/plan";
import { Mode, Difficulty, Quote, QuoteLength, SettingsState, Theme, DEFAULT_THEME } from "@/lib/typing-constants";
import PlanBuilderModal from "./plan/PlanBuilderModal";
import PlanSplash from "./plan/PlanSplash";
import PlanNavigation from "./plan/PlanNavigation";
import PlanResultsModal from "./plan/PlanResultsModal";
import SoundSettingsModal from "./SoundSettingsModal";
import { getRandomSoundUrl, SoundManifest, INITIAL_SOUND_MANIFEST } from "@/lib/sounds";

const MAX_PRESET_LENGTH = 10000;

const TIME_PRESETS = [15, 30, 60, 120, 300];
const WORD_PRESETS = [10, 25, 50, 100, 500];

const PUNCTUATION_CHARS = [".", ",", "!", "?", ";", ":"];
const NUMBER_CHARS = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];

// Word generation helper
const generateWords = (count: number, pool: string[], options: { punctuation: boolean; numbers: boolean }) => {
  const words = [];
  if (pool.length === 0) return "";

  for (let i = 0; i < count; i++) {
    let word = pool[Math.floor(Math.random() * pool.length)];

    // Add numbers occasionally
    if (options.numbers && Math.random() < 0.15) {
      word = NUMBER_CHARS[Math.floor(Math.random() * NUMBER_CHARS.length)] +
        NUMBER_CHARS[Math.floor(Math.random() * NUMBER_CHARS.length)];
    }

    // Add punctuation occasionally
    if (options.punctuation && Math.random() < 0.1 && i > 0) {
      word = word + PUNCTUATION_CHARS[Math.floor(Math.random() * PUNCTUATION_CHARS.length)];
    }

    words.push(word);
  }
  return words.join(" ");
};

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

    // If this is the last word, it's the one currently being typed
    const isCurrentWord = i === typedWords.length - 1;

    if (isCurrentWord) {
      // For the current word being typed
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
      // For completed words (or words we've moved past)
      // 1. Compare characters up to the length of the reference word
      for (let j = 0; j < refWord.length; j++) {
        if (j < typedWord.length) {
          if (typedWord[j] === refWord[j]) {
            correct++;
          } else {
            incorrect++;
          }
        } else {
          // Character in reference was not typed
          missed++;
        }
      }

      // 2. Check for extra characters typed beyond reference length
      if (typedWord.length > refWord.length) {
        extra += typedWord.length - refWord.length;
      }
    }

    // Handle space after the word (if not the last word)
    if (i < typedWords.length - 1) {
      const refHasNextWord = i < referenceWords.length - 1;

      if (refHasNextWord) {
        // Check if the word was fully typed before the space
        if (typedWord.length >= refWord.length) {
          correct++;
        } else {
          incorrect++;
        }
      } else {
        extra++;
      }
    }
  }

  return { correct, incorrect, missed, extra };
};

const LINE_HEIGHT = 1.6;

interface TypingPracticeProps {
  connectMode?: boolean;
  lockedSettings?: Partial<SettingsState>;
  isTestActive?: boolean; // For connect mode: true = start/allow typing, false = wait/stop
  onStatsUpdate?: (stats: { 
    wpm: number; 
    accuracy: number; 
    progress: number; 
    wordsTyped: number; 
    timeElapsed: number; 
    isFinished: boolean; 
  }) => void;
  onLeave?: () => void;
  sessionId?: string | number;
  hostName?: string;
}

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

export default function TypingPractice({
  connectMode = false,
  lockedSettings,
  isTestActive = true,
  onStatsUpdate,
  onLeave,
  sessionId,
  hostName,
}: TypingPracticeProps) {
  // --- State Declarations ---
  const [settings, setSettings] = useState<SettingsState>({
    mode: "time",
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
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [showSoundModal, setShowSoundModal] = useState(false);
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customValue, setCustomValue] = useState(0);

  const [linePreview, setLinePreview] = useState(3);
  const [showSettings, setShowSettings] = useState(false);
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
  
  const inputRef = useRef<HTMLInputElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const activeWordRef = useRef<HTMLSpanElement | null>(null);
  
  const [scrollOffset, setScrollOffset] = useState(0);
  const [isZenUIHidden, setIsZenUIHidden] = useState(false);
  const zenTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [isRepeated, setIsRepeated] = useState(false);
  const [ghostCharIndex, setGhostCharIndex] = useState(0);
  const [isFocused, setIsFocused] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isWarningPlayed, setIsWarningPlayed] = useState(false);
  const [soundManifest, setSoundManifest] = useState<SoundManifest>(INITIAL_SOUND_MANIFEST);

  // Plan Mode State
  const [plan, setPlan] = useState<Plan>([]);
  const [planIndex, setPlanIndex] = useState(0);
  const [isPlanActive, setIsPlanActive] = useState(false);
  const [isPlanSplash, setIsPlanSplash] = useState(false);
  const [showPlanBuilder, setShowPlanBuilder] = useState(false);
  const [planResults, setPlanResults] = useState<Record<string, PlanStepResult>>({});
  const [isZenWaiting, setIsZenWaiting] = useState(false);
  const [nextStepReady, setNextStepReady] = useState(false); // For "Wait for All" toast/unlock
  const [showPlanResultsModal, setShowPlanResultsModal] = useState(false);

  // UI Visibility Logic (Focus Mode)
  const [uiOpacity, setUiOpacity] = useState(1);

  // --- Calculated Stats ---
  const stats = useMemo(() => computeStats(typedText, words), [typedText, words]);
  const accuracy = typedText.length > 0 ? (stats.correct / typedText.length) * 100 : 100;
  const elapsedMinutes = elapsedMs / 60000 || 0.01;
  const wpm = (typedText.length / 5) / elapsedMinutes;
  const raw = wpm;
  // const net = wpm * (accuracy / 100); // Unused but good to have

  // Ref for latest stats to be used in intervals/effects without dependency cycles
  const latestStatsRef = useRef({ wpm, accuracy, progress: 0, wordsTyped: 0, timeElapsed: 0, isFinished: false, planIndex: 0, totalSteps: 0, isZenWaiting: false });
  useEffect(() => {
    latestStatsRef.current = { 
      wpm: wpm || 0, 
      accuracy: accuracy || 0, 
      progress: words.length > 0 ? (typedText.length / words.length) * 100 : 0,
      wordsTyped: typedText.length / 5, // Standard word definition
      timeElapsed: elapsedMs,
      isFinished: isFinished,
      planIndex: isPlanActive ? planIndex : 0,
      totalSteps: isPlanActive ? plan.length : 0,
      isZenWaiting: isZenWaiting
    };
  }, [wpm, accuracy, typedText.length, words.length, elapsedMs, isFinished, isPlanActive, planIndex, plan.length, isZenWaiting]);

  // --- Callbacks & Helpers ---

  const updateSettings = useCallback(
    (updates: Partial<SettingsState>) => {
      setSettings((prev) => ({ ...prev, ...updates }));
    },
    []
  );

  const resetSession = useCallback((isRepeat = false) => {
    setTypedText("");
    setIsRunning(false);
    setIsFinished(false);
    setStartTime(null);
    setElapsedMs(0);
    setScrollOffset(0);
    setGhostCharIndex(0);
    setIsRepeated(isRepeat);
    setIsFocused(true); // Assuming reset means we want to type
    setIsWarningPlayed(false);
    inputRef.current?.focus();
  }, []);

  const finishSession = useCallback(() => {
    if (isFinished) return;
    setIsFinished(true);
    setIsRunning(false);
  }, [isFinished]);

  const playClickSound = useCallback(() => {
    if (!settings.soundEnabled || !settings.typingSound) return;
    try {
      const soundUrl = getRandomSoundUrl(soundManifest, 'typing', settings.typingSound);
      if (!soundUrl) return;

      // Clone the audio to allow overlapping sounds for fast typing
      const audio = new Audio(soundUrl);
      audio.volume = 0.5;
      audio.currentTime = 0;
      audio.play().catch(() => {
        // Ignore auto-play errors or missing file errors
      });
    } catch (e) {
      console.error("Error playing sound:", e);
    }
  }, [settings.soundEnabled, settings.typingSound, soundManifest]);

  const playWarningSound = useCallback(() => {
    if (!settings.soundEnabled || !settings.warningSound) return;
    try {
        const soundUrl = getRandomSoundUrl(soundManifest, 'warning', settings.warningSound);
        if (!soundUrl) return;
        
        const audio = new Audio(soundUrl);
        audio.volume = 0.5;
        audio.play().catch(() => {});
    } catch (e) {
        console.error("Error playing warning sound:", e);
    }
  }, [settings.soundEnabled, settings.warningSound, soundManifest]);

  const generateTest = useCallback(() => {
    if (settings.mode === "quote") {
      if (quotes.length === 0) return;
      const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
      if (randomQuote) {
        setCurrentQuote(randomQuote);
        setWords(randomQuote.quote);
        resetSession(false);
        setScrollOffset(0);
      }
      return;
    }

    if (settings.mode === "preset") {
      if (connectMode) {
        if (!settings.presetText) {
            return;
        }
      } else if (!settings.presetText) {
        setShowPresetInput(true);
        return;
      }
      setWords(settings.presetText);
      resetSession(false);
      setScrollOffset(0);
      return;
    }

    if (wordPool.length === 0) return;

    const wordCount = (settings.mode === "words" && settings.wordTarget > 0) ? settings.wordTarget : 200;
    setWords(generateWords(wordCount, wordPool, {
      punctuation: settings.punctuation,
      numbers: settings.numbers
    }));
    resetSession(false);
    setScrollOffset(0);
  }, [settings.mode, settings.duration, settings.wordTarget, settings.punctuation, settings.numbers, settings.quoteLength, settings.presetText, wordPool, quotes, resetSession, connectMode]);

  const handleInput = (value: string) => {
    if (isFinished) return;
    if (connectMode && !isTestActive) return;

    if (!isRunning) {
      setIsRunning(true);
      setStartTime(Date.now());
    }

    // Handle Zen Mode UI visibility
    if (settings.mode === "zen") {
      setIsZenUIHidden(true);
      if (zenTimeoutRef.current) clearTimeout(zenTimeoutRef.current);
      zenTimeoutRef.current = setTimeout(() => {
        setIsZenUIHidden(false);
      }, 3000);
    }

    setTypedText(value);
    playClickSound();

    // Check quote or preset completion
    if (settings.mode === "quote" || settings.mode === "preset") {
      if (value.length === words.length) {
        finishSession();
      }
      return;
    }

    // Infinite words generation for other modes
    if (settings.mode === "time" || settings.mode === "zen" || (settings.mode === "words" && settings.wordTarget === 0)) {
      const currentWords = value.trim().split(/\s+/).length;
      const totalWords = words.split(" ").length;

      if (totalWords - currentWords < 50) {
        const newWords = generateWords(50, wordPool, {
          punctuation: settings.punctuation,
          numbers: settings.numbers
        });
        setWords(prev => prev + " " + newWords);
      }
    }

    // Check word mode completion
    if (settings.mode === "words" && settings.wordTarget > 0) {
      const typedWords = value.trim().split(/\s+/).length;
      if (value.endsWith(" ") && typedWords >= settings.wordTarget) {
        finishSession();
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Prevent tab from leaving input
    if (e.key === "Tab") {
      e.preventDefault();
      if (e.shiftKey) {
        resetSession(true);
      }
    }
  };

  const applyPlanStep = useCallback((item: PlanItem) => {
    // Merge plan item settings into current settings
    setSettings(prev => ({
        ...prev,
        ...item.settings,
        mode: item.mode, // Ensure mode is set
    }));
  }, []);

  const handleStartPlan = (newPlan: Plan) => {
    if (newPlan.length === 0) return;
    setPlan(newPlan);
    setPlanIndex(0);
    setIsPlanActive(true);
    setIsPlanSplash(true);
    setPlanResults({});
    setIsZenWaiting(false);
    setNextStepReady(false);
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
    let nextIndex = planIndex + 1;
    // If in connect mode, try to sync with host index if it's ahead
    if (connectMode && lockedSettings && typeof lockedSettings.planIndex === 'number') {
        if (lockedSettings.planIndex > planIndex) {
            nextIndex = lockedSettings.planIndex;
        }
    }

    if (nextIndex < plan.length) {
      setPlanIndex(nextIndex);
      setIsPlanSplash(true);
      setIsFinished(false);
      setIsRunning(false);
      setIsZenWaiting(false);
      setNextStepReady(false);
    } else {
      // Finished plan
      setShowPlanResultsModal(true);
    }
  }, [plan.length, planIndex, connectMode, lockedSettings]);

  const handlePlanPrev = useCallback(() => {
    if (planIndex > 0) {
      setPlanIndex(prev => prev - 1);
      setIsPlanSplash(true);
      setIsFinished(false);
      setIsRunning(false);
      setIsZenWaiting(false);
    }
  }, [planIndex]);

  const handleEnterZen = useCallback(() => {
      setIsZenWaiting(true);
      setIsPlanSplash(false);
      setSettings(prev => ({
          ...prev,
          mode: "zen",
      }));
      setTimeout(() => {
          generateTest();
      }, 0);
  }, [generateTest]);

  const sanitizeText = (text: string) => {
    return text.replace(/[^\x20-\x7E\n]/g, "").replace(/\s+/g, " ").trim();
  };

  const handlePresetSubmit = (text: string) => {
    const sanitized = sanitizeText(text);
    if (sanitized.length > 0) {
      if (sanitized.length > MAX_PRESET_LENGTH) {
          alert(`Text exceeds ${MAX_PRESET_LENGTH} characters.`);
          return;
      }
      updateSettings({ presetText: sanitized });
      setShowPresetInput(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text.length > MAX_PRESET_LENGTH) {
        alert(`File content exceeds ${MAX_PRESET_LENGTH} characters.`);
        return;
      }
      setTempPresetText(text);
    };
    reader.readAsText(file);
  };

  // --- Effects ---

  // Mobile detection
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) {
        setSettings(prev => ({
          ...prev,
          typingFontSize: 1.75, // Smaller font for mobile
          iconFontSize: 0.8,
          helpFontSize: 0.8,
        }));
      }
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Fetch sound manifest
  useEffect(() => {
    const fetchSounds = async () => {
        try {
            const res = await fetch('/api/sounds');
            if (res.ok) {
                const data = await res.json();
                setSoundManifest(data);
            }
        } catch (e) {
            console.error("Failed to fetch sound manifest", e);
        }
    };
    fetchSounds();
  }, []);

  // UI Visibility
  useEffect(() => {
    if (!isRunning) {
      setUiOpacity(1);
      return;
    }

    let timeout: NodeJS.Timeout;
    
    const hideUI = () => {
        setUiOpacity(0);
    };

    const showUI = () => {
        setUiOpacity(1);
        clearTimeout(timeout);
        timeout = setTimeout(hideUI, 2000);
    };

    // Initial trigger when running starts
    timeout = setTimeout(hideUI, 1500);

    window.addEventListener("mousemove", showUI);
    return () => {
        window.removeEventListener("mousemove", showUI);
        clearTimeout(timeout);
    };
  }, [isRunning]);

  // Connect Mode: Sync Settings
  useEffect(() => {
    if (connectMode && lockedSettings) {
      const { theme: lockedTheme, ...otherSettings } = lockedSettings;
      setSettings((prev) => ({ ...prev, ...otherSettings }));
      if (lockedTheme) {
        setTheme(lockedTheme);
      }
      
      // Sync Plan Data
      if (otherSettings.mode === 'plan' && otherSettings.plan) {
          setPlan(otherSettings.plan);
          setIsPlanActive(true);
          
          if (typeof otherSettings.planIndex === 'number') {
              const newIndex = otherSettings.planIndex;
              if (isZenWaiting && newIndex > planIndex) {
                  setNextStepReady(true);
              } else {
                  setPlanIndex(newIndex);
                  setIsPlanSplash(true);
                  setIsFinished(false);
                  setIsRunning(false);
                  setIsZenWaiting(false);
                  setNextStepReady(false);
              }
          }
      } else if (otherSettings.mode !== 'plan' && isPlanActive) {
          setIsPlanActive(false);
      }
    }
  }, [connectMode, lockedSettings, isPlanActive, planIndex, isZenWaiting]);

  // Connect Mode: Handle Start/Stop
  useEffect(() => {
    if (!connectMode) return;

    if (isTestActive && !isRunning && !isFinished) {
      inputRef.current?.focus();
    } else if (!isTestActive) {
       if (isRunning) {
           finishSession();
       }
    }
  }, [connectMode, isTestActive, isRunning, isFinished, finishSession]);

  // Connect Mode: Emit Stats
  useEffect(() => {
      if (connectMode && onStatsUpdate && isFinished) {
           onStatsUpdate({
              ...latestStatsRef.current,
              isFinished: true
           });
      }
  }, [connectMode, onStatsUpdate, isFinished]);

  // Continuous Stats Update for Connect Mode
  useEffect(() => {
    if (connectMode && onStatsUpdate && isRunning) {
        const interval = setInterval(() => {
             onStatsUpdate(latestStatsRef.current);
        }, 500);
        return () => clearInterval(interval);
    }
  }, [connectMode, onStatsUpdate, isRunning]);

  // Load word lists
  useEffect(() => {
    const loadWords = async () => {
      const difficulties: Difficulty[] = ["beginner", "easy", "medium", "hard", "extreme"];
      const targetIndex = difficulties.indexOf(settings.difficulty);
      const filesToLoad = difficulties.slice(0, targetIndex + 1);

      try {
        const promises = filesToLoad.map(async (diff) => {
          const res = await fetch(`/words/${diff}.json`);
          if (!res.ok) {
            return [];
          }
          return res.json();
        });
        const results = await Promise.all(promises);
        const combinedWords = results.flat();
        if (combinedWords.length > 0) {
          setWordPool(combinedWords);
        }
      } catch (error) {
        console.error("Failed to load word lists:", error);
      }
    };

    loadWords();
  }, [settings.difficulty]);

  // Load quotes
  useEffect(() => {
    if (settings.mode !== "quote") return;

    const loadQuotes = async () => {
      try {
        let filesToLoad: QuoteLength[] = [];
        if (settings.quoteLength === "all") {
          filesToLoad = ["short", "medium", "long", "xl"];
        } else {
          filesToLoad = [settings.quoteLength];
        }

        const promises = filesToLoad.map(async (len) => {
          const res = await fetch(`/quotes/${len}.json`);
          if (!res.ok) {
            return [];
          }
          return res.json();
        });

        const results = await Promise.all(promises);
        const combinedQuotes = results.flat();
        setQuotes(combinedQuotes);
      } catch (error) {
        console.error("Failed to load quotes:", error);
      }
    };

    loadQuotes();
  }, [settings.mode, settings.quoteLength]);

  // Preset Input Effect
  useEffect(() => {
    if (showPresetInput) {
      setTempPresetText(settings.presetText);
    }
  }, [showPresetInput, settings.presetText]);

  // Generate test on settings change
  useEffect(() => {
    generateTest();
  }, [generateTest, sessionId]);

  // Timer Effect
  useEffect(() => {
    if (!isRunning || !startTime) return;

    const interval = window.setInterval(() => {
      const nextElapsed = Date.now() - startTime;
      setElapsedMs(nextElapsed);

      if ((settings.mode === "time" || (settings.mode === "preset" && settings.presetModeType === "time")) && settings.duration > 0) {
          const remainingMs = settings.duration * 1000 - nextElapsed;
          
          // Warning sound logic: Play once when 3 seconds remain
          if (remainingMs <= 3000 && remainingMs > 0 && !isWarningPlayed) {
              playWarningSound();
              setIsWarningPlayed(true);
          }

          if (nextElapsed >= settings.duration * 1000) {
            finishSession();
          }
      }
    }, 100);

    return () => window.clearInterval(interval);
  }, [finishSession, isRunning, settings.mode, settings.duration, settings.presetModeType, startTime, isWarningPlayed, playWarningSound]);

  // Ghost Writer Effect
  useEffect(() => {
    if (!isRunning || !startTime || !settings.ghostWriterEnabled || settings.ghostWriterSpeed <= 0) return;

    let animationFrameId: number;

    const updateGhost = () => {
      const elapsedMinutes = (Date.now() - startTime) / 60000;
      const targetChars = settings.ghostWriterSpeed * 5 * elapsedMinutes;
      setGhostCharIndex(targetChars);
      animationFrameId = requestAnimationFrame(updateGhost);
    };

    animationFrameId = requestAnimationFrame(updateGhost);

    return () => cancelAnimationFrame(animationFrameId);
  }, [isRunning, startTime, settings.ghostWriterSpeed, settings.ghostWriterEnabled]);

  // Handle Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isRunning) {
        finishSession();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isRunning, finishSession]);

  // Handle Enter/Tab to restart/repeat when finished
  useEffect(() => {
    if (!isFinished) return;

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        if (isPlanActive) {
            handlePlanNext();
        } else {
            generateTest();
        }
      } else if (e.key === "Tab" && settings.mode !== "zen" && !isPlanActive) {
        e.preventDefault();
        resetSession(true);
      }
    };

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [isFinished, generateTest, resetSession, isPlanActive, handlePlanNext, settings.mode]);

  // Handle Plan Step Completion
  useEffect(() => {
    if (isFinished && isPlanActive && !isPlanSplash && !isZenWaiting) {
        // Record results
        const currentItem = plan[planIndex];
        if (currentItem) {
            const result: PlanStepResult = {
                wpm: wpm,
                accuracy: accuracy,
                raw: raw,
                consistency: 0, // Not calculated yet
                time: elapsedMs / 1000,
                date: Date.now(),
                mode: currentItem.mode,
                metadata: currentItem.metadata
            };
            
            setPlanResults(prev => ({
                ...prev,
                [currentItem.id]: result
            }));
        }
    }
  }, [isFinished, isPlanActive, isPlanSplash, isZenWaiting, plan, planIndex, wpm, accuracy, raw, elapsedMs]);

  // Split words into array for rendering
  const wordArray = useMemo(() => words.split(" "), [words]);
  const typedArray = useMemo(() => typedText.split(" "), [typedText]);
  const currentWordIndex = typedArray.length - 1;

  // Virtualization: Only render a window of words around the cursor to improve performance
  const RENDER_WINDOW_START = Math.max(0, currentWordIndex - 30);
  const RENDER_WINDOW_END = currentWordIndex + 100;
  const visibleWords = wordArray.slice(RENDER_WINDOW_START, RENDER_WINDOW_END);

  // Calculate starting character index for the visible window (for ghost cursor)
  // We use useMemo to avoid recalculating this heavy reduction on every render if start index hasn't changed
  const initialCharIndex = useMemo(() => {
      if (RENDER_WINDOW_START === 0) return 0;
      // Sum lengths of all words before the window + spaces
      return wordArray.slice(0, RENDER_WINDOW_START).reduce((acc, w) => acc + w.length + 1, 0);
  }, [wordArray, RENDER_WINDOW_START]);

  // Handle scrolling
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
       setScrollOffset(prev => Math.max(0, prev + diff));
    }
  }, [typedText, settings.typingFontSize, linePreview]);

  return (
    <div
      className={`relative flex min-h-[100dvh] flex-col items-center px-4 pb-8 transition-colors duration-300 
        ${isMobile 
          ? (isFocused ? "justify-start pt-40" : isFinished ? "justify-start pt-0" : "justify-center pt-8") 
          : "justify-center pt-8"
        }`}
      style={{ backgroundColor: theme.backgroundColor }}
    >
      {/* Plan Splash Screen */}
      {isPlanActive && isPlanSplash && plan[planIndex] && (
        <PlanSplash
          item={plan[planIndex]}
          progress={{ current: planIndex + 1, total: plan.length }}
          onStart={handlePlanStepStart}
          isLocked={plan[planIndex].syncSettings.waitForAll && connectMode && !nextStepReady}
          canEnterZen={plan[planIndex].syncSettings.zenWaiting}
          onEnterZen={handleEnterZen}
        />
      )}

      {/* Main UI (Hidden during Plan Splash) */}
      {!isPlanSplash && (
        <>
      {/* Settings bar */}
      {!connectMode && !isRunning && !isFinished && (
        <div
          className={`fixed top-[100px] md:top-[10%] left-0 w-full flex flex-col items-center justify-center gap-4 transition-all duration-300 ${
            (settings.mode === "zen" && isZenUIHidden) || (isFocused && isMobile) 
              ? "opacity-0 pointer-events-none translate-y-[-20px]" 
              : "opacity-100 translate-y-0"
          }`}
          style={{ fontSize: `${settings.iconFontSize}rem` }}
        >
           {/* Line 1: Toolbar */}
           <div 
             className="flex items-center gap-4 px-6 py-2 rounded-full shadow-lg mb-2"
             style={{ backgroundColor: GLOBAL_COLORS.surface }}
           >
            <Link
              href="/connect"
              className="flex h-[1.5em] w-[1.5em] items-center justify-center rounded transition hover:opacity-75 hover:text-white"
              style={{ color: theme.buttonUnselected }}
              title="Connect"
            >
               <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                  <circle cx="9" cy="7" r="4"></circle>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
               </svg>
            </Link>

            <button
              type="button"
              onClick={() => setShowSettings(true)}
              className="flex h-[1.5em] w-[1.5em] items-center justify-center rounded transition hover:opacity-75 hover:text-white"
              style={{ color: theme.buttonUnselected }}
              title="settings"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.78 1.35a2 2 0 0 0 .73 2.73l.15.08a2 2 0 0 1 1 1.73v.52a2 2 0 0 1-1 1.73l-.15.08a2 2 0 0 0-.73 2.73l.78 1.35a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.78-1.35a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.73v-.52a2 2 0 0 1 1-1.73l.15-.08a2 2 0 0 0 .73-2.73l-.78-1.35a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </button>

            <button
              type="button"
              onClick={() => setShowThemeModal(true)}
              className="flex h-[1.5em] w-[1.5em] items-center justify-center rounded transition hover:opacity-75 hover:text-white"
              style={{ color: theme.buttonUnselected }}
              title="customize theme"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="13.5" cy="6.5" r=".5" fill="currentColor" stroke="none" />
                <circle cx="17.5" cy="10.5" r=".5" fill="currentColor" stroke="none" />
                <circle cx="8.5" cy="7.5" r=".5" fill="currentColor" stroke="none" />
                <circle cx="6.5" cy="12.5" r=".5" fill="currentColor" stroke="none" />
                <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z" />
              </svg>
            </button>

            <div className="w-px h-4 bg-gray-600"></div>

            <button
              type="button"
              onClick={() => setShowSoundModal(true)}
              className="flex h-[1.5em] w-[1.5em] items-center justify-center rounded transition hover:opacity-75 hover:text-white"
              style={{ color: settings.soundEnabled ? theme.buttonSelected : theme.buttonUnselected }}
              title="sound settings"
            >
              {settings.soundEnabled ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                  <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                  <line x1="23" y1="9" x2="17" y2="15" />
                  <line x1="17" y1="9" x2="23" y2="15" />
                </svg>
              )}
            </button>

            <button
              type="button"
              onClick={() => updateSettings({ ghostWriterEnabled: !settings.ghostWriterEnabled })}
              className="flex h-[1.5em] w-[1.5em] items-center justify-center rounded transition hover:opacity-75 hover:text-white"
              style={{ color: settings.ghostWriterEnabled ? theme.buttonSelected : theme.buttonUnselected }}
              title="toggle ghost writer"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 10h.01" />
                <path d="M15 10h.01" />
                <path d="M12 2a8 8 0 0 0-8 8v12l3-3 2.5 2.5L12 19l2.5 2.5L17 19l3 3V10a8 8 0 0 0-8-8z" />
              </svg>
            </button>
           </div>

           {/* Line 2: Modes & Toggles */}
           <div className="flex flex-wrap items-center justify-center gap-4 text-gray-400">
                 
                 {/* Mode */}
                 <div className="flex rounded-lg p-1" style={{ backgroundColor: GLOBAL_COLORS.surface }}>
                    {(["time", "words", "quote", "zen", "preset", "plan"] as Mode[]).map((m) => (
                        <button
                            key={m}
                            type="button"
                            onClick={() => {
                                if (m === "plan") {
                                  setShowPlanBuilder(true);
                                  return;
                                }
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
                            <span className={settings.punctuation ? "text-gray-900 rounded px-1 text-[0.75em] font-bold" : "bg-gray-700 rounded px-1 text-[0.75em]"} style={{ backgroundColor: settings.punctuation ? theme.buttonSelected : undefined }}>@</span>
                             Punctuation
                        </button>
                        <button 
                            type="button"
                            onClick={() => updateSettings({ numbers: !settings.numbers })}
                            className={`flex items-center gap-2 transition ${settings.numbers ? "" : "hover:text-gray-200"}`}
                            style={{ color: settings.numbers ? theme.buttonSelected : undefined }}
                        >
                             <span className={settings.numbers ? "text-gray-900 rounded px-1 text-[0.75em] font-bold" : "bg-gray-700 rounded px-1 text-[0.75em]"} style={{ backgroundColor: settings.numbers ? theme.buttonSelected : undefined }}>#</span>
                             Numbers
                        </button>
                     </div>
                 )}
             </div>

           {/* Line 3: Sub-settings */}
           <div className="flex flex-wrap items-center justify-center gap-2 text-gray-400">
                 
                 {/* Time/Word Presets */}
                 {(settings.mode === "time" || (settings.mode === "preset" && settings.presetModeType === "time")) && (
                    <div className="flex rounded-lg p-1" style={{ backgroundColor: GLOBAL_COLORS.surface }}>
                        {TIME_PRESETS.map(d => (
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
                        <button
                            type="button"
                            onClick={() => {
                                setCustomValue(settings.duration);
                                setShowCustomModal(true);
                            }}
                            className={`px-3 py-1 rounded transition ${!TIME_PRESETS.includes(settings.duration) ? "font-medium bg-gray-800" : "hover:text-gray-200"}`}
                            style={{ color: !TIME_PRESETS.includes(settings.duration) ? theme.buttonSelected : undefined }}
                        >
                            #
                        </button>
                    </div>
                 )}

                 {settings.mode === "words" && (
                    <div className="flex rounded-lg p-1" style={{ backgroundColor: GLOBAL_COLORS.surface }}>
                        {WORD_PRESETS.map(w => (
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
                        <button
                            type="button"
                            onClick={() => {
                                setCustomValue(settings.wordTarget);
                                setShowCustomModal(true);
                            }}
                            className={`px-3 py-1 rounded transition ${!WORD_PRESETS.includes(settings.wordTarget) ? "font-medium bg-gray-800" : "hover:text-gray-200"}`}
                            style={{ color: !WORD_PRESETS.includes(settings.wordTarget) ? theme.buttonSelected : undefined }}
                        >
                            #
                        </button>
                    </div>
                 )}

                 {settings.mode === "quote" && (
                    <div className="flex rounded-lg p-1" style={{ backgroundColor: GLOBAL_COLORS.surface }}>
                        {(["all", "short", "medium", "long", "xl"] as QuoteLength[]).map(l => (
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

                 {/* Difficulty (Non-Quote/Preset) */}
                 {settings.mode !== "quote" && settings.mode !== "zen" && settings.mode !== "preset" && (
                    <div className="flex rounded-lg p-1 ml-2" style={{ backgroundColor: GLOBAL_COLORS.surface }}>
                        {(["beginner", "easy", "medium", "hard", "extreme"] as Difficulty[]).map(d => (
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
                                {d === "extreme" ? "expert" : d}
                            </button>
                        ))}
                    </div>
                 )}

                 {/* Preset Type */}
                 {settings.mode === "preset" && (
                    <div className="flex rounded-lg p-1" style={{ backgroundColor: GLOBAL_COLORS.surface }}>
                        {(["finish", "time"] as const).map(t => (
                            <button
                                key={t}
                                type="button"
                                onClick={() => updateSettings({ presetModeType: t })}
                                className={`px-3 py-1 rounded transition ${settings.presetModeType === t ? "font-medium bg-gray-800" : "hover:text-gray-200"}`}
                                style={{ color: settings.presetModeType === t ? theme.buttonSelected : undefined }}
                            >
                                {t}
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

      {/* Live stats (moved to top) */}
      {isRunning && !isFinished && settings.mode !== "zen" && (
        <div className="fixed top-[80px] md:top-[20%] left-0 w-full flex flex-row flex-nowrap items-center justify-center gap-2 md:gap-4 select-none z-10 transition-opacity duration-500">
          
          {/* WPM Pill */}
          <div 
            className="flex items-baseline gap-2 px-3 py-1.5 md:px-6 md:py-3 backdrop-blur-md rounded-full shadow-lg border border-gray-700/50 min-w-[70px] md:min-w-[100px] justify-center"
            style={{ backgroundColor: `${GLOBAL_COLORS.surface}E6` }}
          >
            <span className="text-xl md:text-3xl font-bold tabular-nums leading-none" style={{ color: theme.buttonSelected }}>{Math.round(wpm)}</span>
            <span className="text-[10px] md:text-xs font-semibold uppercase tracking-wider text-gray-500">wpm</span>
          </div>

          {/* Accuracy Pill */}
          <div 
            className="flex items-baseline gap-2 px-3 py-1.5 md:px-6 md:py-3 backdrop-blur-md rounded-full shadow-lg border border-gray-700/50 min-w-[70px] md:min-w-[100px] justify-center"
            style={{ backgroundColor: `${GLOBAL_COLORS.surface}E6` }}
          >
            <span className="text-xl md:text-3xl font-bold tabular-nums leading-none" style={{ color: theme.buttonSelected }}>{Math.round(accuracy)}%</span>
            <span className="text-[10px] md:text-xs font-semibold uppercase tracking-wider text-gray-500">acc</span>
          </div>

          {/* Timer / Word Counter Pill */}
          {(settings.mode === "time" || (settings.mode === "preset" && settings.presetModeType === "time")) && (
            <div 
              className="flex items-baseline gap-2 px-3 py-1.5 md:px-6 md:py-3 backdrop-blur-md rounded-full shadow-lg border border-gray-700/50 min-w-[70px] md:min-w-[100px] justify-center"
              style={{ backgroundColor: `${GLOBAL_COLORS.surface}E6` }}
            >
              <span className={`text-xl md:text-3xl font-bold tabular-nums leading-none ${settings.duration > 0 && Math.max(0, settings.duration - Math.floor(elapsedMs / 1000)) < 10 ? "" : "text-gray-200"}`} style={{ color: settings.duration > 0 && Math.max(0, settings.duration - Math.floor(elapsedMs / 1000)) < 10 ? GLOBAL_COLORS.text.error : undefined }}>
                {settings.duration === 0 
                  ? formatTime(Math.floor(elapsedMs / 1000))
                  : formatTime(Math.max(0, settings.duration - Math.floor(elapsedMs / 1000)))
                }
              </span>
            </div>
          )}
          
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

          {/* Mobile Stop Button */}
          <button
            onClick={finishSession}
            className="md:hidden flex items-center justify-center w-10 h-10 backdrop-blur-md rounded-full shadow-lg border border-red-500/30 text-red-400 bg-red-900/20 active:scale-95 transition-all pointer-events-auto"
            aria-label="Stop Test"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            </svg>
          </button>
        </div>
      )}

      {/* Quote Info */}
      {settings.mode === "quote" && currentQuote && !isFinished && (
        <div 
            className={`mb-8 flex flex-col items-center text-center animate-fade-in transition-opacity duration-500 ${isFocused && isMobile ? "opacity-0 h-0 overflow-hidden mb-0" : ""}`}
            style={{ opacity: isFocused && isMobile ? 0 : uiOpacity }}
        >
          <div className="text-xl font-medium" style={{ color: theme.buttonSelected }}>{currentQuote.author}</div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-sm text-gray-400">{currentQuote.source}, {currentQuote.date}</span>
            <div className="group relative">
              <div 
                className="flex h-4 w-4 cursor-help items-center justify-center rounded-full border border-gray-600 text-[10px] text-gray-500 hover:border-current hover:text-current"
                style={{ "--hover-color": theme.buttonSelected } as any}
                onMouseEnter={(e) => { e.currentTarget.style.color = theme.buttonSelected; e.currentTarget.style.borderColor = theme.buttonSelected; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = ""; e.currentTarget.style.borderColor = ""; }}
              >
                i
              </div>
              {/* Tooltip */}
              <div className="absolute bottom-full left-1/2 mb-2 w-48 -translate-x-1/2 scale-0 rounded bg-gray-800 p-2 text-xs text-gray-300 opacity-0 shadow-lg transition-all group-hover:scale-100 group-hover:opacity-100">
                {currentQuote.context}
                <div className="absolute -bottom-1 left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 bg-gray-800"></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Plan Metadata & Navigation */}
      {isPlanActive && !isPlanSplash && plan[planIndex] && (
        <div 
            className="w-full max-w-4xl flex flex-col items-center mb-8 mt-24 animate-fade-in relative z-0 transition-opacity duration-500"
            style={{ opacity: uiOpacity, pointerEvents: uiOpacity === 0 ? 'none' : 'auto' }}
        >
           <div className="text-center mb-6">
              <div className="text-gray-500 text-xs uppercase tracking-wider mb-2">Step {planIndex + 1} / {plan.length}</div>
              <h2 className="text-3xl font-bold text-gray-200 mb-2">{plan[planIndex].metadata.title}</h2>
              <div className="text-lg text-gray-400">{plan[planIndex].metadata.subtitle}</div>
           </div>
           
           <PlanNavigation
             onNext={handlePlanNext}
             onPrev={handlePlanPrev}
             isNextDisabled={isZenWaiting && plan[planIndex].syncSettings.waitForAll && !nextStepReady}
             isPrevDisabled={planIndex === 0}
             showNext={true}
             showPrev={true}
           />
        </div>
      )}

      {/* Typing area */}
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
            />

            <div
              ref={containerRef}
              className="cursor-text font-mono overflow-hidden relative"
              style={{
                fontSize: `${settings.typingFontSize}rem`,
                lineHeight: LINE_HEIGHT,
                maxHeight: `${linePreview * settings.typingFontSize * LINE_HEIGHT}rem`,
                textAlign: settings.textAlign,
              }}
              onClick={() => inputRef.current?.focus()}
              >
                <div
                  style={{ transform: `translateY(-${scrollOffset}px)`, transition: 'transform 0.1s ease-out' }}
                  className=""
                >
                  {visibleWords.reduce<{ nodes: React.ReactNode[]; currentIndex: number }>(
                    (acc, word, idx) => {
                      const wordIdx = RENDER_WINDOW_START + idx;
                      const wordStartIndex = acc.currentIndex;
                      const typedWord = typedArray[wordIdx] || "";
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
                          const isUpcoming = isCursor;
                          const isGhost = settings.ghostWriterEnabled && Math.floor(ghostCharIndex) === globalCharIndex;

                          let charColor = theme.defaultText;
                          if (!isTyped) {
                            if (isPastWord) charColor = theme.incorrectText;
                            else if (isUpcoming) charColor = theme.upcomingText;
                          } else {
                            charColor = isCorrect ? theme.correctText : theme.incorrectText;
                          }

                          return (
                            <span
                              key={charIdx}
                              className="relative"
                              style={{ color: charColor }}
                            >
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
                        {/* Extra characters typed */}
                        {(isCurrentWord || isPastWord) && typedWord.length > word.length && (
                          <span style={{ color: theme.incorrectText }}>
                            {typedWord.slice(word.length)}
                          </span>
                        )}
                        {/* Cursor at end of word */}
                        {isCurrentWord && typedWord.length === word.length && (
                          <span className="relative">
                            <span
                              className="absolute left-0 top-0 h-full w-0.5 animate-pulse"
                              style={{ backgroundColor: theme.cursor }}
                            />
                          </span>
                        )}
                        {/* Ghost Cursor at end of word (space) */}
                        {settings.ghostWriterEnabled && Math.floor(ghostCharIndex) === wordStartIndex + word.length && (
                          <span className="relative">
                            <span
                              className="absolute left-0 top-0 h-full w-0.5 opacity-70"
                              style={{ backgroundColor: theme.ghostCursor }}
                            />
                          </span>
                        )}
                      </span>
                    );

                    acc.nodes.push(wordNode);
                    acc.currentIndex += word.length + 1; // +1 for space
                    return acc;
                  },
                  { nodes: [], currentIndex: initialCharIndex }
                ).nodes}
              </div>
            </div>
          </div>
        ) : (
          // Results screen
          <div className="w-full max-w-4xl mx-auto animate-fade-in">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {/* Primary Stats */}
              <div className="relative overflow-hidden rounded-2xl p-6 md:p-10 flex flex-col items-center justify-center group border border-gray-800 hover:border-gray-700 transition-colors" style={{ backgroundColor: GLOBAL_COLORS.surface }}>
                <div className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Words Per Minute</div>
                <div className="text-6xl md:text-8xl font-black tabular-nums leading-none tracking-tight" style={{ color: theme.buttonSelected }}>
                  {Math.round(wpm)}
                </div>
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                </div>
              </div>

              <div className="relative overflow-hidden rounded-2xl p-6 md:p-10 flex flex-col items-center justify-center group border border-gray-800 hover:border-gray-700 transition-colors" style={{ backgroundColor: GLOBAL_COLORS.surface }}>
                <div className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Accuracy</div>
                <div className="text-6xl md:text-8xl font-black tabular-nums leading-none tracking-tight" style={{ color: theme.buttonSelected }}>
                  {Math.round(accuracy)}<span className="text-2xl md:text-4xl align-top ml-1 opacity-50">%</span>
                </div>
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                </div>
              </div>
            </div>

            {/* Secondary Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
              <div className="rounded-xl p-4 border border-gray-800/50 flex flex-col items-center" style={{ backgroundColor: `${GLOBAL_COLORS.surface}80` }}>
                <div className="text-3xl font-bold text-gray-200 mb-1">{stats.correct}</div>
                <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Correct</div>
              </div>
              <div className="rounded-xl p-4 border border-gray-800/50 flex flex-col items-center" style={{ backgroundColor: `${GLOBAL_COLORS.surface}80` }}>
                <div className="text-3xl font-bold mb-1" style={{ color: GLOBAL_COLORS.text.error }}>{stats.incorrect}</div>
                <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Errors</div>
              </div>
              <div className="rounded-xl p-4 border border-gray-800/50 flex flex-col items-center" style={{ backgroundColor: `${GLOBAL_COLORS.surface}80` }}>
                <div className="text-3xl font-bold text-gray-400 mb-1">{stats.missed}</div>
                <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Missed</div>
              </div>
              <div className="rounded-xl p-4 border border-gray-800/50 flex flex-col items-center" style={{ backgroundColor: `${GLOBAL_COLORS.surface}80` }}>
                <div className="text-3xl font-bold text-gray-400 mb-1">{stats.extra}</div>
                <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Extra</div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-4 justify-center">
              {!connectMode && !isPlanActive && (
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

            <div> 
              {(!connectMode || isPlanActive) && (
                <div className="mt-6 text-center text-sm text-gray-600">
                    <div>
                        Press <kbd className="bg-gray-800 px-1.5 py-0.5 rounded text-gray-400 font-sans">Enter</kbd> to {isPlanActive ? "next step" : "continue"}
                    </div>
                    {!isPlanActive && (
                        <div className="mt-1">
                            Press <kbd className="bg-gray-800 px-1.5 py-0.5 rounded text-gray-400 font-sans">Tab</kbd> to repeat this test
                        </div>
                    )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Instructions */}
      {!isRunning && !isFinished && !isPlanActive && (
        <div
          className={`fixed bottom-[15%] left-0 w-full text-center text-gray-600 transition-opacity duration-300 ${settings.mode === "zen" && isZenUIHidden ? "opacity-0" : "opacity-100"}`}
          style={{ fontSize: `${settings.helpFontSize}rem` }}
        >
          {isRepeated && (
            <div className="mb-2 text-red-500 font-medium">REPEATED</div>
          )}
          <div className="mt-1">Press <kbd className="bg-gray-800 px-1.5 py-0.5 rounded text-gray-400 font-sans">Tab</kbd> + <kbd className="bg-gray-800 px-1.5 py-0.5 rounded text-gray-400 font-sans">Shift</kbd> to restart</div>
          <div>Click on the text area and start typing</div>
        </div>
      )}

      </>
      )}

      {/* Waiting Overlay for Connect Mode */}
      {connectMode && !isTestActive && !isFinished && (
        <div 
            className="fixed inset-0 z-40 flex flex-col items-center justify-center"
            style={{ backgroundColor: theme.backgroundColor }}
        >
            <div className="w-full max-w-md rounded-2xl p-6 md:p-10 flex flex-col items-center justify-center border border-gray-800 shadow-2xl text-center animate-fade-in mx-4 md:mx-0" style={{ backgroundColor: GLOBAL_COLORS.surface }}>
                <h2 className="text-xl md:text-2xl font-bold mb-4" style={{ color: theme.buttonSelected }}>Waiting for {hostName || "Host"} to start...</h2>
                <div className="text-gray-400 animate-pulse mb-8">Prepare to type</div>
                
                {onLeave && (
                    <button
                        onClick={onLeave}
                        className="px-8 py-3 bg-gray-700 hover:bg-red-900/20 hover:text-red-400 text-gray-300 font-medium rounded-lg transition border border-transparent hover:border-red-900/50"
                    >
                        Leave Room
                    </button>
                )}
            </div>
        </div>
      )}

      {/* Sound Settings Modal */}
      <SoundSettingsModal
        isOpen={showSoundModal}
        onClose={() => setShowSoundModal(false)}
        settings={settings}
        onUpdateSettings={updateSettings}
        soundManifest={soundManifest}
      />

      {/* Settings Modal */}
      {showSettings && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setShowSettings(false)}
        >
          <div
            className="w-full max-w-md rounded-lg p-6 shadow-xl mx-4 md:mx-0"
            style={{ backgroundColor: GLOBAL_COLORS.surface }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-200">Settings</h2>
              <button
                type="button"
                onClick={() => setShowSettings(false)}
                className="text-gray-400 hover:text-gray-200"
              >
                ✕
              </button>
            </div>

            <div className="space-y-6">
              {/* Line Preview Setting */}
              <div>
                <label className="mb-2 block text-sm text-gray-400">
                  Lines to Preview
                </label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((num) => (
                    <button
                      key={num}
                      onClick={() => setLinePreview(num)}
                      className={`rounded px-4 py-2 text-sm transition ${linePreview === num
                        ? "text-gray-900"
                        : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                        }`}
                      style={{ backgroundColor: linePreview === num ? theme.buttonSelected : undefined }}
                    >
                      {num}
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  Number of lines of text visible while typing
                </p>
              </div>
            </div>

            {/* Font Size Settings */}
            <div className="space-y-4 border-t border-gray-700 pt-4">
              <h3 className="text-sm font-medium text-gray-200">Appearance</h3>

              {/* Typing Text Size */}
              <div>
                <label className="mb-2 block text-xs text-gray-400">
                  Typing Text Size (rem)
                </label>
                   <input
                  type="number"
                  min="1"
                  max="10"
                  step="0.1"
                  value={settings.typingFontSize}
                  onChange={(e) => updateSettings({ typingFontSize: parseFloat(e.target.value) || 0 })}
                  className="w-full rounded bg-gray-700 px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-2"
                  style={{ "--tw-ring-color": theme.buttonSelected } as any}
                />
              </div>

              {/* Text Alignment */}
              <div>
                <label className="mb-2 block text-xs text-gray-400">
                  Text Alignment
                </label>
                <div className="flex gap-2">
                  {(["left", "center", "right", "justify"] as const).map((align) => (
                    <button
                      key={align}
                      onClick={() => updateSettings({ textAlign: align })}
                      className={`rounded px-3 py-1 text-sm capitalize transition ${settings.textAlign === align
                        ? "text-gray-900"
                        : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                        }`}
                      style={{ backgroundColor: settings.textAlign === align ? theme.buttonSelected : undefined }}
                    >
                      {align}
                    </button>
                  ))}
                </div>

              </div>

              {/* Icon Size */}
              <div>
                <label className="mb-2 block text-xs text-gray-400">
                  Menu Icon Size
                </label>
                <div className="flex gap-2">
                  {[
                    { label: "xs", value: 0.5 },
                    { label: "s", value: 0.75 },
                    { label: "m", value: 1. },
                    { label: "l", value: 1.25 },
                    { label: "xl", value: 1.5 },
                  ].map(({ label, value }) => (
                    <button
                      key={label}
                      onClick={() => updateSettings({ iconFontSize: value })}
                      className={`rounded px-3 py-1 text-sm transition ${settings.iconFontSize === value
                        ? "text-gray-900"
                        : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                        }`}
                      style={{ backgroundColor: settings.iconFontSize === value ? theme.buttonSelected : undefined }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Help Text Size */}
              <div>
                <label className="mb-2 block text-xs text-gray-400">
                  Help Text Size (rem)
                </label>
                <input
                  type="number"
                  min="0.5"
                  max="5"
                  step="0.1"
                  value={settings.helpFontSize}
                  onChange={(e) => updateSettings({ helpFontSize: parseFloat(e.target.value) || 0 })}
                  className="w-full rounded bg-gray-700 px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-2"
                  style={{ "--tw-ring-color": theme.buttonSelected } as any}
                />
              </div>

              {/* Ghost Writer Speed */}
              <div>
                <label className="mb-2 block text-xs text-gray-400">
                  Ghost Writer Speed (WPM)
                </label>
                <input
                  type="number"
                  min="1"
                  max="500"
                  step="5"
                  value={settings.ghostWriterSpeed}
                  onChange={(e) => updateSettings({ ghostWriterSpeed: parseInt(e.target.value) || 0 })}
                  className="w-full rounded bg-gray-700 px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-2"
                  style={{ "--tw-ring-color": theme.buttonSelected } as any}
                />
              </div>
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
            className="w-full max-w-md max-h-[80vh] overflow-y-auto rounded-lg p-6 shadow-xl mx-4 md:mx-0"
            style={{ backgroundColor: GLOBAL_COLORS.surface }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-200">Customize Theme</h2>
              <button
                type="button"
                onClick={() => setShowThemeModal(false)}
                className="text-gray-400 hover:text-gray-200"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              {[
                { key: "backgroundColor", label: "Background Color" },
                { key: "cursor", label: "Cursor Color" },
                { key: "ghostCursor", label: "Ghost Cursor Color" },
                { key: "defaultText", label: "Default Text Color" },
                { key: "upcomingText", label: "Upcoming Text Color" },
                { key: "correctText", label: "Correct Text Color" },
                { key: "incorrectText", label: "Incorrect Text Color" },
                { key: "buttonUnselected", label: "Button Unselected" },
                { key: "buttonSelected", label: "Button Selected" },
              ].map(({ key, label }) => (
                <div key={key} className="flex items-center justify-between">
                  <label className="text-sm text-gray-400">{label}</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={theme[key as keyof Theme]}
                      onChange={(e) => setTheme((prev) => ({ ...prev, [key]: e.target.value }))}
                      className="h-8 w-14 cursor-pointer rounded bg-transparent p-0"
                    />
                    <button
                      type="button"
                      onClick={() => setTheme((prev) => ({ ...prev, [key]: DEFAULT_THEME[key as keyof Theme] }))}
                      className="text-xs text-gray-500 hover:text-gray-300"
                      title="Reset to default"
                    >
                      Reset
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setTheme(DEFAULT_THEME)}
                className="text-sm text-red-400 hover:text-red-300"
              >
                Reset All Defaults
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Preset Input Modal */}
      {showPresetInput && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => {
             if (settings.presetText) {
                setShowPresetInput(false);
             } else {
                 setShowPresetInput(false);
                 if (!settings.presetText) {
                     updateSettings({ mode: "time" }); // Fallback
                 }
             }
          }}
        >
          <div
            className="w-full max-w-2xl rounded-lg p-6 shadow-xl mx-4 md:mx-0"
            style={{ backgroundColor: GLOBAL_COLORS.surface }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-200">Custom Text</h2>
              <button
                type="button"
                onClick={() => {
                     setShowPresetInput(false);
                     if (!settings.presetText) {
                         updateSettings({ mode: "time" });
                     }
                }}
                className="text-gray-400 hover:text-gray-200"
              >
                ✕
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <label className="mb-2 block text-sm text-gray-400">
                  Paste your text
                </label>
                <textarea
                  className="w-full h-48 rounded bg-gray-700 p-4 text-gray-200 focus:outline-none focus:ring-2 font-mono text-sm"
                  placeholder="Paste your text here..."
                  onChange={(e) => setTempPresetText(e.target.value)}
                  value={tempPresetText}
                  style={{ "--tw-ring-color": theme.buttonSelected } as any}
                />
              </div>

              <div className="flex items-center gap-4">
                <div className="h-px flex-1 bg-gray-700" />
                <span className="text-sm text-gray-500">OR</span>
                <div className="h-px flex-1 bg-gray-700" />
              </div>

              <div>
                <label className="mb-2 block text-sm text-gray-400">
                  Upload text file (.txt)
                </label>
                <input
                  type="file"
                  accept=".txt"
                  onChange={handleFileUpload}
                  className="block w-full text-sm text-gray-400 file:mr-4 file:rounded file:border-0 file:bg-gray-700 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-gray-200 hover:file:bg-gray-600"
                />
              </div>
              
              <div className="flex justify-end pt-4">
                 <button
                    type="button"
                    onClick={() => {
                        if (tempPresetText) {
                            handlePresetSubmit(tempPresetText);
                        }
                    }}
                    disabled={!tempPresetText}
                     className={`px-6 py-2 rounded font-medium transition ${
                        tempPresetText 
                        ? "text-gray-900 hover:opacity-90" 
                        : "bg-gray-700 text-gray-500 cursor-not-allowed"
                    }`}
                    style={{ backgroundColor: tempPresetText ? theme.buttonSelected : undefined }}
                  >
                     Start
                  </button>

              </div>
            </div>
          </div>
        </div>
      )}

      {/* Custom Value Modal */}
      {showCustomModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setShowCustomModal(false)}
        >
          <div
            className="w-full max-w-sm rounded-lg p-6 shadow-xl mx-4 md:mx-0"
            style={{ backgroundColor: GLOBAL_COLORS.surface }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-200">
                Custom {settings.mode === "time" ? "Duration" : "Word Amount"}
              </h2>
              <button
                type="button"
                onClick={() => setShowCustomModal(false)}
                className="text-gray-400 hover:text-gray-200"
              >
                ✕
              </button>
            </div>

            <div className="flex flex-col items-center gap-6">
               <div className="flex items-center gap-4">
                   {/* Decrement Buttons */}
                   <div className="flex flex-col gap-1">
                       <button
                           type="button"
                           onClick={() => setCustomValue(v => Math.max(0, v - 10))}
                           className="px-2 py-1 bg-gray-700 rounded hover:bg-gray-600 text-xs text-gray-300"
                       >---</button>
                       <button
                           type="button"
                           onClick={() => setCustomValue(v => Math.max(0, v - 5))}
                           className="px-2 py-1 bg-gray-700 rounded hover:bg-gray-600 text-xs text-gray-300"
                       >--</button>
                       <button
                           type="button"
                           onClick={() => setCustomValue(v => Math.max(0, v - 1))}
                           className="px-2 py-1 bg-gray-700 rounded hover:bg-gray-600 text-xs text-gray-300"
                       >-</button>
                   </div>

                   {/* Input */}
                   <input
                       type="number"
                       value={customValue}
                       onChange={(e) => setCustomValue(Math.max(0, parseInt(e.target.value) || 0))}
                       className="w-24 text-center text-3xl font-bold bg-transparent border-b-2 focus:outline-none"
                       style={{ borderColor: theme.buttonSelected, color: theme.buttonSelected }}
                   />

                   {/* Increment Buttons */}
                   <div className="flex flex-col gap-1">
                       <button
                           type="button"
                           onClick={() => setCustomValue(v => v + 10)}
                           className="px-2 py-1 bg-gray-700 rounded hover:bg-gray-600 text-xs text-gray-300"
                       >+++</button>
                       <button
                           type="button"
                           onClick={() => setCustomValue(v => v + 5)}
                           className="px-2 py-1 bg-gray-700 rounded hover:bg-gray-600 text-xs text-gray-300"
                       >++</button>
                       <button
                           type="button"
                           onClick={() => setCustomValue(v => v + 1)}
                           className="px-2 py-1 bg-gray-700 rounded hover:bg-gray-600 text-xs text-gray-300"
                       >+</button>
                   </div>
               </div>

               <button
                   type="button"
                   onClick={() => {
                       if (settings.mode === "time") {
                           updateSettings({ duration: customValue });
                       } else {
                           updateSettings({ wordTarget: customValue });
                       }
                       setShowCustomModal(false);
                   }}
                   className="px-8 py-2 rounded font-medium text-gray-900 transition hover:opacity-90"
                   style={{ backgroundColor: theme.buttonSelected }}
               >
                   Set
               </button>
            </div>
          </div>
        </div>
      )}

      {/* Zen Ready Toast */}
      {isZenWaiting && nextStepReady && (
        <div className="fixed top-20 right-8 z-50 bg-sky-600 text-white px-6 py-4 rounded-lg shadow-xl animate-fade-in flex items-center gap-4">
          <div>
            <div className="font-bold">Step Ready!</div>
            <div className="text-sm text-sky-100">Everyone has finished.</div>
          </div>
          <button 
            onClick={handlePlanNext}
            className="px-4 py-2 bg-white text-sky-700 font-bold rounded hover:bg-sky-50 transition"
          >
            Go
          </button>
        </div>
      )}

      {/* Plan Builder Modal */}
      {showPlanBuilder && (
        <PlanBuilderModal
          onSave={handleStartPlan}
          onClose={() => setShowPlanBuilder(false)}
          isConnectMode={connectMode}
        />
      )}

      {/* Plan Results Modal */}
      {showPlanResultsModal && (
        <PlanResultsModal
          user={{ id: "local", name: "You" }}
          plan={plan}
          results={planResults}
          onClose={() => setShowPlanResultsModal(false)}
        />
      )}

    </div>
  );
}
