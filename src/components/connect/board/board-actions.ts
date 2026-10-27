import { toast } from "@/lib/toast-manager";

/** Where students join, shown next to the code (host and path, no scheme). */
export function joinHost() {
  return typeof window === "undefined" ? "/connect/join" : `${window.location.host}/connect/join`;
}

/** The card-only board for a pop-out window or second tab. */
export const boardPath = (roomId: string) => `/connect/host/${roomId}/board`;

/** Toggles fullscreen on an element, or the whole page when none is given. */
export async function toggleFullscreen(element?: HTMLElement | null) {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await (element ?? document.documentElement).requestFullscreen();
  } catch {
    toast.add({ type: "error", title: "Fullscreen isn't available in this browser" });
  }
}

export function popOutBoard(roomId: string) {
  const opened = window.open(boardPath(roomId), `typesetgo-board-${roomId}`, "popup=yes,width=1200,height=800");
  if (!opened) toast.add({ type: "error", title: "The pop-out was blocked", description: "Allow pop-ups for this site, or use New tab." });
}
