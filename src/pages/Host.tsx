// src/pages/Host.tsx
import { useEffect, useState, useMemo, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type { DragEndEvent } from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { GLOBAL_COLORS } from "@/lib/colors";
import {
  DEFAULT_THEME,
  type SettingsState,
  type Mode,
  type Difficulty,
  type QuoteLength,
  type Theme,
} from "@/lib/typing-constants";
import { fetchAllThemes, type ThemeDefinition } from "@/lib/themes";
import { fetchSoundManifest, type SoundManifest } from "@/lib/sounds";
import { fetchWordsManifest, type WordsManifest } from "@/lib/words";
import { fetchQuotesManifest, type QuotesManifest } from "@/lib/quotes";
import { useSessionId } from "@/hooks/useSessionId";
import { HostCard, UserHostCard } from "@/components/connect";
import SoundController from "@/components/typing/SoundController";
import ColorPicker from "@/components/typing/ColorPicker";
import { PlanBuilderModal } from "@/components/plan";
import type { Plan } from "@/types/plan";

type User = {
  id: string;
  name: string;
  stats: {
    wpm: number;
    accuracy: number;
    progress: number;
    wordsTyped: number;
    timeElapsed: number;
    isFinished: boolean;
    planIndex?: number;
    totalSteps?: number;
    isZenWaiting?: boolean;
  };
};

const TIME_PRESETS = [15, 30, 60, 120, 300];
const WORD_PRESETS = [10, 25, 50, 100, 200];
const MAX_PRESET_LENGTH = 10000;

function ActiveHostSession({ hostName }: { hostName: string }) {
  const sessionId = useSessionId();
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [settings, setSettings] = useState<Partial<SettingsState>>({
    mode: "time",
    duration: 30,
    wordTarget: 25,
    difficulty: "medium",
    punctuation: false,
    numbers: false,
    capitalization: false,
    quoteLength: "all",
    presetText: "",
    presetModeType: "finish",
    ghostWriterEnabled: false,
    ghostWriterSpeed: 60,
    soundEnabled: false,
    typingFontSize: 3.5,
    iconFontSize: typeof window !== "undefined" && window.innerWidth < 768 ? 0.8 : 1.25,
    helpFontSize: 1,
    textAlign: "left",
    theme: DEFAULT_THEME,
  });

  // Convex mutations
  const createRoom = useMutation(api.rooms.create);
  const updateRoomSettings = useMutation(api.rooms.updateSettings);
  const setRoomStatus = useMutation(api.rooms.setStatus);
  const kickParticipant = useMutation(api.participants.kick);
  const resetParticipant = useMutation(api.participants.resetStats);

  // Convex queries
  const room = useQuery(
    api.rooms.getByCode,
    roomCode ? { code: roomCode } : "skip"
  );
  const participants = useQuery(
    api.participants.listByRoom,
    room ? { roomId: room._id } : "skip"
  );

  // Convert Convex participants to User format
  const users: User[] = useMemo(() => {
    if (!participants) return [];
    return participants.map((p) => ({
      id: p._id,
      name: p.name,
      stats: {
        wpm: p.stats.wpm,
        accuracy: p.stats.accuracy,
        progress: p.stats.progress,
        wordsTyped: p.stats.wordsTyped,
        timeElapsed: p.stats.timeElapsed,
        isFinished: p.stats.isFinished,
      },
    }));
  }, [participants]);

  // View Options
  const [viewMode, setViewMode] = useState<"list" | "grid">("grid");
  const [sortBy, setSortBy] = useState<
    "join" | "wpm" | "accuracy" | "progress" | "name" | "custom"
  >("join");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [cardSize, setCardSize] = useState(
    typeof window !== "undefined" && window.innerWidth < 768 ? 0.8 : 1
  );
  const [customOrder, setCustomOrder] = useState<string[]>([]);

  // Modals
  const [showPresetInput, setShowPresetInput] = useState(false);
  const [showPlanBuilder, setShowPlanBuilder] = useState(false);
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [tempPresetText, setTempPresetText] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [selectedThemeName, setSelectedThemeName] = useState<string>("TypeSetGo");
  const [isCustomThemeExpanded, setIsCustomThemeExpanded] = useState(false);
  const [isThemeDropdownOpen, setIsThemeDropdownOpen] = useState(false);
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customValue, setCustomValue] = useState(0);
  const [customTime, setCustomTime] = useState({ h: 0, m: 0, s: 0 });

  const cardsContainerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Derived theme
  const theme = settings.theme || DEFAULT_THEME;

  // Theme presets - loaded dynamically
  const [themePresets, setThemePresets] = useState<ThemeDefinition[]>([]);

  // Sound manifest - loaded dynamically
  const [soundManifest, setSoundManifest] = useState<SoundManifest | null>(null);

  // Words manifest - loaded dynamically
  const [wordsManifest, setWordsManifest] = useState<WordsManifest | null>(null);

  // Quotes manifest - loaded dynamically
  const [quotesManifest, setQuotesManifest] = useState<QuotesManifest | null>(null);

  // Load themes on mount
  useEffect(() => {
    fetchAllThemes().then(setThemePresets);
  }, []);

  // Load sound manifest on mount
  useEffect(() => {
    fetchSoundManifest().then(setSoundManifest);
  }, []);

  // Load words manifest on mount
  useEffect(() => {
    fetchWordsManifest().then(setWordsManifest);
  }, []);

  // Load quotes manifest on mount
  useEffect(() => {
    fetchQuotesManifest().then(setQuotesManifest);
  }, []);

  // Fullscreen handler
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Create room on mount
  useEffect(() => {
    if (!sessionId || isCreating || roomCode) return;

    const initRoom = async () => {
      setIsCreating(true);
      try {
        const result = await createRoom({
          hostName,
          hostSessionId: sessionId,
        });
        setRoomCode(result.code);
      } catch (error) {
        console.error("Failed to create room:", error);
      }
      setIsCreating(false);
    };

    initRoom();
  }, [sessionId, hostName, createRoom, isCreating, roomCode]);

  const updateSettings = (newSettings: Partial<SettingsState>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    if (room) {
      updateRoomSettings({
        roomId: room._id,
        settings: {
          mode: updated.mode || "time",
          duration: updated.duration || 30,
          wordTarget: updated.wordTarget || 25,
          difficulty: updated.difficulty || "medium",
          punctuation: updated.punctuation || false,
          numbers: updated.numbers || false,
          capitalization: updated.capitalization || false,
          quoteLength: updated.quoteLength || "all",
          presetText: updated.presetText,
          presetModeType: updated.presetModeType,
          ghostWriterEnabled: updated.ghostWriterEnabled || false,
          ghostWriterSpeed: updated.ghostWriterSpeed || 60,
          soundEnabled: updated.soundEnabled || false,
          typingFontSize: updated.typingFontSize || 3.5,
          textAlign: updated.textAlign || "left",
          theme: updated.theme,
          plan: updated.plan,
          planIndex: updated.planIndex,
        },
      });
    }
  };

  const updateTheme = (newTheme: Partial<Theme>) => {
    const currentTheme = settings.theme || DEFAULT_THEME;
    const updatedTheme = { ...currentTheme, ...newTheme };
    updateSettings({ theme: updatedTheme });
  };

  const resetTheme = () => {
    updateSettings({ theme: DEFAULT_THEME });
  };

  const startTest = async () => {
    if (room) {
      await setRoomStatus({ roomId: room._id, status: "active" });
    }
  };

  const stopTest = async () => {
    if (room) {
      await setRoomStatus({ roomId: room._id, status: "waiting" });
    }
  };

  const resetTest = async () => {
    if (participants) {
      for (const p of participants) {
        await resetParticipant({ participantId: p._id });
      }
    }
    if (room) {
      await setRoomStatus({ roomId: room._id, status: "waiting" });
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const text = ev.target?.result as string;
        if (text.length > MAX_PRESET_LENGTH) {
          alert(`File content exceeds ${MAX_PRESET_LENGTH} characters.`);
          return;
        }
        setTempPresetText(text);
      };
      reader.readAsText(file);
    }
  };

  const kickUser = async (userId: string) => {
    if (confirm("Are you sure you want to kick this user?")) {
      await kickParticipant({ participantId: userId as Id<"participants"> });
    }
  };

  const resetUser = async (userId: string) => {
    if (confirm("Reset this user's progress?")) {
      await resetParticipant({ participantId: userId as Id<"participants"> });
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      cardsContainerRef.current?.requestFullscreen().catch((err) => {
        console.error(
          `Error attempting to enable full-screen mode: ${err.message} (${err.name})`
        );
      });
    } else {
      document.exitFullscreen();
    }
  };

  const sortedUsers = useMemo(() => {
    const sorted = [...users];
    const multiplier = sortDirection === "asc" ? 1 : -1;

    if (sortBy === "wpm") {
      sorted.sort(
        (a, b) => ((a.stats?.wpm || 0) - (b.stats?.wpm || 0)) * multiplier
      );
    } else if (sortBy === "accuracy") {
      sorted.sort(
        (a, b) =>
          ((a.stats?.accuracy || 0) - (b.stats?.accuracy || 0)) * multiplier
      );
    } else if (sortBy === "progress") {
      sorted.sort(
        (a, b) =>
          ((a.stats?.progress || 0) - (b.stats?.progress || 0)) * multiplier
      );
    } else if (sortBy === "name") {
      sorted.sort((a, b) => a.name.localeCompare(b.name) * multiplier);
    } else if (sortBy === "join") {
      if (sortDirection === "desc") {
        sorted.reverse();
      }
    } else if (sortBy === "custom") {
      sorted.sort((a, b) => {
        const indexA = customOrder.indexOf(a.id);
        const indexB = customOrder.indexOf(b.id);
        if (indexA === -1 && indexB === -1) return 0;
        if (indexA === -1) return 1;
        if (indexB === -1) return -1;
        return indexA - indexB;
      });
    }
    return sorted;
  }, [users, sortBy, customOrder, sortDirection]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const currentIds = sortedUsers.map((u) => u.id);

      setCustomOrder((prev) => {
        const baseOrder =
          sortBy === "custom" && prev.length > 0 ? prev : currentIds;
        const allUserIds = users.map((u) => u.id);
        const missingIds = allUserIds.filter((id) => !baseOrder.includes(id));
        const fullOrder = [...baseOrder, ...missingIds];

        const oldIndex = fullOrder.indexOf(active.id as string);
        const newIndex = fullOrder.indexOf(over.id as string);

        return arrayMove(fullOrder, oldIndex, newIndex);
      });

      setSortBy("custom");
    }
  };

  if (!sessionId) {
    return (
      <div
        className="min-h-[100dvh] flex items-center justify-center transition-colors duration-300"
        style={{
          backgroundColor: GLOBAL_COLORS.background,
          color: GLOBAL_COLORS.text.primary,
        }}
      >
        Loading...
      </div>
    );
  }

  if (!roomCode) {
    return (
      <div
        className="min-h-[100dvh] flex items-center justify-center transition-colors duration-300"
        style={{
          backgroundColor: GLOBAL_COLORS.background,
          color: GLOBAL_COLORS.text.primary,
        }}
      >
        Creating room...
      </div>
    );
  }

  return (
    <div
      className="min-h-[100dvh] p-8 font-mono flex flex-col transition-colors duration-300"
      style={{
        backgroundColor: theme.backgroundColor,
        color: GLOBAL_COLORS.text.primary,
      }}
    >
      {/* Header & Controls */}
      <div className="flex flex-col items-center mb-8 space-y-6">
        <div className="text-center">
          <h1
            className="text-3xl font-bold mb-2"
            style={{ color: theme.buttonSelected }}
          >
            Host Panel
          </h1>
          <div
            style={{ color: GLOBAL_COLORS.text.secondary }}
            className="flex items-center justify-center gap-2"
          >
            Room Code:
            <button
              onClick={() => setShowCodeModal(true)}
              className="text-2xl font-bold text-white bg-gray-700 px-3 py-1 rounded tracking-widest hover:bg-gray-600 transition hover:scale-105 active:scale-95"
              title="Click to expand"
            >
              {roomCode}
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4">
          <button
            onClick={resetTest}
            className="px-4 md:px-6 py-2 bg-gray-700 hover:bg-gray-600 rounded text-white transition font-medium text-sm md:text-base"
          >
            Reset
          </button>

          {settings.mode === "plan" ? (
            <>
              <button
                onClick={() =>
                  updateSettings({
                    planIndex: Math.max(0, (settings.planIndex || 0) - 1),
                  })
                }
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-white transition font-medium"
              >
                ← Prev
              </button>
              <div className="flex items-center px-4 bg-gray-800 rounded text-gray-300 font-mono">
                Step {(settings.planIndex || 0) + 1}
              </div>
              <button
                onClick={() =>
                  updateSettings({ planIndex: (settings.planIndex || 0) + 1 })
                }
                className="px-4 py-2 bg-sky-700 hover:bg-sky-600 rounded text-white transition font-medium"
              >
                Next →
              </button>
              {room?.status === "waiting" ? (
                <button
                  onClick={startTest}
                  className="px-4 py-2 bg-yellow-600 hover:bg-yellow-500 rounded text-white transition font-medium"
                >
                  Resume
                </button>
              ) : (
                <button
                  onClick={stopTest}
                  className="px-4 py-2 bg-yellow-700 hover:bg-yellow-600 rounded text-white transition font-medium"
                >
                  Pause
                </button>
              )}
              <button
                onClick={() => updateSettings({ mode: "time" })}
                className="px-4 py-2 bg-red-900/50 hover:bg-red-900/80 text-red-200 rounded transition font-medium"
              >
                Stop Plan
              </button>
            </>
          ) : room?.status === "waiting" ? (
            <button
              onClick={startTest}
              className="px-4 md:px-8 py-2 font-bold rounded transition shadow-lg text-sm md:text-base"
              style={{
                backgroundColor: theme.buttonSelected,
                color: theme.backgroundColor,
                boxShadow: `0 10px 15px -3px ${theme.buttonSelected}33`,
              }}
            >
              Start Test
            </button>
          ) : (
            <button
              onClick={stopTest}
              className="px-4 md:px-8 py-2 font-bold rounded transition shadow-lg text-white text-sm md:text-base"
              style={{
                backgroundColor: GLOBAL_COLORS.text.error,
                boxShadow: `0 10px 15px -3px ${GLOBAL_COLORS.text.error}33`,
              }}
            >
              Stop Test
            </button>
          )}
        </div>

        {/* Toolbar */}
        <div
          className="flex items-center gap-4 px-6 py-2 rounded-full shadow-lg overflow-x-auto max-w-[90vw] md:max-w-none scrollbar-hide"
          style={{
            fontSize: `${settings.iconFontSize || 1.25}rem`,
            backgroundColor: GLOBAL_COLORS.surface,
          }}
        >
          {/* Settings Button */}
          <button
            type="button"
            onClick={() => setShowSettings(true)}
            className="flex h-[1.5em] w-[1.5em] items-center justify-center rounded transition hover:opacity-75 hover:text-white"
            style={{ color: theme.buttonUnselected }}
            title="settings"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="1em"
              height="1em"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.78 1.35a2 2 0 0 0 .73 2.73l.15.08a2 2 0 0 1 1 1.73v.52a2 2 0 0 1-1 1.73l-.15.08a2 2 0 0 0-.73 2.73l.78 1.35a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.78-1.35a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.73v-.52a2 2 0 0 1 1-1.73l.15-.08a2 2 0 0 0 .73-2.73l-.78-1.35a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </button>

          {/* Theme Button */}
          <button
            type="button"
            onClick={() => setShowThemeModal(true)}
            className="flex h-[1.5em] w-[1.5em] items-center justify-center rounded transition hover:opacity-75 hover:text-white"
            style={{ color: theme.buttonUnselected }}
            title="customize theme"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="1em"
              height="1em"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle
                cx="13.5"
                cy="6.5"
                r=".5"
                fill="currentColor"
                stroke="none"
              />
              <circle
                cx="17.5"
                cy="10.5"
                r=".5"
                fill="currentColor"
                stroke="none"
              />
              <circle
                cx="8.5"
                cy="7.5"
                r=".5"
                fill="currentColor"
                stroke="none"
              />
              <circle
                cx="6.5"
                cy="12.5"
                r=".5"
                fill="currentColor"
                stroke="none"
              />
              <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z" />
            </svg>
          </button>

          <div className="w-px h-4 bg-gray-600"></div>

          {/* Sound Toggle */}
          <SoundController
            settings={settings}
            onUpdateSettings={updateSettings}
            soundManifest={soundManifest}
            theme={theme}
          />

          {/* Ghost Toggle */}
          <button
            type="button"
            onClick={() =>
              updateSettings({
                ghostWriterEnabled: !settings.ghostWriterEnabled,
              })
            }
            className="flex h-[1.5em] w-[1.5em] items-center justify-center rounded transition hover:opacity-75 hover:text-white"
            style={{
              color: settings.ghostWriterEnabled
                ? theme.buttonSelected
                : theme.buttonUnselected,
            }}
            title="toggle ghost writer"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="1em"
              height="1em"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 10h.01" />
              <path d="M15 10h.01" />
              <path d="M12 2a8 8 0 0 0-8 8v12l3-3 2.5 2.5L12 19l2.5 2.5L17 19l3 3V10a8 8 0 0 0-8-8z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Settings Bar */}
      <div className="flex justify-center mb-8">
        <div className="flex flex-col items-center gap-4">
          {/* Top Row: Modes */}
          <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-gray-400">
            <div
              className="flex rounded-lg p-1"
              style={{ backgroundColor: GLOBAL_COLORS.surface }}
            >
              {(
                ["time", "words", "quote", "zen", "preset", "plan"] as Mode[]
              ).map((m) => (
                <button
                  key={m}
                  onClick={() => {
                    if (m === "plan") {
                      setShowPlanBuilder(true);
                      return;
                    }
                    if (settings.mode === m && m === "preset") {
                      setShowPresetInput(true);
                    } else {
                      updateSettings({ mode: m });
                    }
                  }}
                  className={`px-3 py-1 rounded transition ${settings.mode === m ? "font-medium bg-gray-800" : "hover:text-gray-200"}`}
                  style={{
                    color: settings.mode === m ? theme.buttonSelected : undefined,
                  }}
                >
                  {m}
                </button>
              ))}
            </div>

            <div className="w-px h-4 bg-gray-700"></div>

            {/* Toggles */}
            {settings.mode !== "preset" && (
              <div
                className="flex gap-4 rounded-lg px-3 py-1.5"
                style={{ backgroundColor: GLOBAL_COLORS.surface }}
              >
                <button
                  onClick={() => updateSettings({ capitalization: !settings.capitalization })}
                  className={`flex items-center gap-2 transition ${settings.capitalization ? "" : "hover:text-gray-200"}`}
                  style={{
                    color: settings.capitalization ? theme.buttonSelected : undefined,
                  }}
                >
                  <span
                    className={`rounded px-1 text-xs ${settings.capitalization ? "text-gray-900 font-bold" : "bg-gray-700"}`}
                    style={{
                      backgroundColor: settings.capitalization
                        ? theme.buttonSelected
                        : undefined,
                    }}
                  >
                    Aa
                  </span>
                  Caps
                </button>
                <button
                  onClick={() =>
                    updateSettings({ punctuation: !settings.punctuation })
                  }
                  className={`flex items-center gap-2 transition ${settings.punctuation ? "" : "hover:text-gray-200"}`}
                  style={{
                    color: settings.punctuation
                      ? theme.buttonSelected
                      : undefined,
                  }}
                >
                  <span
                    className={`rounded px-1 text-xs ${settings.punctuation ? "text-gray-900 font-bold" : "bg-gray-700"}`}
                    style={{
                      backgroundColor: settings.punctuation
                        ? theme.buttonSelected
                        : undefined,
                    }}
                  >
                    @
                  </span>
                  Punctuation
                </button>
                <button
                  onClick={() => updateSettings({ numbers: !settings.numbers })}
                  className={`flex items-center gap-2 transition ${settings.numbers ? "" : "hover:text-gray-200"}`}
                  style={{
                    color: settings.numbers ? theme.buttonSelected : undefined,
                  }}
                >
                  <span
                    className={`rounded px-1 text-xs ${settings.numbers ? "text-gray-900 font-bold" : "bg-gray-700"}`}
                    style={{
                      backgroundColor: settings.numbers
                        ? theme.buttonSelected
                        : undefined,
                    }}
                  >
                    #
                  </span>
                  Numbers
                </button>
              </div>
            )}
          </div>

          {/* Bottom Row: Sub-settings */}
          <div className="flex flex-wrap items-center justify-center gap-2 text-sm text-gray-400">
            {/* Time/Word Presets */}
            {(settings.mode === "time" ||
              (settings.mode === "preset" &&
                settings.presetModeType === "time")) && (
              <div
                className="flex rounded-lg p-1"
                style={{ backgroundColor: GLOBAL_COLORS.surface }}
              >
                {TIME_PRESETS.map((d) => (
                  <button
                    key={d}
                    onClick={() => updateSettings({ duration: d })}
                    className={`px-3 py-1 rounded transition ${settings.duration === d ? "font-medium bg-gray-800" : "hover:text-gray-200"}`}
                    style={{
                      color:
                        settings.duration === d
                          ? theme.buttonSelected
                          : undefined,
                    }}
                  >
                    {d}
                  </button>
                ))}
                <button
                  onClick={() => {
                    const d = settings.duration || 0;
                    setCustomTime({
                      h: Math.floor(d / 3600),
                      m: Math.floor((d % 3600) / 60),
                      s: d % 60,
                    });
                    setShowCustomModal(true);
                  }}
                  className={`px-3 py-1 rounded transition ${!TIME_PRESETS.includes(settings.duration || 0) ? "font-medium bg-gray-800" : "hover:text-gray-200"}`}
                  style={{
                    color: !TIME_PRESETS.includes(settings.duration || 0)
                      ? theme.buttonSelected
                      : undefined,
                  }}
                >
                  #
                </button>
              </div>
            )}

            {settings.mode === "words" && (
              <div
                className="flex rounded-lg p-1"
                style={{ backgroundColor: GLOBAL_COLORS.surface }}
              >
                {WORD_PRESETS.map((w) => (
                  <button
                    key={w}
                    onClick={() => updateSettings({ wordTarget: w })}
                    className={`px-3 py-1 rounded transition ${settings.wordTarget === w ? "font-medium bg-gray-800" : "hover:text-gray-200"}`}
                    style={{
                      color:
                        settings.wordTarget === w
                          ? theme.buttonSelected
                          : undefined,
                    }}
                  >
                    {w}
                  </button>
                ))}
                <button
                  onClick={() => {
                    setCustomValue(settings.wordTarget || 0);
                    setShowCustomModal(true);
                  }}
                  className={`px-3 py-1 rounded transition ${!WORD_PRESETS.includes(settings.wordTarget || 0) ? "font-medium bg-gray-800" : "hover:text-gray-200"}`}
                  style={{
                    color: !WORD_PRESETS.includes(settings.wordTarget || 0)
                      ? theme.buttonSelected
                      : undefined,
                  }}
                >
                  #
                </button>
              </div>
            )}

            {settings.mode === "quote" && (
              <div
                className="flex rounded-lg p-1"
                style={{ backgroundColor: GLOBAL_COLORS.surface }}
              >
                {quotesManifest && ["all", ...quotesManifest.lengths].map(
                  (l) => (
                    <button
                      key={l}
                      onClick={() => updateSettings({ quoteLength: l as QuoteLength })}
                      className={`px-3 py-1 rounded transition ${settings.quoteLength === l ? "font-medium bg-gray-800" : "hover:text-gray-200"}`}
                      style={{
                        color:
                          settings.quoteLength === l
                            ? theme.buttonSelected
                            : undefined,
                      }}
                    >
                      {l}
                    </button>
                  )
                )}
              </div>
            )}

            {/* Difficulty */}
            {settings.mode !== "quote" &&
              settings.mode !== "zen" &&
              settings.mode !== "preset" &&
              wordsManifest && (
                <div
                  className="flex rounded-lg p-1 ml-2"
                  style={{ backgroundColor: GLOBAL_COLORS.surface }}
                >
                  {wordsManifest.difficulties.map((d) => (
                    <button
                      key={d}
                      onClick={() => updateSettings({ difficulty: d as Difficulty })}
                      className={`px-3 py-1 rounded transition ${settings.difficulty === d ? "font-medium bg-gray-800" : "hover:text-gray-200"}`}
                      style={{
                        color:
                          settings.difficulty === d
                            ? theme.buttonSelected
                            : undefined,
                      }}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              )}

            {/* Preset Type */}
            {settings.mode === "preset" && (
              <div
                className="flex rounded-lg p-1"
                style={{ backgroundColor: GLOBAL_COLORS.surface }}
              >
                {(["finish", "time"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => updateSettings({ presetModeType: t })}
                    className={`px-3 py-1 rounded transition ${settings.presetModeType === t ? "font-medium bg-gray-800" : "hover:text-gray-200"}`}
                    style={{
                      color:
                        settings.presetModeType === t
                          ? theme.buttonSelected
                          : undefined,
                    }}
                  >
                    {t}
                  </button>
                ))}
              </div>
            )}

            {/* Edit Preset Button */}
            {settings.mode === "preset" && (
              <button
                onClick={() => setShowPresetInput(true)}
                className="ml-2 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-gray-200 transition flex items-center gap-2"
              >
                <span>✎</span> Edit Text
              </button>
            )}
          </div>

          {/* View Options */}
          <div
            className="flex items-center gap-6 text-sm px-6 py-2 rounded-full shadow-lg mt-2"
            style={{ backgroundColor: GLOBAL_COLORS.surface }}
          >
            <div className="flex items-center gap-2">
              <span className="text-gray-500">Sort:</span>
              <div className="flex bg-gray-800 rounded p-1">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                  className="bg-transparent border-none text-gray-200 cursor-pointer focus:outline-none text-sm appearance-none pr-6 pl-2 relative z-10"
                >
                  <option value="join">Joined</option>
                  <option value="wpm">WPM</option>
                  <option value="accuracy">Accuracy</option>
                  <option value="progress">Progress</option>
                  <option value="name">Name</option>
                  <option value="custom">Custom</option>
                </select>
                <button
                  onClick={() =>
                    setSortDirection((prev) =>
                      prev === "asc" ? "desc" : "asc"
                    )
                  }
                  disabled={sortBy === "custom"}
                  className={`px-2 hover:bg-gray-700 rounded transition ${sortBy === "custom" ? "opacity-30 cursor-not-allowed" : "cursor-pointer"}`}
                  title={sortDirection === "asc" ? "Ascending" : "Descending"}
                >
                  {sortDirection === "asc" ? "↑" : "↓"}
                </button>
              </div>
            </div>

            <div className="w-px h-4 bg-gray-600"></div>

            <div className="flex items-center gap-2">
              <span className="text-gray-500">View:</span>
              <div className="flex bg-gray-800 rounded p-1">
                <button
                  onClick={() => setViewMode("grid")}
                  className={`px-2 py-0.5 rounded ${viewMode === "grid" ? "bg-gray-600 text-white" : "text-gray-400 hover:text-gray-200"}`}
                >
                  Grid
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`px-2 py-0.5 rounded ${viewMode === "list" ? "bg-gray-600 text-white" : "text-gray-400 hover:text-gray-200"}`}
                >
                  List
                </button>
              </div>
            </div>

            {viewMode === "grid" && (
              <>
                <div className="w-px h-4 bg-gray-600"></div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-500">Size:</span>
                  <input
                    type="range"
                    min="0.5"
                    max="2"
                    step="0.1"
                    value={cardSize}
                    onChange={(e) => setCardSize(parseFloat(e.target.value))}
                    className="w-24"
                    style={{ accentColor: theme.buttonSelected }}
                  />
                </div>
              </>
            )}

            <div className="w-px h-4 bg-gray-600"></div>

            <button
              onClick={toggleFullscreen}
              className="flex items-center justify-center text-gray-400 hover:text-white transition"
              title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
            >
              {isFullscreen ? (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="1.2em"
                  height="1.2em"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
                </svg>
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="1.2em"
                  height="1.2em"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Connected Users Area */}
      <div
        ref={cardsContainerRef}
        className={`flex-1 overflow-y-auto p-4 rounded-xl ${users.length === 0 ? "flex items-center justify-center" : ""} ${isFullscreen ? "p-8" : ""}`}
        style={{
          backgroundColor: isFullscreen
            ? theme.backgroundColor
            : "rgba(0,0,0,0.2)",
          color: GLOBAL_COLORS.text.primary,
        }}
      >
        {users.length === 0 ? (
          <div
            className="text-center"
            style={{ color: GLOBAL_COLORS.text.secondary }}
          >
            <div className="text-xl mb-2">Waiting for users to join...</div>
            <button
              onClick={() => {
                const link = `${window.location.origin}/connect/join?code=${roomCode}`;
                navigator.clipboard.writeText(link);
              }}
              className="hover:opacity-80 transition-opacity cursor-pointer"
              title="Click to copy direct link"
            >
              Share code{" "}
              <span
                className="font-bold"
                style={{ color: theme.buttonSelected }}
              >
                {roomCode}
              </span>
            </button>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={sortedUsers.map((u) => u.id)}
              strategy={
                viewMode === "grid"
                  ? rectSortingStrategy
                  : verticalListSortingStrategy
              }
            >
              <div
                className={
                  viewMode === "grid"
                    ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 content-start"
                    : "flex flex-col gap-2"
                }
                style={
                  viewMode === "grid"
                    ? {
                        gridTemplateColumns: `repeat(auto-fill, minmax(${300 * cardSize}px, 1fr))`,
                      }
                    : {}
                }
              >
                {sortedUsers.map((user) => (
                  <UserHostCard
                    key={user.id}
                    user={user}
                    settings={settings}
                    viewMode={viewMode}
                    theme={theme}
                    cardSize={cardSize}
                    onKick={kickUser}
                    onReset={resetUser}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>

      {/* Full Screen Code Modal */}
      {showCodeModal && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 cursor-pointer backdrop-blur-sm"
          onClick={() => setShowCodeModal(false)}
        >
          <div className="text-center w-full">
            <div className="text-4xl md:text-6xl font-bold text-gray-500 mb-8 md:mb-16 tracking-widest uppercase">
              Join Code
            </div>
            <div
              className="text-[20vw] font-black tracking-widest leading-none select-text transition-colors duration-300"
              style={{
                color: theme.buttonSelected,
                textShadow: `0 0 100px ${theme.buttonSelected}33`,
              }}
              onClick={(e) => {
                e.stopPropagation();
                navigator.clipboard.writeText(roomCode || "");
              }}
              title="Click to copy"
            >
              {roomCode}
            </div>
            <div className="mt-16 text-xl md:text-2xl text-gray-600 font-medium">
              Click anywhere to close
            </div>
          </div>
        </div>
      )}

      {/* Plan Builder Modal */}
      {showPlanBuilder && (
        <PlanBuilderModal
          initialPlan={settings.plan as Plan | undefined}
          onSave={(newPlan) => {
            updateSettings({ mode: "plan", plan: newPlan });
            setShowPlanBuilder(false);
          }}
          onClose={() => setShowPlanBuilder(false)}
          isConnectMode={true}
        />
      )}

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
                  value={settings.typingFontSize || 3.5}
                  onChange={(e) =>
                    updateSettings({
                      typingFontSize: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-full rounded bg-gray-700 px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-2"
                  style={
                    { "--tw-ring-color": theme.buttonSelected } as React.CSSProperties
                  }
                />
              </div>

              {/* Text Alignment */}
              <div>
                <label className="mb-2 block text-xs text-gray-400">
                  Text Alignment
                </label>
                <div className="flex gap-2">
                  {(["left", "center", "right", "justify"] as const).map(
                    (align) => (
                      <button
                        key={align}
                        onClick={() => updateSettings({ textAlign: align })}
                        className={`rounded px-3 py-1 text-sm capitalize transition ${
                          settings.textAlign === align
                            ? "font-medium bg-gray-800"
                            : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                        }`}
                        style={{
                          color:
                            settings.textAlign === align
                              ? theme.buttonSelected
                              : undefined,
                        }}
                      >
                        {align}
                      </button>
                    )
                  )}
                </div>
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
                  value={settings.ghostWriterSpeed || 60}
                  onChange={(e) =>
                    updateSettings({
                      ghostWriterSpeed: parseInt(e.target.value) || 0,
                    })
                  }
                  className="w-full rounded bg-gray-700 px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-2"
                  style={
                    { "--tw-ring-color": theme.buttonSelected } as React.CSSProperties
                  }
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
          onClick={() => {
            setShowThemeModal(false);
            setIsThemeDropdownOpen(false);
          }}
        >
          <div
            className="w-full max-w-md max-h-[80vh] overflow-y-auto rounded-lg p-6 shadow-xl mx-4 md:mx-0"
            style={{ backgroundColor: GLOBAL_COLORS.surface }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-200">
                Theme Presets
              </h2>
              <button
                type="button"
                onClick={() => {
                  setShowThemeModal(false);
                  setIsThemeDropdownOpen(false);
                }}
                className="text-gray-400 hover:text-gray-200"
              >
                ✕
              </button>
            </div>

            {/* Theme Presets Collapsible Section */}
            <div className="mb-4 border border-gray-600 rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={() => setIsThemeDropdownOpen(!isThemeDropdownOpen)}
                className="w-full flex items-center justify-between px-4 py-3 bg-gray-700 hover:bg-gray-600 transition-colors"
              >
                <span className="text-sm font-medium text-gray-200">
                  {selectedThemeName}
                </span>
                <svg
                  className={`w-5 h-5 text-gray-400 transition-transform ${isThemeDropdownOpen ? "rotate-180" : ""}`}
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
                  isThemeDropdownOpen
                    ? "max-h-[240px] opacity-100"
                    : "max-h-0 opacity-0"
                }`}
              >
                <div className="overflow-y-auto max-h-[240px] bg-gray-800/50">
                  {themePresets.map((preset) => (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => {
                        // Convert ThemeDefinition to legacy Theme format for settings
                        const legacyTheme = {
                          cursor: preset.dark.typing.cursor,
                          defaultText: preset.dark.typing.default,
                          upcomingText: preset.dark.typing.upcoming,
                          correctText: preset.dark.typing.correct,
                          incorrectText: preset.dark.typing.incorrect,
                          buttonUnselected: preset.dark.interactive.primary.DEFAULT,
                          buttonSelected: preset.dark.interactive.secondary.DEFAULT,
                          backgroundColor: preset.dark.bg.base,
                          surfaceColor: preset.dark.bg.surface,
                          ghostCursor: preset.dark.typing.cursorGhost,
                        };
                        updateSettings({ theme: legacyTheme });
                        setSelectedThemeName(preset.name);
                        setIsCustomThemeExpanded(false);
                      }}
                      className={`w-full flex items-center justify-between px-4 py-3 hover:bg-gray-700 transition-colors border-b border-gray-700 last:border-b-0 ${
                        selectedThemeName === preset.name ? "bg-gray-700" : ""
                      }`}
                    >
                      <span className="text-sm text-gray-200">
                        {preset.name}
                      </span>
                      <div className="flex items-center gap-1">
                        <div
                          className="w-4 h-4 rounded border border-gray-500"
                          style={{ backgroundColor: preset.dark.bg.base }}
                          title="Background"
                        />
                        <div
                          className="w-4 h-4 rounded border border-gray-500"
                          style={{ backgroundColor: preset.dark.typing.cursor }}
                          title="Cursor"
                        />
                        <div
                          className="w-4 h-4 rounded border border-gray-500"
                          style={{ backgroundColor: preset.dark.typing.default }}
                          title="Default Text"
                        />
                        <div
                          className="w-4 h-4 rounded border border-gray-500"
                          style={{ backgroundColor: preset.dark.typing.correct }}
                          title="Correct Text"
                        />
                        <div
                          className="w-4 h-4 rounded border border-gray-500"
                          style={{ backgroundColor: preset.dark.typing.incorrect }}
                          title="Incorrect Text"
                        />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Custom Theme Collapsible Section */}
            <div className="border border-gray-600 rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={() => setIsCustomThemeExpanded(!isCustomThemeExpanded)}
                className="w-full flex items-center justify-between px-4 py-3 bg-gray-700 hover:bg-gray-600 transition-colors"
              >
                <span className="text-sm font-medium text-gray-200">
                  Custom Theme
                </span>
                <svg
                  className={`w-5 h-5 text-gray-400 transition-transform ${isCustomThemeExpanded ? "rotate-180" : ""}`}
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
                  isCustomThemeExpanded
                    ? "max-h-[600px] opacity-100"
                    : "max-h-0 opacity-0"
                }`}
              >
                <div className="p-4 space-y-4 bg-gray-800/50">
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
                        <ColorPicker
                          value={(theme as Record<string, string>)[key]}
                          onChange={(hex) => {
                            updateTheme({ [key]: hex });
                            setSelectedThemeName("Custom");
                          }}
                          className="cursor-pointer"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            updateTheme({
                              [key]: (DEFAULT_THEME as Record<string, string>)[key],
                            })
                          }
                          className="text-xs text-gray-500 hover:text-gray-300"
                          title="Reset to default"
                        >
                          Reset
                        </button>
                      </div>
                    </div>
                  ))}

                  <div className="pt-4 flex justify-end border-t border-gray-600">
                    <button
                      type="button"
                      onClick={() => {
                        resetTheme();
                        setSelectedThemeName("TypeSetGo");
                      }}
                      className="text-sm text-red-400 hover:text-red-300"
                    >
                      Reset All Defaults
                    </button>
                  </div>
                </div>
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
              {settings.mode === "time" ? (
                <div className="flex items-center gap-4">
                  {/* Hours */}
                  <div className="flex flex-col items-center gap-1">
                    <label className="text-xs text-gray-400">HH</label>
                    <input
                      type="number"
                      min="0"
                      value={customTime.h}
                      onChange={(e) =>
                        setCustomTime((prev) => ({
                          ...prev,
                          h: Math.max(0, parseInt(e.target.value) || 0),
                        }))
                      }
                      className="w-16 text-center text-2xl font-bold bg-transparent border-b-2 focus:outline-none"
                      style={{
                        borderColor: theme.buttonSelected,
                        color: theme.buttonSelected,
                      }}
                    />
                  </div>
                  <span className="text-2xl font-bold text-gray-600">:</span>
                  {/* Minutes */}
                  <div className="flex flex-col items-center gap-1">
                    <label className="text-xs text-gray-400">MM</label>
                    <input
                      type="number"
                      min="0"
                      max="59"
                      value={customTime.m}
                      onChange={(e) =>
                        setCustomTime((prev) => ({
                          ...prev,
                          m: Math.max(0, parseInt(e.target.value) || 0),
                        }))
                      }
                      className="w-16 text-center text-2xl font-bold bg-transparent border-b-2 focus:outline-none"
                      style={{
                        borderColor: theme.buttonSelected,
                        color: theme.buttonSelected,
                      }}
                    />
                  </div>
                  <span className="text-2xl font-bold text-gray-600">:</span>
                  {/* Seconds */}
                  <div className="flex flex-col items-center gap-1">
                    <label className="text-xs text-gray-400">SS</label>
                    <input
                      type="number"
                      min="0"
                      max="59"
                      value={customTime.s}
                      onChange={(e) =>
                        setCustomTime((prev) => ({
                          ...prev,
                          s: Math.max(0, parseInt(e.target.value) || 0),
                        }))
                      }
                      className="w-16 text-center text-2xl font-bold bg-transparent border-b-2 focus:outline-none"
                      style={{
                        borderColor: theme.buttonSelected,
                        color: theme.buttonSelected,
                      }}
                    />
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-4">
                  {/* Decrement Buttons */}
                  <div className="flex flex-col gap-1">
                    <button
                      type="button"
                      onClick={() => setCustomValue((v) => Math.max(0, v - 10))}
                      className="px-2 py-1 bg-gray-700 rounded hover:bg-gray-600 text-xs text-gray-300"
                    >
                      ---
                    </button>
                    <button
                      type="button"
                      onClick={() => setCustomValue((v) => Math.max(0, v - 5))}
                      className="px-2 py-1 bg-gray-700 rounded hover:bg-gray-600 text-xs text-gray-300"
                    >
                      --
                    </button>
                    <button
                      type="button"
                      onClick={() => setCustomValue((v) => Math.max(0, v - 1))}
                      className="px-2 py-1 bg-gray-700 rounded hover:bg-gray-600 text-xs text-gray-300"
                    >
                      -
                    </button>
                  </div>

                  {/* Input */}
                  <input
                    type="number"
                    value={customValue}
                    onChange={(e) =>
                      setCustomValue(Math.max(0, parseInt(e.target.value) || 0))
                    }
                    className="w-24 text-center text-3xl font-bold bg-transparent border-b-2 focus:outline-none"
                    style={{
                      borderColor: theme.buttonSelected,
                      color: theme.buttonSelected,
                    }}
                  />

                  {/* Increment Buttons */}
                  <div className="flex flex-col gap-1">
                    <button
                      type="button"
                      onClick={() => setCustomValue((v) => v + 10)}
                      className="px-2 py-1 bg-gray-700 rounded hover:bg-gray-600 text-xs text-gray-300"
                    >
                      +++
                    </button>
                    <button
                      type="button"
                      onClick={() => setCustomValue((v) => v + 5)}
                      className="px-2 py-1 bg-gray-700 rounded hover:bg-gray-600 text-xs text-gray-300"
                    >
                      ++
                    </button>
                    <button
                      type="button"
                      onClick={() => setCustomValue((v) => v + 1)}
                      className="px-2 py-1 bg-gray-700 rounded hover:bg-gray-600 text-xs text-gray-300"
                    >
                      +
                    </button>
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={() => {
                  if (settings.mode === "time") {
                    const totalSeconds =
                      customTime.h * 3600 + customTime.m * 60 + customTime.s;
                    updateSettings({ duration: totalSeconds });
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

      {/* Preset Input Modal */}
      {showPresetInput && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={() => setShowPresetInput(false)}
        >
          <div
            className="w-full max-w-2xl rounded-lg p-6 shadow-xl border border-gray-700 mx-4 md:mx-0"
            style={{ backgroundColor: GLOBAL_COLORS.surface }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-200">
                Custom Text
              </h2>
              <button
                onClick={() => setShowPresetInput(false)}
                className="text-gray-400 hover:text-gray-200"
              >
                ✕
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <textarea
                  className="w-full h-48 rounded bg-gray-700 p-4 text-gray-200 focus:outline-none focus:ring-2 font-mono text-sm"
                  style={
                    { "--tw-ring-color": theme.buttonSelected } as React.CSSProperties
                  }
                  placeholder="Paste your text here..."
                  onChange={(e) => setTempPresetText(e.target.value)}
                  value={tempPresetText}
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
                  className="block w-full text-sm text-gray-400 file:mr-4 file:rounded file:border-0 file:bg-gray-700 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-gray-200 hover:file:bg-gray-600 cursor-pointer"
                />
              </div>

              <div className="flex justify-end pt-4">
                <button
                  onClick={() => {
                    if (tempPresetText) {
                      if (tempPresetText.length > MAX_PRESET_LENGTH) {
                        alert(`Text exceeds ${MAX_PRESET_LENGTH} characters.`);
                        return;
                      }
                      updateSettings({ presetText: tempPresetText.trim() });
                      setShowPresetInput(false);
                    }
                  }}
                  disabled={!tempPresetText}
                  className={`px-6 py-2 rounded font-medium transition ${
                    tempPresetText
                      ? "text-gray-900 hover:opacity-90 shadow-lg"
                      : "bg-gray-700 text-gray-500 cursor-not-allowed"
                  }`}
                  style={{
                    backgroundColor: tempPresetText
                      ? theme.buttonSelected
                      : undefined,
                    boxShadow: tempPresetText
                      ? `0 10px 15px -3px ${theme.buttonSelected}33`
                      : undefined,
                  }}
                >
                  Set Text
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="text-center pt-6 text-xs text-gray-600">
        <Link to="/" className="hover:text-gray-400 transition">
          ← Back to Main Menu
        </Link>
      </div>
    </div>
  );
}

export default function Host() {
  const [searchParams] = useSearchParams();
  const nameParam = searchParams.get("name");

  if (!nameParam) {
    return (
      <div
        className="min-h-[100dvh] flex items-center justify-center font-mono px-4 transition-colors duration-300"
        style={{
          backgroundColor: GLOBAL_COLORS.background,
          color: GLOBAL_COLORS.text.primary,
        }}
      >
        <div className="w-full max-w-md animate-fade-in">
          <div className="text-center mb-8">
            <Link
              to="/connect"
              className="text-sm hover:text-white mb-4 inline-block"
              style={{ color: GLOBAL_COLORS.text.secondary }}
            >
              ← Back
            </Link>
          </div>
          <HostCard />
        </div>
      </div>
    );
  }

  return <ActiveHostSession hostName={nameParam} />;
}
