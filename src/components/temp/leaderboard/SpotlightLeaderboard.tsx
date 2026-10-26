import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRightIcon, CrownSimpleIcon, CrosshairIcon, MedalIcon, TimerIcon } from "@phosphor-icons/react";
import { LAB_SPRING } from "@/components/temp/settings/lab-settings";
import { PlayerAvatar, RulesNote, YouTag } from "./LeaderboardParts";
import { BOARDS, entryLabel, METALS, PERIODS, yourStanding, type BoardEntry, type PeriodId } from "./mock-leaderboard";

function PeriodCards({ value, onChange }: { value: PeriodId; onChange: (period: PeriodId) => void }) {
  return (
    <div role="tablist" aria-label="Leaderboard period" className="grid gap-3 sm:grid-cols-3">
      {PERIODS.map((meta) => {
        const leader = BOARDS[meta.id][0];
        const selected = value === meta.id;
        return (
          <button key={meta.id} type="button" role="tab" aria-selected={selected} onClick={() => onChange(meta.id)}
            className={`relative flex flex-col gap-3 rounded-3xl border p-4 text-left focus-visible:outline-2 focus-visible:outline-ring ${selected ? "border-primary" : "border-border hover:border-primary/40"}`}>
            {selected && <motion.span layoutId="spotlight-period" transition={LAB_SPRING} className="absolute inset-0 rounded-3xl bg-primary/10" />}
            <span className="relative flex items-center justify-between gap-2">
              <span className="text-lg font-bold">{meta.title}</span>
              {meta.resets && <span className="flex items-center gap-1 text-[0.7rem] text-muted-foreground"><TimerIcon className="size-3.5" aria-hidden="true" />{meta.resets}</span>}
            </span>
            <span className="relative flex items-center gap-2 text-sm text-muted-foreground">
              <PlayerAvatar username={leader.username} size="sm" />
              <span className="min-w-0 flex-1 truncate">{leader.username}</span>
              <strong className="tabular-nums text-foreground">{leader.wpm}</strong>
            </span>
          </button>
        );
      })}
    </div>
  );
}

function RunnerUp({ entry, side }: { entry: BoardEntry; side: "left" | "right" }) {
  const metal = METALS[entry.rank - 1];
  return (
    <motion.div initial={{ opacity: 0, x: side === "left" ? -30 : 30, y: 20 }} animate={{ opacity: 1, x: 0, y: 0 }} transition={{ ...LAB_SPRING, delay: 0.15 }} aria-label={entryLabel(entry)}
      className="flex flex-col items-center gap-2 rounded-3xl border-2 bg-card p-5 text-center" style={{ borderColor: metal }}>
      <span className="flex items-center gap-1.5 text-sm font-bold" style={{ color: metal }}><MedalIcon weight="fill" className="size-5" aria-hidden="true" />#{entry.rank}</span>
      <PlayerAvatar username={entry.username} size="lg" />
      <span className="max-w-full truncate font-semibold">{entry.username}</span>
      <span className="text-3xl font-bold tabular-nums">{entry.wpm}<span className="ml-1 text-xs font-normal text-muted-foreground">wpm</span></span>
    </motion.div>
  );
}

function Stage({ board }: { board: BoardEntry[] }) {
  const [first, second, third] = board;
  return (
    <section aria-label="Top three" className="relative overflow-hidden rounded-[2.5rem] border border-border bg-[radial-gradient(ellipse_at_top,color-mix(in_srgb,var(--primary)_18%,transparent),transparent_70%)] px-4 pb-8 pt-10">
      <motion.div aria-hidden="true" initial={{ rotate: -14, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} transition={{ type: "spring", stiffness: 60, damping: 14 }}
        className="pointer-events-none absolute left-1/2 top-0 h-[130%] w-72 -translate-x-1/2 origin-top bg-[linear-gradient(180deg,color-mix(in_srgb,#d6a738_40%,transparent),transparent_75%)] [clip-path:polygon(42%_0,58%_0,100%_100%,0_100%)]" />
      <div className="relative grid items-end gap-4 md:grid-cols-[1fr_1.3fr_1fr]">
        <div className="order-2 md:order-1 md:pb-6"><RunnerUp entry={second} side="left" /></div>
        <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={LAB_SPRING} aria-label={entryLabel(first)} className="order-1 flex flex-col items-center gap-3 text-center md:order-2 md:pb-16">
          <motion.span initial={{ y: -20, opacity: 0 }} animate={{ y: [0, -6, 0], opacity: 1 }} transition={{ y: { duration: 2.4, repeat: Infinity, ease: "easeInOut" }, opacity: { delay: 0.2 } }} className="text-[#d6a738]">
            <CrownSimpleIcon weight="fill" className="size-12" aria-hidden="true" />
          </motion.span>
          <span className="rounded-full p-1.5" style={{ boxShadow: "0 0 0 3px #d6a738, 0 0 60px 10px color-mix(in srgb, #d6a738 45%, transparent)" }}>
            <PlayerAvatar username={first.username} size="xl" />
          </span>
          <span className="flex items-center gap-2 text-2xl font-bold">{first.username}{first.isYou && <YouTag />}</span>
          <span className="text-7xl font-black leading-none tabular-nums tracking-tight">{first.wpm}</span>
          <span className="text-sm text-muted-foreground">words per minute · {first.accuracy.toFixed(1)}% accuracy · {first.test}</span>
        </motion.div>
        <div className="order-3 md:pb-2"><RunnerUp entry={third} side="right" /></div>
      </div>
    </section>
  );
}

/** 3 · Spotlight: the leader centre stage, period cards with reset timers, and who to chase next. */
export function SpotlightLeaderboard() {
  const [period, setPeriod] = useState<PeriodId>("today");
  const board = BOARDS[period];
  const standing = yourStanding(period);
  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-6 px-4 pt-8 md:px-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-4xl font-black tracking-tight">Leaderboard</h1>
        <RulesNote className="items-end" />
      </header>
      <PeriodCards value={period} onChange={setPeriod} />
      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={period} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.12 } }} className="flex flex-col gap-6">
          <Stage board={board} />
          <section className="flex flex-wrap items-center gap-4 rounded-3xl border border-primary/40 bg-primary/10 p-5">
            <span className="flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground"><CrosshairIcon weight="bold" className="size-6" aria-hidden="true" /></span>
            <div className="flex min-w-48 flex-1 flex-col">
              <span className="text-xs font-semibold uppercase tracking-wider text-primary">Your next target</span>
              <span className="text-lg">You’re <strong>#{standing.rank}</strong>. Beat <strong>{standing.next?.username}</strong> by {standing.next?.gap} WPM to move up.</span>
            </div>
            <button type="button" className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 font-semibold text-primary-foreground hover:brightness-110">Practice now<ArrowRightIcon className="size-4" aria-hidden="true" /></button>
          </section>
          <ol start={4} aria-label="Ranks 4 and below" className="grid grid-cols-[repeat(auto-fill,minmax(14rem,1fr))] gap-3">
            {board.slice(3).map((entry, index) => (
              <motion.li key={entry.username} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ ...LAB_SPRING, delay: 0.1 + index * 0.03 }} aria-label={entryLabel(entry)}
                className={`flex items-center gap-3 rounded-2xl border p-3 ${entry.isYou ? "border-primary bg-primary/10" : "border-border bg-card"}`}>
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted text-sm font-bold tabular-nums">{entry.rank}</span>
                <PlayerAvatar username={entry.username} size="sm" />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="flex items-center gap-1.5 truncate text-sm font-semibold">{entry.username}{entry.isYou && <YouTag />}</span>
                  <span className="text-[0.7rem] text-muted-foreground">{entry.test}</span>
                </span>
                <span className="text-lg font-bold tabular-nums">{entry.wpm}</span>
              </motion.li>
            ))}
          </ol>
        </motion.div>
      </AnimatePresence>
    </main>
  );
}
