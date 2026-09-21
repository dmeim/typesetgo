import {
  ArrowClockwiseIcon,
  ArrowDownIcon,
  ArrowFatRightIcon,
  ArrowLeftIcon,
  ArrowUpIcon,
  ArrowsClockwiseIcon,
  CopyIcon,
  CornersInIcon,
  CornersOutIcon,
  GearSixIcon,
  ListBulletsIcon,
  PaletteIcon,
  PencilSimpleIcon,
  PlayIcon,
  SquaresFourIcon,
  StopIcon,
  UserMinusIcon,
  WarningCircleIcon,
  XIcon,
} from "@phosphor-icons/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useMutation, useQuery } from "convex/react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import {
  DEFAULT_THEME,
  type SettingsState,
  type Theme,
} from "@/lib/typing-constants";
import { TEXT_SIZE_MIN, TEXT_SIZE_MAX, MAX_GHOST_SPEED } from "@/lib/practice-limits";
import { fetchAllThemes, type ThemeDefinition } from "@/lib/themes";
import { fetchSoundManifest, type SoundManifest } from "@/lib/sounds";
import { tv } from "@/lib/theme-vars";
import { useTheme } from "@/hooks/useTheme";
import { useSessionId } from "@/hooks/useSessionId";
import { HostCard, UserHostCard } from "@/components/connect";
import { RoomButton, RoomDialog, RoomPage } from "@/components/connect/RoomUI";
import { fieldClass, fieldStyle, panelStyle } from "@/components/connect/room-styles";
import PracticeSettings from "@/components/connect/PracticeSettings";
import {
  getPlanStep,
  resolveRoomSettings,
} from "@/components/connect/room-settings";
import { useRoomAttempt } from "@/components/connect/use-room-attempt";
import SoundController from "@/components/typing/SoundController";
import { PlanBuilderModal } from "@/components/plan";

const initialSettings: Partial<SettingsState> = {
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
  typingSound: "creamy",
  warningSound: "clock",
  errorSound: "",
  typingFontSize: 3.5,
  textAlign: "left",
};
type SortBy = "join" | "wpm" | "accuracy" | "progress" | "name" | "custom";

function ActiveHostSession({ hostName }: { hostName: string }) {
  const sessionId = useSessionId();
  const { mode: colorMode } = useTheme();
  const createRoom = useMutation(api.rooms.create);
  const updateRoomSettings = useMutation(api.rooms.updateSettings);
  const setRoomStatus = useMutation(api.rooms.setStatus);
  const resetRoom = useMutation(api.rooms.resetPractice);
  const kickParticipant = useMutation(api.participants.kick);
  const resetParticipant = useMutation(api.participants.resetStats);
  const request = useCallback(
    () =>
      createRoom({ hostName, hostSessionId: sessionId, gameMode: "practice" }),
    [hostName, sessionId, createRoom],
  );
  const attempt = useRoomAttempt(Boolean(sessionId), request);
  const roomCode = attempt.value?.code;
  const room = useQuery(
    api.rooms.getByCode,
    roomCode ? { code: roomCode } : "skip",
  );
  const participants = useQuery(
    api.participants.listByRoom,
    room ? { roomId: room._id } : "skip",
  );
  const [settings, setSettings] = useState(initialSettings);
  const settingsRef = useRef(settings);
  const [pendingSettings, setPendingSettings] = useState(0);
  const settingsRevision = useRef(0);
  const [settingsError, setSettingsError] = useState("");
  const [actionError, setActionError] = useState("");
  const [busy, setBusy] = useState(false);
  const [modal, setModal] = useState<
    "code" | "settings" | "theme" | "plan" | null
  >(null);
  const [confirmation, setConfirmation] = useState<{
    kind: "reset" | "remove";
    id: string;
    name: string;
  } | null>(null);
  const [themes, setThemes] = useState<ThemeDefinition[] | null>(null);
  const [themeError, setThemeError] = useState("");
  const [themeName, setThemeName] = useState("Default");
  const [soundManifest, setSoundManifest] = useState<SoundManifest | null>(
    null,
  );
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [sortBy, setSortBy] = useState<SortBy>("join");
  const [descending, setDescending] = useState(false);
  const [cardSize, setCardSize] = useState(1);
  const [customOrder, setCustomOrder] = useState<string[]>([]);
  const [fullscreen, setFullscreen] = useState(false);
  const [copyMessage, setCopyMessage] = useState("");
  const cards = useRef<HTMLDivElement>(null);
  const active = room?.status === "active";
  const locked = active || busy;
  const currentStep = getPlanStep(settings);
  const stepIndex = settings.planIndex ?? 0;
  const concrete = resolveRoomSettings(settings);
  const readyToStart = Boolean(
    concrete && (concrete.mode !== "preset" || concrete.presetText?.trim()),
  );
  const theme = settings.theme ?? DEFAULT_THEME;

  useEffect(() => {
    void fetchSoundManifest().then(setSoundManifest);
  }, []);
  useEffect(() => {
    const change = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", change);
    return () => document.removeEventListener("fullscreenchange", change);
  }, []);
  const loadThemes = () => {
    setThemeError("");
    void fetchAllThemes()
      .then(setThemes)
      .catch(() => setThemeError("Unable to load themes. Try again."));
  };
  const openThemes = () => {
    setModal("theme");
    if (!themes) loadThemes();
  };

  const saveSettings = async (updated: Partial<SettingsState>) => {
    if (!room) return;
    const revision = ++settingsRevision.current;
    setPendingSettings((count) => count + 1);
    try {
      await updateRoomSettings({
        roomId: room._id,
        hostSessionId: sessionId,
        settings: updated,
      });
      if (revision === settingsRevision.current) setSettingsError("");
    } catch (error) {
      if (revision === settingsRevision.current)
        setSettingsError(
          error instanceof Error
            ? error.message
            : "Unable to save room settings.",
        );
    } finally {
      setPendingSettings((count) => count - 1);
    }
  };
  const updateSettings = (updates: Partial<SettingsState>) => {
    if (locked || !room) return;
    const updated = { ...settingsRef.current, ...updates };
    settingsRef.current = updated;
    setSettings(updated);
    void saveSettings(updated);
  };
  const perform = async (action: () => Promise<unknown>) => {
    if (busy) return;
    setBusy(true);
    setActionError("");
    try {
      await action();
      return true;
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : "Unable to update the room. Please try again.",
      );
      return false;
    } finally {
      setBusy(false);
    }
  };
  const start = () => {
    if (room && readyToStart && !pendingSettings && !settingsError)
      void perform(async () => {
        await updateRoomSettings({
          roomId: room._id,
          hostSessionId: sessionId,
          settings: settingsRef.current,
        });
        const args = {
          roomId: room._id,
          hostSessionId: sessionId,
          status: "active" as const,
        };
        await setRoomStatus(args);
      });
  };
  const stop = () => {
    if (room)
      void perform(() => {
        const args = {
          roomId: room._id,
          hostSessionId: sessionId,
          status: "waiting" as const,
        };
        return setRoomStatus(args);
      });
  };
  const reset = () => {
    if (room)
      void perform(() =>
        resetRoom({ roomId: room._id, hostSessionId: sessionId }),
      );
  };
  const users = useMemo(() => {
    const list = (participants ?? [])
      .filter((participant) => participant.isConnected)
      .map((participant) => ({
        id: participant._id,
        name: participant.name,
        stats: participant.stats,
        joinedAt: participant.joinedAt,
      }));
    const direction = descending ? -1 : 1;
    list.sort((a, b) => {
      if (sortBy === "custom") {
        const rank = (id: string) => {
          const index = customOrder.indexOf(id);
          return index === -1 ? Number.MAX_SAFE_INTEGER : index;
        };
        return rank(a.id) - rank(b.id);
      }
      if (sortBy === "name") return a.name.localeCompare(b.name) * direction;
      if (sortBy === "join") return (a.joinedAt - b.joinedAt) * direction;
      return (a.stats[sortBy] - b.stats[sortBy]) * direction;
    });
    return list;
  }, [participants, sortBy, descending, customOrder]);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
  const dragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const ids = users.map((user) => user.id);
    setCustomOrder(
      arrayMove(
        ids,
        ids.indexOf(active.id as Id<"participants">),
        ids.indexOf(over.id as Id<"participants">),
      ),
    );
    setSortBy("custom");
  };
  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopyMessage("Copied to clipboard.");
    } catch {
      setCopyMessage(
        "Copy unavailable. Select the code or link below to copy it.",
      );
    }
  };

  const requestConfirmation = async (
    action: NonNullable<typeof confirmation>,
  ) => {
    const trigger = document.activeElement;
    // Dialog portals are outside the fullscreen element's top layer.
    if (document.fullscreenElement) {
      try {
        await document.exitFullscreen();
        if (trigger instanceof HTMLElement) trigger.focus();
      } catch {
        setActionError("Exit fullscreen to manage this participant.");
        return;
      }
    }
    setConfirmation(action);
  };

  if (!roomCode)
    return (
      <RoomPage>
        <div className="mx-auto max-w-md space-y-5 py-12 text-center">
          <h1 className="text-2xl font-semibold">Host a room</h1>
          {attempt.status === "error" ? (
            <>
              <p role="alert">{attempt.error}</p>
              <RoomButton onClick={attempt.retry}>
                <ArrowsClockwiseIcon className="size-4 shrink-0" aria-hidden="true" />
                Retry
              </RoomButton>
            </>
          ) : (
            <p role="status">{sessionId ? "Creating room…" : "Loading…"}</p>
          )}
          <Link to="/connect" className="inline-flex items-center gap-2 py-2">
            <ArrowLeftIcon className="size-4 shrink-0" aria-hidden="true" />
            Back to Connect
          </Link>
        </div>
      </RoomPage>
    );
  if (room === null)
    return (
      <RoomPage>
        <p>This room is no longer available.</p>
        <Link to="/connect" className="inline-flex items-center justify-center gap-2">
          <ArrowLeftIcon className="size-4 shrink-0" aria-hidden="true" />
          Back to Connect
        </Link>
      </RoomPage>
    );
  if (!room)
    return (
      <RoomPage>
        <p role="status">Loading room…</p>
      </RoomPage>
    );
  return (
    <RoomPage>
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-wrap items-start justify-between gap-5">
          <div className="space-y-2">
            <Link to="/connect" className="inline-flex items-center gap-2 py-2 text-sm">
              <ArrowLeftIcon className="size-4 shrink-0" aria-hidden="true" />
              Connect
            </Link>
            <h1 className="text-3xl font-semibold">Host panel</h1>
            <p
              className="break-words text-sm"
              style={{ color: tv.ui.mutedForeground }}
            >
              Hosted by {hostName}
            </p>
          </div>
          <RoomButton
            onClick={() => {
              setCopyMessage("");
              setModal("code");
            }}
            aria-label={`Share room ${roomCode}`}
          >
            <span className="block text-xs">Room code</span>
            <span className="text-2xl tracking-widest">{roomCode}</span>
          </RoomButton>
        </header>
        <section
          className="space-y-4 rounded-xl border p-4 sm:p-6"
          style={panelStyle}
          aria-label="Room controls"
        >
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="font-semibold">
                {active ? "Practice in progress" : "Ready when you are"}
              </h2>
              <p
                className="mt-1 text-sm"
                style={{ color: tv.ui.mutedForeground }}
              >
                {active
                  ? "Stop to change settings or select another plan step."
                  : "Start begins a fresh attempt for everyone."}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <RoomButton onClick={reset} disabled={busy}>
                <ArrowClockwiseIcon className="size-4 shrink-0" aria-hidden="true" />
                Reset room
              </RoomButton>
              <RoomButton
                selected
                onClick={active ? stop : start}
                disabled={
                  busy ||
                  (!active &&
                    (pendingSettings > 0 ||
                      Boolean(settingsError) ||
                      !readyToStart))
                }
              >
                {active ? <StopIcon className="size-4 shrink-0" aria-hidden="true" /> : <PlayIcon className="size-4 shrink-0" aria-hidden="true" />}
                {active ? "Stop test" : "Start test"}
              </RoomButton>
            </div>
          </div>
          {actionError && (
            <p role="alert" style={{ color: tv.ui.destructive }}>
              {actionError}
            </p>
          )}
          {settingsError && (
            <div role="alert" className="space-y-2">
              <p style={{ color: tv.ui.destructive }}>{settingsError}</p>
              <RoomButton
                onClick={() => void saveSettings(settingsRef.current)}
                disabled={locked || pendingSettings > 0}
              >
                <WarningCircleIcon className="size-4 shrink-0" aria-hidden="true" />
                Retry saving settings
              </RoomButton>
            </div>
          )}
          <fieldset disabled={locked} className="min-w-0 space-y-4">
            <legend className="sr-only">Room settings</legend>
            <PracticeSettings
              settings={settings}
              onChange={updateSettings}
              allowPlan
              onEditPlan={() => setModal("plan")}
            />
            {settings.mode === "plan" && (
              <div
                className="space-y-3 rounded-lg border p-3"
                style={{ borderColor: tv.ui.border }}
              >
                <p className="break-words font-medium">
                  Step {stepIndex + 1} of {settings.plan?.length ?? 0}:{" "}
                  {currentStep?.metadata.title || "Select a step"}
                </p>
                {currentStep?.metadata.subtitle && (
                  <p
                    className="break-words text-sm"
                    style={{ color: tv.ui.mutedForeground }}
                  >
                    {currentStep.metadata.subtitle}
                  </p>
                )}
                <div className="flex flex-wrap gap-2">
                  <RoomButton
                    disabled={stepIndex <= 0}
                    onClick={() =>
                      updateSettings({ planIndex: Math.max(0, stepIndex - 1) })
                    }
                  >
                    <ArrowLeftIcon className="size-4 shrink-0" aria-hidden="true" />
                    Previous step
                  </RoomButton>
                  <RoomButton
                    disabled={stepIndex >= (settings.plan?.length ?? 0) - 1}
                    onClick={() =>
                      updateSettings({
                        planIndex: Math.min(
                          (settings.plan?.length ?? 1) - 1,
                          stepIndex + 1,
                        ),
                      })
                    }
                  >
                    <ArrowFatRightIcon className="size-4 shrink-0" aria-hidden="true" />
                    Next step
                  </RoomButton>
                  <RoomButton onClick={() => setModal("plan")}>
                    <PencilSimpleIcon className="size-4 shrink-0" aria-hidden="true" />
                    Edit plan
                  </RoomButton>
                </div>
              </div>
            )}
            <div
              className="flex flex-wrap items-center gap-2 border-t pt-4"
              style={{ borderColor: tv.ui.border }}
            >
              <RoomButton onClick={() => setModal("settings")}>
                <GearSixIcon className="size-4 shrink-0" aria-hidden="true" />
                Appearance & ghost
              </RoomButton>
              <RoomButton onClick={openThemes}>
                <PaletteIcon className="size-4 shrink-0" aria-hidden="true" />
                Participant theme
              </RoomButton>
              <SoundController
                disabled={locked}
                settings={settings}
                onUpdateSettings={updateSettings}
                soundManifest={soundManifest}
              />
              <span
                className="text-sm"
                style={{ color: tv.ui.mutedForeground }}
              >
                Room-wide sound
              </span>
            </div>
          </fieldset>
          {pendingSettings > 0 && (
            <p role="status" className="text-sm">
              Saving settings…
            </p>
          )}
          {!readyToStart && (
            <p className="text-sm" style={{ color: tv.ui.warning }}>
              Add custom text or select a valid plan step before starting.
            </p>
          )}
        </section>
        <section
          ref={cards}
          className="min-w-0 space-y-4 rounded-xl p-1 sm:p-3"
          style={{
            backgroundColor: tv.ui.background,
            ...(fullscreen
              ? ({
                  height: "100dvh",
                  overflowY: "auto",
                  padding: "1rem",
                } as const)
              : {}),
          }}
          aria-label="Participants"
        >
          {fullscreen && actionError && <p role="alert">{actionError}</p>}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 className="text-xl font-semibold">
              Participants ({users.length})
            </h2>
            <div className="flex flex-wrap items-center gap-2">
              <label className="flex items-center gap-2 text-sm">
                Sort
                <select
                  aria-label="Sort participants"
                  className={`${fieldClass} max-w-36`}
                  style={fieldStyle}
                  value={sortBy}
                  onChange={(event) => setSortBy(event.target.value as SortBy)}
                >
                  {[
                    "join",
                    "wpm",
                    "accuracy",
                    "progress",
                    "name",
                    "custom",
                  ].map((sort) => (
                    <option key={sort} value={sort}>
                      {sort === "join" ? "Join order" : sort}
                    </option>
                  ))}
                </select>
              </label>
              <RoomButton
                disabled={sortBy === "custom"}
                onClick={() => setDescending((value) => !value)}
                aria-label={descending ? "Sort ascending" : "Sort descending"}
              >
                {descending ? <ArrowDownIcon className="size-4 shrink-0" aria-hidden="true" /> : <ArrowUpIcon className="size-4 shrink-0" aria-hidden="true" />}
                {descending ? "Descending" : "Ascending"}
              </RoomButton>
              <div
                className="flex gap-1"
                role="group"
                aria-label="Participant view"
              >
                <RoomButton
                  selected={viewMode === "grid"}
                  aria-pressed={viewMode === "grid"}
                  onClick={() => setViewMode("grid")}
                >
                  <SquaresFourIcon className="size-4 shrink-0" aria-hidden="true" />
                  Grid
                </RoomButton>
                <RoomButton
                  selected={viewMode === "list"}
                  aria-pressed={viewMode === "list"}
                  onClick={() => setViewMode("list")}
                >
                  <ListBulletsIcon className="size-4 shrink-0" aria-hidden="true" />
                  List
                </RoomButton>
              </div>
              <RoomButton
                onClick={() =>
                  void perform(async () => {
                    if (document.fullscreenElement)
                      await document.exitFullscreen();
                    else await cards.current?.requestFullscreen();
                  })
                }
              >
                {fullscreen ? <CornersInIcon className="size-4 shrink-0" aria-hidden="true" /> : <CornersOutIcon className="size-4 shrink-0" aria-hidden="true" />}
                {fullscreen ? "Exit fullscreen" : "Fullscreen"}
              </RoomButton>
            </div>
          </div>
          <label className="flex flex-wrap items-center gap-3 text-sm">
            Card size
            <input
              type="range"
              min={0.8}
              max={2}
              step={0.1}
              value={cardSize}
              onChange={(event) => setCardSize(Number(event.target.value))}
            />
            <span>{Math.round(cardSize * 100)}%</span>
          </label>
          {!users.length ? (
            <p
              className="rounded-xl border px-4 py-10 text-center"
              style={panelStyle}
            >
              Share the room code to invite participants.
            </p>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={dragEnd}
            >
              <SortableContext
                items={users.map((user) => user.id)}
                strategy={
                  viewMode === "grid"
                    ? rectSortingStrategy
                    : verticalListSortingStrategy
                }
              >
                <div
                  className="grid min-w-0 gap-4"
                  style={
                    viewMode === "grid"
                      ? {
                          gridTemplateColumns: `repeat(auto-fit, minmax(min(100%, ${280 * cardSize}px), 1fr))`,
                        }
                      : undefined
                  }
                >
                  {users.map((user) => (
                    <UserHostCard
                      key={user.id}
                      user={user}
                      settings={settings}
                      theme={theme}
                      viewMode={viewMode}
                      cardSize={cardSize}
                      onKick={() =>
                        void requestConfirmation({
                          kind: "remove",
                          id: user.id,
                          name: user.name,
                        })
                      }
                      onReset={() =>
                        void requestConfirmation({
                          kind: "reset",
                          id: user.id,
                          name: user.name,
                        })
                      }
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </section>
        {modal === "plan" && (
          <PlanBuilderModal
            initialPlan={settings.plan}
            isConnectMode
            onClose={() => setModal(null)}
            onSave={(plan) =>
              updateSettings({ mode: "plan", plan, planIndex: 0 })
            }
          />
        )}
        <RoomDialog
          open={modal === "code"}
          onClose={() => setModal(null)}
          title="Share your room"
          description="Participants can enter this code in Connect, or open the invite link."
        >
          <p className="select-all break-all text-center text-4xl font-semibold tracking-widest">
            {roomCode}
          </p>
          <label className="block space-y-2 text-sm">
            Invite link
            <input
              className={fieldClass}
              style={fieldStyle}
              readOnly
              value={`${window.location.origin}/connect/join?code=${roomCode}`}
              onFocus={(event) => event.target.select()}
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <RoomButton onClick={() => void copy(roomCode)}>
              <CopyIcon className="size-4 shrink-0" aria-hidden="true" />
              Copy code
            </RoomButton>
            <RoomButton
              onClick={() =>
                void copy(
                  `${window.location.origin}/connect/join?code=${roomCode}`,
                )
              }
            >
              <CopyIcon className="size-4 shrink-0" aria-hidden="true" />
              Copy link
            </RoomButton>
          </div>
          <p role="status" className="text-sm">
            {copyMessage}
          </p>
        </RoomDialog>
        <RoomDialog
          open={modal === "settings"}
          onClose={() => setModal(null)}
          title="Appearance & ghost"
          description="These settings apply to every participant."
        >
          <fieldset disabled={locked} className="space-y-4">
            <label className="block space-y-2 text-sm">
              Typing text size (rem)
              <input
                type="number"
                min={TEXT_SIZE_MIN}
                max={TEXT_SIZE_MAX}
                step={0.1}
                className={fieldClass}
                style={fieldStyle}
                value={settings.typingFontSize ?? 3.5}
                onChange={(event) =>
                  updateSettings({
                    typingFontSize: Math.max(
                      TEXT_SIZE_MIN,
                      Math.min(TEXT_SIZE_MAX, Number(event.target.value) || TEXT_SIZE_MIN),
                    ),
                  })
                }
              />
            </label>
            <label className="block space-y-2 text-sm">
              Text alignment
              <select
                className={fieldClass}
                style={fieldStyle}
                value={settings.textAlign}
                onChange={(event) =>
                  updateSettings({
                    textAlign: event.target.value as SettingsState["textAlign"],
                  })
                }
              >
                {["left", "center", "right", "justify"].map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={settings.ghostWriterEnabled}
                onChange={(event) =>
                  updateSettings({ ghostWriterEnabled: event.target.checked })
                }
              />
              Ghost writer
            </label>
            <label className="block space-y-2 text-sm">
              Ghost speed (WPM)
              <input
                type="number"
                min={1}
                max={MAX_GHOST_SPEED}
                className={fieldClass}
                style={fieldStyle}
                value={settings.ghostWriterSpeed}
                onChange={(event) =>
                  updateSettings({
                    ghostWriterSpeed: Math.max(
                      1,
                      Math.min(MAX_GHOST_SPEED, Number(event.target.value) || 1),
                    ),
                  })
                }
              />
            </label>
          </fieldset>
        </RoomDialog>
        <RoomDialog
          open={modal === "theme"}
          onClose={() => setModal(null)}
          title="Participant theme"
          description="Choose a preset or customize the typing colors shared with participants."
        >
          <fieldset disabled={locked} className="space-y-4">
            {!themes && !themeError && <p role="status">Loading themes…</p>}
            {themeError && (
              <p role="alert">
                {themeError}
                <RoomButton onClick={loadThemes}>
                  <ArrowsClockwiseIcon className="size-4 shrink-0" aria-hidden="true" />
                  Retry
                </RoomButton>
              </p>
            )}
            <label className="block space-y-2 text-sm">
              Theme preset
              <select
                className={fieldClass}
                style={fieldStyle}
                value={themeName}
                onChange={(event) => {
                  const selected = themes?.find(
                    (entry) => entry.name === event.target.value,
                  );
                  setThemeName(event.target.value);
                  if (!selected) {
                    updateSettings({ theme: DEFAULT_THEME });
                    return;
                  }
                  const colors =
                    colorMode === "light" && selected.light
                      ? selected.light
                      : selected.dark;
                  updateSettings({
                    theme: {
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
                    },
                  });
                }}
              >
                <option value="Default">Default</option>
                {themeName === "Custom" && (
                  <option value="Custom">Custom</option>
                )}
                {themes?.map((entry) => (
                  <option key={entry.id} value={entry.name}>
                    {entry.name}
                  </option>
                ))}
              </select>
            </label>
            <details>
              <summary className="cursor-pointer rounded py-2 text-sm">
                Custom colors
              </summary>
              <div className="space-y-3 py-3">
                {(Object.keys(DEFAULT_THEME) as (keyof Theme)[]).map((key) => (
                  <label
                    key={key}
                    className="flex flex-wrap items-center justify-between gap-2 text-sm"
                  >
                    <span>{key.replace(/([A-Z])/g, " $1")}</span>
                    <input
                      aria-label={key.replace(/([A-Z])/g, " $1")}
                      type="color"
                      className="h-10 w-14 cursor-pointer rounded border"
                      value={theme[key]}
                      onChange={(event) => {
                        setThemeName("Custom");
                        updateSettings({
                          theme: { ...theme, [key]: event.target.value },
                        });
                      }}
                    />
                  </label>
                ))}
              </div>
            </details>
            <RoomButton
              onClick={() => {
                setThemeName("Default");
                updateSettings({ theme: DEFAULT_THEME });
              }}
            >
              <ArrowClockwiseIcon className="size-4 shrink-0" aria-hidden="true" />
              Reset theme
            </RoomButton>
          </fieldset>
        </RoomDialog>
        <RoomDialog
          open={Boolean(confirmation)}
          onClose={() => setConfirmation(null)}
          title={
            confirmation?.kind === "remove"
              ? "Remove participant?"
              : "Reset participant?"
          }
          description={
            confirmation?.kind === "remove"
              ? `Remove ${confirmation.name} from this room.`
              : `Clear ${confirmation?.name ?? "this participant"}'s text, clock and progress.`
          }
        >
          {actionError && <p role="alert">{actionError}</p>}
          <div className="flex flex-wrap justify-end gap-3">
            <RoomButton onClick={() => setConfirmation(null)} disabled={busy}>
              <XIcon className="size-4 shrink-0" aria-hidden="true" />
              Cancel
            </RoomButton>
            <RoomButton
              selected
              disabled={busy}
              onClick={async () => {
                if (!confirmation) return;
                const result = await perform(() =>
                  confirmation.kind === "remove"
                    ? kickParticipant({
                        participantId: confirmation.id as Id<"participants">,
                      })
                    : resetParticipant({
                        participantId: confirmation.id as Id<"participants">,
                      }),
                );
                if (result) setConfirmation(null);
              }}
            >
              {confirmation?.kind === "remove" ? <UserMinusIcon className="size-4 shrink-0" aria-hidden="true" /> : <ArrowClockwiseIcon className="size-4 shrink-0" aria-hidden="true" />}
              {confirmation?.kind === "remove"
                ? "Remove participant"
                : "Reset participant"}
            </RoomButton>
          </div>
        </RoomDialog>
      </div>
    </RoomPage>
  );
}

export default function Host() {
  const [params] = useSearchParams();
  const hostName = params.get("name")?.trim();
  if (!hostName)
    return (
      <RoomPage>
        <div className="mx-auto max-w-md space-y-6 py-6">
          <Link to="/connect" className="inline-flex items-center justify-center gap-2">
            <ArrowLeftIcon className="size-4 shrink-0" aria-hidden="true" />
            Back to Connect
          </Link>
          <HostCard />
        </div>
      </RoomPage>
    );
  return <ActiveHostSession key={hostName} hostName={hostName} />;
}
