import { afterEach, beforeAll, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { FontGallery } from "@/components/profile/FontGallery";
import { SettingsPreview } from "@/components/profile/SettingsPreview";
import { readProfileSettings, type ProfileSettings } from "@/components/profile/profile-settings";
import { TYPING_FONT_OPTIONS } from "@/lib/typing-fonts";
import type { ThemeColors } from "@/types/theme";
import theme from "../../public/themes/typesetgo.json";

vi.mock("@/components/profile/theme-catalog", () => ({ useThemeColors: () => null }));

const colors = theme.variants.default.dark as unknown as ThemeColors;
const selection = { themeId: "typesetgo", variantId: "default", mode: "dark" as const };

beforeAll(() => {
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
});

afterEach(() => {
  cleanup();
  localStorage.clear();
});

function renderPreview(settings: ProfileSettings) {
  return render(<SettingsPreview settings={settings} theme={selection} themeName="TypeSetGo" fallbackColors={colors} active="text" />);
}

it("shows the theme and the practice text in one preview card", () => {
  renderPreview(readProfileSettings());
  const previews = screen.getByRole("complementary", { name: "Previews" });
  const card = within(previews).getByRole("region", { name: /^Preview/ });
  expect(within(previews).getAllByRole("region")).toHaveLength(1);
  expect(within(card).getByRole("img", { name: /miniature typing homepage/ })).toBeInTheDocument();
  expect(within(card).getByRole("img", { name: /practice text at your current settings/ })).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /actual size/i })).not.toBeInTheDocument();
});

it("opens the Live Preview over the page with the current font and returns focus when closed", async () => {
  const settings = { ...readProfileSettings(), typingFontFamily: "lexend" };
  const { rerender } = renderPreview(settings);
  const trigger = screen.getByRole("button", { name: "Live Preview" });
  trigger.focus();
  fireEvent.click(trigger);
  const dialog = screen.getByRole("dialog", { name: "Live Preview" });
  const sample = () => dialog.querySelector<HTMLElement>("[data-practice-sample]");
  expect(sample()?.style.fontFamily).toMatch(/Lexend/);

  rerender(<SettingsPreview settings={{ ...settings, typingFontSize: 4 }} theme={selection} themeName="TypeSetGo" fallbackColors={colors} active="text" />);
  expect(sample()?.style.fontSize).toBe("4rem");

  fireEvent.keyDown(dialog, { key: "Escape" });
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  await waitFor(() => expect(trigger).toHaveFocus());
});

it("labels each font card with only Aa and the font name, written in that font", () => {
  const update = vi.fn();
  render(<FontGallery settings={readProfileSettings()} update={update} />);
  const font = TYPING_FONT_OPTIONS.find((option) => option.value === "lexend")!;
  const card = screen.getByRole("radio", { name: font.label });
  expect(card).toHaveTextContent(new RegExp(`^Aa${font.label}$`));
  expect(card.querySelector<HTMLElement>("[style]")?.style.fontFamily).toBe(font.fontFamily.replace(/'/g, "\""));
  fireEvent.click(card);
  expect(update).toHaveBeenCalledWith({ typingFontFamily: "lexend" });
});
