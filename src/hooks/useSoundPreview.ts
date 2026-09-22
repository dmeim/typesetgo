import { useCallback, useEffect, useRef, useState } from "react";
import { getRandomSoundUrl, type SoundManifest } from "@/lib/sounds";

/** One preview at a time; close, disable, selection changes and unmount stop it. */
export function useSoundPreview(manifest: SoundManifest | null, enabled: boolean, selection: string) {
  const current = useRef<HTMLAudioElement | null>(null);
  const [error, setError] = useState("");
  const stop = useCallback(() => {
    current.current?.pause();
    current.current = null;
  }, []);
  useEffect(() => stop, [enabled, selection, stop]);
  const play = useCallback((category: "typing" | "warning", pack: string) => {
    stop();
    if (!enabled) return;
    const url = getRandomSoundUrl(manifest, category, pack);
    if (!url) return;
    setError("");
    try {
      const audio = new Audio(url);
      current.current = audio;
      audio.volume = 0.5;
      void audio.play().catch(() => {
        if (current.current === audio) setError("Unable to play this preview.");
      });
    } catch {
      setError("Unable to play this preview.");
    }
  }, [enabled, manifest, stop]);
  return { play, stop, error };
}
