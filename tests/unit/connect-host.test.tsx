import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { getFunctionName } from "convex/server";
import Host from "@/pages/Host";
import type { SettingsState } from "@/lib/typing-constants";

const mocks = vi.hoisted(() => ({
  room: { _id: "room", code: "ABCDE", hostName: "Returning Host", status: "waiting", settings: { mode: "time", duration: 75 } },
  mutations: {} as Record<string, ReturnType<typeof vi.fn>>,
  catalog: vi.fn(), palette: vi.fn(),
}));
vi.mock("@/hooks/useTheme", () => ({ useTheme: () => ({ mode: "dark" }) }));
vi.mock("@/hooks/useSessionId", () => ({ useSessionId: () => "host" }));
vi.mock("convex/react", () => ({
  useQuery: (ref: Parameters<typeof getFunctionName>[0], args: unknown) => args === "skip" ? undefined : getFunctionName(ref) === "rooms:getByCode" ? mocks.room : [],
  useMutation: (ref: Parameters<typeof getFunctionName>[0]) => mocks.mutations[getFunctionName(ref)] ??= vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/lib/themes", () => ({ fetchThemeCatalogIndex: () => mocks.catalog(), fetchTheme: (id: string) => mocks.palette(id) }));
vi.mock("@/lib/sounds", () => ({ fetchSoundManifest: async () => ({}) }));
vi.mock("@/components/typing/SoundController", () => ({ default: () => null }));
vi.mock("@/components/connect/PracticeSettings", () => ({ default: ({ settings, onChange }: { settings: Partial<SettingsState>; onChange: (value: Partial<SettingsState>) => void }) =>
  <input aria-label="Duration" value={settings.duration} onChange={(event) => onChange({ duration: Number(event.target.value) })} /> }));
function view(path = "/connect/host/room") {
  return <MemoryRouter initialEntries={[path]}><Routes>
    <Route path="/connect/host" element={<Host />} /><Route path="/connect/host/:roomId" element={<Host />} />
  </Routes></MemoryRouter>;
}
beforeEach(() => {
  mocks.mutations = {};
  mocks.mutations["rooms:resume"] = vi.fn().mockResolvedValue({ roomId: "room", code: "ABCDE" });
  mocks.mutations["rooms:create"] = vi.fn().mockResolvedValue({ roomId: "room", code: "ABCDE" });
  mocks.catalog.mockReset().mockResolvedValue({ themes: [{ id: "sample", name: "Sample" }] });
  mocks.palette.mockReset().mockResolvedValue(null);
});
afterEach(cleanup);

it("restores persisted settings and saves rapid draft edits only on Apply or Start", async () => {
  render(view());
  await screen.findByRole("heading", { name: "Host panel" });
  expect(screen.getByLabelText("Duration")).toHaveValue("75");
  expect(mocks.mutations["rooms:create"]).not.toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText("Duration"), { target: { value: "80" } });
  fireEvent.change(screen.getByLabelText("Duration"), { target: { value: "90" } });
  expect(mocks.mutations["rooms:updateSettings"]).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Start test" }));
  await waitFor(() => expect(mocks.mutations["rooms:setStatus"]).toHaveBeenCalledTimes(1));
  expect(mocks.mutations["rooms:updateSettings"]).toHaveBeenCalledTimes(1);
  expect(mocks.mutations["rooms:updateSettings"].mock.calls[0][0].settings.duration).toBe(90);
});

it("does not start when saving the draft fails and retries the current draft", async () => {
  mocks.mutations["rooms:updateSettings"] = vi.fn().mockRejectedValueOnce(new Error("Offline")).mockResolvedValue(undefined);
  render(view());
  await screen.findByRole("heading", { name: "Host panel" });
  fireEvent.change(screen.getByLabelText("Duration"), { target: { value: "99" } });
  fireEvent.click(screen.getByRole("button", { name: "Start test" }));
  await screen.findByRole("alert");
  expect(mocks.mutations["rooms:setStatus"]).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Start test" }));
  await waitFor(() => expect(mocks.mutations["rooms:setStatus"]).toHaveBeenCalledTimes(1));
  expect(mocks.mutations["rooms:updateSettings"].mock.calls[1][0].settings.duration).toBe(99);
});

it("loads catalog metadata only, retries catalog failure, then retries just the selected palette", async () => {
  mocks.catalog.mockResolvedValueOnce(null).mockResolvedValue({ themes: [{ id: "sample", name: "Sample" }] });
  const dark = { typing: { cursor: "#111111", default: "#222222", upcoming: "#333333", correct: "#444444", incorrect: "#555555", cursorGhost: "#666666" }, interactive: { primary: { DEFAULT: "#777777" }, secondary: { DEFAULT: "#888888" } }, bg: { base: "#999999", surface: "#aaaaaa" } };
  mocks.palette.mockResolvedValueOnce(null).mockResolvedValue({ dark });
  render(view());
  await screen.findByRole("heading", { name: "Host panel" });
  expect(mocks.catalog).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Participant theme" }));
  await screen.findByText("Unable to load themes. Try again.");
  fireEvent.click(screen.getByRole("button", { name: "Retry", exact: true }));
  await screen.findByRole("option", { name: "Sample" });
  expect(mocks.palette).not.toHaveBeenCalled();
  fireEvent.change(screen.getByRole("combobox", { name: "Theme preset" }), { target: { value: "sample" } });
  await screen.findByText("Unable to load this palette. Retry or choose another theme.");
  fireEvent.click(screen.getByRole("button", { name: "Retry", exact: true }));
  await waitFor(() => expect(screen.queryByText("Unable to load this palette. Retry or choose another theme.")).not.toBeInTheDocument());
  expect(mocks.catalog).toHaveBeenCalledTimes(2);
  expect(mocks.palette).toHaveBeenCalledTimes(2);
  expect(mocks.palette).toHaveBeenLastCalledWith("sample");
});
