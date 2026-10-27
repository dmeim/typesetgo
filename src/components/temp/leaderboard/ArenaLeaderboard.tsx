import { useState } from "react";
import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import { CrownSimpleIcon, TrophyIcon } from "@phosphor-icons/react";
import { useAnimatedCounter } from "@/hooks/useAnimatedCounter";
import { LAB_SPRING } from "@/components/temp/settings/lab-settings";
import { PeriodTabs, PlayerAvatar, ProfileLink, RankChange, RulesNote, YouTag } from "./LeaderboardParts";
import { BOARDS, entryLabel, METALS, PERIODS, YOU, yourStanding, type BoardEntry, type PeriodId } from "./mock-leaderboard";

const STEP_HEIGHTS = ["h-44", "h-32", "h-24"];

function PodiumSpot({ entry, place }: { entry: BoardEntry; place: 0 | 1 | 2 }) {
  const wpm = useAnimatedCounter(entry.wpm, 700);
  const metal = METALS[place];
  return (
    <li className={`flex min-w-0 flex-col items-center ${place === 0 ? "order-2" : place === 1 ? "order-1" : "order-3"}`} aria-label={entryLabel(entry)}>
      <div className="relative flex flex-col items-center gap-2 pb-4">
        <AnimatePresence>
          {place === 0 && (
            <motion.span key="crown" initial={{ y: -12, opacity: 0, rotate: -20 }} animate={{ y: 0, opacity: 1, rotate: 0 }} transition={{ ...LAB_SPRING, delay: 0.25 }} className="absolute -top-7" style={{ color: metal }}>
              <CrownSimpleIcon weight="fill" className="size-7" aria-hidden="true" />
            </motion.span>
          )}
        </AnimatePresence>
        <span className="rounded-full" style={{ boxShadow: `0 0 0 4px var(--background), 0 0 0 7px ${metal}` }}>
          <PlayerAvatar username={entry.username} size={place === 0 ? "xl" : "lg"} layoutId={`arena-${entry.username}`} />
        </span>
        <motion.span key={entry.username} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="max-w-full truncate px-1 text-sm font-semibold">
          <ProfileLink username={entry.username} />{entry.isYou && <> <YouTag /></>}
        </motion.span>
        <span className="flex items-baseline gap-1"><span className={`${place === 0 ? "text-4xl" : "text-3xl"} font-bold tabular-nums`}>{wpm}</span><span className="text-xs text-muted-foreground">wpm</span></span>
      </div>
      <motion.div layout transition={LAB_SPRING} aria-hidden="true"
        className={`flex w-full flex-col items-center justify-start gap-1 rounded-t-2xl border border-b-0 border-t-4 pt-3 ${STEP_HEIGHTS[place]}`}
        style={{ borderColor: metal, background: `linear-gradient(180deg, color-mix(in srgb, ${metal} 30%, var(--card)), color-mix(in srgb, ${metal} 6%, var(--background)))` }}>
        <span className="text-5xl font-black tabular-nums" style={{ color: metal }}>{place + 1}</span>
      </motion.div>
    </li>
  );
}

function YouBar({ period }: { period: PeriodId }) {
  const standing = yourStanding(period);
  const label = PERIODS.find((entry) => entry.id === period)!.label.toLowerCase();
  return (
    <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ ...LAB_SPRING, delay: 0.3 }}
      className="sticky bottom-20 z-20 mx-auto mt-6 flex max-w-3xl items-center gap-4 rounded-2xl border border-primary/40 bg-popover/95 px-4 py-3 shadow-2xl backdrop-blur">
      <PlayerAvatar username={YOU} />
      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={period} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18 }} className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-4 gap-y-1">
          <span className="text-sm">You’re <strong className="text-lg">#{standing.rank}</strong> {label === "all time" ? "of all time" : label}</span>
          <span className="text-xs text-muted-foreground">{standing.next ? `${standing.next.gap} WPM behind ${standing.next.username}` : ""}</span>
        </motion.div>
      </AnimatePresence>
      <span className="text-2xl font-bold tabular-nums text-primary">{standing.wpm}<span className="ml-1 text-xs font-normal text-muted-foreground">wpm</span></span>
    </motion.div>
  );
}

/** 1 · Arena: one big podium. Switching period morphs every player to their new place. */
export function ArenaLeaderboard() {
  const [period, setPeriod] = useState<PeriodId>("all");
  const board = BOARDS[period];
  const meta = PERIODS.find((entry) => entry.id === period)!;
  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-8 px-4 pt-10">
      <header className="flex flex-col items-center gap-4 text-center">
        <h1 className="flex items-center gap-3 text-4xl font-bold"><TrophyIcon weight="fill" className="size-9 text-[#d6a738]" aria-hidden="true" />Leaderboard</h1>
        <PeriodTabs value={period} onChange={setPeriod} className="w-full max-w-md" />
        <AnimatePresence mode="wait" initial={false}>
          <motion.p key={period} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-sm text-muted-foreground">{meta.subtitle}{meta.resets ? ` · ${meta.resets}` : ""} · UTC</motion.p>
        </AnimatePresence>
        <RulesNote className="items-center" />
      </header>

      <LayoutGroup>
        <ol aria-label={`${meta.title} podium`} className="mx-auto grid w-full max-w-2xl grid-cols-3 items-end gap-3 border-b border-border pt-8">
          {board.slice(0, 3).map((entry, place) => <PodiumSpot key={place} entry={entry} place={place as 0 | 1 | 2} />)}
        </ol>

        <ol aria-label={`${meta.title} ranks 4 and below`} start={4} className="flex flex-col gap-1.5">
          <AnimatePresence mode="popLayout" initial={false}>
            {board.slice(3).map((entry) => (
              <motion.li layout key={entry.username} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 16 }} transition={LAB_SPRING} aria-label={entryLabel(entry)}
                className={`flex items-center gap-3 rounded-2xl border px-4 py-2.5 ${entry.isYou ? "border-primary/50 bg-primary/10" : "border-transparent bg-card"}`}>
                <motion.span key={entry.rank} initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-7 text-right text-lg font-bold tabular-nums text-muted-foreground">{entry.rank}</motion.span>
                <RankChange change={entry.change} />
                <PlayerAvatar username={entry.username} size="sm" layoutId={`arena-${entry.username}`} />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="flex items-center gap-2 truncate font-semibold"><ProfileLink username={entry.username} />{entry.isYou && <YouTag />}</span>
                  <span className="text-xs text-muted-foreground">{entry.test} · {entry.accuracy.toFixed(1)}% accuracy</span>
                </span>
                <span className="text-xl font-bold tabular-nums">{entry.wpm}<span className="ml-1 text-xs font-normal text-muted-foreground">wpm</span></span>
              </motion.li>
            ))}
          </AnimatePresence>
        </ol>
      </LayoutGroup>

      <YouBar period={period} />
    </main>
  );
}
