// Ways to put the mockup's live board on a projector, mirroring the real host panel.
import { toast } from "@/lib/toast-manager";

/** The card-only board; it mirrors the host tab's room over a BroadcastChannel. */
export const POPOUT_PATH = "/temp-connect?popout=board";

export const chip = "flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-border px-3.5 text-sm font-semibold transition-colors hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-40";

/** Toggles fullscreen on an element, or the whole page when none is given. */
export async function toggleFullscreen(element?: HTMLElement | null) {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await (element ?? document.documentElement).requestFullscreen();
  } catch {
    toast.add({ type: "error", title: "Fullscreen isn't available in this browser" });
  }
}

export function popOut() {
  const opened = window.open(POPOUT_PATH, "typesetgo-temp-board", "popup=yes,width=1200,height=800");
  if (!opened) toast.add({ type: "error", title: "The pop-out was blocked", description: "Allow pop-ups for this site, or use New tab." });
}
