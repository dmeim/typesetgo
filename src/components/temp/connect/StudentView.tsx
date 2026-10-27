import { AnimatePresence, motion } from "framer-motion";
import { CoffeeIcon, ConfettiIcon, HourglassMediumIcon, PauseCircleIcon, SignOutIcon, StarIcon } from "@phosphor-icons/react";
import { LAB_SPRING } from "@/components/temp/settings/lab-settings";
import { RESULTS_TICKS, ROOM, average, formatClock, testDetail, type Kid } from "./connect-mock";
import { KidAvatar, TestDots, TestRow } from "./ConnectParts";
import { kidPhase, kidProgress } from "./room-text";
import type { MockRoom } from "./use-mock-room";

const PASSAGE = "the sun came up over the hill and the birds began to sing a happy song for everyone";

function Lobby({ room, you }: { room: MockRoom; you: Kid }) {
  const classmates = room.kids.filter((kid) => kid.online && !kid.isYou);
  return (
    <div className="flex flex-col items-center gap-5 text-center">
      <motion.span animate={{ rotate: [0, 0, 180, 180] }} transition={{ duration: 2.4, repeat: Infinity, times: [0, 0.4, 0.6, 1] }} className="text-primary">
        <HourglassMediumIcon weight="fill" className="size-12" aria-hidden="true" />
      </motion.span>
      <div>
        <h2 className="text-2xl font-black">Waiting for {ROOM.host} to start</h2>
        <p className="text-muted-foreground">You're in as <strong className="text-foreground">{you.name}</strong>. Get comfy!</p>
      </div>
      <div className="flex items-center gap-2">
        <span className="flex -space-x-2" aria-hidden="true">
          {classmates.slice(0, 5).map((kid, index) => (
            <motion.span key={kid.id} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ ...LAB_SPRING, delay: 0.2 + index * 0.08 }}>
              <KidAvatar name={kid.name} size="sm" className="ring-2 ring-card" />
            </motion.span>
          ))}
        </span>
        <span className="text-sm text-muted-foreground">{classmates.length} classmates here</span>
      </div>
      <ol className="flex w-full flex-col gap-1 text-left" aria-label="Tests in this room">
        {room.tests.map((test, index) => <TestRow key={test.id} test={test} position={index} phase="upcoming" highlightId="student-test" />)}
      </ol>
    </div>
  );
}

function Typing({ room, you, step }: { room: MockRoom; you: Kid; step: number }) {
  const typed = Math.round((kidProgress(room, you) / 100) * PASSAGE.length);
  return (
    <div className="flex flex-col gap-5">
      <p className="rounded-3xl bg-background p-5 font-mono text-xl leading-relaxed" aria-label="Your typing">
        <span className="text-foreground">{PASSAGE.slice(0, typed)}</span>
        <motion.span aria-hidden="true" animate={{ opacity: [1, 0, 1] }} transition={{ duration: 1, repeat: Infinity }} className="-mx-px inline-block h-6 w-0.5 translate-y-1 bg-primary" />
        <span className="text-muted-foreground/60">{PASSAGE.slice(typed)}</span>
      </p>
      <div className="grid grid-cols-2 gap-3">
        <Stat label="Speed" value={you.wpm || "–"} unit="wpm" />
        <Stat label="Accuracy" value={you.accuracy ? `${you.accuracy}%` : "–"} />
      </div>
      <p className="text-center text-xs text-muted-foreground">{room.tests[step]?.title} · {room.tests[step] ? testDetail(room.tests[step]) : ""}</p>
    </div>
  );
}

function Stat({ label, value, unit }: { label: string; value: number | string; unit?: string }) {
  return (
    <div className="rounded-2xl bg-muted/50 p-3 text-center">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="text-3xl font-black tabular-nums">{value}{unit && <span className="ml-1 text-sm font-normal text-muted-foreground">{unit}</span>}</p>
    </div>
  );
}

function nextTypingTitle(room: MockRoom, step: number) {
  return room.tests.find((test, index) => index > step && test.mode !== "break")?.title;
}

function Finished({ room, you, step }: { room: MockRoom; you: Kid; step: number }) {
  const online = room.kids.filter((kid) => kid.online);
  const next = room.tests[step + 1];
  const waiting = room.pacing === "host" && room.resultsTicks === null
    ? `Waiting for classmates · ${online.filter((kid) => kid.finished).length} of ${online.length} done`
    : next ? `Up next: ${next.title}${room.pacing === "host" && room.resultsTicks !== null ? ` in ${formatClock(RESULTS_TICKS - room.resultsTicks)}` : ""}` : "That was the last one!";
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
      <p className="text-sm text-muted-foreground tabular-nums">{waiting}</p>
    </div>
  );
}

function Break({ room, you, step }: { room: MockRoom; you: Kid; step: number }) {
  const test = room.tests[step];
  const seconds = test?.seconds ?? 10;
  const ticks = room.pacing === "host" ? room.stepTicks : you.stepTicks;
  const left = seconds - ticks;
  const circumference = 2 * Math.PI * 54;
  const next = nextTypingTitle(room, step);
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
      <h2 className="text-2xl font-black">{test?.title ?? "Break"}</h2>
      <p className="text-muted-foreground">Shake out your hands and wiggle those fingers.</p>
      {next && <p className="rounded-full bg-muted px-4 py-1.5 text-sm">Up next: <strong>{next}</strong></p>}
    </div>
  );
}

function Done({ you }: { you: Kid }) {
  const avg = average(you.results);
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
      <ol className="flex w-full flex-wrap justify-center gap-2" aria-label="Your results">
        {you.results.map((result, index) => (
          <motion.li key={index} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ ...LAB_SPRING, delay: 0.2 + index * 0.08 }}
            className="rounded-full bg-muted px-3 py-1 text-xs tabular-nums"><strong>{result.wpm}</strong> wpm · {result.accuracy}%</motion.li>
        ))}
      </ol>
    </div>
  );
}

/** What one student sees on their own device, inside a phone-sized frame. */
export function StudentView({ room, onLeave }: { room: MockRoom; onLeave: () => void }) {
  const you = room.kids.find((kid) => kid.isYou);
  if (!you) return null;
  const phase = kidPhase(room, you);
  const step = room.stepOf(you);
  const showDots = room.status !== "lobby" && phase !== "done";
  const body = {
    waiting: <Lobby room={room} you={you} />,
    offline: <Lobby room={room} you={you} />,
    typing: <Typing room={room} you={you} step={step} />,
    finished: <Finished room={room} you={you} step={step} />,
    break: <Break room={room} you={you} step={step} />,
    done: <Done you={you} />,
  }[phase];
  return (
    <section aria-label={`${you.name}'s screen`} className="relative mx-auto flex w-full max-w-md flex-col overflow-hidden rounded-[2.5rem] border-4 border-border bg-card shadow-2xl">
      <header className="flex items-center gap-3 border-b border-border px-5 py-3">
        <KidAvatar name={you.name} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold">{ROOM.name}</p>
          <p className="truncate text-xs text-muted-foreground">Typing as {you.name}</p>
        </div>
        <button type="button" onClick={onLeave} className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring">
          <SignOutIcon className="size-4" aria-hidden="true" />Leave
        </button>
      </header>
      {showDots && (
        <div className="flex items-center gap-3 px-5 pt-4 text-xs font-semibold text-muted-foreground">
          <span className="shrink-0 tabular-nums">Test {Math.min(step + 1, room.tests.length)} of {room.tests.length}</span>
          <TestDots tests={room.tests} index={step} />
        </div>
      )}
      <div className="relative min-h-[28rem] p-5">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={`${phase}-${step}`} initial={{ opacity: 0, y: 24, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -16, scale: 0.97 }} transition={LAB_SPRING}>
            {body}
          </motion.div>
        </AnimatePresence>
        <AnimatePresence>
          {room.status === "paused" && (
            <motion.div role="status" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-card/85 p-6 text-center backdrop-blur-sm">
              <motion.span initial={{ scale: 0.5 }} animate={{ scale: 1 }} transition={LAB_SPRING}><PauseCircleIcon weight="fill" className="size-14 text-primary" aria-hidden="true" /></motion.span>
              <p className="text-xl font-black">Paused by {ROOM.host}</p>
              <p className="text-sm text-muted-foreground">Your progress is safe. Typing picks up when the host continues.</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
