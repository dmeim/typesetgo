import { useId, useState, type FormEvent, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion, useTime, useTransform } from "framer-motion";
import {
  ArrowClockwiseIcon, CheckCircleIcon, CircleNotchIcon, FlagCheckeredIcon, HourglassIcon, MapTrifoldIcon, MedalIcon, PlusIcon, SignInIcon, SlidersHorizontalIcon, TimerIcon,
} from "@phosphor-icons/react";
import { PODIUM_METALS } from "@/lib/leaderboard-entries";
import { cn } from "@/lib/utils";
import { BOTS, BOUNCY_SPRING, DIFFICULTIES, RACE_SPRING, ROOM_CODE, WORD_COUNTS, YOU_ID, formatSeconds, ordinal } from "./race-mock";
import { CopyCodeButton, EmojiPicker, HostTag, LeaveButton, RacerAvatar, YouTag } from "./RaceParts";
import { AutoplayToggle, RacePassage } from "./RacePassage";
import { INFIELD_PATH, TRACK_HEIGHT, TRACK_PATH, TRACK_WIDTH, laneOffset, toPercent, trackPoint, type TrackPoint } from "./track-geometry";
import { useMockLobby } from "./use-mock-lobby";
import { useMockRace } from "./use-mock-race";
import type { ConceptProps } from "./use-race-lab";

const LANE_ORDER = [YOU_ID, ...BOTS.map((bot) => bot.id)];
/** Finishers park in the infield in two rows of three, in finishing order. */
const parked = (place: number): TrackPoint => ({ x: 80 + ((place - 1) % 3) * 20, y: place <= 3 ? 52 : 70 });
const laneFor = (id: string) => laneOffset(Math.max(0, LANE_ORDER.indexOf(id)));
const field = "h-11 w-full min-w-0 rounded-full border border-input bg-background px-4 text-base outline-none focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/20";
const pill = "group inline-flex h-11 items-center justify-center gap-2 rounded-full bg-primary px-5 font-bold text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-50";

/** The circuit drawing; racers and labels are laid over it as children. */
function TrackMap({ children, className, label, infield }: { children?: ReactNode; className?: string; label: string; infield?: ReactNode }) {
  const pattern = useId();
  return (
    <div role="img" aria-label={label} className={cn("relative aspect-[5/3] w-full", className)}>
      <svg viewBox={`0 0 ${TRACK_WIDTH} ${TRACK_HEIGHT}`} className="absolute inset-0 size-full overflow-visible" aria-hidden="true">
        <defs>
          <pattern id={pattern} width="3" height="3" patternUnits="userSpaceOnUse">
            <rect width="3" height="3" fill="var(--background)" />
            <rect width="1.5" height="1.5" fill="var(--foreground)" />
            <rect x="1.5" y="1.5" width="1.5" height="1.5" fill="var(--foreground)" />
          </pattern>
        </defs>
        <path d={TRACK_PATH} fill="none" stroke="var(--border)" strokeWidth="26" strokeLinejoin="round" />
        <path d={TRACK_PATH} fill="none" stroke="var(--muted)" strokeWidth="23" strokeLinejoin="round" />
        <path d={INFIELD_PATH} fill="color-mix(in srgb, var(--success) 10%, transparent)" />
        <path d={TRACK_PATH} fill="none" stroke="var(--muted-foreground)" strokeOpacity="0.35" strokeWidth="0.6" strokeDasharray="3 3" />
        <rect x="98.5" y="88.5" width="3" height="23" fill={`url(#${pattern})`} />
      </svg>
      {infield && <div className="absolute inset-x-[30%] inset-y-[33%] flex items-center justify-center text-center">{infield}</div>}
      {children}
    </div>
  );
}

function MapDot({ point, emoji, color, isYou, dim, place, smooth = false, label }: { point: TrackPoint; emoji: string; color: string; isYou?: boolean; dim?: boolean; place?: number; smooth?: boolean; label?: string }) {
  return (
    <motion.span initial={false} animate={toPercent(point)} transition={smooth ? { type: "tween", ease: "linear", duration: 0.1 } : RACE_SPRING}
      className={cn("absolute z-10 -translate-x-1/2 -translate-y-1/2", isYou && "z-20")}>
      <span className={cn("relative flex size-6 items-center justify-center rounded-full border-2 bg-card text-xs shadow-md transition-opacity sm:size-9 sm:text-lg", dim && "opacity-40 grayscale")} style={{ borderColor: color }}>
        {isYou && <span aria-hidden="true" className="absolute inset-0 rounded-full border-2 border-primary motion-safe:animate-ping" />}
        <span aria-hidden="true">{emoji}</span>
        {place !== undefined && <span className="absolute -right-1.5 -top-1.5 flex size-4 items-center justify-center rounded-full bg-foreground text-[0.55rem] font-black text-background sm:size-5 sm:text-[0.65rem]">{place}</span>}
      </span>
      {label && <span className="absolute left-1/2 top-full mt-0.5 hidden -translate-x-1/2 whitespace-nowrap rounded-full bg-card/90 px-1.5 text-[0.6rem] font-bold sm:block">{label}</span>}
    </motion.span>
  );
}

/** Idle laps on the landing map, driven by motion values so nothing re-renders. */
function OrbitDot({ index, emoji, color, still }: { index: number; emoji: string; color: string; still: boolean }) {
  const time = useTime();
  const fraction = (ms: number) => (still ? 0.1 + index * 0.17 : ms / (9000 + index * 900) + index * 0.17);
  const left = useTransform(time, (ms) => toPercent(trackPoint(fraction(ms), laneOffset(index))).left);
  const top = useTransform(time, (ms) => toPercent(trackPoint(fraction(ms), laneOffset(index))).top);
  return (
    <motion.span style={{ left, top }} className="absolute -translate-x-1/2 -translate-y-1/2">
      <span className="flex size-7 items-center justify-center rounded-full border-2 bg-card text-sm shadow-md sm:size-9 sm:text-lg" style={{ borderColor: color }} aria-hidden="true">{emoji}</span>
    </motion.span>
  );
}

function Landing({ lab, go }: ConceptProps) {
  const id = useId();
  const still = useReducedMotion() ?? false;
  const [name, setName] = useState(lab.you.name);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState<"host" | "join" | null>(null);
  const enter = (role: "host" | "join") => (event?: FormEvent) => {
    event?.preventDefault();
    if (!name.trim()) { setError("Add your racer name first."); return; }
    if (role === "join" && code.trim().length < 4) { setError("Enter the room code to join that track."); return; }
    setPending(role);
    lab.setYou({ name: name.trim() });
    lab.setRole(role === "host" ? "host" : "guest");
    window.setTimeout(() => go("lobby"), 550);
  };
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 pt-6">
      <header className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-3xl font-black tracking-tight sm:text-5xl">One lap. Every word.</h1>
        <p className="max-w-lg text-muted-foreground">Each race is a single lap of the track. Type the passage and your racer goes round. First back to the line wins.</p>
      </header>
      <section aria-label="Track preview" className="rounded-3xl border border-border bg-card p-3 sm:p-6">
        <TrackMap className="mx-auto max-w-2xl" label="Racers lapping the track" infield={<span className="text-[0.6rem] font-bold uppercase tracking-widest text-muted-foreground sm:text-xs">Live practice laps</span>}>
          {BOTS.map((bot, index) => <OrbitDot key={bot.id} index={index} emoji={bot.emoji} color={bot.color} still={still} />)}
        </TrackMap>
      </section>
      <section className="grid min-w-0 gap-4 rounded-3xl border border-border bg-card p-4 sm:p-6 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
        <label htmlFor={`${id}-name`} className="flex flex-col gap-1.5 text-sm font-semibold md:col-span-3">
          Racer name
          <input id={`${id}-name`} value={name} maxLength={30} autoComplete="nickname" onChange={(event) => { setName(event.target.value); setError(""); }} className={cn(field, "md:max-w-xs")} />
        </label>
        <form onSubmit={enter("join")} noValidate className="flex min-w-0 flex-col gap-2">
          <h2 className="flex items-center gap-2 font-bold"><SignInIcon className="size-5" aria-hidden="true" />Join a track</h2>
          <div className="flex min-w-0 gap-2">
            <label htmlFor={`${id}-code`} className="sr-only">Room code</label>
            <input id={`${id}-code`} value={code} maxLength={6} placeholder={ROOM_CODE} autoComplete="off" spellCheck={false} onChange={(event) => { setCode(event.target.value.toUpperCase()); setError(""); }}
              className={cn(field, "font-bold uppercase tracking-[0.25em] placeholder:text-muted-foreground/40")} />
            <button type="submit" disabled={pending !== null} aria-label="Join race" className={cn(pill, "w-11 shrink-0 px-0")}>
              {pending === "join" ? <CircleNotchIcon className="size-5 animate-spin" aria-hidden="true" /> : <SignInIcon className="size-5" aria-hidden="true" />}
            </button>
          </div>
        </form>
        <div aria-hidden="true" className="flex items-center gap-3 text-xs font-bold uppercase text-muted-foreground md:flex-col">
          <span className="h-px flex-1 bg-border md:h-auto md:w-px" />or<span className="h-px flex-1 bg-border md:h-auto md:w-px" />
        </div>
        <div className="flex min-w-0 flex-col gap-2">
          <h2 className="flex items-center gap-2 font-bold"><MapTrifoldIcon className="size-5" aria-hidden="true" />Build a track</h2>
          <button type="button" onClick={() => enter("host")()} disabled={pending !== null} className={cn(pill, "bg-foreground text-background")}>
            {pending === "host" ? <CircleNotchIcon className="size-5 animate-spin" aria-hidden="true" /> : <PlusIcon className="size-5" aria-hidden="true" />}
            {pending === "host" ? "Building…" : "Host a race"}
          </button>
        </div>
        {error && <p role="alert" className="text-sm font-medium text-destructive md:col-span-3">{error}</p>}
      </section>
    </main>
  );
}

function Lobby({ lab, go }: ConceptProps) {
  const lobby = useMockLobby(lab, () => go("race"));
  const host = lobby.racers.find((racer) => racer.isHost)?.name ?? "the host";
  const ready = lobby.racers.filter((racer) => racer.ready);
  const waiting = lobby.racers.filter((racer) => !racer.ready);
  const gridPoint = (index: number): TrackPoint => ({ x: 94 - Math.floor(index / 2) * 15, y: 100 + (index % 2 === 0 ? -6 : 6) });
  const pitPoint = (index: number): TrackPoint => ({ x: 62 + index * 15, y: 78 });
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 pt-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <h1 className="text-xl font-black">Track <span className="text-primary tracking-[0.2em]">{ROOM_CODE}</span></h1>
          <CopyCodeButton code={ROOM_CODE} />
        </div>
        <LeaveButton onLeave={() => go("landing")} />
      </header>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <section aria-label="Starting line" className="relative min-w-0 rounded-3xl border border-border bg-card p-3 sm:p-6">
          <TrackMap className="mx-auto max-w-2xl" label={`${ready.length} racers on the starting grid, ${waiting.length} still in the pit lane`}
            infield={<span className="flex flex-col items-center gap-0.5 text-[0.6rem] font-bold uppercase tracking-widest text-muted-foreground sm:text-xs">Pit lane<span className="hidden font-normal normal-case tracking-normal sm:block">Ready racers roll out to the line</span></span>}>
            {waiting.map((racer, index) => <MapDot key={racer.id} point={pitPoint(index)} emoji={racer.emoji} color={racer.color} isYou={racer.isYou} dim />)}
            {ready.map((racer, index) => <MapDot key={racer.id} point={gridPoint(index)} emoji={racer.emoji} color={racer.color} isYou={racer.isYou} />)}
          </TrackMap>
          <AnimatePresence>
            {lobby.starting && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} role="status" className="absolute inset-0 flex items-center justify-center rounded-3xl bg-card/70 backdrop-blur-[1px]">
                <AnimatePresence mode="popLayout">
                  <motion.span key={lobby.countdown} initial={{ scale: 2, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.4, opacity: 0 }} transition={BOUNCY_SPRING} className="text-7xl font-black text-primary sm:text-9xl">
                    {Math.max(1, lobby.countdown)}
                  </motion.span>
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>
        </section>
        <aside className="flex min-w-0 flex-col gap-4">
          <section aria-labelledby="map-racers" className="flex flex-col gap-3 rounded-3xl border border-border bg-card p-4">
            <h2 id="map-racers" className="flex items-center justify-between gap-2 font-bold">Racers<span className="text-xs font-semibold text-muted-foreground">{lobby.readyCount}/{lobby.racers.length} at the line</span></h2>
            <ul className="flex flex-col gap-1.5">
              {lobby.racers.map((racer) => (
                <li key={racer.id} className={cn("flex items-center gap-2.5 rounded-2xl px-2 py-1.5", racer.isYou && "bg-primary/10")}>
                  {racer.isYou ? <EmojiPicker value={lab.you.emoji} color={racer.color} onChange={(emoji) => lab.setYou({ emoji })} size="sm" disabled={lobby.starting} />
                    : <RacerAvatar emoji={racer.emoji} color={racer.color} size="sm" />}
                  <span className="flex min-w-0 flex-1 items-center gap-1.5"><span className="truncate text-sm font-semibold">{racer.name}</span>{racer.isYou && <YouTag />}{racer.isHost && <HostTag label={false} />}</span>
                  {racer.ready ? <CheckCircleIcon weight="fill" className="size-5 text-success" aria-label="Ready" /> : <HourglassIcon className="size-5 text-muted-foreground" aria-label="Not ready" />}
                </li>
              ))}
            </ul>
            <button type="button" onClick={lobby.toggleReady} disabled={lobby.starting} aria-pressed={lobby.you.ready} className={cn(pill, lobby.you.ready && "border border-border bg-transparent text-foreground hover:bg-accent")}>
              {lobby.you.ready ? "Back to the pit lane" : "Roll out to the line"}
            </button>
          </section>
          <section aria-labelledby="map-setup" className="flex flex-col gap-3 rounded-3xl border border-border bg-card p-4">
            <h2 id="map-setup" className="flex items-center gap-2 font-bold"><SlidersHorizontalIcon className="size-5" aria-hidden="true" />Track setup</h2>
            {!lobby.isHost && <p className="-mt-2 text-xs text-muted-foreground">{host} sets the track.</p>}
            <label className="flex flex-col gap-1 text-sm font-semibold">Difficulty
              <select value={lab.settings.difficulty} disabled={!lobby.isHost || lobby.starting} onChange={(event) => lab.setSettings({ difficulty: event.target.value as typeof lab.settings.difficulty })}
                className="h-10 rounded-full border border-input bg-background px-3 capitalize disabled:opacity-60">
                {DIFFICULTIES.map((difficulty) => <option key={difficulty} value={difficulty}>{difficulty}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm font-semibold">Lap length
              <select value={lab.settings.words} disabled={!lobby.isHost || lobby.starting} onChange={(event) => lab.setSettings({ words: Number(event.target.value) })}
                className="h-10 rounded-full border border-input bg-background px-3 disabled:opacity-60">
                {WORD_COUNTS.map((words) => <option key={words} value={words}>{words} words</option>)}
              </select>
            </label>
          </section>
        </aside>
      </div>
    </main>
  );
}

function Race({ lab, go }: ConceptProps) {
  const race = useMockRace(lab, () => go("results"));
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 pt-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <p role="status" className="flex flex-wrap items-center gap-x-3 text-sm text-muted-foreground">
          <span className="font-bold text-foreground">Lap {race.phase === "countdown" ? 0 : 1}/1</span>
          <span className="inline-flex items-center gap-1"><TimerIcon className="size-4" aria-hidden="true" />{formatSeconds(Math.max(0, race.elapsed))}</span>
          {race.endsIn !== null && <span className="font-semibold text-warning">Closing in {race.endsIn}s</span>}
        </p>
        <LeaveButton confirm onLeave={() => go("landing")} />
      </header>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_16rem] lg:items-start">
        <div className="flex min-w-0 flex-col gap-5">
          <section aria-label="Track" className="min-w-0 rounded-3xl border border-border bg-card p-3 sm:p-6">
            <TrackMap className="mx-auto max-w-2xl" label={`You are ${ordinal(race.you.place)} of ${race.racers.length}, ${Math.round(race.you.progress * 100)} percent round the lap`}
              infield={race.phase === "countdown" ? (
                <AnimatePresence mode="popLayout"><motion.span key={race.countdown} initial={{ scale: 2, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.5, opacity: 0 }} transition={BOUNCY_SPRING} className="text-5xl font-black text-primary sm:text-7xl">{race.countdown}</motion.span></AnimatePresence>
              ) : race.finishedCount === 0 ? <span className="text-[0.6rem] font-bold uppercase tracking-widest text-muted-foreground sm:text-xs">Finishers park here</span> : undefined}>
              {race.racers.map((racer) => racer.finishMs !== null
                ? <MapDot key={racer.id} point={parked(racer.place)} emoji={racer.emoji} color={racer.color} isYou={racer.isYou} place={racer.place} />
                : <MapDot key={racer.id} point={trackPoint(racer.progress, laneFor(racer.id))} emoji={racer.emoji} color={racer.color} isYou={racer.isYou} smooth label={racer.isYou ? "You" : undefined} />)}
            </TrackMap>
          </section>
          <section aria-label="Your lap" className="flex min-w-0 flex-col gap-3 rounded-3xl border border-border bg-card p-4 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <AutoplayToggle race={race} />
              {race.phase === "done" ? (
                <button type="button" onClick={race.showResults} className={cn(pill, "h-9 text-sm")}><MedalIcon weight="fill" className="size-4" aria-hidden="true" />Results ({race.resultsIn})</button>
              ) : <span className="text-xs text-muted-foreground"><strong className="text-sm tabular-nums text-foreground">{race.you.liveWpm}</strong> WPM · <strong className="text-sm tabular-nums text-foreground">{race.you.liveAccuracy}%</strong></span>}
            </div>
            <RacePassage race={race} size="md" />
          </section>
        </div>
        <section aria-label="Standings" className="flex min-w-0 flex-col gap-1 rounded-3xl border border-border bg-card p-3">
          {race.racers.map((racer) => (
            <motion.div key={racer.id} layout transition={RACE_SPRING} className={cn("flex items-center gap-2 rounded-2xl px-2 py-1.5 text-sm", racer.isYou && "bg-primary/10")}>
              <span className="w-4 text-center font-black tabular-nums text-muted-foreground">{racer.place}</span>
              <span aria-hidden="true">{racer.emoji}</span>
              <span className="min-w-0 flex-1 truncate font-semibold">{racer.name}</span>
              {racer.finishMs !== null ? <FlagCheckeredIcon weight="fill" className="size-4 text-success" aria-label="Finished" />
                : <span className="text-xs tabular-nums text-muted-foreground">{Math.round(racer.progress * 100)}%</span>}
              <span className="w-8 text-right text-xs font-bold tabular-nums">{racer.liveWpm}</span>
            </motion.div>
          ))}
        </section>
      </div>
    </main>
  );
}

function Results({ lab, go }: ConceptProps) {
  const results = lab.results;
  const me = results.find((result) => result.isYou);
  const host = results.find((result) => result.isHost)?.name ?? "the host";
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-5 px-4 pt-6">
      <h1 className="flex items-center gap-2 text-2xl font-black sm:text-3xl"><FlagCheckeredIcon weight="fill" className="size-7 text-primary" aria-hidden="true" />Lap complete</h1>
      <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_18rem]">
        <section aria-label="Finish order on the track" className="min-w-0 rounded-3xl border border-border bg-card p-3 sm:p-6">
          <TrackMap className="mx-auto max-w-2xl" label="Finishers parked in the infield in finishing order">
            {results.map((result) => result.finishMs !== null
              ? <MapDot key={result.id} point={parked(result.place)} emoji={result.emoji} color={result.color} isYou={result.isYou} place={result.place} />
              : <MapDot key={result.id} point={trackPoint(result.progress, laneFor(result.id))} emoji={result.emoji} color={result.color} isYou={result.isYou} dim />)}
          </TrackMap>
        </section>
        {me && (
          <motion.section initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ ...RACE_SPRING, delay: 0.2 }} aria-label="Your lap"
            className="flex flex-col items-center justify-center gap-2 rounded-3xl bg-primary p-5 text-center text-primary-foreground">
            <RacerAvatar emoji={me.emoji} color="var(--primary-foreground)" size="lg" />
            <p className="text-5xl font-black">{me.finishMs === null ? "DNF" : ordinal(me.place)}</p>
            <dl className="grid w-full grid-cols-3 gap-2 text-center">
              {[["WPM", `${me.wpm}`], ["Acc", `${me.accuracy}%`], ["Lap", me.finishMs === null ? "–" : formatSeconds(me.finishMs)]].map(([term, value]) => (
                <div key={term} className="rounded-2xl bg-primary-foreground/15 py-2"><dt className="text-[0.65rem] uppercase tracking-widest opacity-80">{term}</dt><dd className="font-black tabular-nums">{value}</dd></div>
              ))}
            </dl>
          </motion.section>
        )}
      </div>
      <ol aria-label="Final standings" className="grid gap-2 sm:grid-cols-2">
        {results.map((result, index) => (
          <motion.li key={result.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ ...RACE_SPRING, delay: 0.3 + index * 0.06 }}
            className={cn("flex items-center gap-3 rounded-2xl border bg-card px-3 py-2", result.isYou ? "border-primary/60" : "border-border")}>
            {result.place <= 3 && result.finishMs !== null
              ? <MedalIcon weight="fill" className="size-6 shrink-0" style={{ color: PODIUM_METALS[result.place - 1] }} aria-label={`${ordinal(result.place)} place`} />
              : <span className="w-6 text-center font-black tabular-nums text-muted-foreground">{result.place}</span>}
            <RacerAvatar emoji={result.emoji} color={result.color} size="sm" />
            <span className="flex min-w-0 flex-1 items-center gap-1.5"><span className="truncate font-semibold">{result.name}</span>{result.isYou && <YouTag />}</span>
            <span className="text-right text-xs text-muted-foreground"><strong className="text-sm tabular-nums text-foreground">{result.wpm}</strong> WPM<br />{result.finishMs === null ? `${Math.round(result.progress * 100)}% of lap` : formatSeconds(result.finishMs)}</span>
          </motion.li>
        ))}
      </ol>
      <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
        {lab.role === "host" ? (
          <button type="button" onClick={() => go("lobby")} className={cn(pill, "h-12")}><ArrowClockwiseIcon className="size-5" aria-hidden="true" />Another lap</button>
        ) : <p className="text-sm text-muted-foreground">Waiting for {host} to start another lap…</p>}
        <LeaveButton onLeave={() => go("landing")} className="h-12" />
      </div>
    </main>
  );
}

/** Concept 3, Track map: every race is one lap of an oval circuit; racers roll from the pit lane to the line, lap the map live and park in the infield in finishing order. */
export function TrackMapConcept(props: ConceptProps) {
  if (props.screen === "landing") return <Landing {...props} />;
  if (props.screen === "lobby") return <Lobby {...props} />;
  if (props.screen === "race") return <Race {...props} />;
  return <Results {...props} />;
}
