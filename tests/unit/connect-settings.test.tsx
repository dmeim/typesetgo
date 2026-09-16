import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { DndContext } from "@dnd-kit/core";
import { SortableContext } from "@dnd-kit/sortable";
import { MAX_DURATION_SECONDS, MAX_WORD_TARGET, MAX_GHOST_SPEED, TEXT_SIZE_MAX } from "@/lib/practice-limits";
import { DEFAULT_THEME, normalizePracticeSettings, type SettingsState } from "@/lib/typing-constants";
import {
  isTimedPractice,
  practiceSessionKey,
  resolveRoomSettings,
} from "@/components/connect/room-settings";
import PracticeSettings from "@/components/connect/PracticeSettings";
import UserHostCard from "@/components/connect/UserHostCard";
import PlanBuilderModal from "@/components/plan/PlanBuilderModal";
import SoundSettingsModal from "@/components/settings/SoundSettingsModal";

vi.mock("@/lib/words", () => ({
  fetchWordsManifest: async () => ({ difficulties: ["medium"] }),
}));
vi.mock("@/lib/quotes", () => ({
  fetchQuotesManifest: async () => ({ lengths: ["short"] }),
}));
afterEach(cleanup);
const plan: SettingsState["plan"] = [
  {
    id: "first",
    mode: "words",
    settings: { wordTarget: 10 },
    metadata: { title: "Warm-up", subtitle: "" },
    syncSettings: { waitForAll: true, zenWaiting: true },
  },
  {
    id: "second",
    mode: "preset",
    settings: {
      presetModeType: "time",
      presetText: "Hello",
      duration: 20,
      typingSound: "local",
    },
    metadata: { title: "Text", subtitle: "" },
    syncSettings: { waitForAll: false, zenWaiting: false },
  },
];

describe("host-led settings", () => {
  it("resolves the selected concrete step while retaining room sound ownership", () => {
    const resolved = resolveRoomSettings({
      mode: "plan",
      plan,
      planIndex: 1,
      typingSound: "shared",
      warningSound: "clock",
      errorSound: "",
      soundEnabled: true,
    });
    expect(resolved).toMatchObject({
      mode: "preset",
      presetModeType: "time",
      presetText: "Hello",
      duration: 20,
      typingSound: "shared",
      warningSound: "clock",
      errorSound: "",
      soundEnabled: true,
    });
    expect(resolved).not.toHaveProperty("plan");
    expect(resolved).not.toHaveProperty("planIndex");
    expect(isTimedPractice(resolved!)).toBe(true);
    expect(
      resolveRoomSettings({ mode: "plan", plan, planIndex: 3 }),
    ).toBeUndefined();
    expect(
      resolveRoomSettings({ mode: "plan", plan, planIndex: -1 }),
    ).toBeUndefined();
  });
  it("identifies runs, resets and host-selected steps independently", () => {
    const settings = { mode: "plan" as const, plan, planIndex: 0 };
    const initial = practiceSessionKey("room", 0, 0, settings);
    expect(practiceSessionKey("room", 1, 0, settings)).not.toBe(initial);
    expect(practiceSessionKey("room", 0, 1, settings)).not.toBe(initial);
    expect(
      practiceSessionKey("room", 0, 0, { ...settings, planIndex: 1 }),
    ).not.toBe(initial);
  });
  it("edits the duration of a timed preset without changing word count", async () => {
    const onChange = vi.fn();
    render(
      <PracticeSettings
        settings={{
          mode: "preset",
          presetModeType: "time",
          presetText: "Hello",
          duration: 30,
          wordTarget: 25,
        }}
        onChange={onChange}
      />,
    );
    fireEvent.change(screen.getByLabelText("Duration (seconds)"), {
      target: { value: "45" },
    });
    expect(onChange).toHaveBeenCalledWith({ duration: 45 });
    expect(screen.queryByLabelText("Word count")).not.toBeInTheDocument();
    expect(screen.getByText(/whichever comes first/)).toBeVisible();
  });
  it("saves a host-led plan without exposing unsupported automatic controls", () => {
    const onSave = vi.fn();
    render(
      <PlanBuilderModal
        initialPlan={plan}
        onSave={onSave}
        onClose={vi.fn()}
        isConnectMode
      />,
    );
    expect(screen.queryByText(/wait for all/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/zen waiting/i)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Save plan" }));
    expect(onSave.mock.calls[0][0][0].syncSettings).toEqual({
      waitForAll: false,
      zenWaiting: false,
    });
  });
});

describe("participant controls", () => {
  it("uses milliseconds for timed progress and restricts dragging to its named handle", () => {
    const user = {
      id: "p1",
      name: "Participant with a long name",
      stats: {
        wpm: 54,
        accuracy: 98,
        progress: 14,
        wordsTyped: 8,
        timeElapsed: 12000,
        isFinished: false,
      },
    };
    render(
      <DndContext>
        <SortableContext items={[user.id]}>
          <UserHostCard
            user={user}
            settings={{ mode: "time", duration: 30 }}
            viewMode="grid"
            theme={DEFAULT_THEME}
            cardSize={2}
            onReset={vi.fn()}
            onKick={vi.fn()}
          />
        </SortableContext>
      </DndContext>,
    );
    expect(screen.getByText("18s left")).toBeVisible();
    expect(screen.getByRole("progressbar")).toHaveAttribute(
      "aria-valuenow",
      "40",
    );
    expect(screen.getByRole("article")).not.toHaveAttribute("tabindex");
    expect(
      screen.getByRole("button", {
        name: "Reorder Participant with a long name",
      }),
    ).toBeVisible();
    expect(
      screen.getByRole("button", {
        name: "Reset Participant with a long name",
      }),
    ).toBeVisible();
    expect(
      screen.getByRole("button", {
        name: "Remove Participant with a long name",
      }),
    ).toBeVisible();
  });
  it("disables sound controls for keyboard users when sound is off and hides unavailable error packs", () => {
    render(
      <SoundSettingsModal
        isOpen
        onClose={vi.fn()}
        settings={{ soundEnabled: false, typingSound: "creamy" }}
        onUpdateSettings={vi.fn()}
        soundManifest={{
          typing: { creamy: ["1.wav"] },
          warning: { clock: ["1.wav"] },
          error: {},
        }}
      />,
    );
    expect(screen.getByLabelText("Typing sound")).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Preview typing sound" }),
    ).toBeDisabled();
    expect(screen.queryByLabelText("Error sound")).not.toBeInTheDocument();
  });
});

describe("host and executor settings agreement", () => {
  it("bounds and rounds custom amounts before sharing them with the room", () => {
    const onChange = vi.fn();
    const view = render(<PracticeSettings settings={{ mode: "time", duration: 30 }} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText("Duration (seconds)"), { target: { value: "30000" } });
    expect(onChange).toHaveBeenLastCalledWith({ duration: MAX_DURATION_SECONDS });
    fireEvent.change(screen.getByLabelText("Duration (seconds)"), { target: { value: "1.5" } });
    expect(onChange).toHaveBeenLastCalledWith({ duration: 2 });
    view.rerender(<PracticeSettings settings={{ mode: "words", wordTarget: 25 }} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText("Word count"), { target: { value: "10000" } });
    expect(onChange).toHaveBeenLastCalledWith({ wordTarget: MAX_WORD_TARGET });
  });
  it("retains every supported boundary through the Join adapter and executor normalization", () => {
    const supported = {
      mode: "time" as const, duration: MAX_DURATION_SECONDS, wordTarget: MAX_WORD_TARGET,
      typingFontSize: TEXT_SIZE_MAX, ghostWriterSpeed: MAX_GHOST_SPEED,
    };
    const normalized = normalizePracticeSettings(resolveRoomSettings(supported) as SettingsState);
    expect(normalized).toMatchObject(supported);
  });
});
