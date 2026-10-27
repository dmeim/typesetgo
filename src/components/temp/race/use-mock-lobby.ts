import { useEffect, useEffectEvent, useState } from "react";
import { BOT_READY_DELAYS, BOTS, LATE_BOT_ID, YOU_ID, hostIdFor, youProfile, type RacerProfile } from "./race-mock";
import type { RaceLab } from "./use-race-lab";

export interface LobbyRacer extends RacerProfile {
  ready: boolean;
  isHost: boolean;
  isYou: boolean;
}

export interface MockLobby {
  /** Host first, then you, then everyone else in join order. */
  racers: LobbyRacer[];
  you: LobbyRacer;
  isHost: boolean;
  readyCount: number;
  allReady: boolean;
  /** Seconds left before the race opens; only meaningful while `starting`. */
  countdown: number;
  starting: boolean;
  toggleReady: () => void;
}

/**
 * A lobby that fills itself: the pretend racers ready up one by one, Leo waits until you are ready,
 * and once everyone is set a three-second countdown runs and `onStart` fires (the real room auto-starts the same way).
 */
export function useMockLobby(lab: RaceLab, onStart: () => void): MockLobby {
  const [botReady, setBotReady] = useState<Record<string, boolean>>({});
  const [youReady, setYouReady] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const hostId = hostIdFor(lab.role);
  const allReady = youReady && BOTS.every((bot) => botReady[bot.id]);
  const start = useEffectEvent(onStart);

  useEffect(() => {
    const timers = Object.entries(BOT_READY_DELAYS).map(([id, delay]) =>
      window.setTimeout(() => setBotReady((current) => ({ ...current, [id]: true })), delay));
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, []);

  useEffect(() => {
    if (!youReady) return;
    const timer = window.setTimeout(() => setBotReady((current) => ({ ...current, [LATE_BOT_ID]: true })), 1300);
    return () => window.clearTimeout(timer);
  }, [youReady]);

  useEffect(() => {
    if (!allReady) return;
    const begin = Date.now();
    const timer = window.setInterval(() => {
      const left = 3 - Math.floor((Date.now() - begin) / 1000);
      setCountdown(Math.max(0, left));
      if (left <= 0) {
        window.clearInterval(timer);
        start();
      }
    }, 100);
    return () => window.clearInterval(timer);
  }, [allReady]);

  const me: LobbyRacer = { ...youProfile(lab.you), ready: youReady, isHost: hostId === YOU_ID, isYou: true };
  const others = BOTS.map((bot): LobbyRacer => ({ ...bot, ready: !!botReady[bot.id], isHost: bot.id === hostId, isYou: false }));
  const racers = me.isHost ? [me, ...others] : [...others.filter((racer) => racer.isHost), me, ...others.filter((racer) => !racer.isHost)];

  return {
    racers,
    you: me,
    isHost: me.isHost,
    readyCount: racers.filter((racer) => racer.ready).length,
    allReady,
    countdown,
    starting: allReady,
    toggleReady: () => { if (!allReady) setYouReady((current) => !current); },
  };
}
