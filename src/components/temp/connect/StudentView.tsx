import { useEffect, useState, type CSSProperties } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowFatRightIcon, CoffeeIcon, ConfettiIcon, DoorOpenIcon, HourglassMediumIcon, PauseCircleIcon, SignInIcon, SignOutIcon, SpeakerHighIcon, SpeakerSlashIcon,
  StarIcon, UserMinusIcon,
} from "@phosphor-icons/react";
import { KeyboardStyleView } from "@/components/temp/keyboard/KeyboardStyleView";
import { LAB_SPRING } from "@/components/temp/settings/lab-settings";
import { useThemeColors } from "@/components/temp/settings/useLabSettings";
import { describeConnectTest, type ConnectTest } from "@/lib/connect-types";
import { themeCSSVariables } from "@/lib/theme-css";
import { getTypingFontFamily } from "@/lib/typing-fonts";
import { cn } from "@/lib/utils";
import { RESULTS_TICKS, SELF_PACED_REST_TICKS, average, formatClock, type Kid } from "./connect-mock";
import { KidAvatar, TestDots, TestRow } from "./ConnectParts";
import { kidPhase, kidProgress } from "./room-text";
import type { MockRoom } from "./use-mock-room";

const PASSAGE = "the sun came up over the hill and the birds began to sing a happy song for everyone";
const QUOTE = "Do not wait to strike till the iron is hot, but make it hot by striking.";
const UP_NEXT_MS = 2500;

function passageFor(test: ConnectTest | undefined) {
  if (test?.mode === "preset" && test.presetText?.trim()) return test.presetText.trim().replace(/\s+/g, " ").slice(0, 160);
  if (test?.mode === "quote") return QUOTE;
  return PASSAGE;
}

function Stat({ label, value, unit }: { label: string; value: number | string; unit?: string }) {
  return (
    <div className="rounded-2xl bg-muted/50 p-3 text-center">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="text-3xl font-black tabular-nums">{value}{unit && <span className="ml-1 text-sm font-normal text-muted-foreground">{unit}</span>}</p>
    </div>
  );
}

function Lobby({ room, you }: { room: MockRoom; you: Kid }) {
  const classmates = room.kids.filter((kid) => kid.online && !kid.isYou);
  return (
    <div className="flex flex-col items-center gap-5 text-center">
      <motion.span animate={{ rotate: [0, 0, 180, 180] }} transition={{ duration: 2.4, repeat: Infinity, times: [0, 0.4, 0.6, 1] }} className="text-primary">
        <HourglassMediumIcon weight="fill" className="size-12" aria-hidden="true" />
      </motion.span>
      <div>
        <h2 className="text-2xl font-black">Waiting for {room.host} to start</h2>
        <p className="text-muted-foreground">You're in as <strong className="text-foreground">{you.name}</strong>. Get comfy!</p>
      </div>
      <div className="flex items-center gap-2">
        <span className="flex -space-x-2" aria-hidden="true">
          {classmates.slice(0, 5).map((kid, index) => (
            <motion.span key={kid.id} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ ...LAB_SPRING, delay: 0.2 + index * 0.08 }}>
              <KidAvatar name={kid.name} photo={kid.signedIn} size="sm" className="ring-2 ring-card" />
            </motion.span>
          ))}
        </span>
        <span className="text-sm text-muted-foreground">{classmates.length} classmates here</span>
      </div>
      <ol className="flex w-full flex-col gap-1 text-left" aria-label="Tests in this room">
        {room.tests.map((test, index) => <TestRow key={test.id} test={test} title={room.labels[index].title} position={index} phase="upcoming" highlightId="student-test" />)}
      </ol>
    </div>
  );
}

/** Host-led: someone who joined mid-test waits for the next one. */
function Late({ room, step }: { room: MockRoom; step: number }) {
  const next = room.labels[step + 1]?.title;
  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <motion.span initial={{ scale: 0.6, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 300, damping: 12 }} className="flex size-20 items-center justify-center rounded-full bg-warning/15 text-warning">
        <HourglassMediumIcon weight="fill" className="size-10" aria-hidden="true" />
      </motion.span>
      <h2 className="text-2xl font-black">You'll start with the next test</h2>
      <p className="text-muted-foreground">The class is partway through <strong className="text-foreground">{room.labels[step]?.title}</strong>. Hang tight, you'll jump in{next ? <> for <strong className="text-foreground">{next}</strong></> : " soon"}.</p>
      <p className="text-xs text-muted-foreground">Your teacher can also let you start now.</p>
    </div>
  );
}

function Typing({ room, you, step }: { room: MockRoom; you: Kid; step: number }) {
  const { on, settings } = room.everyone;
  const test = room.tests[step];
  const passage = passageFor(test);
  const typed = Math.round((kidProgress(room, you) / 100) * passage.length);
  const ticks = room.pacing === "host" ? room.stepTicks : you.stepTicks;
  const ghostOn = on.ghost && settings.ghostWriterEnabled;
  const ghost = Math.min(passage.length, Math.round(ticks * settings.ghostWriterSpeed * 5 / 60 * 2.5));
  const keyboardOn = on.keyboard && settings.showOnScreenKeyboard;
  // The phone frame is small, so the room's text size is scaled down to fit.
  const textStyle: CSSProperties = on.text
    ? { fontFamily: getTypingFontFamily(settings.typingFontFamily), fontSize: `clamp(1rem, ${settings.typingFontSize * 0.4}rem, 2.2rem)`, textAlign: settings.textAlign }
    : {};
  const marks = [...passage].map((char, index) => (
    <span key={index} className={cn("relative", index < typed ? "text-foreground" : "text-muted-foreground/60")}>
      {index === typed && <motion.span aria-hidden="true" animate={{ opacity: [1, 0, 1] }} transition={{ duration: 1, repeat: Infinity }} className="absolute -left-px top-[0.15em] h-[1.1em] w-0.5 bg-primary" />}
      {ghostOn && index === ghost && <span aria-hidden="true" className="absolute -left-px top-[0.15em] h-[1.1em] w-0.5 bg-muted-foreground/70" />}
      {char}
    </span>
  ));
  return (
    <div className="flex flex-col gap-4">
      <p className={cn("rounded-3xl bg-background p-5 leading-relaxed", !on.text && "font-mono text-xl")} style={textStyle} aria-label="Your typing">{marks}</p>
      {ghostOn && <p className="-mt-2 text-center text-xs text-muted-foreground">The grey line is the ghost, typing at {settings.ghostWriterSpeed} wpm.</p>}
      {keyboardOn && <KeyboardStyleView style={settings.keyboardStyle} layoutId={settings.keyboardLayout} nextChar={passage[typed] ?? null} bare />}
      <div className="grid grid-cols-2 gap-3">
        <Stat label="Speed" value={you.wpm || "–"} unit="wpm" />
        <Stat label="Accuracy" value={you.accuracy ? `${you.accuracy}%` : "–"} />
      </div>
      <p className="text-center text-xs text-muted-foreground">{room.labels[step]?.title} · {test ? describeConnectTest(test) : ""}</p>
    </div>
  );
}

function Finished({ room, you, step, onNext }: { room: MockRoom; you: Kid; step: number; onNext: () => void }) {
  const selfPaced = room.pacing === "participant";
  const last = step + 1 >= room.tests.length;
  const nextTitle = room.labels[step + 1]?.title;
  const taking = room.kids.filter((kid) => kid.online && !room.late(kid));
  let line: string;
  if (selfPaced) line = last ? `Finishing in ${formatClock(SELF_PACED_REST_TICKS - you.restTicks)}` : `Next: ${nextTitle} in ${formatClock(SELF_PACED_REST_TICKS - you.restTicks)}`;
  else if (room.resultsTicks === null) line = `Waiting for everyone to finish · ${taking.filter((kid) => kid.finished).length} of ${taking.length} done`;
  else line = last ? `Finishing in ${formatClock(RESULTS_TICKS - room.resultsTicks)}` : `Next: ${nextTitle} in ${formatClock(RESULTS_TICKS - room.resultsTicks)}`;
  return (
    <div className="flex flex-col items-center gap-5 text-center">
      <motion.span initial={{ scale: 0, rotate: -40 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 400, damping: 12 }} className="text-warning">
        <StarIcon weight="fill" className="size-14" aria-hidden="true" />
      </motion.span>
      <h2 className="text-2xl font-black">Nice one, {you.name}!</h2>
      <div className="grid w-full grid-cols-2 gap-3">
        <Stat label="Speed" value={you.wpm} unit="wpm" />
        <Stat label="Accuracy" value={`${you.accuracy}%`} />
      </div>
      <p className="text-sm text-muted-foreground tabular-nums" aria-live="polite">{line}</p>
      {selfPaced && !last && (
        <motion.button type="button" onClick={onNext} whileTap={{ scale: 0.96 }} autoFocus
          className="flex h-11 items-center gap-2 rounded-full bg-primary px-5 text-sm font-bold text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
          <ArrowFatRightIcon weight="fill" className="size-4" aria-hidden="true" />Next test<kbd className="rounded-md bg-primary-foreground/20 px-1.5 text-xs">Enter</kbd>
        </motion.button>
      )}
    </div>
  );
}

function Break({ room, you, step }: { room: MockRoom; you: Kid; step: number }) {
  const test = room.tests[step];
  const seconds = test?.duration ?? 10;
  const ticks = room.pacing === "host" ? room.stepTicks : you.stepTicks;
  const left = seconds - ticks;
  const circumference = 2 * Math.PI * 54;
  const next = room.tests.findIndex((item, index) => index > step && item.mode !== "break");
  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <div className="relative size-40">
        <svg viewBox="0 0 120 120" className="size-full -rotate-90" aria-hidden="true">
          <circle cx="60" cy="60" r="54" fill="none" strokeWidth="10" className="stroke-muted" />
          <motion.circle cx="60" cy="60" r="54" fill="none" strokeWidth="10" strokeLinecap="round" className="stroke-primary"
            strokeDasharray={circumference} initial={false} animate={{ strokeDashoffset: circumference * (1 - left / seconds) }} transition={{ duration: 1, ease: "linear" }} />
        </svg>
        <span className="absolute inset-0 flex flex-col items-center justify-center" role="timer" aria-label={`${formatClock(left)} left in the break`}>
          <CoffeeIcon weight="fill" className="size-6 text-primary" aria-hidden="true" />
          <span className="text-3xl font-black tabular-nums">{formatClock(left)}</span>
        </span>
      </div>
      <h2 className="text-2xl font-black">{room.labels[step]?.title ?? "Break"}</h2>
      <p className="text-muted-foreground">Shake out your hands and wiggle those fingers.</p>
      {next >= 0 && <p className="rounded-full bg-muted px-4 py-1.5 text-sm">Up next: <strong>{room.labels[next].title}</strong></p>}
    </div>
  );
}

/** Self-paced: a short "Up next" card between tests that moves on by itself. */
function UpNext({ room, index }: { room: MockRoom; index: number }) {
  const test = room.tests[index];
  return (
    <div className="flex flex-col gap-4">
      <div className="text-center">
        <p className="text-xs font-bold uppercase tracking-widest text-primary">Up next</p>
        <h2 className="text-2xl font-black">{room.labels[index]?.title}</h2>
        {test && <p className="text-sm text-muted-foreground">{describeConnectTest(test)}</p>}
      </div>
      <ol className="flex flex-col gap-1" aria-label="Your tests">
        {room.tests.map((item, position) => (
          <motion.div key={item.id} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ ...LAB_SPRING, delay: position * 0.05 }}>
            <TestRow test={item} title={room.labels[position].title} position={position} phase={position < index ? "done" : position === index ? "current" : "upcoming"} highlightId="up-next" />
          </motion.div>
        ))}
      </ol>
      <motion.div className="h-1 overflow-hidden rounded-full bg-muted" aria-hidden="true">
        <motion.div className="h-full bg-primary" initial={{ width: 0 }} animate={{ width: "100%" }} transition={{ duration: UP_NEXT_MS / 1000, ease: "linear" }} />
      </motion.div>
    </div>
  );
}

function Done({ room, you }: { room: MockRoom; you: Kid }) {
  const avg = average(you.results);
  const typingTests = room.tests.map((test, index) => ({ test, index })).filter(({ test }) => test.mode !== "break");
  return (
    <div className="flex flex-col items-center gap-5 text-center">
      <motion.span initial={{ scale: 0, y: 20 }} animate={{ scale: 1, y: 0 }} transition={{ type: "spring", stiffness: 300, damping: 10 }} className="text-warning">
        <ConfettiIcon weight="fill" className="size-14" aria-hidden="true" />
      </motion.span>
      <div>
        <h2 className="text-2xl font-black">All done, {you.name}!</h2>
        <p className="text-muted-foreground">Here's how you did across the room's tests.</p>
      </div>
      <div className="grid w-full grid-cols-2 gap-3">
        <Stat label="Average speed" value={avg?.wpm ?? "–"} unit="wpm" />
        <Stat label="Average accuracy" value={avg ? `${avg.accuracy}%` : "–"} />
      </div>
      <ol className="flex w-full flex-col divide-y divide-border rounded-2xl border border-border text-left text-sm" aria-label="Your results">
        {typingTests.map(({ test, index }, position) => {
          const result = you.results[position];
          return (
            <motion.li key={test.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ ...LAB_SPRING, delay: 0.2 + position * 0.06 }} className="flex items-center gap-3 px-3 py-2">
              <span className="min-w-0 flex-1 truncate font-semibold">{room.labels[index].title}</span>
              <span className="tabular-nums">{result ? <><strong>{result.wpm}</strong> wpm · {result.accuracy}%</> : <span className="text-muted-foreground">Skipped</span>}</span>
            </motion.li>
          );
        })}
      </ol>
    </div>
  );
}

function Message({ Icon, title, detail, action }: { Icon: typeof UserMinusIcon; title: string; detail: string; action?: { label: string; onClick: () => void } }) {
  return (
    <div className="flex flex-col items-center gap-4 py-10 text-center">
      <span className="flex size-20 items-center justify-center rounded-full bg-muted text-muted-foreground"><Icon className="size-10" aria-hidden="true" /></span>
      <h2 className="text-2xl font-black">{title}</h2>
      <p className="text-muted-foreground">{detail}</p>
      {action && (
        <button type="button" onClick={action.onClick} className="flex h-11 items-center gap-2 rounded-full bg-primary px-5 text-sm font-bold text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
          <SignInIcon className="size-4" aria-hidden="true" />{action.label}
        </button>
      )}
    </div>
  );
}

/** The room's theme, scoped to the student's screen while the host's theme setting is on. */
function useRoomThemeStyle(room: MockRoom): CSSProperties | undefined {
  const colors = useThemeColors(room.everyone.on.theme ? room.everyone.theme : null);
  if (!room.everyone.on.theme || !colors) return undefined;
  return { ...themeCSSVariables(colors), colorScheme: room.everyone.theme.mode } as CSSProperties;
}

/** What one student sees on their own device, inside a phone-sized frame. */
export function StudentView({ room, onLeave }: { room: MockRoom; onLeave: () => void }) {
  const [upNext, setUpNext] = useState<number | null>(null);
  const themeStyle = useRoomThemeStyle(room);
  const you = room.kids.find((kid) => kid.isYou);
  const phase = you ? kidPhase(room, you) : null;
  const step = you ? room.stepOf(you) : 0;
  const canSkip = room.pacing === "participant" && phase === "finished" && step + 1 < room.tests.length;

  const next = () => {
    if (!canSkip) return;
    room.actions.advanceYou();
    setUpNext(step + 1);
  };

  useEffect(() => {
    if (upNext === null) return;
    const timer = setTimeout(() => setUpNext(null), UP_NEXT_MS);
    return () => clearTimeout(timer);
  }, [upNext]);

  useEffect(() => {
    if (!canSkip) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === "Enter" && !(event.target instanceof HTMLButtonElement)) next(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  let key: string;
  let body;
  if (room.ended) {
    key = "ended";
    body = <Message Icon={DoorOpenIcon} title="This room has ended" detail={`${room.host} ended ${room.name}. Thanks for typing along!`} />;
  } else if (room.youRemoved || !you || !phase) {
    key = "removed";
    body = <Message Icon={UserMinusIcon} title="You were removed from the room" detail="Ask your teacher for the code if you'd like to join again." action={{ label: "Join again", onClick: room.actions.rejoin }} />;
  } else if (upNext !== null) {
    key = `up-next-${upNext}`;
    body = <UpNext room={room} index={upNext} />;
  } else {
    key = `${phase}-${step}`;
    body = {
      waiting: <Lobby room={room} you={you} />,
      offline: <Lobby room={room} you={you} />,
      late: <Late room={room} step={step} />,
      typing: <Typing room={room} you={you} step={step} />,
      finished: <Finished room={room} you={you} step={step} onNext={next} />,
      break: <Break room={room} you={you} step={step} />,
      done: <Done room={room} you={you} />,
    }[phase];
  }
  const showDots = you && !room.ended && room.status !== "lobby" && phase !== "done" && upNext === null;
  const soundOn = room.everyone.settings.soundEnabled;

  return (
    <section aria-label={`${you?.name ?? "A student"}'s screen`} style={themeStyle}
      className="relative mx-auto flex w-full max-w-md flex-col overflow-hidden rounded-[2.5rem] border-4 border-border bg-card text-card-foreground shadow-2xl">
      <header className="flex items-center gap-3 border-b border-border px-5 py-3">
        <KidAvatar name={you?.name ?? "?"} photo={you?.signedIn} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold">{room.name}</p>
          <p className="truncate text-xs text-muted-foreground">{you ? `Typing as ${you.name}${you.signedIn ? "" : " (guest)"}` : "Not in the room"}</p>
        </div>
        {room.everyone.on.sound && (
          <span className="flex items-center gap-1 rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground" title="Sounds are set by the room">
            {soundOn ? <SpeakerHighIcon className="size-3.5" aria-hidden="true" /> : <SpeakerSlashIcon className="size-3.5" aria-hidden="true" />}
            {soundOn ? room.everyone.settings.typingSound : "Muted"}
          </span>
        )}
        <button type="button" onClick={onLeave} className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring">
          <SignOutIcon className="size-4" aria-hidden="true" />Leave
        </button>
      </header>
      {showDots && (
        <div className="flex items-center gap-3 px-5 pt-4 text-xs font-semibold text-muted-foreground">
          <span className="shrink-0 tabular-nums">Test {Math.min(step + 1, room.tests.length)} of {room.tests.length}</span>
          <TestDots tests={room.tests} titles={room.labels.map((label) => label.title)} index={step} />
        </div>
      )}
      <div className="relative min-h-[28rem] p-5">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={key} initial={{ opacity: 0, y: 24, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -16, scale: 0.97 }} transition={LAB_SPRING}>
            {body}
          </motion.div>
        </AnimatePresence>
        <AnimatePresence>
          {room.status === "paused" && !room.ended && you && (
            <motion.div role="status" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-card/85 p-6 text-center backdrop-blur-sm">
              <motion.span initial={{ scale: 0.5 }} animate={{ scale: 1 }} transition={LAB_SPRING}><PauseCircleIcon weight="fill" className="size-14 text-primary" aria-hidden="true" /></motion.span>
              <p className="text-xl font-black">Paused by {room.host}</p>
              <p className="text-sm text-muted-foreground">Your progress is safe. Everything picks up when the host continues.</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
