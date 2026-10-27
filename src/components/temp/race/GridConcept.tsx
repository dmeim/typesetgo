import { useEffect, useId, useState, type FormEvent, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowClockwiseIcon, ChampagneIcon, CheckCircleIcon, CircleNotchIcon, FlagCheckeredIcon, GarageIcon, SignInIcon, SteeringWheelIcon, TimerIcon, TrafficSignalIcon,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { BOUNCY_SPRING, COUNTDOWN_MS, DIFFICULTIES, RACE_SPRING, ROOM_CODE, WORD_COUNTS, formatSeconds, racerCode } from "./race-mock";
import { CopyCodeButton, EmojiPicker, HostTag, LeaveButton, RacerAvatar, YouTag } from "./RaceParts";
import { AutoplayToggle, RacePassage } from "./RacePassage";
import { useMockLobby } from "./use-mock-lobby";
import { useMockRace, type LiveRacer, type MockRace } from "./use-mock-race";
import type { ConceptProps } from "./use-race-lab";

const field = "h-11 w-full min-w-0 rounded-xl border border-input bg-background px-3 text-base outline-none focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/20";
const solid = "inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 font-bold uppercase tracking-wide text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-50";

/** Five start lights. `lit` of them glow; `out` turns them all off for the start. */
function StartLights({ lit, className, size = "md" }: { lit: number; className?: string; size?: "sm" | "md" }) {
  return (
    <div aria-hidden="true" className={cn("flex justify-center gap-1.5 rounded-2xl bg-foreground p-2 sm:gap-2", className)}>
      {Array.from({ length: 5 }, (_, index) => (
        <span key={index} className="flex flex-col gap-1 rounded-lg bg-background/10 p-1">
          {[0, 1].map((row) => (
            <motion.span key={row} initial={false} animate={{ backgroundColor: index < lit ? "var(--destructive)" : "color-mix(in srgb, var(--background) 18%, transparent)", boxShadow: index < lit ? "0 0 14px var(--destructive)" : "0 0 0 transparent" }}
              transition={{ duration: 0.15 }} className={cn("block rounded-full", size === "md" ? "size-5 sm:size-7" : "size-3.5 sm:size-4")} />
          ))}
        </span>
      ))}
    </div>
  );
}

/** A painted grid box: the bracket on the tarmac with the position beside it. */
function GridSlot({ position, children, className, highlight }: { position: number; children: ReactNode; className?: string; highlight?: boolean }) {
  return (
    <div className={cn("relative min-w-0", className)}>
      <div className="mb-1.5 flex items-end gap-2">
        <span className={cn("text-lg font-black italic leading-none", highlight ? "text-primary" : "text-muted-foreground")}>P{position}</span>
        <span aria-hidden="true" className={cn("h-3 flex-1 rounded-t-md border-x-4 border-t-4", highlight ? "border-primary" : "border-foreground/25")} />
      </div>
      {children}
    </div>
  );
}

function Landing({ lab, go }: ConceptProps) {
  const id = useId();
  const [name, setName] = useState(lab.you.name);
  const [code, setCode] = useState("");
  const [pending, setPending] = useState<"host" | "join" | null>(null);
  const [error, setError] = useState("");
  const [lit, setLit] = useState(0);
  useEffect(() => {
    const timer = window.setInterval(() => setLit((current) => (current + 1) % 8), 550);
    return () => window.clearInterval(timer);
  }, []);
  const enter = (role: "host" | "join") => (event?: FormEvent) => {
    event?.preventDefault();
    if (!name.trim()) { setError("Your racer needs a name."); return; }
    if (role === "join" && code.trim().length < 4) { setError("Type the room code to take your slot."); return; }
    setPending(role);
    lab.setYou({ name: name.trim() });
    lab.setRole(role === "host" ? "host" : "guest");
    window.setTimeout(() => go("lobby"), 550);
  };
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 pt-8">
      <header className="flex flex-col items-center gap-5 text-center">
        <StartLights lit={lit > 5 ? 0 : lit} />
        <h1 className="text-4xl font-black uppercase italic tracking-tight sm:text-5xl">Five lights.<br className="sm:hidden" /> Then type.</h1>
        <p className="max-w-md text-muted-foreground">Line up on the grid with friends. When the lights go out, everyone gets the same words.</p>
      </header>
      <label htmlFor={`${id}-name`} className="mx-auto flex w-full max-w-sm flex-col gap-1.5 text-sm font-semibold">
        <span className="flex items-center gap-1.5"><SteeringWheelIcon className="size-4" aria-hidden="true" />Racer name</span>
        <input id={`${id}-name`} value={name} maxLength={30} autoComplete="nickname" onChange={(event) => { setName(event.target.value); setError(""); }} className={field} />
      </label>
      {error && <p role="alert" className="-mt-4 text-center text-sm font-medium text-destructive">{error}</p>}
      <div className="grid gap-6 sm:grid-cols-2 sm:gap-8">
        <GridSlot position={1} highlight>
          <section aria-labelledby={`${id}-host`} className="flex flex-col gap-3 rounded-2xl border-2 border-primary/40 bg-card p-5">
            <h2 id={`${id}-host`} className="text-xl font-black uppercase italic">Host a race</h2>
            <p className="text-sm text-muted-foreground">Open a new grid, pick the words, and share the code with your crew.</p>
            <button type="button" onClick={() => enter("host")()} disabled={pending !== null} className={solid}>
              {pending === "host" ? <CircleNotchIcon className="size-5 animate-spin" aria-hidden="true" /> : <FlagCheckeredIcon weight="fill" className="size-5" aria-hidden="true" />}
              {pending === "host" ? "Opening grid…" : "Open a grid"}
            </button>
          </section>
        </GridSlot>
        <GridSlot position={2} className="sm:mt-12">
          <form onSubmit={enter("join")} noValidate aria-labelledby={`${id}-join`} className="flex flex-col gap-3 rounded-2xl border-2 border-border bg-card p-5">
            <h2 id={`${id}-join`} className="text-xl font-black uppercase italic">Join a race</h2>
            <label htmlFor={`${id}-code`} className="text-sm text-muted-foreground">Room code from your host</label>
            <input id={`${id}-code`} value={code} maxLength={6} placeholder={ROOM_CODE} autoComplete="off" spellCheck={false} onChange={(event) => { setCode(event.target.value.toUpperCase()); setError(""); }}
              className={cn(field, "text-center text-xl font-black uppercase tracking-[0.35em] placeholder:text-muted-foreground/40")} />
            <button type="submit" disabled={pending !== null} className={cn(solid, "bg-foreground text-background")}>
              {pending === "join" ? <CircleNotchIcon className="size-5 animate-spin" aria-hidden="true" /> : <SignInIcon className="size-5" aria-hidden="true" />}
              {pending === "join" ? "Taking slot…" : "Take my slot"}
            </button>
          </form>
        </GridSlot>
      </div>
    </main>
  );
}

function PitWall({ lab, editable, host }: { lab: ConceptProps["lab"]; editable: boolean; host: string }) {
  const chip = "rounded-lg px-2.5 py-1.5 text-sm font-semibold capitalize transition-colors enabled:hover:bg-background/15 disabled:cursor-not-allowed aria-pressed:bg-primary aria-pressed:text-primary-foreground";
  return (
    <section aria-labelledby="pit-wall" className="flex min-w-0 flex-col gap-4 rounded-2xl bg-foreground p-5 text-background">
      <h2 id="pit-wall" className="flex items-center gap-2 text-sm font-black uppercase tracking-widest"><GarageIcon weight="fill" className="size-5" aria-hidden="true" />Pit wall</h2>
      {!editable && <p className="-mt-2 text-xs opacity-70">Set by {host}.</p>}
      <fieldset disabled={!editable} className="flex flex-col gap-2">
        <legend className="mb-2 text-xs uppercase tracking-widest opacity-70">Difficulty</legend>
        <div className="flex flex-wrap gap-1">
          {DIFFICULTIES.map((difficulty) => <button key={difficulty} type="button" aria-pressed={lab.settings.difficulty === difficulty} onClick={() => lab.setSettings({ difficulty })} className={chip}>{difficulty}</button>)}
        </div>
      </fieldset>
      <fieldset disabled={!editable} className="flex flex-col gap-2">
        <legend className="mb-2 text-xs uppercase tracking-widest opacity-70">Words</legend>
        <div className="grid grid-cols-5 gap-1">
          {WORD_COUNTS.map((words) => <button key={words} type="button" aria-pressed={lab.settings.words === words} onClick={() => lab.setSettings({ words })} className={cn(chip, "tabular-nums")}>{words}</button>)}
        </div>
      </fieldset>
    </section>
  );
}

function Lobby({ lab, go }: ConceptProps) {
  const lobby = useMockLobby(lab, () => go("race"));
  const host = lobby.racers.find((racer) => racer.isHost)?.name ?? "the host";
  const lit = lobby.starting ? 5 : Math.round((lobby.readyCount / lobby.racers.length) * 5);
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 pt-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-3">
          <h1 className="text-2xl font-black uppercase italic">Grid</h1>
          <span className="rounded-lg bg-foreground px-3 py-1 text-xl font-black tracking-[0.3em] text-background">{ROOM_CODE}</span>
          <CopyCodeButton code={ROOM_CODE} className="rounded-xl" />
        </div>
        <LeaveButton onLeave={() => go("landing")} className="rounded-xl" />
      </header>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <section aria-labelledby="grid-title" className="flex min-w-0 flex-col gap-4">
          <h2 id="grid-title" className="sr-only">Starting grid</h2>
          <ol className="grid grid-cols-2 gap-x-3 gap-y-4 sm:gap-x-8">
            {lobby.racers.map((racer, index) => (
              <motion.li key={racer.id} initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ ...RACE_SPRING, delay: index * 0.07 }} className={cn(index % 2 === 1 && "mt-8")}>
                <GridSlot position={index + 1} highlight={racer.isYou}>
                  <div className={cn("flex min-w-0 flex-col gap-2 rounded-2xl border-2 bg-card p-3 transition-colors sm:flex-row sm:items-center", racer.isYou ? "border-primary/50" : "border-border", !racer.ready && "border-dashed")}>
                    {racer.isYou ? <EmojiPicker value={lab.you.emoji} color={racer.color} onChange={(emoji) => lab.setYou({ emoji })} size="sm" disabled={lobby.starting} />
                      : <RacerAvatar emoji={racer.emoji} color={racer.color} size="sm" dim={!racer.ready} />}
                    <div className="min-w-0 flex-1">
                      <p className="flex min-w-0 items-center gap-1.5"><span className="truncate font-bold">{racer.name}</span>{racer.isYou && <YouTag />}</p>
                      <p className="flex flex-wrap items-center gap-x-2 text-xs">
                        {racer.isHost && <HostTag />}
                        <span className={racer.ready ? "font-semibold text-success" : "text-muted-foreground"}>{racer.ready ? "On the grid" : "In the garage"}</span>
                      </p>
                    </div>
                  </div>
                </GridSlot>
              </motion.li>
            ))}
          </ol>
          <button type="button" onClick={lobby.toggleReady} disabled={lobby.starting} aria-pressed={lobby.you.ready}
            className={cn(solid, "h-12 w-full", lobby.you.ready && "border-2 border-border bg-transparent text-foreground")}>
            {lobby.you.ready ? <><GarageIcon className="size-5" aria-hidden="true" />Back to the garage</> : <><CheckCircleIcon weight="fill" className="size-5" aria-hidden="true" />Line up on the grid</>}
          </button>
        </section>
        <aside className="contents lg:flex lg:min-w-0 lg:flex-col lg:gap-4">
          <div className="order-first flex flex-col items-center gap-2 rounded-2xl border border-border bg-card p-4 text-center lg:order-none">
            <StartLights lit={lit} size="sm" />
            <p role="status" className="text-sm font-semibold">
              {lobby.starting ? <span className="text-destructive">Lights on. Go in {Math.max(1, lobby.countdown)}…</span> : `${lobby.readyCount} of ${lobby.racers.length} on the grid`}
            </p>
            <p className="text-xs text-muted-foreground">The lights go out when everyone has lined up.</p>
          </div>
          <PitWall lab={lab} editable={lobby.isHost && !lobby.starting} host={host} />
        </aside>
      </div>
    </main>
  );
}

function gapLabel(racer: LiveRacer, leader: LiveRacer) {
  if (racer.place === 1) return "Leader";
  if (racer.finishMs !== null && leader.finishMs !== null) return `+${((racer.finishMs - leader.finishMs) / 1000).toFixed(1)}s`;
  const cps = Math.max(1, (racer.liveWpm * 5) / 60);
  return `+${((leader.chars - racer.chars) / cps).toFixed(1)}s`;
}

function TimingTower({ race }: { race: MockRace }) {
  const leader = race.racers[0];
  return (
    <section aria-label="Timing tower" className="flex min-w-0 flex-col overflow-hidden rounded-2xl border-2 border-border bg-card">
      <div className="flex items-center justify-between gap-2 bg-foreground px-3 py-2 text-xs font-black uppercase tracking-widest text-background">
        <span className="flex items-center gap-1.5"><TimerIcon className="size-4" aria-hidden="true" />{race.phase === "countdown" ? "Formation" : formatSeconds(Math.max(0, race.elapsed))}</span>
        {race.endsIn !== null ? <span className="text-destructive">{race.endsIn}s left</span> : <span className="opacity-60">Interval</span>}
      </div>
      <ol>
        {race.racers.map((racer) => (
          <motion.li key={racer.id} layout transition={RACE_SPRING}
            className={cn("flex items-center gap-2 border-t border-border px-3 py-1.5 text-sm first:border-t-0", racer.isYou && "bg-primary text-primary-foreground")}>
            <span className="w-5 text-right font-black tabular-nums">{racer.place}</span>
            <span aria-hidden="true" className="h-5 w-1 rounded-full" style={{ backgroundColor: racer.color }} />
            <span aria-hidden="true">{racer.emoji}</span>
            <span className="font-black tracking-wider" title={racer.name}>{racerCode(racer.name)}<span className="sr-only">{racer.name}</span></span>
            <span className="ml-auto flex items-center gap-1 tabular-nums opacity-80">
              {racer.finishMs !== null && <FlagCheckeredIcon weight="fill" className="size-3.5" aria-label="Finished" />}
              {gapLabel(racer, leader)}
            </span>
          </motion.li>
        ))}
      </ol>
    </section>
  );
}

function Race({ lab, go }: ConceptProps) {
  const race = useMockRace(lab, () => go("results"));
  const lightsOut = race.phase !== "countdown";
  const lit = lightsOut ? 0 : Math.min(5, Math.floor((COUNTDOWN_MS + race.elapsed) / 600) + 1);
  const sectors = [1 / 3, 2 / 3, 1];
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 pt-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="flex items-center gap-2 text-xl font-black uppercase italic"><TrafficSignalIcon weight="fill" className="size-6 text-destructive" aria-hidden="true" />Race · {ROOM_CODE}</h1>
        <LeaveButton confirm onLeave={() => go("landing")} className="rounded-xl" />
      </header>
      <div className="grid gap-5 lg:grid-cols-[17rem_minmax(0,1fr)]">
        <div className="order-2 lg:order-none"><TimingTower race={race} /></div>
        <div className="flex min-w-0 flex-col gap-4">
          <section aria-label="Your race" className="relative flex min-w-0 flex-col gap-4 overflow-hidden rounded-2xl border-2 border-border bg-card p-4 sm:p-6">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div className="flex gap-5">
                <span className="flex flex-col"><span className="text-[0.65rem] font-bold uppercase tracking-widest text-muted-foreground">Speed</span><span className="text-3xl font-black tabular-nums">{race.you.liveWpm}<span className="ml-1 text-xs text-muted-foreground">WPM</span></span></span>
                <span className="flex flex-col"><span className="text-[0.65rem] font-bold uppercase tracking-widest text-muted-foreground">Position</span><span className="text-3xl font-black tabular-nums">P{race.you.place}<span className="ml-1 text-xs text-muted-foreground">/{race.racers.length}</span></span></span>
              </div>
              <AutoplayToggle race={race} compact />
            </div>
            <div className="flex gap-1" aria-label={`Sectors: ${Math.round(race.you.progress * 100)} percent through`} role="img">
              {sectors.map((end, index) => {
                const start = index / 3;
                const fill = Math.max(0, Math.min(1, (race.you.progress - start) / (end - start)));
                return (
                  <span key={end} className="relative h-3 flex-1 overflow-hidden rounded-full bg-muted">
                    <motion.span initial={false} animate={{ width: `${fill * 100}%` }} transition={{ type: "spring", stiffness: 140, damping: 24 }} className={cn("absolute inset-y-0 left-0 rounded-full", fill >= 1 ? "bg-success" : "bg-primary")} />
                    <span className="absolute inset-0 flex items-center justify-center text-[0.55rem] font-black text-foreground/60">S{index + 1}</span>
                  </span>
                );
              })}
            </div>
            <RacePassage race={race} size="lg" />
            <AnimatePresence>
              {(!lightsOut || race.elapsed < 900) && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-3 bg-card/80 backdrop-blur-[2px]">
                  <StartLights lit={lit} />
                  <span role="status" className="text-2xl font-black uppercase italic">{lightsOut ? "Lights out!" : "Hold…"}</span>
                </motion.div>
              )}
            </AnimatePresence>
          </section>
          {race.phase === "done" && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={BOUNCY_SPRING} role="status"
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border-2 border-foreground bg-[repeating-conic-gradient(var(--foreground)_0_25%,var(--background)_0_50%)] bg-[length:16px_16px] p-1">
              <span className="rounded-xl bg-card px-3 py-2 text-sm font-black uppercase">Chequered flag · P{race.you.place}{race.you.finishMs === null ? " (out of time)" : ""}</span>
              <button type="button" onClick={race.showResults} className={cn(solid, "h-10")}><FlagCheckeredIcon weight="fill" className="size-4" aria-hidden="true" />Classification ({race.resultsIn})</button>
            </motion.div>
          )}
        </div>
      </div>
    </main>
  );
}

function Results({ lab, go }: ConceptProps) {
  const results = lab.results;
  const winner = results[0];
  const host = results.find((result) => result.isHost)?.name ?? "the host";
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 pt-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{ROOM_CODE} · {lab.settings.difficulty} · {lab.settings.words} words</p>
          <h1 className="flex items-center gap-2 text-2xl font-black uppercase italic sm:text-3xl"><FlagCheckeredIcon weight="fill" className="size-7 shrink-0 sm:size-8" aria-hidden="true" />Classification</h1>
        </div>
      </header>
      <ol aria-label="Podium" className="grid grid-cols-3 items-end gap-2 sm:gap-4">
        {[results[1], results[0], results[2]].map((result) => result && (
          <motion.li key={result.id} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ ...BOUNCY_SPRING, delay: result.place === 1 ? 0.35 : 0.15 }}
            className={cn("flex min-w-0 flex-col items-center gap-2 rounded-2xl p-3 text-center", result.place === 1 ? "bg-foreground pb-8 text-background" : "border-2 border-border bg-card")}>
            {result.place === 1 && <motion.span initial={{ rotate: -30, scale: 0 }} animate={{ rotate: [0, -12, 12, 0], scale: 1 }} transition={{ delay: 0.7, duration: 0.8 }}><ChampagneIcon weight="fill" className="size-7 text-warning" aria-hidden="true" /></motion.span>}
            <span className="text-2xl font-black italic">P{result.place}</span>
            <RacerAvatar emoji={result.emoji} color={result.color} size={result.place === 1 ? "lg" : "md"} />
            <span className="flex w-full min-w-0 flex-col items-center"><span className="max-w-full truncate font-bold">{result.name}</span>{result.isYou && <YouTag className="mt-0.5" />}</span>
            <span className="text-sm tabular-nums opacity-80">{result.wpm} WPM</span>
          </motion.li>
        ))}
      </ol>
      <div className="overflow-hidden rounded-2xl border-2 border-border bg-card">
        <table className="w-full text-sm">
          <caption className="sr-only">Full classification</caption>
          <thead className="bg-muted/60 text-left text-[0.65rem] uppercase tracking-widest text-muted-foreground">
            <tr><th scope="col" className="px-3 py-2">Pos</th><th scope="col" className="px-1 py-2">Racer</th><th scope="col" className="px-2 py-2 text-right">Gap</th><th scope="col" className="hidden px-2 py-2 text-right sm:table-cell">Acc</th><th scope="col" className="px-3 py-2 text-right">WPM</th></tr>
          </thead>
          <tbody>
            {results.map((result, index) => (
              <motion.tr key={result.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 + index * 0.07 }} className={cn("border-t border-border", result.isYou && "bg-primary/10")}>
                <td className="px-3 py-2.5 font-black italic tabular-nums">{result.finishMs === null ? "DNF" : `P${result.place}`}</td>
                <td className="w-full max-w-0 px-1 py-2.5">
                  <span className="flex min-w-0 items-center gap-2">
                    <span aria-hidden="true" className="h-5 w-1 shrink-0 rounded-full" style={{ backgroundColor: result.color }} />
                    <span aria-hidden="true">{result.emoji}</span>
                    <span className="truncate font-semibold">{result.name}</span>{result.isYou && <YouTag />}
                  </span>
                </td>
                <td className="px-2 py-2.5 text-right tabular-nums text-muted-foreground">
                  {result.place === 1 ? formatSeconds(result.finishMs ?? 0) : result.finishMs === null ? `${Math.round(result.progress * 100)}%` : `+${((result.finishMs - (winner.finishMs ?? 0)) / 1000).toFixed(1)}s`}
                </td>
                <td className="hidden px-2 py-2.5 text-right tabular-nums sm:table-cell">{result.accuracy}%</td>
                <td className="px-3 py-2.5 text-right font-bold tabular-nums">{result.wpm}</td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
        {lab.role === "host" ? (
          <button type="button" onClick={() => go("lobby")} className={cn(solid, "h-12")}><ArrowClockwiseIcon className="size-5" aria-hidden="true" />Back to the grid</button>
        ) : <p className="text-sm text-muted-foreground">{host} will call everyone back to the grid.</p>}
        <LeaveButton onLeave={() => go("landing")} className="h-12 rounded-xl" />
      </div>
    </main>
  );
}

/** Concept 2, Starting grid: motorsport styling with grid boxes, start lights that fill as racers get ready, a timing tower and a classification table. */
export function GridConcept(props: ConceptProps) {
  if (props.screen === "landing") return <Landing {...props} />;
  if (props.screen === "lobby") return <Lobby {...props} />;
  if (props.screen === "race") return <Race {...props} />;
  return <Results {...props} />;
}
