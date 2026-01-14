import { useState } from "react";
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
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Plan, PlanItem } from "@/types/plan";
import { GLOBAL_COLORS } from "@/lib/colors";
import type { Difficulty, SettingsState, QuoteLength } from "@/lib/typing-constants";

// --- Types & Constants ---

const DEFAULT_SETTINGS: Partial<SettingsState> = {
  mode: "time",
  duration: 30,
  wordTarget: 25,
  punctuation: false,
  numbers: false,
  difficulty: "beginner",
  quoteLength: "all",
  ghostWriterEnabled: false,
  ghostWriterSpeed: 40,
  presetText: "",
  presetModeType: "finish",
};

interface PlanBuilderModalProps {
  initialPlan?: Plan;
  onSave: (plan: Plan) => void;
  onClose: () => void;
  isConnectMode?: boolean;
}

// --- Sortable Item Component ---

function SortableItem({
  item,
  isSelected,
  onSelect,
  onRemove,
}: {
  item: PlanItem;
  isSelected: boolean;
  onSelect: () => void;
  onRemove: (e: React.MouseEvent) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onSelect}
      className={`group flex items-center justify-between p-3 mb-2 rounded cursor-pointer border transition-colors ${
        isSelected
          ? "bg-gray-800 border-sky-500"
          : "bg-gray-800/50 border-gray-700 hover:border-gray-600"
      }`}
    >
      <div className="flex items-center gap-3 overflow-hidden">
        <span className="text-gray-500 cursor-grab active:cursor-grabbing">
          ☰
        </span>
        <div className="flex flex-col overflow-hidden">
          <span className="font-medium text-gray-200 truncate">
            {item.metadata.title || "Untitled Step"}
          </span>
          <span className="text-xs text-gray-400 truncate">
            {item.mode} • {item.metadata.subtitle || "No subtitle"}
          </span>
        </div>
      </div>
      <button
        onClick={onRemove}
        className="text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity px-2"
        title="Remove"
      >
        ✕
      </button>
    </div>
  );
}

// --- Main Component ---

export default function PlanBuilderModal({
  initialPlan = [],
  onSave,
  onClose,
  isConnectMode = false,
}: PlanBuilderModalProps) {
  const [items, setItems] = useState<Plan>(() => {
    // Deep clone and validate initial plan to prevent "ghost" items or reference issues
    const raw = initialPlan.length > 0 ? initialPlan : [];
    try {
      const cloned = JSON.parse(JSON.stringify(raw));
      return Array.isArray(cloned)
        ? cloned.filter(
            (i: PlanItem) => i && typeof i.id === "string" && i.id.length > 0
          )
        : [];
    } catch (e) {
      console.error("Failed to initialize plan", e);
      return [];
    }
  });
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setItems((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleAddItem = () => {
    const newItem: PlanItem = {
      id: crypto.randomUUID(),
      mode: "time",
      settings: { ...DEFAULT_SETTINGS },
      metadata: {
        title: `Step ${items.length + 1}`,
        subtitle: "30s Time Test",
      },
      syncSettings: {
        waitForAll: false,
        zenWaiting: false,
      },
    };
    setItems([...items, newItem]);
    setSelectedId(newItem.id);
  };

  const handleRemoveItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newItems = items.filter((i) => i.id !== id);
    setItems(newItems);
    if (selectedId === id) {
      setSelectedId(null);
    }
  };

  const handleUpdateItem = (
    id: string,
    updates: Partial<PlanItem> | ((prev: PlanItem) => Partial<PlanItem>)
  ) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const newValues = typeof updates === "function" ? updates(item) : updates;

        // Deep merge for nested objects if needed, but simple spread works for top level
        // For nested settings/metadata, we need to be careful
        return {
          ...item,
          ...newValues,
          settings: { ...item.settings, ...(newValues.settings || {}) },
          metadata: { ...item.metadata, ...(newValues.metadata || {}) },
          syncSettings: { ...item.syncSettings, ...(newValues.syncSettings || {}) },
        };
      })
    );
  };

  const selectedItem = items.find((i) => i.id === selectedId);

  const handleSave = () => {
    const validItems = items.filter(
      (i) => i && typeof i.id === "string" && i.id.length > 0
    );
    onSave(validItems);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div
        className="w-full max-w-5xl h-[80vh] rounded-xl flex overflow-hidden shadow-2xl border border-gray-800"
        style={{ backgroundColor: GLOBAL_COLORS.surface }}
      >
        {/* Left Panel: List */}
        <div className="w-1/3 min-w-[300px] border-r border-gray-800 flex flex-col bg-black/20">
          <div className="p-4 border-b border-gray-800 flex justify-between items-center">
            <h2 className="text-lg font-bold text-gray-200">Plan Steps</h2>
            <button
              onClick={handleAddItem}
              className="px-3 py-1 bg-sky-600 hover:bg-sky-500 text-white rounded text-sm transition-colors"
            >
              + Add Step
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 scrollbar-thin scrollbar-thumb-gray-700">
            {items.length === 0 ? (
              <div className="text-center text-gray-500 mt-10">
                <p>No steps yet.</p>
                <p className="text-sm">Click "Add Step" to begin.</p>
              </div>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={items.map((i) => i.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {items.map((item) => (
                    <SortableItem
                      key={item.id}
                      item={item}
                      isSelected={selectedId === item.id}
                      onSelect={() => setSelectedId(item.id)}
                      onRemove={(e) => handleRemoveItem(item.id, e)}
                    />
                  ))}
                </SortableContext>
              </DndContext>
            )}
          </div>

          <div className="p-4 border-t border-gray-800 flex justify-between gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-2 text-gray-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="flex-1 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded font-medium transition-colors"
            >
              Start Plan
            </button>
          </div>
        </div>

        {/* Right Panel: Settings */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-900/50">
          {selectedItem ? (
            <div className="space-y-8 max-w-2xl mx-auto animate-fade-in">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-200">
                  Step Configuration
                </h3>
                <span className="text-xs text-gray-500 font-mono">
                  {selectedItem.id.slice(0, 8)}
                </span>
              </div>

              {/* Metadata Section */}
              <div className="space-y-4 p-4 rounded-lg border border-gray-700 bg-gray-800/30">
                <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
                  Display Metadata
                </h4>
                <div className="grid gap-4">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">
                      Title
                    </label>
                    <input
                      type="text"
                      value={selectedItem.metadata.title}
                      onChange={(e) =>
                        handleUpdateItem(selectedItem.id, {
                          metadata: {
                            ...selectedItem.metadata,
                            title: e.target.value,
                          },
                        })
                      }
                      className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-gray-200 focus:border-sky-500 outline-none"
                      placeholder="e.g. Warm Up"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">
                      Subtitle
                    </label>
                    <input
                      type="text"
                      value={selectedItem.metadata.subtitle}
                      onChange={(e) =>
                        handleUpdateItem(selectedItem.id, {
                          metadata: {
                            ...selectedItem.metadata,
                            subtitle: e.target.value,
                          },
                        })
                      }
                      className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-gray-200 focus:border-sky-500 outline-none"
                      placeholder="e.g. 30s Time Test"
                    />
                  </div>
                </div>
              </div>

              {/* Mode Selection */}
              <div className="space-y-4 p-4 rounded-lg border border-gray-700 bg-gray-800/30">
                <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
                  Test Mode
                </h4>
                <div className="flex flex-wrap gap-2">
                  {(["time", "words", "quote", "zen", "preset"] as const).map(
                    (m) => (
                      <button
                        key={m}
                        onClick={() =>
                          handleUpdateItem(selectedItem.id, {
                            mode: m,
                            settings: {
                              ...selectedItem.settings,
                              mode: m,
                            },
                          })
                        }
                        className={`px-4 py-2 rounded font-medium capitalize transition-colors ${
                          selectedItem.mode === m
                            ? "bg-sky-600 text-white"
                            : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                        }`}
                      >
                        {m}
                      </button>
                    )
                  )}
                </div>

                {/* Time Mode Settings */}
                {selectedItem.mode === "time" && (
                  <div>
                    <label className="block text-xs text-gray-500 mb-2">
                      Duration (seconds)
                    </label>
                    <div className="flex gap-2">
                      {[15, 30, 60, 120, 300].map((d) => (
                        <button
                          key={d}
                          onClick={() =>
                            handleUpdateItem(selectedItem.id, {
                              settings: {
                                ...selectedItem.settings,
                                duration: d,
                              },
                            })
                          }
                          className={`px-3 py-1 rounded text-sm ${
                            selectedItem.settings.duration === d
                              ? "bg-sky-600 text-white"
                              : "bg-gray-700 text-gray-300"
                          }`}
                        >
                          {d}s
                        </button>
                      ))}
                      <input
                        type="number"
                        value={selectedItem.settings.duration}
                        onChange={(e) =>
                          handleUpdateItem(selectedItem.id, {
                            settings: {
                              ...selectedItem.settings,
                              duration: parseInt(e.target.value) || 0,
                            },
                          })
                        }
                        className="w-20 bg-gray-900 border border-gray-700 rounded px-2 text-center text-gray-200"
                      />
                    </div>
                  </div>
                )}

                {/* Words Mode Settings */}
                {selectedItem.mode === "words" && (
                  <div>
                    <label className="block text-xs text-gray-500 mb-2">
                      Word Count
                    </label>
                    <div className="flex gap-2">
                      {[10, 25, 50, 100, 200].map((w) => (
                        <button
                          key={w}
                          onClick={() =>
                            handleUpdateItem(selectedItem.id, {
                              settings: {
                                ...selectedItem.settings,
                                wordTarget: w,
                              },
                            })
                          }
                          className={`px-3 py-1 rounded text-sm ${
                            selectedItem.settings.wordTarget === w
                              ? "bg-sky-600 text-white"
                              : "bg-gray-700 text-gray-300"
                          }`}
                        >
                          {w}
                        </button>
                      ))}
                      <input
                        type="number"
                        value={selectedItem.settings.wordTarget}
                        onChange={(e) =>
                          handleUpdateItem(selectedItem.id, {
                            settings: {
                              ...selectedItem.settings,
                              wordTarget: parseInt(e.target.value) || 0,
                            },
                          })
                        }
                        className="w-20 bg-gray-900 border border-gray-700 rounded px-2 text-center text-gray-200"
                      />
                    </div>
                  </div>
                )}

                {/* Quote Mode Settings */}
                {selectedItem.mode === "quote" && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs text-gray-500 mb-2">
                        Quote Length
                      </label>
                      <div className="flex gap-2">
                        {(
                          ["short", "medium", "long", "xl", "all"] as QuoteLength[]
                        ).map((l) => (
                          <button
                            key={l}
                            onClick={() =>
                              handleUpdateItem(selectedItem.id, {
                                settings: {
                                  ...selectedItem.settings,
                                  quoteLength: l,
                                },
                              })
                            }
                            className={`px-3 py-1 rounded text-sm capitalize ${
                              selectedItem.settings.quoteLength === l
                                ? "bg-sky-600 text-white"
                                : "bg-gray-700 text-gray-300"
                            }`}
                          >
                            {l}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Preset Mode Settings */}
                {selectedItem.mode === "preset" && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs text-gray-500 mb-2">
                        Preset Type
                      </label>
                      <div className="flex gap-2">
                        {(["finish", "time"] as const).map((t) => (
                          <button
                            key={t}
                            onClick={() =>
                              handleUpdateItem(selectedItem.id, {
                                settings: {
                                  ...selectedItem.settings,
                                  presetModeType: t,
                                },
                              })
                            }
                            className={`px-3 py-1 rounded text-sm capitalize ${
                              selectedItem.settings.presetModeType === t
                                ? "bg-sky-600 text-white"
                                : "bg-gray-700 text-gray-300"
                            }`}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs text-gray-500 mb-2">
                        Custom Text
                      </label>
                      <textarea
                        value={selectedItem.settings.presetText || ""}
                        onChange={(e) =>
                          handleUpdateItem(selectedItem.id, {
                            settings: {
                              ...selectedItem.settings,
                              presetText: e.target.value,
                            },
                          })
                        }
                        className="w-full h-32 bg-gray-900 border border-gray-700 rounded p-2 text-sm text-gray-200 focus:border-sky-500 outline-none font-mono"
                        placeholder="Paste your text here..."
                      />
                      <div className="mt-2">
                        <input
                          type="file"
                          accept=".txt"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onload = (ev) => {
                                const text = ev.target?.result as string;
                                handleUpdateItem(selectedItem.id, {
                                  settings: {
                                    ...selectedItem.settings,
                                    presetText: text,
                                  },
                                });
                              };
                              reader.readAsText(file);
                            }
                          }}
                          className="block w-full text-xs text-gray-400 file:mr-4 file:py-1 file:px-2 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-gray-700 file:text-gray-300 hover:file:bg-gray-600"
                        />
                      </div>
                    </div>

                    {selectedItem.settings.presetModeType === "time" && (
                      <div>
                        <label className="block text-xs text-gray-500 mb-2">
                          Duration (seconds)
                        </label>
                        <div className="flex gap-2">
                          {[15, 30, 60, 120].map((d) => (
                            <button
                              key={d}
                              onClick={() =>
                                handleUpdateItem(selectedItem.id, {
                                  settings: {
                                    ...selectedItem.settings,
                                    duration: d,
                                  },
                                })
                              }
                              className={`px-3 py-1 rounded text-sm ${
                                selectedItem.settings.duration === d
                                  ? "bg-sky-600 text-white"
                                  : "bg-gray-700 text-gray-300"
                              }`}
                            >
                              {d}s
                            </button>
                          ))}
                          <input
                            type="number"
                            value={selectedItem.settings.duration}
                            onChange={(e) =>
                              handleUpdateItem(selectedItem.id, {
                                settings: {
                                  ...selectedItem.settings,
                                  duration: parseInt(e.target.value) || 0,
                                },
                              })
                            }
                            className="w-20 bg-gray-900 border border-gray-700 rounded px-2 text-center text-gray-200"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Common Toggles */}
                {selectedItem.mode !== "quote" &&
                  selectedItem.mode !== "zen" &&
                  selectedItem.mode !== "preset" && (
                    <div className="flex gap-4 pt-2">
                      <button
                        onClick={() =>
                          handleUpdateItem(selectedItem.id, {
                            settings: {
                              ...selectedItem.settings,
                              punctuation: !selectedItem.settings.punctuation,
                            },
                          })
                        }
                        className={`flex items-center gap-2 px-3 py-1.5 rounded transition-colors ${
                          selectedItem.settings.punctuation
                            ? "bg-sky-900/50 text-sky-400 border border-sky-500/50"
                            : "bg-gray-700 text-gray-400"
                        }`}
                      >
                        <span className="font-bold">@</span> Punctuation
                      </button>
                      <button
                        onClick={() =>
                          handleUpdateItem(selectedItem.id, {
                            settings: {
                              ...selectedItem.settings,
                              numbers: !selectedItem.settings.numbers,
                            },
                          })
                        }
                        className={`flex items-center gap-2 px-3 py-1.5 rounded transition-colors ${
                          selectedItem.settings.numbers
                            ? "bg-sky-900/50 text-sky-400 border border-sky-500/50"
                            : "bg-gray-700 text-gray-400"
                        }`}
                      >
                        <span className="font-bold">#</span> Numbers
                      </button>
                    </div>
                  )}

                {selectedItem.mode !== "quote" &&
                  selectedItem.mode !== "zen" &&
                  selectedItem.mode !== "preset" && (
                    <div>
                      <label className="block text-xs text-gray-500 mb-2 mt-4">
                        Difficulty
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {(
                          [
                            "beginner",
                            "easy",
                            "medium",
                            "hard",
                            "expert",
                          ] as Difficulty[]
                        ).map((d) => (
                          <button
                            key={d}
                            onClick={() =>
                              handleUpdateItem(selectedItem.id, {
                                settings: {
                                  ...selectedItem.settings,
                                  difficulty: d,
                                },
                              })
                            }
                            className={`px-3 py-1 rounded text-sm capitalize ${
                              selectedItem.settings.difficulty === d
                                ? "bg-sky-600 text-white"
                                : "bg-gray-700 text-gray-300"
                            }`}
                          >
                            {d}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
              </div>

              {/* Connect Sync Settings (Only if Connect Mode) */}
              {isConnectMode && (
                <div className="space-y-4 p-4 rounded-lg border border-indigo-500/30 bg-indigo-900/10">
                  <h4 className="text-sm font-semibold text-indigo-400 uppercase tracking-wider flex items-center gap-2">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                      <circle cx="9" cy="7" r="4"></circle>
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                      <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                    </svg>
                    Multiplayer Sync
                  </h4>

                  <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-gray-200 font-medium">
                          Wait for All
                        </div>
                        <div className="text-xs text-gray-500">
                          Require everyone to finish before moving on
                        </div>
                      </div>
                      <button
                        onClick={() =>
                          handleUpdateItem(selectedItem.id, {
                            syncSettings: {
                              ...selectedItem.syncSettings,
                              waitForAll: !selectedItem.syncSettings.waitForAll,
                            },
                          })
                        }
                        className={`w-12 h-6 rounded-full transition-colors relative ${
                          selectedItem.syncSettings.waitForAll
                            ? "bg-indigo-500"
                            : "bg-gray-700"
                        }`}
                      >
                        <span
                          className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
                            selectedItem.syncSettings.waitForAll
                              ? "translate-x-6"
                              : "translate-x-0"
                          }`}
                        />
                      </button>
                    </div>

                    {selectedItem.syncSettings.waitForAll && (
                      <div className="flex items-center justify-between pl-4 border-l-2 border-indigo-500/30">
                        <div>
                          <div className="text-gray-200 font-medium">
                            Allow Zen Waiting
                          </div>
                          <div className="text-xs text-gray-500">
                            Early finishers enter a Zen mode room
                          </div>
                        </div>
                        <button
                          onClick={() =>
                            handleUpdateItem(selectedItem.id, {
                              syncSettings: {
                                ...selectedItem.syncSettings,
                                zenWaiting: !selectedItem.syncSettings.zenWaiting,
                              },
                            })
                          }
                          className={`w-12 h-6 rounded-full transition-colors relative ${
                            selectedItem.syncSettings.zenWaiting
                              ? "bg-indigo-500"
                              : "bg-gray-700"
                          }`}
                        >
                          <span
                            className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
                              selectedItem.syncSettings.zenWaiting
                                ? "translate-x-6"
                                : "translate-x-0"
                            }`}
                          />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-gray-600">
              Select a step to configure
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
