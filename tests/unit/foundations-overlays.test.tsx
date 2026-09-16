import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";

beforeEach(() => {
  vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} });
});

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("shared overlay and field contracts", () => {
  it("dismisses only the deepest dialog on an immediate Escape", async () => {
    render(<Dialog defaultOpen><DialogContent><DialogTitle>Parent</DialogTitle><DialogDescription>Parent settings</DialogDescription><Dialog><DialogTrigger>Open child</DialogTrigger><DialogContent><DialogTitle>Child</DialogTitle><DialogDescription>Child settings</DialogDescription><button>Cancel child</button></DialogContent></Dialog></DialogContent></Dialog>);
    fireEvent.click(screen.getByRole("button", { name: "Open child" }));
    fireEvent.keyDown(window, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Child" })).not.toBeInTheDocument());
    expect(screen.getByRole("dialog", { name: "Parent" })).toBeInTheDocument();
  });

  it("lets an overlay explicitly prevent Escape dismissal", () => {
    render(<Dialog defaultOpen><DialogContent onEscapeKeyDown={(event) => event.preventDefault()}><DialogTitle>Keep open</DialogTitle><DialogDescription>Pending operation</DialogDescription></DialogContent></Dialog>);
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.getByRole("dialog", { name: "Keep open" })).toBeInTheDocument();
  });

  it("restores an external opener for a controlled dialog without a DialogTrigger", async () => {
    function Controlled() {
      const [open, setOpen] = useState(false);
      return <><button onClick={() => setOpen(true)}>Open external settings</button><Dialog open={open} onOpenChange={setOpen}><DialogContent><DialogTitle>External settings</DialogTitle><DialogDescription>Settings</DialogDescription><button>Inside</button></DialogContent></Dialog></>;
    }
    render(<Controlled />);
    const opener = screen.getByRole("button", { name: "Open external settings" });
    opener.focus();
    fireEvent.click(opener);
    await waitFor(() => expect(screen.getByRole("button", { name: "Inside" })).toHaveFocus());
    fireEvent.keyDown(document.activeElement!, { key: "Escape" });
    await waitFor(() => expect(opener).toHaveFocus());
  });

  it("honors an explicit close-focus destination over the captured opener", async () => {
    function Controlled() {
      const [open, setOpen] = useState(false);
      return <><button onClick={() => setOpen(true)}>Open</button><button id="surviving-focus">Destination</button><Dialog open={open} onOpenChange={setOpen}><DialogContent onCloseAutoFocus={(event) => { event.preventDefault(); document.getElementById("surviving-focus")?.focus(); }}><DialogTitle>Settings</DialogTitle><DialogDescription>Preferences</DialogDescription></DialogContent></Dialog></>;
    }
    render(<Controlled />);
    const opener = screen.getByRole("button", { name: "Open" });
    opener.focus();
    fireEvent.click(opener);
    await waitFor(() => expect(screen.getByRole("button", { name: "Close" })).toHaveFocus());
    fireEvent.keyDown(document.activeElement!, { key: "Escape" });
    await waitFor(() => expect(screen.getByRole("button", { name: "Destination" })).toHaveFocus());
  });

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
