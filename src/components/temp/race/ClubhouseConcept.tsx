import { useId, useState, type FormEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowClockwiseIcon, ArrowRightIcon, CheckCircleIcon, CircleNotchIcon, FlagCheckeredIcon, HourglassIcon, PlusIcon, ShareNetworkIcon,
  SignInIcon, SlidersHorizontalIcon, TimerIcon, TrophyIcon, UsersThreeIcon,
} from "@phosphor-icons/react";
import { Pills } from "@/components/temp/connect/ConnectParts";
import { PODIUM_METALS } from "@/lib/leaderboard-entries";
import { cn } from "@/lib/utils";
import { BOTS, BOUNCY_SPRING, DIFFICULTIES, RACE_SPRING, ROOM_CODE, WORD_COUNTS, formatSeconds, ordinal, type RaceResult } from "./race-mock";
import { CopyCodeButton, EmojiPicker, HostTag, LeaveButton, RacerAvatar, YouTag } from "./RaceParts";
import { AutoplayToggle, RacePassage } from "./RacePassage";
import { useMockLobby } from "./use-mock-lobby";
import { useMockRace, type LiveRacer } from "./use-mock-race";
import type { ConceptProps } from "./use-race-lab";

const field = "h-12 w-full min-w-0 rounded-2xl border border-input bg-background px-4 text-base outline-none focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/20";
const primaryButton = "group inline-flex h-12 items-center justify-center gap-2 rounded-full bg-primary px-6 font-bold text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-50";

type Mode = "join" | "host";
const SLIDE = {
  enter: (mode: Mode) => ({ opacity: 0, x: mode === "join" ? -40 : 40 }),
  center: { opacity: 1, x: 0 },
  exit: (mode: Mode) => ({ opacity: 0, x: mode === "join" ? -40 : 40 }),
};

function Landing({ lab, go }: ConceptProps) {
  const id = useId();
  const [mode, setMode] = useState<Mode>("join");
  const [name, setName] = useState(lab.you.name);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) { setError("Pick a racer name first."); return; }
    if (mode === "join" && code.trim().length < 4) { setError("Enter the code your host shared."); return; }
    setPending(true);
    lab.setYou({ name: name.trim() });
    lab.setRole(mode === "host" ? "host" : "guest");
    window.setTimeout(() => go("lobby"), 550);
  };
  return (
    <main className="mx-auto flex w-full max-w-xl flex-col gap-8 px-4 pt-8 md:pt-12">
      <header className="flex flex-col items-center gap-4 text-center">
        <ul className="flex -space-x-2" aria-hidden="true">
          {BOTS.map((bot, index) => (
            <motion.li key={bot.id} initial={{ opacity: 0, y: 20, scale: 0.5 }} animate={{ opacity: 1, y: [0, -7, 0], scale: 1 }}
              transition={{ opacity: { delay: index * 0.07 }, scale: { ...BOUNCY_SPRING, delay: index * 0.07 }, y: { duration: 2.4, repeat: Infinity, delay: index * 0.25, ease: "easeInOut" } }}>
              <RacerAvatar emoji={bot.emoji} color={bot.color} size="md" className="ring-4 ring-background sm:size-16 sm:text-3xl" />
            </motion.li>
          ))}
        </ul>
        <span className="flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-widest text-primary">
          <FlagCheckeredIcon weight="fill" className="size-4" aria-hidden="true" />Race
        </span>
        <h1 className="text-4xl font-black tracking-tight sm:text-5xl">Race your friends.</h1>
        <p className="max-w-md text-muted-foreground">Same words, same start. First to the end wins. Got a code? Jump in. Starting one? Flip to host.</p>
      </header>
      <motion.form layout onSubmit={submit} noValidate transition={RACE_SPRING}
        className="flex min-w-0 flex-col gap-5 overflow-hidden rounded-3xl border border-primary/30 bg-card p-4 shadow-[0_20px_60px_-30px_var(--primary)] sm:p-6">
        <Pills<Mode> label="Join or host" value={mode} onChange={(next) => { setMode(next); setError(""); }} size="lg"
          options={[{ value: "join", label: "Join a race", short: "Join", Icon: SignInIcon }, { value: "host", label: "Host a race", short: "Host", Icon: UsersThreeIcon }]} />
        <AnimatePresence mode="popLayout" initial={false} custom={mode}>
          <motion.div key={mode} custom={mode} variants={SLIDE} initial="enter" animate="center" exit="exit" transition={RACE_SPRING} className="flex min-w-0 flex-col gap-4">
            {mode === "host" && (
              <ol className="grid grid-cols-3 gap-2" aria-label="How hosting works">
                {[{ Icon: SlidersHorizontalIcon, label: "Pick words" }, { Icon: ShareNetworkIcon, label: "Share code" }, { Icon: FlagCheckeredIcon, label: "Ready, go" }].map(({ Icon, label }, index) => (
                  <li key={label} className="flex flex-col items-center gap-1.5 rounded-2xl bg-muted/50 px-1 py-3 text-center">
                    <span className="relative flex size-9 items-center justify-center rounded-full bg-background">
                      <Icon className="size-5" aria-hidden="true" />
                      <span className="absolute -right-1 -top-1 flex size-4.5 items-center justify-center rounded-full bg-primary text-[0.6rem] font-bold text-primary-foreground">{index + 1}</span>
                    </span>
                    <span className="text-xs font-semibold leading-tight">{label}</span>
                  </li>
                ))}
              </ol>
            )}
            <div className={cn("grid gap-3", mode === "join" && "sm:grid-cols-2")}>
              <label htmlFor={`${id}-name`} className="flex min-w-0 flex-col gap-1.5 text-sm font-semibold">
                Racer name
                <input id={`${id}-name`} value={name} maxLength={30} autoComplete="nickname" onChange={(event) => { setName(event.target.value); setError(""); }} className={field} />
              </label>
              {mode === "join" && (
                <label htmlFor={`${id}-code`} className="flex min-w-0 flex-col gap-1.5 text-sm font-semibold">
                  Room code
                  <input id={`${id}-code`} value={code} maxLength={6} autoComplete="off" spellCheck={false} placeholder={ROOM_CODE}
                    onChange={(event) => { setCode(event.target.value.toUpperCase()); setError(""); }} className={cn(field, "text-center font-bold uppercase tracking-[0.3em] placeholder:text-muted-foreground/40")} />
                </label>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
        {error && <p role="alert" className="text-sm font-medium text-destructive">{error}</p>}
        <button type="submit" disabled={pending} className={primaryButton}>
          {pending ? <CircleNotchIcon className="size-5 animate-spin" aria-hidden="true" /> : mode === "host" ? <PlusIcon className="size-5" aria-hidden="true" /> : <SignInIcon className="size-5" aria-hidden="true" />}
          {pending ? (mode === "host" ? "Making your race…" : "Joining…") : mode === "host" ? "Create race" : "Join race"}
          {!pending && <ArrowRightIcon className="size-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />}
        </button>
      </motion.form>
    </main>
  );
}

function CodeLetters({ code }: { code: string }) {
  return (
    <span role="img" aria-label={`Room code ${code.split("").join(" ")}`} className="flex w-full max-w-sm gap-1.5 [perspective:600px] sm:gap-2">
      {code.split("").map((char, index) => (
        <motion.span key={index} aria-hidden="true" initial={{ rotateX: -90, opacity: 0 }} animate={{ rotateX: 0, opacity: 1 }} transition={{ ...RACE_SPRING, delay: 0.06 * index }}
          className="flex aspect-[4/5] min-w-0 flex-1 items-center justify-center rounded-2xl border-2 border-primary/30 bg-primary/10 text-2xl font-black text-primary shadow-[inset_0_-4px_0_color-mix(in_srgb,var(--primary)_25%,transparent)] sm:text-4xl">
          {char}
        </motion.span>
      ))}
    </span>
  );
}

function Lobby({ lab, go }: ConceptProps) {
  const lobby = useMockLobby(lab, () => go("race"));
  const host = lobby.racers.find((racer) => racer.isHost);
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 pt-6">
      <section className="flex flex-col items-center gap-4 rounded-3xl border border-border bg-card p-5 text-center sm:p-6">
        <div className="flex w-full flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Room code</span>
          <LeaveButton onLeave={() => go("landing")} />
        </div>
        <CodeLetters code={ROOM_CODE} />
        <CopyCodeButton code={ROOM_CODE} />
        <p role="status" className="text-sm text-muted-foreground">
          {lobby.starting ? "Everyone's ready. Here we go!" : lobby.isHost ? "Share the code. The race starts when everyone is ready." : `${host?.name ?? "The host"} picks the words. The race starts when everyone is ready.`}
        </p>
      </section>
      <div className={cn("grid gap-6", "lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]")}>
        <section aria-labelledby="clubhouse-settings" className="order-last flex min-w-0 flex-col gap-4 self-start rounded-3xl border border-border bg-card p-5 lg:order-none">
          <h2 id="clubhouse-settings" className="flex items-center gap-2 font-bold"><SlidersHorizontalIcon className="size-5" aria-hidden="true" />Race settings</h2>
          {!lobby.isHost && <p className="text-xs text-muted-foreground">Only {host?.name} can change these.</p>}
          <fieldset disabled={!lobby.isHost || lobby.starting} className="flex flex-col gap-2">
            <legend className="mb-2 text-sm font-semibold">Difficulty</legend>
            <div className="flex flex-wrap gap-1.5">
              {DIFFICULTIES.map((difficulty) => (
                <button key={difficulty} type="button" aria-pressed={lab.settings.difficulty === difficulty} onClick={() => lab.setSettings({ difficulty })}
                  className="rounded-full border border-border px-3 py-1.5 text-sm capitalize transition-colors enabled:hover:bg-accent disabled:cursor-not-allowed aria-pressed:border-primary aria-pressed:bg-primary aria-pressed:text-primary-foreground [&:disabled:not([aria-pressed=true])]:opacity-50">
                  {difficulty}
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset disabled={!lobby.isHost || lobby.starting} className="flex flex-col gap-2">
            <legend className="mb-2 text-sm font-semibold">Words</legend>
            <div className="grid grid-cols-5 gap-1.5">
              {WORD_COUNTS.map((words) => (
                <button key={words} type="button" aria-pressed={lab.settings.words === words} onClick={() => lab.setSettings({ words })}
                  className="rounded-full border border-border py-1.5 text-sm tabular-nums transition-colors enabled:hover:bg-accent disabled:cursor-not-allowed aria-pressed:border-primary aria-pressed:bg-primary aria-pressed:text-primary-foreground [&:disabled:not([aria-pressed=true])]:opacity-50">
                  {words}
                </button>
              ))}
            </div>
          </fieldset>
        </section>
        <section aria-labelledby="clubhouse-racers" className="relative flex min-w-0 flex-col gap-4 rounded-3xl border border-border bg-card p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 id="clubhouse-racers" className="flex items-center gap-2 font-bold"><UsersThreeIcon className="size-5" aria-hidden="true" />Racers</h2>
            <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold tabular-nums">{lobby.readyCount} / {lobby.racers.length} ready</span>
          </div>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {lobby.racers.map((racer, index) => (
              <motion.li key={racer.id} layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ ...RACE_SPRING, delay: index * 0.05 }}
                className={cn("relative flex min-w-0 flex-col items-center gap-2 rounded-2xl border p-3 text-center transition-colors",
                  racer.isYou ? "border-primary/50 bg-primary/5" : "border-border", racer.ready && "border-success/50")}>
                {racer.isYou ? <EmojiPicker value={lab.you.emoji} color={racer.color} onChange={(emoji) => lab.setYou({ emoji })} disabled={lobby.starting} /> : (
                  <motion.span animate={racer.ready ? { y: [0, -6, 0] } : { y: 0 }} transition={{ duration: 0.4 }}>
                    <RacerAvatar emoji={racer.emoji} color={racer.color} dim={!racer.ready} />
                  </motion.span>
                )}
                <span className="flex w-full min-w-0 flex-col items-center gap-0.5">
                  <span className="max-w-full truncate text-sm font-bold">{racer.name}</span>
                  <span className="flex items-center gap-1">{racer.isHost && <HostTag />}{racer.isYou && <YouTag />}</span>
                </span>
                <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold", racer.ready ? "bg-success/15 text-success" : "bg-muted text-muted-foreground")}>
                  {racer.ready ? <CheckCircleIcon weight="fill" className="size-3.5" aria-hidden="true" /> : <HourglassIcon className="size-3.5" aria-hidden="true" />}
                  {racer.ready ? "Ready" : "Getting set"}
                </span>
              </motion.li>
            ))}
          </ul>
          <button type="button" onClick={lobby.toggleReady} disabled={lobby.starting} aria-pressed={lobby.you.ready}
            className={cn(primaryButton, "w-full", lobby.you.ready && "border border-border bg-transparent text-foreground hover:bg-accent")}>
            {lobby.you.ready ? <><HourglassIcon className="size-5" aria-hidden="true" />Not ready yet</> : <><CheckCircleIcon weight="fill" className="size-5" aria-hidden="true" />I'm ready</>}
          </button>
          <AnimatePresence>
            {lobby.starting && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} role="status"
                className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-3xl bg-card/90 backdrop-blur-sm">
                <span className="text-sm font-semibold text-muted-foreground">Race starts in</span>
                <AnimatePresence mode="popLayout">
                  <motion.span key={lobby.countdown} initial={{ scale: 2, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.4, opacity: 0 }} transition={BOUNCY_SPRING}
                    className="text-8xl font-black tabular-nums text-primary">{Math.max(1, lobby.countdown)}</motion.span>
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      </div>
    </main>
  );
}

function RingAvatar({ racer }: { racer: LiveRacer }) {
  const radius = 30;
  const circumference = 2 * Math.PI * radius;
  return (
    <span className="relative flex size-12 shrink-0 items-center justify-center sm:size-18">
      <svg viewBox="0 0 72 72" className="absolute inset-0 -rotate-90" aria-hidden="true">
        <circle cx="36" cy="36" r={radius} fill="none" stroke="currentColor" strokeWidth="5" className="text-muted" />
        <motion.circle cx="36" cy="36" r={radius} fill="none" strokeWidth="5" strokeLinecap="round" stroke={racer.finishMs !== null ? "var(--success)" : racer.color}
          strokeDasharray={circumference} initial={false} animate={{ strokeDashoffset: circumference * (1 - racer.progress) }} transition={{ type: "spring", stiffness: 120, damping: 22 }} />
      </svg>
      <span className="text-xl leading-none sm:text-3xl" aria-hidden="true">{racer.emoji}</span>
      {racer.finishMs !== null && (
        <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={BOUNCY_SPRING} className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-success text-background sm:size-6">
          <FlagCheckeredIcon weight="fill" className="size-3.5" aria-hidden="true" />
        </motion.span>
      )}
    </span>
  );
}

function Race({ lab, go }: ConceptProps) {
  const race = useMockRace(lab, () => go("results"));
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-5 px-4 pt-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="flex items-center gap-2 text-xl font-bold"><FlagCheckeredIcon weight="fill" className="size-6 text-primary" aria-hidden="true" />Race in progress</h1>
          <p className="text-sm text-muted-foreground" role="status">
            {race.finishedCount} / {race.racers.length} finished
            {race.endsIn !== null && <span className="ml-2 inline-flex items-center gap-1 font-semibold text-warning"><TimerIcon className="size-4" aria-hidden="true" />Ends in {race.endsIn}s</span>}
          </p>
        </div>
        <LeaveButton confirm onLeave={() => go("landing")} />
      </header>
      <ol aria-label="Live standings" className="grid grid-cols-3 gap-2 sm:gap-3 lg:grid-cols-6">
        {race.racers.map((racer) => (
          <motion.li key={racer.id} layout transition={RACE_SPRING}
            className={cn("relative flex min-w-0 flex-col items-center gap-1 rounded-2xl border bg-card p-2 text-center sm:gap-1.5 sm:rounded-3xl sm:p-3", racer.isYou ? "border-primary shadow-[0_12px_40px_-24px_var(--primary)]" : "border-border")}>
            <span className={cn("absolute left-2 top-1.5 text-xs font-black tabular-nums sm:left-2.5 sm:top-2 sm:text-sm", racer.place === 1 ? "text-warning" : "text-muted-foreground")}>{racer.place}</span>
            <RingAvatar racer={racer} />
            <span className="flex w-full min-w-0 items-center justify-center gap-1"><span className="truncate text-xs font-bold sm:text-sm">{racer.name}</span>{racer.isYou && <YouTag className="hidden sm:inline" />}</span>
            <span className="text-[0.65rem] text-muted-foreground sm:text-xs"><strong className="text-sm tabular-nums text-foreground sm:text-base">{racer.liveWpm}</strong> WPM</span>
            <span className="sr-only">{Math.round(racer.progress * 100)} percent{racer.finishMs !== null ? ", finished" : ""}</span>
          </motion.li>
        ))}
      </ol>
      <section aria-label="Your race" className="relative flex min-w-0 flex-col gap-4 overflow-hidden rounded-3xl border border-border bg-card p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <AutoplayToggle race={race} />
          <span className="flex gap-3 text-xs text-muted-foreground">
            <span><strong className="text-sm tabular-nums text-foreground">{race.you.liveWpm}</strong> WPM</span>
            <span><strong className="text-sm tabular-nums text-foreground">{race.you.liveAccuracy}%</strong> acc</span>
          </span>
        </div>
        <RacePassage race={race} size="lg" />
        <AnimatePresence>
          {(race.phase === "countdown" || (race.phase === "racing" && race.elapsed < 700)) && (
            <motion.div key="count" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="pointer-events-none absolute inset-0 flex items-center justify-center bg-card/70 backdrop-blur-[2px]">
              <AnimatePresence mode="popLayout">
                <motion.span key={race.phase === "countdown" ? race.countdown : "go"} role="status" initial={{ scale: 2.2, opacity: 0, rotate: -8 }} animate={{ scale: 1, opacity: 1, rotate: 0 }} exit={{ scale: 0.5, opacity: 0 }} transition={BOUNCY_SPRING}
                  className="text-7xl font-black text-primary sm:text-8xl">{race.phase === "countdown" ? race.countdown : "Go!"}</motion.span>
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
        {(race.phase === "done" || race.you.finishMs !== null) && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={RACE_SPRING} role="status"
            className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-primary/10 p-3">
            <span className="text-sm font-semibold">
              {race.phase === "done" ? `Race over. You came ${race.you.finishMs === null ? "in after the clock" : ordinal(race.you.place)}.` : `You finished ${ordinal(race.you.place)}! Waiting for the others…`}
            </span>
            {race.phase === "done" && (
              <button type="button" onClick={race.showResults} className={cn(primaryButton, "h-10 px-4 text-sm")}>
                <TrophyIcon weight="fill" className="size-4" aria-hidden="true" />See results ({race.resultsIn})
              </button>
            )}
          </motion.div>
        )}
      </section>
    </main>
  );
}

const PODIUM = [
  { slot: "col-start-2", inset: "", step: "h-28 sm:h-36" },
  { slot: "col-start-1", inset: "pt-8", step: "h-20 sm:h-28" },
  { slot: "col-start-3", inset: "pt-14", step: "h-14 sm:h-20" },
] as const;

function PodiumPlace({ result, index }: { result: RaceResult; index: 0 | 1 | 2 }) {
  const metal = PODIUM_METALS[index];
  const { slot, inset, step } = PODIUM[index];
  return (
    <li className={cn("row-start-1 flex min-w-0 flex-col items-center text-center", slot, inset)}>
      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ ...BOUNCY_SPRING, delay: 0.3 + (2 - index) * 0.15 }}
        className="flex w-full min-w-0 flex-1 flex-col items-center gap-1.5 pb-3">
        <span className="rounded-full" style={{ boxShadow: `0 0 0 3px var(--background), 0 0 0 6px ${metal}` }}>
          <RacerAvatar emoji={result.emoji} color={result.color} size={index === 0 ? "xl" : "lg"} />
        </span>
        <span className="mt-1 flex w-full min-w-0 flex-col items-center gap-0.5 text-sm font-bold">
          <span className="max-w-full truncate">{result.name}</span>{result.isYou && <YouTag />}
        </span>
        <span className="text-xs text-muted-foreground"><strong className="text-xl tabular-nums text-foreground sm:text-2xl">{result.wpm}</strong> WPM</span>
      </motion.div>
      <motion.div aria-hidden="true" initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} transition={{ ...RACE_SPRING, delay: 0.1 + (2 - index) * 0.12 }} style={{ originY: 1, borderColor: metal, background: `linear-gradient(180deg, color-mix(in srgb, ${metal} 30%, var(--card)), color-mix(in srgb, ${metal} 6%, var(--background)))` }}
        className={cn("flex w-full shrink-0 justify-center rounded-t-2xl border border-b-0 border-t-4 pt-2", step)}>
        <span className="text-3xl font-black sm:text-4xl" style={{ color: metal }}>{index + 1}</span>
      </motion.div>
    </li>
  );
}

function Results({ lab, go }: ConceptProps) {
  const results = lab.results;
  const me = results.find((result) => result.isYou);
  const host = results.find((result) => result.isHost);
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 pt-6">
      <header className="flex flex-col items-center gap-3 text-center">
        <motion.span initial={{ scale: 0.5, rotate: -15, opacity: 0 }} animate={{ scale: 1, rotate: 0, opacity: 1 }} transition={BOUNCY_SPRING}
          className="flex size-14 items-center justify-center rounded-3xl bg-primary text-primary-foreground shadow-lg">
          <TrophyIcon weight="fill" className="size-7" aria-hidden="true" />
        </motion.span>
        <h1 className="text-3xl font-black sm:text-4xl">{me ? (me.finishMs === null ? "Out of time" : me.place === 1 ? "You won!" : `You came ${ordinal(me.place)}`) : "Race results"}</h1>
        {me && (
          <ul className="flex flex-wrap justify-center gap-2 text-sm" aria-label="Your race">
            {[[`${me.wpm}`, "WPM"], [`${me.accuracy}%`, "accuracy"], [me.finishMs === null ? "DNF" : formatSeconds(me.finishMs), "time"]].map(([value, label]) => (
              <li key={label} className="rounded-full border border-border bg-card px-3 py-1.5"><strong className="tabular-nums">{value}</strong> <span className="text-muted-foreground">{label}</span></li>
            ))}
          </ul>
        )}
      </header>
      <ol aria-label="Podium" className="mx-auto grid w-full max-w-lg grid-cols-3 items-stretch gap-2 border-b border-border pt-4 sm:gap-3">
        {results.slice(0, 3).map((result, index) => <PodiumPlace key={result.id} result={result} index={index as 0 | 1 | 2} />)}
      </ol>
      <ol aria-label="Everyone" className="flex flex-col gap-2">
        {results.map((result, index) => (
          <motion.li key={result.id} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ ...RACE_SPRING, delay: 0.6 + index * 0.06 }}
            className={cn("flex items-center gap-3 rounded-2xl border px-3 py-2.5", result.isYou ? "border-primary/50 bg-primary/5" : "border-border bg-card")}>
            <span className="w-6 text-center font-black tabular-nums text-muted-foreground">{result.place}</span>
            <RacerAvatar emoji={result.emoji} color={result.color} size="sm" />
            <span className="flex min-w-0 flex-1 items-center gap-1.5"><span className="truncate font-semibold">{result.name}</span>{result.isYou && <YouTag />}{result.isHost && <HostTag label={false} />}</span>
            <span className="hidden text-xs text-muted-foreground sm:inline">{result.accuracy}%</span>
            <span className="w-14 text-right text-xs text-muted-foreground tabular-nums">{result.finishMs === null ? "DNF" : formatSeconds(result.finishMs)}</span>
            <span className="w-16 text-right text-sm"><strong className="tabular-nums">{result.wpm}</strong> <span className="text-xs text-muted-foreground">WPM</span></span>
          </motion.li>
        ))}
      </ol>
      <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
        {lab.role === "host" ? (
          <button type="button" onClick={() => go("lobby")} className={primaryButton}><ArrowClockwiseIcon className="size-5" aria-hidden="true" />Race again</button>
        ) : <p className="text-sm text-muted-foreground">Waiting for {host?.name ?? "the host"} to start another race…</p>}
        <LeaveButton onLeave={() => go("landing")} className="h-12" />
      </div>
    </main>
  );
}

/** Concept 1, Clubhouse: one friendly card to join or host (like Connect), avatar cards in the lobby, progress rings while racing and a podium at the end. */
export function ClubhouseConcept(props: ConceptProps) {
  if (props.screen === "landing") return <Landing {...props} />;
  if (props.screen === "lobby") return <Lobby {...props} />;
  if (props.screen === "race") return <Race {...props} />;
  return <Results {...props} />;
}
