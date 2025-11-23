"use client";

import { useEffect, useState, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { io, Socket } from "socket.io-client";
import Link from "next/link";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { SettingsState, Mode, Difficulty, QuoteLength, Theme, DEFAULT_THEME } from "@/components/TypingPractice";
import { GLOBAL_COLORS } from "@/lib/colors";
import HostCard from "@/components/connect/HostCard";
import UserHostCard from "@/components/connect/UserHostCard";

let socket: Socket;

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
  };
};

const TIME_PRESETS = [15, 30, 60, 120, 300];
const WORD_PRESETS = [10, 25, 50, 100, 200];


const MAX_PRESET_LENGTH = 10000;

function ActiveHostSession({ hostName }: { hostName: string }) {
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [settings, setSettings] = useState<Partial<SettingsState>>({
    mode: "time",
    duration: 30,
    wordTarget: 25,
    difficulty: "medium",
    punctuation: false,
    numbers: false,
    quoteLength: "all",
    presetText: "",
    presetModeType: "finish",
    ghostWriterEnabled: false,
    ghostWriterSpeed: 60,
    soundEnabled: false,
    typingFontSize: 3.5,
    iconFontSize: 1.25,
    helpFontSize: 1,
    textAlign: "left",
    theme: DEFAULT_THEME
  });
  const [status, setStatus] = useState<"waiting" | "active">("waiting");

  // View Options
  const [viewMode, setViewMode] = useState<"list" | "grid">("grid");
  const [sortBy, setSortBy] = useState<"join" | "wpm" | "accuracy" | "progress" | "name" | "custom">("join");
  const [cardSize, setCardSize] = useState(1); // 0.5 to 2
  const [customOrder, setCustomOrder] = useState<string[]>([]);
  
  // Mobile check
  useEffect(() => {
    if (window.innerWidth < 768) {
        setSettings(prev => ({
            ...prev,
            iconFontSize: 0.8
        }));
        setCardSize(0.8);
    }
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const [showPresetInput, setShowPresetInput] = useState(false);
  const [tempPresetText, setTempPresetText] = useState("");
  
  const [showSettings, setShowSettings] = useState(false);
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customValue, setCustomValue] = useState(0);

  // Derived theme for UI usage (defaulting if missing)
  const theme = settings.theme || DEFAULT_THEME;

  const createRoom = () => {
      socket.emit("create_room", { name: hostName }, ({ code }: { code: string }) => {
        setRoomCode(code);
        localStorage.setItem("hostRoomCode", code);
      });
  };

  useEffect(() => {
    // Connect to socket
    socket = io();

    socket.on("connect", () => {
      console.log("Connected to server");
      const savedCode = localStorage.getItem("hostRoomCode");
      
      if (savedCode) {
          socket.emit("claim_host", { code: savedCode }, (response: any) => {
              if (response.success) {
                  console.log("Reconnected to room", savedCode);
                  setRoomCode(savedCode);
                  setUsers(response.users || []);
                  setSettings(prev => ({ ...prev, ...response.settings }));
                  setStatus(response.status);
              } else {
                  console.log("Failed to claim room, creating new one");
                  localStorage.removeItem("hostRoomCode");
                  createRoom();
              }
          });
      } else {
          createRoom();
      }
    });

    socket.on("user_joined", (user: User) => {
      setUsers((prev) => [...prev, user]);
    });

    socket.on("user_left", ({ userId }: { userId: string }) => {
      setUsers((prev) => prev.filter((u) => u.id !== userId));
    });

    socket.on("stats_update", ({ userId, stats }: { userId: string; stats: any }) => {
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, stats } : u))
      );
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const updateSettings = (newSettings: Partial<SettingsState>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    if (roomCode) {
      socket.emit("update_settings", { code: roomCode, settings: updated });
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

  const startTest = () => {
    if (roomCode) {
      socket.emit("start_test", { code: roomCode });
      setStatus("active");
    }
  };

  const stopTest = () => {
    if (roomCode) {
      socket.emit("stop_test", { code: roomCode });
      setStatus("waiting");
    }
  };

  const resetTest = () => {
      if (roomCode) {
          socket.emit("reset_test", { code: roomCode });
          setStatus("waiting");
          setUsers(prev => prev.map(u => ({ 
            ...u, 
            stats: { wpm: 0, accuracy: 0, progress: 0, wordsTyped: 0, timeElapsed: 0, isFinished: false } 
          })));
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

  const kickUser = (userId: string) => {
      if (confirm("Are you sure you want to kick this user?")) {
          socket.emit("kick_user", { code: roomCode, userId });
      }
  };

  const resetUser = (userId: string) => {
      if (confirm("Reset this user's progress?")) {
          socket.emit("reset_user", { code: roomCode, userId });
      }
  };

  const sortedUsers = useMemo(() => {
      let sorted = [...users];
      if (sortBy === "wpm") sorted.sort((a, b) => (b.stats?.wpm || 0) - (a.stats?.wpm || 0));
      else if (sortBy === "accuracy") sorted.sort((a, b) => (b.stats?.accuracy || 0) - (a.stats?.accuracy || 0));
      else if (sortBy === "progress") sorted.sort((a, b) => (b.stats?.progress || 0) - (a.stats?.progress || 0));
      else if (sortBy === "name") sorted.sort((a, b) => a.name.localeCompare(b.name));
      else if (sortBy === "custom") {
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
  }, [users, sortBy, customOrder]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      // If we weren't in custom mode, we initialize the order from the current view
      const currentIds = sortedUsers.map(u => u.id);
      
      setCustomOrder((prev) => {
        // If prev is empty or we weren't in custom mode, use current sorted list as base
        const baseOrder = sortBy === "custom" && prev.length > 0 ? prev : currentIds;
        
        // Ensure all current users are in the base order (handle new joins)
        const allUserIds = users.map(u => u.id);
        const missingIds = allUserIds.filter(id => !baseOrder.includes(id));
        const fullOrder = [...baseOrder, ...missingIds];

        const oldIndex = fullOrder.indexOf(active.id as string);
        const newIndex = fullOrder.indexOf(over.id as string);

        return arrayMove(fullOrder, oldIndex, newIndex);
      });
      
      setSortBy("custom");
    }
  };

  if (!roomCode) {
    return (
      <div 
        className="min-h-[100dvh] flex items-center justify-center transition-colors duration-300"
        style={{ backgroundColor: GLOBAL_COLORS.background, color: GLOBAL_COLORS.text.primary }}
      >
        Creating room...
      </div>
    );
  }

  return (
    <div 
        className="min-h-[100dvh] p-8 font-mono flex flex-col transition-colors duration-300"
        style={{ backgroundColor: theme.backgroundColor, color: GLOBAL_COLORS.text.primary }}
    >
      
      {/* Header & Controls */}
      <div className="flex flex-col items-center mb-8 space-y-6">
          <div className="text-center">
             <h1 className="text-3xl font-bold mb-2" style={{ color: theme.buttonSelected }}>Host Panel</h1>
             <div style={{ color: GLOBAL_COLORS.text.secondary }}>Room Code: <span className="text-2xl font-bold text-white bg-gray-700 px-3 py-1 rounded ml-2 tracking-widest">{roomCode}</span></div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4">
              <button 
                  onClick={resetTest}
                  className="px-4 md:px-6 py-2 bg-gray-700 hover:bg-gray-600 rounded text-white transition font-medium text-sm md:text-base"
              >
                  Reset
              </button>
              {status === "waiting" ? (
              <button
                  onClick={startTest}
                  className="px-4 md:px-8 py-2 font-bold rounded transition shadow-lg text-sm md:text-base"
                  style={{ 
                    backgroundColor: theme.buttonSelected, 
                    color: theme.backgroundColor,
                    boxShadow: `0 10px 15px -3px ${theme.buttonSelected}33`
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
                    boxShadow: `0 10px 15px -3px ${GLOBAL_COLORS.text.error}33`
                  }}
              >
                  Stop Test
              </button>
              )}
          </div>

          {/* Toolbar (Copied from TypingPractice) */}
          <div 
            className="flex items-center gap-4 px-6 py-2 rounded-full shadow-lg overflow-x-auto max-w-[90vw] md:max-w-none scrollbar-hide"
            style={{ fontSize: `${settings.iconFontSize || 1.25}rem`, backgroundColor: GLOBAL_COLORS.surface }}
          >
            {/* Settings Button */}
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

            {/* Theme Button */}
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

            {/* Sound Toggle */}
            <button
              type="button"
              onClick={() => updateSettings({ soundEnabled: !settings.soundEnabled })}
              className="flex h-[1.5em] w-[1.5em] items-center justify-center rounded transition hover:opacity-75 hover:text-white"
              style={{ color: settings.soundEnabled ? theme.buttonSelected : theme.buttonUnselected }}
              title="toggle sound"
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

            {/* Ghost Toggle */}
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
      </div>

      {/* Settings Bar */}
      <div className="flex justify-center mb-8">
         <div className="flex flex-col items-center gap-4">
             {/* Top Row: Modes */}
             <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-gray-400">
                 <div className="flex rounded-lg p-1" style={{ backgroundColor: GLOBAL_COLORS.surface }}>
                    {(["time", "words", "quote", "zen", "preset"] as Mode[]).map((m) => (
                        <button
                            key={m}
                            onClick={() => {
                                if (settings.mode === m && m === "preset") {
                                    setShowPresetInput(true);
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
                            onClick={() => updateSettings({ punctuation: !settings.punctuation })}
                            className={`flex items-center gap-2 transition ${settings.punctuation ? "" : "hover:text-gray-200"}`}
                            style={{ color: settings.punctuation ? theme.buttonSelected : undefined }}
                        >
                            <span className={`rounded px-1 text-xs ${settings.punctuation ? "text-gray-900 font-bold" : "bg-gray-700"}`} style={{ backgroundColor: settings.punctuation ? theme.buttonSelected : undefined }}>@</span>
                             Punctuation
                        </button>
                        <button 
                            onClick={() => updateSettings({ numbers: !settings.numbers })}
                            className={`flex items-center gap-2 transition ${settings.numbers ? "" : "hover:text-gray-200"}`}
                            style={{ color: settings.numbers ? theme.buttonSelected : undefined }}
                        >
                             <span className={`rounded px-1 text-xs ${settings.numbers ? "text-gray-900 font-bold" : "bg-gray-700"}`} style={{ backgroundColor: settings.numbers ? theme.buttonSelected : undefined }}>#</span>
                             Numbers
                        </button>
                     </div>
                 )}
             </div>

             {/* Bottom Row: Sub-settings */}
             <div className="flex flex-wrap items-center justify-center gap-2 text-sm text-gray-400">
                 
                 {/* Time/Word Presets */}
                 {(settings.mode === "time" || (settings.mode === "preset" && settings.presetModeType === "time")) && (
                    <div className="flex rounded-lg p-1" style={{ backgroundColor: GLOBAL_COLORS.surface }}>
                        {TIME_PRESETS.map(d => (
                            <button
                                key={d}
                                onClick={() => updateSettings({ duration: d })}
                                className={`px-3 py-1 rounded transition ${settings.duration === d ? "font-medium bg-gray-800" : "hover:text-gray-200"}`}
                                style={{ color: settings.duration === d ? theme.buttonSelected : undefined }}
                            >
                                {d}
                            </button>
                        ))}
                        <button
                            onClick={() => {
                                setCustomValue(settings.duration || 0);
                                setShowCustomModal(true);
                            }}
                            className={`px-3 py-1 rounded transition ${!TIME_PRESETS.includes(settings.duration || 0) ? "font-medium bg-gray-800" : "hover:text-gray-200"}`}
                            style={{ color: !TIME_PRESETS.includes(settings.duration || 0) ? theme.buttonSelected : undefined }}
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
                                onClick={() => updateSettings({ wordTarget: w })}
                                className={`px-3 py-1 rounded transition ${settings.wordTarget === w ? "font-medium bg-gray-800" : "hover:text-gray-200"}`}
                                style={{ color: settings.wordTarget === w ? theme.buttonSelected : undefined }}
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
                            style={{ color: !WORD_PRESETS.includes(settings.wordTarget || 0) ? theme.buttonSelected : undefined }}
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
                                onClick={() => updateSettings({ quoteLength: l })}
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
                                onClick={() => updateSettings({ difficulty: d })}
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
                        onClick={() => setShowPresetInput(true)}
                        className="ml-2 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-gray-200 transition flex items-center gap-2"
                     >
                         <span>✎</span> Edit Text
                     </button>
                 )}

             </div>
             
             {/* View Options (Moved below third row) */}
             <div className="flex items-center gap-6 text-sm px-6 py-2 rounded-full shadow-lg mt-2" style={{ backgroundColor: GLOBAL_COLORS.surface }}>
                <div className="flex items-center gap-2">
                    <span className="text-gray-500">Sort:</span>
                    <select 
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as any)}
                        className="bg-gray-800 border-none rounded px-2 py-1 text-gray-200 cursor-pointer focus:ring-1"
                        style={{ "--tw-ring-color": theme.buttonSelected } as any}
                    >
                        <option value="join">Joined</option>
                        <option value="wpm">WPM</option>
                        <option value="accuracy">Accuracy</option>
                        <option value="progress">Progress</option>
                        <option value="name">Name</option>
                        <option value="custom">Custom</option>
                    </select>
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
            </div>
         </div>
      </div>

      {/* Connected Users Area */}
      <div className={`flex-1 overflow-y-auto p-4 rounded-xl ${users.length === 0 ? "flex items-center justify-center" : ""}`} style={{ backgroundColor: "rgba(0,0,0,0.2)" }}>
        {users.length === 0 ? (
            <div className="text-center" style={{ color: GLOBAL_COLORS.text.secondary }}>
                <div className="text-xl mb-2">Waiting for users to join...</div>
                <button
                    onClick={() => {
                        const link = `${window.location.origin}/connect/join?code=${roomCode}`;
                        navigator.clipboard.writeText(link);
                    }}
                    className="hover:opacity-80 transition-opacity cursor-pointer"
                    title="Click to copy direct link"
                >
                    Share code <span className="font-bold" style={{ color: theme.buttonSelected }}>{roomCode}</span>
                </button>
            </div>
        ) : (
            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
            >
                <SortableContext
                    items={sortedUsers.map(u => u.id)}
                    strategy={viewMode === "grid" ? rectSortingStrategy : verticalListSortingStrategy}
                >
                    <div
                        className={
                            viewMode === "grid"
                            ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 content-start"
                            : "flex flex-col gap-2"
                        }
                        style={viewMode === "grid" ? {
                            gridTemplateColumns: `repeat(auto-fill, minmax(${300 * cardSize}px, 1fr))`
                        } : {}}
                    >
                        {sortedUsers.map(user => (
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
                        ? "font-medium bg-gray-800"
                        : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                        }`}
                      style={{ color: settings.textAlign === align ? theme.buttonSelected : undefined }}
                    >
                      {align}
                    </button>
                  ))}
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
                      value={(theme as any)[key]}
                      onChange={(e) => updateTheme({ [key]: e.target.value })}
                      className="h-8 w-14 cursor-pointer rounded bg-transparent p-0"
                    />
                    <button
                      type="button"
                      onClick={() => updateTheme({ [key]: (DEFAULT_THEME as any)[key] })}
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
                onClick={resetTheme}
                className="text-sm text-red-400 hover:text-red-300"
              >
                Reset All Defaults
              </button>
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
              <h2 className="text-xl font-semibold text-gray-200">Custom Text</h2>
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
                  style={{ "--tw-ring-color": theme.buttonSelected } as any}
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
                      backgroundColor: tempPresetText ? theme.buttonSelected : undefined,
                      boxShadow: tempPresetText ? `0 10px 15px -3px ${theme.buttonSelected}33` : undefined
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
           <Link href="/" className="hover:text-gray-400 transition">← Back to Main Menu</Link>
      </div>
    </div>
  );
}

function ConnectHostContent() {
  const searchParams = useSearchParams();
  const nameParam = searchParams.get("name");

  if (!nameParam) {
      return (
        <div 
            className="min-h-[100dvh] flex items-center justify-center font-mono px-4 transition-colors duration-300"
            style={{ backgroundColor: GLOBAL_COLORS.background, color: GLOBAL_COLORS.text.primary }}
        >
            <div className="w-full max-w-md animate-fade-in">
                <div className="text-center mb-8">
                    <Link href="/connect" className="text-sm hover:text-white mb-4 inline-block" style={{ color: GLOBAL_COLORS.text.secondary }}>
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

export default function ConnectHost() {
  return (
    <Suspense fallback={<div 
      className="min-h-[100dvh] flex items-center justify-center transition-colors duration-300"
      style={{ backgroundColor: GLOBAL_COLORS.background, color: GLOBAL_COLORS.text.primary }}
    >
      Loading...
    </div>}>
      <ConnectHostContent />
    </Suspense>
  );
}
