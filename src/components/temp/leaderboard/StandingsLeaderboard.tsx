import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { MagnifyingGlassIcon, MedalIcon, ShieldCheckIcon, TrophyIcon } from "@phosphor-icons/react";
import { LAB_SPRING } from "@/components/temp/settings/lab-settings";
import { PeriodTabs, PlayerAvatar, RankChange, YouTag } from "./LeaderboardParts";
import { BOARDS, entryLabel, METALS, PERIODS, RULES, YOU, when, yourStanding, type PeriodId } from "./mock-leaderboard";

function YourStanding({ period, onSelect }: { period: PeriodId; onSelect: (period: PeriodId) => void }) {
  return (
    <section aria-labelledby="standing-title" className="flex flex-col gap-3">
      <h2 id="standing-title" className="flex items-center gap-2 px-1 text-sm font-semibold"><PlayerAvatar username={YOU} size="sm" />Your standing</h2>
      {PERIODS.map((meta) => {
        const standing = yourStanding(meta.id);
        const selected = period === meta.id;
        const closeness = standing.next ? Math.max(8, 100 - standing.next.gap * 6) : 100;
        return (
          <button key={meta.id} type="button" aria-pressed={selected} onClick={() => onSelect(meta.id)}
            className={`relative flex flex-col gap-2 rounded-2xl border p-4 text-left focus-visible:outline-2 focus-visible:outline-ring ${selected ? "border-primary" : "border-border hover:border-primary/40"}`}>
            {selected && <motion.span layoutId="standing-selected" transition={LAB_SPRING} className="absolute inset-0 rounded-2xl bg-primary/10" />}
            <span className="relative flex items-baseline justify-between gap-2">
              <span className="text-sm text-muted-foreground">{meta.title}</span>
              <span className="text-3xl font-black tabular-nums">#{standing.rank}</span>
            </span>
            <span aria-hidden="true" className="relative h-1.5 overflow-hidden rounded-full bg-muted">
              <motion.span className="block h-full rounded-full bg-primary" initial={{ width: 0 }} animate={{ width: `${closeness}%` }} transition={{ duration: 0.8 }} />
            </span>
            <span className="relative text-xs text-muted-foreground">{standing.next ? `${standing.next.gap} WPM to pass ${standing.next.username}` : "Top of the board"}</span>
          </button>
        );
      })}
      <p className="flex gap-2 rounded-2xl bg-muted/50 p-3 text-xs text-muted-foreground"><ShieldCheckIcon className="size-4 shrink-0" aria-hidden="true" />{RULES} Only verified tests appear.</p>
    </section>
  );
}

function MedalRow({ period }: { period: PeriodId }) {
  const top = BOARDS[period].slice(0, 3);
  return (
    <ol aria-label="Podium" className="grid grid-cols-3 items-end gap-3">
      {top.map((entry, place) => (
        <motion.li key={`${period}-${entry.username}`} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ ...LAB_SPRING, delay: (2 - place) * 0.06 }} aria-label={entryLabel(entry)}
          className={`flex flex-col items-center gap-2 rounded-3xl border-2 bg-card px-3 text-center ${place === 0 ? "order-2 py-6" : place === 1 ? "order-1 py-4" : "order-3 py-3"}`}
          style={{ borderColor: METALS[place], background: `linear-gradient(180deg, color-mix(in srgb, ${METALS[place]} 18%, var(--card)), var(--card))` }}>
          <span className="flex items-center gap-1 text-xs font-bold" style={{ color: METALS[place] }}>
            {place === 0 ? <TrophyIcon weight="fill" className="size-5" aria-hidden="true" /> : <MedalIcon weight="fill" className="size-5" aria-hidden="true" />}{place + 1}{["st", "nd", "rd"][place]}
          </span>
          <PlayerAvatar username={entry.username} size={place === 0 ? "lg" : "md"} />
          <span className="max-w-full truncate text-sm font-semibold">{entry.username}</span>
          <span className={`${place === 0 ? "text-3xl" : "text-2xl"} font-bold tabular-nums`}>{entry.wpm}</span>
        </motion.li>
      ))}
    </ol>
  );
}

/** 5 · Standings: your rank in every period beside a searchable, dense table. */
export function StandingsLeaderboard() {
  const [period, setPeriod] = useState<PeriodId>("today");
  const [query, setQuery] = useState("");
  const meta = PERIODS.find((entry) => entry.id === period)!;
  const needle = query.trim().toLowerCase();
  const rows = BOARDS[period].filter((entry) => !needle || entry.username.toLowerCase().includes(needle));
  return (
    <main className="mx-auto flex max-w-[100rem] flex-col gap-6 px-4 pt-8 md:px-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="flex items-center gap-3 text-3xl font-bold"><TrophyIcon weight="fill" className="size-8 text-[#d6a738]" aria-hidden="true" />Leaderboard</h1>
        <p className="text-sm text-muted-foreground">{meta.subtitle}{meta.resets ? ` · ${meta.resets}` : ""} · UTC</p>
      </header>
      <div className="grid items-start gap-6 lg:grid-cols-[19rem_minmax(0,1fr)]">
        <aside className="lg:sticky lg:top-6"><YourStanding period={period} onSelect={setPeriod} /></aside>
        <div className="flex min-w-0 flex-col gap-5">
          <div className="flex flex-wrap items-center gap-3">
            <PeriodTabs value={period} onChange={setPeriod} className="min-w-72" />
            <label className="flex min-w-48 flex-1 items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm focus-within:outline-2 focus-within:outline-ring">
              <MagnifyingGlassIcon className="size-4 text-muted-foreground" aria-hidden="true" />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Find a player" aria-label="Find a player" className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted-foreground" />
            </label>
          </div>
          <MedalRow period={period} />
          <div className="overflow-x-auto rounded-3xl border border-border bg-card">
            <table className="w-full min-w-[40rem] text-sm">
              <caption className="sr-only">{meta.title} leaderboard</caption>
              <thead className="border-b border-border text-xs text-muted-foreground">
                <tr>
                  <th scope="col" className="w-14 px-4 py-3 text-right font-medium">Rank</th>
                  <th scope="col" className="w-10 py-3 font-medium"><span className="sr-only">Change</span></th>
                  <th scope="col" className="px-3 py-3 text-left font-medium">Player</th>
                  <th scope="col" className="px-3 py-3 text-right font-medium">WPM</th>
                  <th scope="col" className="px-3 py-3 text-right font-medium">Accuracy</th>
                  <th scope="col" className="px-3 py-3 text-left font-medium">Test</th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">When</th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence initial={false} mode="popLayout">
                  {rows.map((entry) => (
                    <motion.tr layout key={`${period}-${entry.username}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={LAB_SPRING}
                      className={`border-b border-border last:border-0 ${entry.isYou ? "bg-primary/10" : entry.rank <= 3 ? "bg-muted/30" : ""}`}>
                      <td className="px-4 py-2.5 text-right font-bold tabular-nums" style={entry.rank <= 3 ? { color: METALS[entry.rank - 1] } : undefined}>{entry.rank}</td>
                      <td className="py-2.5"><RankChange change={entry.change} /></td>
                      <th scope="row" className="px-3 py-2.5 text-left font-medium"><span className="flex items-center gap-2"><PlayerAvatar username={entry.username} size="sm" />{entry.username}{entry.isYou && <YouTag />}</span></th>
                      <td className="px-3 py-2.5 text-right text-base font-bold tabular-nums">{entry.wpm}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground">{entry.accuracy.toFixed(1)}%</td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-muted-foreground">{entry.test}</td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-right text-muted-foreground">{when(entry.createdAt)}</td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
                {rows.length === 0 && <tr><td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">No player named “{query}” on this board.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}
