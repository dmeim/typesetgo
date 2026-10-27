import { useId, useState, type FormEvent, type ReactNode } from "react";
import { motion } from "framer-motion";
import { ArrowClockwiseIcon, CircleNotchIcon, FlagCheckeredIcon, LightningIcon, PlusIcon, ReceiptIcon, SignInIcon } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { BOUNCY_SPRING, COUNTDOWN_MS, DIFFICULTIES, ROOM_CODE, WORD_COUNTS, formatSeconds, ordinal, type RaceResult } from "./race-mock";
import { CopyCodeButton, EmojiPicker, HostTag, LeaveButton, RacerAvatar, YouTag } from "./RaceParts";
import { AutoplayToggle, RacePassage } from "./RacePassage";
import { useMockLobby } from "./use-mock-lobby";
import { useMockRace, type MockRace } from "./use-mock-race";
import type { ConceptProps } from "./use-race-lab";

const greenButton = "inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-success px-5 font-black uppercase tracking-wide text-background transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-50";

/** The starting tree: two staging bulbs, three ambers and a green, top to bottom. */
function Tree({ prestaged, staged, ambers, green, className, small = false }: { prestaged: boolean; staged: boolean; ambers: number; green: boolean; className?: string; small?: boolean }) {
  const bulb = (on: boolean, color: string, tiny = false) => (
    <motion.span initial={false} animate={{ backgroundColor: on ? color : "color-mix(in srgb, var(--background) 16%, transparent)", boxShadow: on ? `0 0 12px ${color}` : "0 0 0 transparent" }} transition={{ duration: 0.12 }}
      className={cn("block rounded-full", tiny ? (small ? "size-2" : "size-3") : small ? "size-3.5" : "size-5")} />
  );
  return (
    <div aria-hidden="true" className={cn("flex w-fit shrink-0 flex-col items-center rounded-2xl bg-foreground", small ? "gap-1 px-2 py-2" : "gap-1.5 px-3 py-3", className)}>
      <span className={cn("flex", small ? "gap-1.5" : "gap-2")}>{bulb(prestaged, "var(--warning)", true)}{bulb(prestaged, "var(--warning)", true)}</span>
      <span className={cn("flex", small ? "gap-1.5" : "gap-2")}>{bulb(staged, "var(--warning)", true)}{bulb(staged, "var(--warning)", true)}</span>
      {[0, 1, 2].map((index) => <span key={index} className={cn("flex", small ? "gap-1.5" : "gap-2")}>{bulb(ambers > index, "var(--warning)")}{bulb(ambers > index, "var(--warning)")}</span>)}
      <span className={cn("flex", small ? "gap-1.5" : "gap-2")}>{bulb(green, "var(--success)")}{bulb(green, "var(--success)")}</span>
    </div>
  );
}

/** Six letter boxes over one hidden input. */
function CodeBoxes({ id, value, onChange }: { id: string; value: string; onChange: (value: string) => void }) {
  return (
    <span className="relative flex w-full gap-1.5">
      {Array.from({ length: 6 }, (_, index) => (
        <span key={index} aria-hidden="true" className={cn("flex h-12 min-w-0 flex-1 items-center justify-center rounded-lg border-2 bg-background text-xl font-black uppercase",
          index === value.length ? "border-success" : value[index] ? "border-foreground/40" : "border-border")}>
          {value[index] ?? <span className="text-muted-foreground/30">{ROOM_CODE[index]}</span>}
        </span>
      ))}
      <input id={id} value={value} maxLength={6} autoComplete="off" spellCheck={false} autoCapitalize="characters" onChange={(event) => onChange(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
        className="peer absolute inset-0 size-full cursor-text text-base opacity-0" />
    </span>
  );
}

function Landing({ lab, go: navigate }: ConceptProps) {
  const id = useId();
  const [name, setName] = useState(lab.you.name);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState<"host" | "join" | null>(null);
  const enter = (role: "host" | "join") => (event?: FormEvent) => {
    event?.preventDefault();
    if (!name.trim()) { setError("Fill in your racer name."); return; }
    if (role === "join" && code.length < 6) { setError("Room codes have six letters and numbers."); return; }
    setPending(role);
    lab.setYou({ name: name.trim() });
    lab.setRole(role === "host" ? "host" : "guest");
    window.setTimeout(() => navigate("lobby"), 550);
  };
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 pt-8">
      <header className="flex items-center gap-4">
        <Tree prestaged staged ambers={3} green className="hidden sm:flex" />
        <div className="flex flex-col gap-2">
          <p className="flex items-center gap-1.5 text-xs font-black uppercase tracking-[0.3em] text-success"><LightningIcon weight="fill" className="size-4" aria-hidden="true" />Drag race</p>
          <h1 className="text-3xl font-black uppercase leading-none tracking-tight sm:text-5xl">Stage. Wait for green. Type.</h1>
          <p className="text-muted-foreground">Straight-line typing sprints. Quick start, clean finish, best time wins.</p>
        </div>
      </header>
      <label htmlFor={`${id}-name`} className="flex flex-col gap-1.5 text-sm font-semibold sm:max-w-xs">
        Racer name
        <input id={`${id}-name`} value={name} maxLength={30} autoComplete="nickname" onChange={(event) => { setName(event.target.value); setError(""); }}
          className="h-11 rounded-xl border border-input bg-background px-3 text-base outline-none focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/20" />
      </label>
      <div className="flex flex-col gap-3">
        <form onSubmit={enter("join")} noValidate className="relative grid min-w-0 gap-3 overflow-hidden rounded-2xl border-2 border-border bg-card p-4 pl-12 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end sm:pl-16">
          <span aria-hidden="true" className="absolute inset-y-0 left-0 flex w-9 items-center justify-center bg-foreground text-2xl font-black text-background sm:w-12 sm:text-3xl">1</span>
          <label htmlFor={`${id}-code`} className="flex min-w-0 flex-col gap-1.5 text-sm font-semibold">Join with a code<CodeBoxes id={`${id}-code`} value={code} onChange={(value) => { setCode(value); setError(""); }} /></label>
          <button type="submit" disabled={pending !== null} className={greenButton}>
            {pending === "join" ? <CircleNotchIcon className="size-5 animate-spin" aria-hidden="true" /> : <SignInIcon className="size-5" aria-hidden="true" />}Stage
          </button>
        </form>
        <div className="relative flex min-w-0 flex-wrap items-center justify-between gap-3 overflow-hidden rounded-2xl border-2 border-dashed border-border bg-card/60 p-4 pl-12 sm:pl-16">
          <span aria-hidden="true" className="absolute inset-y-0 left-0 flex w-9 items-center justify-center bg-muted text-2xl font-black text-muted-foreground sm:w-12 sm:text-3xl">2</span>
          <div className="min-w-0">
            <h2 className="font-bold">Run your own strip</h2>
            <p className="text-sm text-muted-foreground">Get a code to share. You set the words.</p>
          </div>
          <button type="button" onClick={() => enter("host")()} disabled={pending !== null} className={cn(greenButton, "bg-foreground")}>
            {pending === "host" ? <CircleNotchIcon className="size-5 animate-spin" aria-hidden="true" /> : <PlusIcon className="size-5" aria-hidden="true" />}Host
          </button>
        </div>
        {error && <p role="alert" className="text-sm font-medium text-destructive">{error}</p>}
      </div>
    </main>
  );
}

function Lane({ number, highlight, children, end }: { number: number; highlight?: boolean; children: ReactNode; end?: ReactNode }) {
  return (
    <li className={cn("flex min-w-0 items-stretch overflow-hidden rounded-xl border", highlight ? "border-primary/60" : "border-border")}>
      <span className={cn("flex w-7 shrink-0 items-center justify-center text-sm font-black sm:w-10 sm:text-lg", highlight ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>{number}</span>
      <div className="relative h-12 min-w-0 flex-1 bg-[repeating-linear-gradient(90deg,transparent_0_38px,color-mix(in_srgb,var(--border)_70%,transparent)_38px_40px)] bg-card">{children}</div>
      {end && <span className="flex w-14 shrink-0 flex-col items-center justify-center border-l border-border bg-card text-center sm:w-20">{end}</span>}
    </li>
  );
}

function Lobby({ lab, go: navigate }: ConceptProps) {
  const lobby = useMockLobby(lab, () => navigate("race"));
  const host = lobby.racers.find((racer) => racer.isHost)?.name ?? "the host";
  const ambers = lobby.starting ? Math.min(3, 4 - Math.max(1, lobby.countdown)) : 0;
  const chip = "rounded-lg border border-border px-2.5 py-1 text-xs font-bold uppercase transition-colors enabled:hover:bg-accent disabled:cursor-not-allowed aria-pressed:border-foreground aria-pressed:bg-foreground aria-pressed:text-background";
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-5 px-4 pt-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-black uppercase">Staging lanes</h1>
          <CopyCodeButton code={ROOM_CODE} className="rounded-xl font-black tracking-[0.2em]">{ROOM_CODE}</CopyCodeButton>
        </div>
        <LeaveButton onLeave={() => navigate("landing")} className="rounded-xl" />
      </header>
      <section aria-label="Race control" className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border border-border bg-card p-3">
        <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">Race control{lobby.isHost ? "" : ` · ${host}`}</span>
        <div className="flex flex-wrap gap-1" role="group" aria-label="Difficulty">
          {DIFFICULTIES.map((difficulty) => <button key={difficulty} type="button" disabled={!lobby.isHost || lobby.starting} aria-pressed={lab.settings.difficulty === difficulty} onClick={() => lab.setSettings({ difficulty })} className={chip}>{difficulty}</button>)}
        </div>
        <div className="flex flex-wrap gap-1" role="group" aria-label="Words">
          {WORD_COUNTS.map((words) => <button key={words} type="button" disabled={!lobby.isHost || lobby.starting} aria-pressed={lab.settings.words === words} onClick={() => lab.setSettings({ words })} className={cn(chip, "tabular-nums")}>{words}w</button>)}
        </div>
      </section>
      <div className="grid gap-5 md:grid-cols-[auto_minmax(0,1fr)]">
        <div className="flex items-center gap-4 md:flex-col md:items-stretch">
          <Tree prestaged={lobby.readyCount > 0} staged={lobby.allReady} ambers={ambers} green={false} className="md:mx-auto" />
          <div className="flex min-w-0 flex-1 flex-col gap-3 rounded-2xl border border-border bg-card p-3 md:w-48 md:flex-none">
            <div className="flex items-center gap-3">
              <EmojiPicker value={lab.you.emoji} color={lobby.you.color} onChange={(emoji) => lab.setYou({ emoji })} size="sm" disabled={lobby.starting} />
              <span className="min-w-0 truncate text-sm font-bold">{lab.you.name}</span>
            </div>
            <button type="button" onClick={lobby.toggleReady} disabled={lobby.starting} aria-pressed={lobby.you.ready} className={cn(greenButton, "h-10 w-full", lobby.you.ready && "bg-warning")}>
              {lobby.you.ready ? "Staged" : "Stage"}
            </button>
            <p role="status" className="text-xs text-muted-foreground">{lobby.starting ? "Watch the ambers…" : `${lobby.readyCount}/${lobby.racers.length} staged. Green comes when all lanes are staged.`}</p>
          </div>
        </div>
        <ol aria-label="Lanes" className="flex min-w-0 flex-col gap-2">
          {lobby.racers.map((racer, index) => (
            <Lane key={racer.id} number={index + 1} highlight={racer.isYou}
              end={<span className={cn("text-[0.6rem] font-black uppercase leading-tight", racer.ready ? "text-success" : "text-muted-foreground")}>{racer.ready ? "Staged" : "Pre-stage"}</span>}>
              <span aria-hidden="true" className="absolute inset-y-0 left-[25%] w-0.5 bg-warning/60" />
              <motion.span initial={false} animate={{ left: racer.ready ? "25%" : "0%", x: racer.ready ? "-50%" : "15%" }} transition={BOUNCY_SPRING} className="absolute top-1/2 flex -translate-y-1/2 items-center">
                <RacerAvatar emoji={racer.emoji} color={racer.color} size="sm" dim={!racer.ready} />
              </motion.span>
              <span className="absolute inset-y-0 left-[calc(25%+1.5rem)] right-2 flex min-w-0 items-center gap-1.5">
                <span className="truncate text-sm font-bold">{racer.name}</span>{racer.isYou && <YouTag />}{racer.isHost && <HostTag label={false} className="hidden sm:inline-flex" />}
              </span>
            </Lane>
          ))}
        </ol>
      </div>
    </main>
  );
}

function RaceTree({ race }: { race: MockRace }) {
  const ambers = race.phase === "countdown" ? Math.min(3, Math.floor((COUNTDOWN_MS + race.elapsed) / 1000) + 1) : 3;
  return <Tree prestaged staged ambers={race.phase === "countdown" ? ambers : 0} green={race.phase !== "countdown"} small />;
}

function Race({ lab, go: navigate }: ConceptProps) {
  const race = useMockRace(lab, () => navigate("results"));
  const lanes = [...race.racers].sort((a, b) => a.reactionMs - b.reactionMs);
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 pt-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <RaceTree race={race} />
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Elapsed</p>
            <p role="timer" className="text-4xl font-black tabular-nums">{(Math.max(0, race.elapsed) / 1000).toFixed(2)}</p>
            <p role="status" className="text-xs font-bold uppercase">
              {race.phase === "countdown" ? <span className="text-warning">Ambers…</span> : race.phase === "done" ? <span className="text-success">Run complete</span>
                : race.endsIn !== null ? <span className="text-warning">Strip closes in {race.endsIn}s</span> : <span className="text-success">Green!</span>}
            </p>
          </div>
        </div>
        <LeaveButton confirm onLeave={() => navigate("landing")} className="rounded-xl" />
      </header>
      <ol aria-label="Lanes" className="flex flex-col gap-1.5">
        {lanes.map((racer, index) => (
          <Lane key={racer.id} number={index + 1} highlight={racer.isYou}
            end={<><span className="text-base font-black tabular-nums leading-none sm:text-xl">{racer.liveWpm}</span><span className="text-[0.55rem] font-bold uppercase text-muted-foreground">WPM</span></>}>
            <span aria-hidden="true" className="absolute inset-y-0 right-0 w-2 bg-[repeating-linear-gradient(0deg,var(--foreground)_0_6px,var(--background)_6px_12px)]" />
            <motion.span initial={false} animate={{ width: `${racer.progress * 100}%` }} transition={{ type: "tween", ease: "linear", duration: 0.1 }} aria-hidden="true"
              className="absolute inset-y-2 left-0 rounded-r-full opacity-25" style={{ backgroundColor: racer.color }} />
            <motion.span initial={false} animate={{ left: `calc(${racer.progress * 100}% - ${racer.progress * 2.25}rem)` }} transition={{ type: "tween", ease: "linear", duration: 0.1 }} className="absolute top-1/2 flex -translate-y-1/2 items-center gap-1">
              <RacerAvatar emoji={racer.emoji} color={racer.color} size="sm" />
            </motion.span>
            {racer.finishMs !== null && (
              <motion.span initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} transition={BOUNCY_SPRING}
                className="absolute left-2 top-1/2 -translate-y-1/2 rounded-md bg-foreground px-1.5 py-0.5 text-[0.65rem] font-black uppercase text-background">
                {ordinal(racer.place)} · {formatSeconds(racer.finishMs)}
              </motion.span>
            )}
            <span className="sr-only">{racer.name}{racer.isYou ? " (you)" : ""}: {Math.round(racer.progress * 100)} percent</span>
          </Lane>
        ))}
      </ol>
      <section aria-label="Your run" className="flex min-w-0 flex-col gap-3 rounded-2xl border-2 border-border bg-card p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <AutoplayToggle race={race} />
          {race.phase === "done" && (
            <button type="button" onClick={race.showResults} className={cn(greenButton, "h-9 text-sm")}><ReceiptIcon weight="fill" className="size-4" aria-hidden="true" />Time slips ({race.resultsIn})</button>
          )}
        </div>
        <RacePassage race={race} size="lg" />
      </section>
    </main>
  );
}

function TimeSlip({ result, lane, big = false, delay }: { result: RaceResult; lane: number; big?: boolean; delay: number }) {
  const rows: [string, string][] = [
    ["Lane", `${lane}`],
    ["Reaction", (result.reactionMs / 1000).toFixed(3)],
    ["Elapsed", result.finishMs === null ? "—" : (result.finishMs / 1000).toFixed(3)],
    ["Speed", `${result.wpm} wpm`],
    ["Accuracy", `${result.accuracy}%`],
  ];
  return (
    <motion.article initial={{ opacity: 0, y: -30, rotate: big ? -4 : 0 }} animate={{ opacity: 1, y: 0, rotate: big ? -1.5 : 0 }} transition={{ ...BOUNCY_SPRING, delay }}
      aria-label={`${result.name} time slip`}
      className={cn("relative flex min-w-0 flex-col gap-2 rounded-sm border border-y-4 border-border border-y-foreground/15 border-dashed bg-card px-4 py-5 font-mono shadow-lg",
        result.isYou && "border-y-primary/50", big && "sm:px-6")}>
      <header className="flex items-center justify-between gap-2 border-b border-dashed border-border pb-2">
        <span className="text-[0.6rem] font-bold uppercase tracking-[0.25em] text-muted-foreground">TypeSetGo strip</span>
        <span className="text-[0.6rem] text-muted-foreground">{ROOM_CODE}</span>
      </header>
      <p className="flex min-w-0 items-center gap-2"><span aria-hidden="true" className={big ? "text-3xl" : "text-xl"}>{result.emoji}</span><span className={cn("truncate font-black uppercase", big && "text-xl")}>{result.name}</span>{result.isYou && <YouTag />}</p>
      <dl className={cn("grid grid-cols-[auto_1fr] gap-x-4 gap-y-0.5", big ? "text-base" : "text-sm")}>
        {rows.map(([term, value]) => (
          <div key={term} className="contents"><dt className="uppercase text-muted-foreground">{term}</dt><dd className="text-right font-bold tabular-nums">{value}</dd></div>
        ))}
      </dl>
      <p className="border-t border-dashed border-border pt-2 text-center font-black uppercase tracking-[0.3em]">{result.finishMs === null ? "Did not finish" : result.place === 1 ? "Winner" : `${ordinal(result.place)} place`}</p>
      {result.place === 1 && result.finishMs !== null && (
        <motion.span initial={{ scale: 2.5, opacity: 0, rotate: -30 }} animate={{ scale: 1, opacity: 1, rotate: -14 }} transition={{ ...BOUNCY_SPRING, delay: delay + 0.4 }}
          aria-hidden="true" className="absolute right-3 top-10 rounded-md border-4 border-success px-2 text-2xl font-black uppercase text-success">Win</motion.span>
      )}
    </motion.article>
  );
}

function Results({ lab, go: navigate }: ConceptProps) {
  const results = lab.results;
  const lanes = [...results].sort((a, b) => a.reactionMs - b.reactionMs).map((result) => result.id);
  const me = results.find((result) => result.isYou);
  const host = results.find((result) => result.isHost)?.name ?? "the host";
  const others = results.filter((result) => !result.isYou);
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 pt-6">
      <h1 className="flex items-center gap-2 text-2xl font-black uppercase"><ReceiptIcon weight="fill" className="size-7" aria-hidden="true" />Time slips</h1>
      <div className="grid gap-6 md:grid-cols-[minmax(0,20rem)_minmax(0,1fr)] md:items-start">
        {me && <TimeSlip result={me} lane={lanes.indexOf(me.id) + 1} big delay={0.1} />}
        <div className="grid gap-4 sm:grid-cols-2">
          {others.map((result, index) => <TimeSlip key={result.id} result={result} lane={lanes.indexOf(result.id) + 1} delay={0.3 + index * 0.08} />)}
        </div>
      </div>
      <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
        {lab.role === "host" ? (
          <button type="button" onClick={() => navigate("lobby")} className={cn(greenButton, "h-12")}><ArrowClockwiseIcon className="size-5" aria-hidden="true" />Back to staging</button>
        ) : <p className="flex items-center gap-2 text-sm text-muted-foreground"><FlagCheckeredIcon className="size-4" aria-hidden="true" />{host} will call the next run.</p>}
        <LeaveButton onLeave={() => navigate("landing")} className="h-12 rounded-xl" />
      </div>
    </main>
  );
}

/** Concept 4, Drag strip: a straight sprint with a starting tree, lanes that stage as racers ready up, a big elapsed timer and printed time slips at the end. */
export function DragStripConcept(props: ConceptProps) {
  if (props.screen === "landing") return <Landing {...props} />;
  if (props.screen === "lobby") return <Lobby {...props} />;
  if (props.screen === "race") return <Race {...props} />;
  return <Results {...props} />;
}
