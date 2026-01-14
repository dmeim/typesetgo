// src/hooks/useSound.ts
import { useRef, useCallback } from "react";
import { getRandomSoundUrl, SOUND_MANIFEST } from "@/lib/sounds";

export function useSound() {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const playSound = useCallback((category: string, pack: string) => {
    const url = getRandomSoundUrl(SOUND_MANIFEST, category, pack);
    if (!url) return;

    // Reuse or create audio element
    if (!audioRef.current) {
      audioRef.current = new Audio();
    }

    audioRef.current.src = url;
    audioRef.current.volume = 0.5;
    audioRef.current.play().catch(() => {
      // Ignore autoplay errors
    });
  }, []);

  const playTypingSound = useCallback(
    (pack: string) => {
      playSound("typing", pack);
    },
    [playSound]
  );

  const playWarningSound = useCallback(
    (pack: string) => {
      playSound("warning", pack);
    },
    [playSound]
  );

  return { playTypingSound, playWarningSound, playSound };
}
