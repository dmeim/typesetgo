import { useState } from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ColorPicker from "@/components/typing/ColorPicker";

function ControlledPicker() {
  const [value, setValue] = useState("#ff0000");
  return <><ColorPicker value={value} onChange={setValue} /><output>{value}</output></>;
}

beforeEach(() => {
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("ColorPicker", () => {
  it("names its controls and restores focus after Escape", async () => {
    render(<ControlledPicker />);
    const trigger = screen.getByRole("button", { name: "Pick color" });
    trigger.focus();
    fireEvent.click(trigger);
    expect(screen.getByRole("dialog", { name: "Color picker" })).toBeInTheDocument();
    expect(screen.getByRole("slider", { name: "Hue" })).toHaveAttribute("aria-valuenow", "0");
    expect(screen.getByRole("slider", { name: "Saturation" })).toHaveValue("100");
    expect(screen.getByRole("slider", { name: "Brightness" })).toHaveValue("100");
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await waitFor(() => expect(trigger).toHaveFocus());
  });

  it("supports keyboard hue and independent saturation/brightness adjustments", () => {
    render(<ControlledPicker />);
    fireEvent.click(screen.getByRole("button", { name: "Pick color" }));
    fireEvent.keyDown(screen.getByRole("slider", { name: "Hue" }), { key: "PageUp" });
    expect(screen.getByRole("slider", { name: "Hue" })).toHaveAttribute("aria-valuenow", "10");
    fireEvent.change(screen.getByRole("slider", { name: "Saturation" }), { target: { value: "0" } });
    expect(screen.getByRole("status")).toHaveTextContent("#ffffff");
    fireEvent.change(screen.getByRole("slider", { name: "Brightness" }), { target: { value: "50" } });
    expect(screen.getByRole("status")).toHaveTextContent("#808080");
  });

  it("keeps invalid hex drafts local and publishes valid colors", () => {
    render(<ControlledPicker />);
    fireEvent.click(screen.getByRole("button", { name: "Pick color" }));
    const field = screen.getByRole("textbox", { name: "Hex color" });
    fireEvent.change(field, { target: { value: "xyz" } });
    expect(field).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("status")).toHaveTextContent("#ff0000");
    fireEvent.change(field, { target: { value: "0f0" } });
    expect(field).toHaveAttribute("aria-invalid", "false");
    expect(screen.getByRole("status")).toHaveTextContent("#0f0");
  });

  it("captures touch drags and stops changing the color after cancellation", () => {
    class TestPointerEvent extends MouseEvent {
      pointerId = 7;
      pointerType = "touch";
      isPrimary = true;
    }
    vi.stubGlobal("PointerEvent", TestPointerEvent);
    render(<ControlledPicker />);
    fireEvent.click(screen.getByRole("button", { name: "Pick color" }));
    const hue = screen.getByRole("slider", { name: "Hue" });
    const capture = vi.fn();
    const release = vi.fn();
    Object.assign(hue, {
      setPointerCapture: capture,
      hasPointerCapture: () => true,
      releasePointerCapture: release,
      getBoundingClientRect: () => ({ left: 0, top: 0, width: 180, height: 180 }),
    });
    fireEvent.pointerDown(hue, { clientX: 180, clientY: 90, button: 0 });
    expect(capture).toHaveBeenCalledWith(7);
    expect(hue).toHaveAttribute("aria-valuenow", "90");
    fireEvent.pointerMove(hue, { clientX: 90, clientY: 180 });
    expect(hue).toHaveAttribute("aria-valuenow", "180");
    fireEvent.pointerCancel(hue);
    expect(release).toHaveBeenCalledWith(7);
    fireEvent.pointerMove(hue, { clientX: 0, clientY: 90 });
    expect(hue).toHaveAttribute("aria-valuenow", "180");
  });
});
