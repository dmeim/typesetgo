import { useEffect, useEffectEvent, useRef, useState, type RefObject } from "react";
import {
  AUTO_TIMES, BOT_FINISH_MS, BOTS, COUNTDOWN_MS, DEADLINE_MS, PASSAGE, YOU_ID, autoCharsAfter, botChars, hostIdFor, wpmFrom, youProfile,
  type RaceResult, type RacerProfile,
} from "./race-mock";
import type { RaceLab } from "./use-race-lab";

export type RacePhase = "countdown" | "racing" | "done";

export interface LiveRacer extends RacerProfile {
  isYou: boolean;
  isHost: boolean;
  /** 0 to 1. */
  progress: number;
  chars: number;
  liveWpm: number;
  liveAccuracy: number;
  finishMs: number | null;
  /** Standing right now: finishers by time, then everyone else by distance. */
  place: number;
}

export interface MockRace {
  phase: RacePhase;
  /** 3, 2, 1 during the countdown. */
  countdown: number;
  /** Milliseconds since the start (negative during the countdown), frozen once the race ends. */
  elapsed: number;
  racers: LiveRacer[];
  you: LiveRacer;
  finishedCount: number;
  /** Seconds left once three racers have finished. */
  endsIn: number | null;
  /** Seconds before the results screen opens on its own. */
  resultsIn: number | null;
  results: RaceResult[];
  passage: string;
  typed: string;
  onInput: (value: string) => void;
  inputRef: RefObject<HTMLInputElement | null>;
  autoPlay: boolean;
  setAutoPlay: (on: boolean) => void;
  restart: () => void;
  showResults: () => void;
}

/** Autoplay took over at character `from`, `at` milliseconds into the race. */
interface AutoRun {
  from: number;
  at: number;
}

const RESULTS_AFTER_MS = 4000;
const START_AUTO: AutoRun = { from: 0, at: 0 };
const nextStart = () => Date.now() + COUNTDOWN_MS;

function correctChars(typed: string) {
  let count = 0;
  for (let index = 0; index < typed.length; index++) if (typed[index] === PASSAGE[index]) count++;
  return count;
}

function correctPrefix(typed: string) {
  let index = 0;
  while (index < typed.length && typed[index] === PASSAGE[index]) index++;
  return index;
}

/**
 * One scripted race. Pretend racers follow fixed speed curves; you either type for real or let autoplay drive.
 * Everything is worked out from the clock, so a throttled background tab still shows the right standings.
 * Typing any key takes over from autoplay. When the race ends the results open after a few seconds.
 */
export function useMockRace(lab: RaceLab, onResults: () => void): MockRace {
  const [startAt, setStartAt] = useState(nextStart);
  const [now, setNow] = useState(Date.now);
  const [manual, setManual] = useState("");
  const [keys, setKeys] = useState({ total: 0, errors: 0 });
  const [manualFinishMs, setManualFinishMs] = useState<number | null>(null);
  const [auto, setAuto] = useState<AutoRun | null>(START_AUTO);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 50);
    return () => window.clearInterval(timer);
  }, []);

  const raw = now - startAt;
  const autoFinishMs = auto ? auto.at + AUTO_TIMES[PASSAGE.length] - AUTO_TIMES[auto.from] : null;
  const youFinishMs = auto ? (autoFinishMs !== null && autoFinishMs <= raw ? autoFinishMs : null) : manualFinishMs;
  const finishes = [...Object.values(BOT_FINISH_MS), ...(youFinishMs === null ? [] : [youFinishMs])].sort((a, b) => a - b);
  const deadline = finishes[2] + DEADLINE_MS;
  const everyoneDone = youFinishMs === null ? Infinity : finishes[finishes.length - 1];
  const endMs = Math.min(deadline, everyoneDone);
  const elapsed = Math.min(raw, endMs);
  const phase: RacePhase = raw < 0 ? "countdown" : raw >= endMs ? "done" : "racing";
  const racing = phase === "racing" && youFinishMs === null;
  const autoChars = auto ? autoCharsAfter(auto.from, Math.max(0, elapsed) - auto.at) : 0;
  const typed = auto ? PASSAGE.slice(0, autoChars) : manual;
  const keyTotal = keys.total + (auto ? autoChars - auto.from : 0);

  const takeOver = () => {
    if (!auto) return typed;
    setManual(typed);
    setKeys((current) => ({ ...current, total: current.total + autoChars - auto.from }));
    setAuto(null);
    return typed;
  };

  const onInput = (value: string) => {
    if (!racing) return;
    const base = takeOver();
    const next = value.slice(0, PASSAGE.length);
    const appended = next.length > base.length && next.startsWith(base);
    const deleted = next.length < base.length && base.startsWith(next);
    if (!appended && !deleted) return;
    if (appended) {
      const added = next.slice(base.length);
      let errors = 0;
      for (let index = 0; index < added.length; index++) if (added[index] !== PASSAGE[base.length + index]) errors++;
      setKeys((current) => ({ total: current.total + added.length, errors: current.errors + errors }));
    }
    setManual(next);
    if (next === PASSAGE) setManualFinishMs(Date.now() - startAt);
  };

  const setAutoPlay = (on: boolean) => {
    if (!on) {
      takeOver();
      inputRef.current?.focus({ preventScroll: true });
      return;
    }
    if (auto || !racing) return;
    const from = correctPrefix(manual);
    setManual(PASSAGE.slice(0, from));
    setAuto({ from, at: Math.max(0, Date.now() - startAt) });
  };

  const me = youProfile(lab.you);
  const hostId = hostIdFor(lab.role);
  const youChars = correctChars(typed);
  const live = [
    {
      ...me,
      isYou: true,
      isHost: hostId === YOU_ID,
      chars: youChars,
      progress: youChars / PASSAGE.length,
      liveWpm: wpmFrom(youChars, youFinishMs ?? Math.max(0, elapsed)),
      liveAccuracy: keyTotal ? Math.round(((keyTotal - keys.errors) / keyTotal) * 100) : 100,
      finishMs: youFinishMs,
    },
    ...BOTS.map((bot) => {
      const finishMs = BOT_FINISH_MS[bot.id] <= elapsed ? BOT_FINISH_MS[bot.id] : null;
      const chars = finishMs === null ? Math.min(PASSAGE.length - 1, botChars(bot, Math.max(0, elapsed))) : PASSAGE.length;
      return {
        ...bot,
        isYou: false,
        isHost: bot.id === hostId,
        chars,
        progress: chars / PASSAGE.length,
        liveWpm: wpmFrom(chars, finishMs ?? Math.max(0, elapsed)),
        liveAccuracy: bot.accuracy,
        finishMs,
      };
    }),
  ];
  const racers: LiveRacer[] = [...live]
    .sort((a, b) => {
      if (a.finishMs !== null && b.finishMs !== null) return a.finishMs - b.finishMs;
      if (a.finishMs !== null || b.finishMs !== null) return a.finishMs === null ? 1 : -1;
      return b.chars - a.chars;
    })
    .map((racer, index) => ({ ...racer, place: index + 1 }));
  const you = racers.find((racer) => racer.isYou) ?? racers[0];

  const results: RaceResult[] = racers.map((racer) => ({
    id: racer.id,
    name: racer.name,
    emoji: racer.emoji,
    color: racer.color,
    isYou: racer.isYou,
    isHost: racer.isHost,
    place: racer.place,
    wpm: racer.liveWpm,
    accuracy: racer.liveAccuracy,
    finishMs: racer.finishMs,
    reactionMs: racer.reactionMs,
    progress: racer.progress,
  }));

  const showResults = () => {
    lab.saveResults(results);
    onResults();
  };
  const autoShow = useEffectEvent(showResults);

  useEffect(() => {
    if (phase !== "done") return;
    const timer = window.setTimeout(() => autoShow(), RESULTS_AFTER_MS);
    return () => window.clearTimeout(timer);
  }, [phase]);

  const restart = () => {
    setStartAt(nextStart());
    setNow(Date.now());
    setManual("");
    setKeys({ total: 0, errors: 0 });
    setManualFinishMs(null);
    setAuto(START_AUTO);
  };

  return {
    phase,
    countdown: Math.max(1, Math.ceil(-raw / 1000)),
    elapsed,
    racers,
    you,
    finishedCount: racers.filter((racer) => racer.finishMs !== null).length,
    endsIn: phase === "racing" && finishes.filter((ms) => ms <= elapsed).length >= 3 ? Math.max(0, Math.ceil((deadline - elapsed) / 1000)) : null,
    resultsIn: phase === "done" ? Math.max(0, Math.ceil((endMs + RESULTS_AFTER_MS - raw) / 1000)) : null,
    results,
    passage: PASSAGE,
    typed,
    onInput,
    inputRef,
    autoPlay: auto !== null,
    setAutoPlay,
    restart,
    showResults,
  };
}
