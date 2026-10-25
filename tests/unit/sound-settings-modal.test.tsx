import { afterEach, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import SoundSettingsModal from "@/components/settings/SoundSettingsModal";

afterEach(cleanup);

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
  expect(screen.getByRole("button", { name: "Preview typing sound" })).toBeDisabled();
  expect(screen.queryByLabelText("Error sound")).not.toBeInTheDocument();
});
