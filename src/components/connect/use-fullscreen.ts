import { useEffect, useState } from "react";

/** Whether any element is fullscreen, kept in sync with Escape and browser controls. */
export function useFullscreen() {
  const [fullscreen, setFullscreen] = useState(() => typeof document !== "undefined" && Boolean(document.fullscreenElement));
  useEffect(() => {
    const change = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", change);
    return () => document.removeEventListener("fullscreenchange", change);
  }, []);
  return fullscreen;
}
