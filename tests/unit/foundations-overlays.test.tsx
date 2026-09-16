import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";

beforeEach(() => {
  vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} });
});

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("shared overlay and field contracts", () => {
  it("names a modal, dismisses with Escape, and restores its trigger", async () => {
    render(
      <Dialog>
        <DialogTrigger>Open preferences</DialogTrigger>
        <DialogContent>
          <DialogTitle>Preferences</DialogTitle>
          <DialogDescription>Adjust your practice settings.</DialogDescription>
          <button>First setting</button>
        </DialogContent>
      </Dialog>
    );

    const trigger = screen.getByRole("button", { name: "Open preferences" });
    fireEvent.click(trigger);
    const dialog = screen.getByRole("dialog", { name: "Preferences" });
    expect(dialog).toHaveAccessibleDescription("Adjust your practice settings.");
    await waitFor(() => expect(screen.getByRole("button", { name: "First setting" })).toHaveFocus());
    fireEvent.keyDown(document.activeElement!, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
  });

  it("forwards the slider label and description to its interactive thumb", () => {
    render(<><span id="speed-help">Words per minute</span><Slider defaultValue={[60]} aria-label="Ghost speed" aria-describedby="speed-help" /></>);
    const slider = screen.getByRole("slider", { name: "Ghost speed" });
    expect(slider).toHaveAccessibleDescription("Words per minute");
    expect(slider).toHaveAttribute("aria-valuenow", "60");
  });

  it("supports distinct names for each range thumb", () => {
    render(<Slider defaultValue={[20, 80]} thumbLabels={["Minimum speed", "Maximum speed"]} />);
    expect(screen.getByRole("slider", { name: "Minimum speed" })).toHaveAttribute("aria-valuenow", "20");
    expect(screen.getByRole("slider", { name: "Maximum speed" })).toHaveAttribute("aria-valuenow", "80");
  });
});
