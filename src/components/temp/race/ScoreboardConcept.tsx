import { useEffect, useEffectEvent, useId, useState, type FormEvent, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRightIcon, CircleNotchIcon, KeyReturnIcon } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { DIFFICULTIES, RACE_SPRING, ROOM_CODE, WORD_COUNTS, formatSeconds, ordinal } from "./race-mock";
import { CopyCodeButton, EmojiPicker, LeaveButton, YouTag } from "./RaceParts";
import { AutoplayToggle, RacePassage } from "./RacePassage";
import { useMockLobby } from "./use-mock-lobby";
import { useMockRace } from "./use-mock-race";
import type { ConceptProps } from "./use-race-lab";

const label = "text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-muted-foreground";
const textButton = "inline-flex items-center gap-2 rounded-full px-1 font-semibold underline decoration-border decoration-2 underline-offset-[6px] transition-colors hover:text-primary hover:decoration-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-50";

function Kbd({ children }: { children: ReactNode }) {
  return <kbd className="rounded-md border border-border bg-muted px-1.5 py-0.5 text-[0.65rem] font-semibold text-muted-foreground no-underline">{children}</kbd>;
}

/** A page-level shortcut that stays out of the way of fields and buttons that already handle the key. */
function useShortcut(key: string, handler: () => void, enabled = true) {
  const run = useEffectEvent(handler);
  useEffect(() => {
    if (!enabled) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== key || event.metaKey || event.ctrlKey || event.altKey || event.repeat) return;
      const target = event.target as HTMLElement | null;
      if (target && target !== document.body && target.closest("input, textarea, select, button, a, [role=dialog]")) return;
      event.preventDefault();
      run();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [key, enabled]);
}

function Landing({ lab, go }: ConceptProps) {
  const id = useId();
  const [code, setCode] = useState("");
  const [name, setName] = useState(lab.you.name);
  const [pending, setPending] = useState<"join" | "host" | null>(null);
  const [error, setError] = useState("");
  const enter = (role: "join" | "host") => {
    if (!name.trim()) { setError("Add a name first."); return; }
    if (role === "join" && code.length < 4) { setError("That code looks short."); return; }
    setPending(role);
    lab.setYou({ name: name.trim() });
    lab.setRole(role === "host" ? "host" : "guest");
    window.setTimeout(() => go("lobby"), 450);
  };
  const submit = (event: FormEvent) => { event.preventDefault(); enter("join"); };
  return (
    <main className="mx-auto flex w-full max-w-xl flex-col items-center gap-10 px-4 pt-12 text-center sm:pt-20">
      <form onSubmit={submit} noValidate className="flex w-full flex-col items-center gap-6">
        <label htmlFor={`${id}-code`} className={label}>Race code</label>
        <input id={`${id}-code`} value={code} maxLength={6} autoComplete="off" spellCheck={false} autoFocus placeholder={ROOM_CODE}
          onChange={(event) => { setCode(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "")); setError(""); }}
          className="w-full border-b-2 border-border bg-transparent pb-2 text-center text-5xl font-black uppercase tracking-[0.2em] outline-none transition-colors placeholder:text-muted-foreground/20 focus:border-primary sm:text-7xl" />
        <p className="flex flex-wrap items-baseline justify-center gap-x-2 text-sm text-muted-foreground">
          <label htmlFor={`${id}-name`}>racing as</label>
          <input id={`${id}-name`} value={name} maxLength={30} autoComplete="nickname" onChange={(event) => { setName(event.target.value); setError(""); }}
            className="w-[12ch] border-b border-dashed border-muted-foreground bg-transparent text-center text-base font-semibold text-foreground outline-none focus:border-primary" />
        </p>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <button type="submit" disabled={pending !== null} className="inline-flex h-12 items-center gap-2 rounded-full bg-primary px-8 font-bold text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-50">
          {pending === "join" ? <CircleNotchIcon className="size-5 animate-spin" aria-hidden="true" /> : <KeyReturnIcon className="size-5" aria-hidden="true" />}Join
        </button>
      </form>
      <button type="button" onClick={() => enter("host")} disabled={pending !== null} className={cn(textButton, "text-sm text-muted-foreground")}>
        {pending === "host" ? <CircleNotchIcon className="size-4 animate-spin" aria-hidden="true" /> : null}or host a new race<ArrowRightIcon className="size-4" aria-hidden="true" />
      </button>
    </main>
  );
}

function cycle<T>(list: readonly T[], value: T) {
  return list[(list.indexOf(value) + 1) % list.length];
}

function Lobby({ lab, go }: ConceptProps) {
  const lobby = useMockLobby(lab, () => go("race"));
  const host = lobby.racers.find((racer) => racer.isHost)?.name ?? "the host";
  const editable = lobby.isHost && !lobby.starting;
  useShortcut(" ", lobby.toggleReady, !lobby.starting);
  return (
    <main className="mx-auto flex w-full max-w-xl flex-col gap-10 px-4 pt-10">
      <header className="flex flex-col items-center gap-2 text-center">
        <span className={label}>Room</span>
        <p className="text-5xl font-black tracking-[0.2em] sm:text-6xl">{ROOM_CODE}</p>
        <CopyCodeButton code={ROOM_CODE} className="border-0 text-muted-foreground" />
      </header>
      <section aria-labelledby="board-racers" className="flex flex-col gap-1">
        <h2 id="board-racers" className={cn(label, "mb-2 flex justify-between")}><span>Racers</span><span className="tabular-nums">{lobby.readyCount}/{lobby.racers.length}</span></h2>
        <ul>
          {lobby.racers.map((racer) => (
            <motion.li key={racer.id} layout transition={RACE_SPRING} className="flex items-center gap-3 py-2">
              {racer.isYou ? <EmojiPicker value={lab.you.emoji} color={racer.color} onChange={(emoji) => lab.setYou({ emoji })} size="sm" disabled={lobby.starting} />
                : <span aria-hidden="true" className="flex size-9 items-center justify-center text-xl">{racer.emoji}</span>}
              <span className={cn("flex min-w-0 items-center gap-1.5", racer.isYou && "font-bold text-primary")}>
                <span className="truncate">{racer.name}</span>{racer.isYou && <YouTag />}{racer.isHost && <span className="text-xs text-muted-foreground">host</span>}
              </span>
              <span aria-hidden="true" className="h-px min-w-4 flex-1 border-b border-dotted border-muted-foreground/40" />
              <span className={cn("flex items-center gap-1.5 text-sm", racer.ready ? "text-success" : "text-muted-foreground")}>
                <span aria-hidden="true" className={cn("size-2 rounded-full", racer.ready ? "bg-success" : "border border-muted-foreground")} />{racer.ready ? "ready" : "waiting"}
              </span>
            </motion.li>
          ))}
        </ul>
      </section>
      <p className="text-center text-sm text-muted-foreground">
        <button type="button" disabled={!editable} onClick={() => lab.setSettings({ difficulty: cycle(DIFFICULTIES, lab.settings.difficulty) })} className={cn(textButton, "text-foreground disabled:no-underline disabled:opacity-100")} aria-label={`Difficulty ${lab.settings.difficulty}${editable ? ", change" : ""}`}>{lab.settings.difficulty}</button>
        {" · "}
        <button type="button" disabled={!editable} onClick={() => lab.setSettings({ words: cycle(WORD_COUNTS, lab.settings.words as (typeof WORD_COUNTS)[number]) })} className={cn(textButton, "text-foreground disabled:no-underline disabled:opacity-100")} aria-label={`${lab.settings.words} words${editable ? ", change" : ""}`}>{lab.settings.words} words</button>
        <br /><span className="text-xs">{lobby.isHost ? "Tap a setting to change it." : `${host} sets the words.`}</span>
      </p>
      <div className="flex flex-col items-center gap-4">
        <AnimatePresence mode="wait" initial={false}>
          {lobby.starting ? (
            <motion.p key="count" role="status" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="text-6xl font-black tabular-nums text-primary">{Math.max(1, lobby.countdown)}</motion.p>
          ) : (
            <motion.button key="ready" type="button" onClick={lobby.toggleReady} aria-pressed={lobby.you.ready} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className={cn("inline-flex h-12 items-center gap-3 rounded-full px-8 font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                lobby.you.ready ? "border border-border text-muted-foreground hover:text-foreground" : "bg-primary text-primary-foreground")}>
              {lobby.you.ready ? "Not ready" : "Ready"}<Kbd>space</Kbd>
            </motion.button>
          )}
        </AnimatePresence>
        <LeaveButton onLeave={() => go("landing")} className="border-0" label="Leave" />
      </div>
    </main>
  );
}

function Race({ lab, go }: ConceptProps) {
  const race = useMockRace(lab, () => go("results"));
  const top = race.racers[0];
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-10 px-4 pt-8">
      <ol aria-label="Scoreboard" className="flex flex-col gap-1.5 text-xs">
        {race.racers.map((racer) => (
          <motion.li key={racer.id} layout transition={RACE_SPRING} className={cn("grid grid-cols-[1rem_minmax(0,6rem)_minmax(0,1fr)_2.5rem] items-center gap-2 sm:grid-cols-[1rem_8rem_minmax(0,1fr)_3rem]", racer.isYou ? "font-bold text-primary" : "text-muted-foreground")}>
            <span className="tabular-nums">{racer.place}</span>
            <span className="truncate">{racer.name}</span>
            <span className="relative h-1 overflow-hidden rounded-full bg-muted">
              <motion.span initial={false} animate={{ width: `${racer.progress * 100}%` }} transition={{ type: "tween", ease: "linear", duration: 0.1 }}
                className={cn("absolute inset-y-0 left-0 rounded-full", racer.isYou ? "bg-primary" : racer.finishMs !== null ? "bg-foreground" : "bg-muted-foreground")} />
            </span>
            <span className="text-right tabular-nums">{racer.finishMs !== null ? formatSeconds(racer.finishMs) : racer.liveWpm}</span>
          </motion.li>
        ))}
      </ol>
      <section aria-label="Race text" className="relative flex flex-col gap-4">
        <AnimatePresence mode="popLayout">
          {race.phase === "countdown" && (
            <motion.p key={race.countdown} role="status" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={RACE_SPRING} className="text-center text-4xl font-black tabular-nums text-muted-foreground">
              {race.countdown}
            </motion.p>
          )}
        </AnimatePresence>
        <RacePassage race={race} size="lg" />
      </section>
      <section aria-label="Your numbers" className="grid grid-cols-3 gap-4 text-center">
        {[["wpm", `${race.you.liveWpm}`], ["accuracy", `${race.you.liveAccuracy}%`], [race.you.finishMs !== null ? "finished" : "place", race.you.finishMs !== null ? formatSeconds(race.you.finishMs) : `${race.you.place}/${race.racers.length}`]].map(([term, value]) => (
          <div key={term} className="flex flex-col gap-1"><span className="text-3xl font-black tabular-nums sm:text-5xl">{value}</span><span className={label}>{term}</span></div>
        ))}
      </section>
      <footer className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm text-muted-foreground" role="status">
        {race.phase === "done" ? (
          <span className="flex flex-wrap items-center justify-center gap-2">
            {top.isYou ? "You won." : `${top.name} won.`} You placed {ordinal(race.you.place)}.
            <button type="button" onClick={race.showResults} className={cn(textButton, "text-foreground")}>See results ({race.resultsIn})</button>
          </span>
        ) : (
          <>
            <AutoplayToggle race={race} compact />
            {race.endsIn !== null && <span className="text-warning">ends in {race.endsIn}s</span>}
            <LeaveButton confirm onLeave={() => go("landing")} className="h-8 border-0" label="Leave" />
          </>
        )}
      </footer>
    </main>
  );
}

function Results({ lab, go }: ConceptProps) {
  const results = lab.results;
  const me = results.find((result) => result.isYou);
  const host = results.find((result) => result.isHost)?.name ?? "the host";
  const isHost = lab.role === "host";
  useShortcut("Enter", () => go("lobby"), isHost);
  useShortcut("Escape", () => go("landing"));
  return (
    <main className="mx-auto flex w-full max-w-xl flex-col gap-10 px-4 pt-10">
      {me && (
        <header className="flex flex-col items-center gap-1 text-center">
          <span className={label}>You finished</span>
          <motion.p initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={RACE_SPRING} className="text-8xl font-black leading-none tracking-tight text-primary sm:text-9xl">
            {me.finishMs === null ? "DNF" : ordinal(me.place)}
          </motion.p>
          <p className="text-muted-foreground">{me.wpm} wpm · {me.accuracy}% · {me.finishMs === null ? "out of time" : formatSeconds(me.finishMs)}</p>
        </header>
      )}
      <table className="w-full text-sm">
        <caption className={cn(label, "mb-3 text-left")}>Final board</caption>
        <thead className="sr-only"><tr><th scope="col">Place</th><th scope="col">Racer</th><th scope="col">WPM</th><th scope="col">Accuracy</th><th scope="col">Time</th></tr></thead>
        <tbody>
          {results.map((result, index) => (
            <motion.tr key={result.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 + index * 0.06 }} className={cn("border-b border-border/60", result.isYou ? "font-bold text-primary" : "text-muted-foreground")}>
              <td className="w-6 py-2 tabular-nums">{result.place}</td>
              <td className="w-full max-w-0 py-2 pl-2"><span className="block truncate"><span aria-hidden="true" className="mr-2">{result.emoji}</span>{result.name}</span></td>
              <td className="py-2 pl-3 text-right tabular-nums">{result.wpm}</td>
              <td className="hidden py-2 pl-3 text-right tabular-nums sm:table-cell">{result.accuracy}%</td>
              <td className="py-2 pl-3 text-right tabular-nums">{result.finishMs === null ? "dnf" : formatSeconds(result.finishMs)}</td>
            </motion.tr>
          ))}
        </tbody>
      </table>
      <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm">
        {isHost ? (
          <button type="button" onClick={() => go("lobby")} className={cn(textButton, "text-foreground")}>race again <Kbd>enter</Kbd></button>
        ) : <span className="text-muted-foreground">waiting for {host}…</span>}
        <button type="button" onClick={() => go("landing")} className={cn(textButton, "text-muted-foreground")}>leave <Kbd>esc</Kbd></button>
      </div>
    </main>
  );
}

/** Concept 5, Scoreboard: almost no chrome. One big code field, a plain list lobby with keyboard shortcuts, thin progress lines over a large passage and a giant finishing place. */
export function ScoreboardConcept(props: ConceptProps) {
  if (props.screen === "landing") return <Landing {...props} />;
  if (props.screen === "lobby") return <Lobby {...props} />;
  if (props.screen === "race") return <Race {...props} />;
  return <Results {...props} />;
}
