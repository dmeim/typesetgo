import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { FlagCheckeredIcon } from "@phosphor-icons/react";
import { LAB_SPRING } from "@/components/temp/settings/lab-settings";
import { PeriodTabs, PlayerAvatar, RulesNote, YouTag } from "./LeaderboardParts";
import { BOARDS, entryLabel, METALS, PERIODS, YOU, yourStanding, type BoardEntry, type PeriodId } from "./mock-leaderboard";

const BLOCK_HEIGHTS = [176, 128, 96];
const CHECKER = "repeating-conic-gradient(var(--foreground) 0 25%, transparent 0 50%) 0 0 / 8px 8px";

function Blocks({ board }: { board: BoardEntry[] }) {
  return (
    <ol aria-label="Podium" className="mx-auto grid w-full max-w-2xl grid-cols-3 items-end gap-0 [perspective:900px]">
      {board.slice(0, 3).map((entry, place) => (
        <li key={entry.username} aria-label={entryLabel(entry)} className={`flex flex-col items-center ${place === 0 ? "order-2" : place === 1 ? "order-1" : "order-3"}`}>
          <motion.div initial={{ y: -30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ ...LAB_SPRING, delay: 0.35 + (2 - place) * 0.12 }} className="flex flex-col items-center gap-1 pb-3">
            <PlayerAvatar username={entry.username} size={place === 0 ? "xl" : "lg"} />
            <span className="max-w-full truncate px-1 text-sm font-semibold">{entry.username}</span>
            <span className="text-2xl font-bold tabular-nums">{entry.wpm}<span className="ml-1 text-xs font-normal text-muted-foreground">wpm</span></span>
          </motion.div>
          <motion.div aria-hidden="true" initial={{ height: 0 }} animate={{ height: BLOCK_HEIGHTS[place] }} transition={{ type: "spring", stiffness: 140, damping: 18, delay: (2 - place) * 0.12 }}
            className="relative w-full [transform:rotateX(10deg)] [transform-origin:bottom]"
            style={{ background: `linear-gradient(180deg, color-mix(in srgb, ${METALS[place]} 55%, var(--card)), color-mix(in srgb, ${METALS[place]} 20%, var(--background)))`, boxShadow: `inset 0 6px 0 color-mix(in srgb, ${METALS[place]} 80%, white), inset ${place === 2 ? "-" : ""}10px 0 20px #0003` }}>
            <span className="absolute inset-x-0 top-4 text-center text-5xl font-black text-black/40 mix-blend-overlay">{place + 1}</span>
          </motion.div>
        </li>
      ))}
    </ol>
  );
}

function Lane({ entry, start, finish, index }: { entry: BoardEntry; start: number; finish: number; index: number }) {
  // The track starts just below the slowest runner so gaps between players stay visible.
  const percent = Math.min(100, 8 + (entry.wpm - start) / (finish - start) * 92);
  return (
    <motion.li layout transition={LAB_SPRING} aria-label={entryLabel(entry)} className="grid grid-cols-[2.5rem_minmax(0,9rem)_minmax(0,1fr)_3.5rem] items-center gap-3">
      <span className="text-right text-lg font-bold tabular-nums text-muted-foreground">{entry.rank}</span>
      <span className="flex min-w-0 items-center gap-2 truncate text-sm font-semibold">{entry.username}{entry.isYou && <YouTag />}</span>
      <span className={`relative h-12 overflow-hidden rounded-xl border ${entry.isYou ? "border-primary/60 bg-primary/10" : "border-border bg-card"}`}>
        <span aria-hidden="true" className="absolute inset-x-3 top-1/2 border-t-2 border-dashed border-border" />
        <span aria-hidden="true" className="absolute inset-y-0 right-0 w-3 opacity-30" style={{ background: CHECKER }} />
        <motion.span aria-hidden="true" initial={{ width: 0 }} animate={{ width: `${percent}%` }} transition={{ type: "spring", stiffness: 60, damping: 16, delay: 0.1 + index * 0.05 }}
          className={`absolute inset-y-0 left-0 flex items-center justify-end rounded-xl pr-1 ${entry.isYou ? "bg-primary/35" : "bg-primary/15"}`}>
          <PlayerAvatar username={entry.username} size="sm" />
        </motion.span>
      </span>
      <span className="text-right text-lg font-bold tabular-nums">{entry.wpm}</span>
    </motion.li>
  );
}

/** 4 · Race track: the podium, then everyone else in a lane racing to the podium line. */
export function RaceTrackLeaderboard() {
  const [period, setPeriod] = useState<PeriodId>("week");
  const board = BOARDS[period];
  const meta = PERIODS.find((entry) => entry.id === period)!;
  const finish = board[2].wpm;
  const standing = yourStanding(period);
  const lanes: BoardEntry[] = [...board.slice(3)];
  if (!board.some((entry) => entry.isYou)) {
    lanes.push({ rank: standing.rank, username: YOU, wpm: standing.wpm, accuracy: 96, test: "Time · 60s", createdAt: 0, change: 0, isYou: true });
  }
  const start = Math.floor(Math.min(...lanes.map((entry) => entry.wpm)) * 0.85);
  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-8 px-4 pt-8 md:px-6">
      <header className="flex flex-col items-center gap-4 text-center">
        <h1 className="flex items-center gap-3 text-4xl font-bold"><FlagCheckeredIcon weight="fill" className="size-9" aria-hidden="true" />The Race</h1>
        <PeriodTabs value={period} onChange={setPeriod} className="w-full max-w-md" />
        <p className="text-sm text-muted-foreground">{meta.subtitle}{meta.resets ? ` · ${meta.resets}` : ""} · UTC</p>
      </header>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={period} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.12 } }} className="flex flex-col gap-8">
          <Blocks board={board} />
          <section aria-label="Everyone else" className="flex flex-col gap-3">
            <div className="grid grid-cols-[2.5rem_minmax(0,9rem)_minmax(0,1fr)_3.5rem] gap-3 text-xs text-muted-foreground">
              <span /><span>Player</span>
              <span className="flex items-center justify-end gap-1.5">Podium line · {finish} wpm<FlagCheckeredIcon className="size-4" aria-hidden="true" /></span>
              <span className="text-right">WPM</span>
            </div>
            <ol className="flex flex-col gap-2">
              {lanes.map((entry, index) => <Lane key={entry.username} entry={entry} start={start} finish={finish} index={index} />)}
            </ol>
          </section>
        </motion.div>
      </AnimatePresence>
      <RulesNote className="items-center" />
    </main>
  );
}
