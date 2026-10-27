import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { TimerIcon, TrophyIcon } from "@phosphor-icons/react";
import { LAB_SPRING } from "@/components/temp/settings/lab-settings";
import { PeriodTabs, PlayerAvatar, ProfileLink, RankChange, RulesNote, YouTag } from "./LeaderboardParts";
import { BOARDS, entryLabel, METALS, PERIODS, YOU, yourStanding, type BoardEntry, type PeriodId, type PeriodMeta } from "./mock-leaderboard";

const STEPS = ["h-20", "h-14", "h-10"];

interface HoverProps {
  hovered: string | null;
  onHover: (username: string | null) => void;
}

const highlight = (username: string, hovered: string | null) =>
  hovered === null ? "" : hovered === username ? "bg-primary/15 ring-1 ring-primary/50" : "opacity-40";

function MiniPodium({ board, hovered, onHover }: { board: BoardEntry[] } & HoverProps) {
  return (
    <ol className="grid grid-cols-3 items-end gap-2 border-b border-border">
      {board.slice(0, 3).map((entry, place) => (
        <li key={entry.username} aria-label={entryLabel(entry)} onMouseEnter={() => onHover(entry.username)} onMouseLeave={() => onHover(null)}
          className={`flex min-w-0 flex-col items-center gap-1.5 rounded-t-xl pt-2 transition-opacity duration-200 ${place === 0 ? "order-2" : place === 1 ? "order-1" : "order-3"} ${highlight(entry.username, hovered)}`}>
          <PlayerAvatar username={entry.username} size={place === 0 ? "lg" : "md"} />
          <span className="max-w-full truncate px-1 text-xs font-semibold"><ProfileLink username={entry.username} /></span>
          <span className="text-lg font-bold tabular-nums">{entry.wpm}</span>
          <span aria-hidden="true" className={`flex w-full items-start justify-center rounded-t-lg pt-1 text-lg font-black ${STEPS[place]}`}
            style={{ color: METALS[place], background: `linear-gradient(180deg, color-mix(in srgb, ${METALS[place]} 28%, var(--card)), transparent)`, borderTop: `3px solid ${METALS[place]}` }}>
            {place + 1}
          </span>
        </li>
      ))}
    </ol>
  );
}

function Board({ meta, hovered, onHover }: { meta: PeriodMeta } & HoverProps) {
  const board = BOARDS[meta.id];
  const standing = yourStanding(meta.id);
  const youListed = board.some((entry) => entry.isYou);
  return (
    <section id={`board-${meta.id}`} aria-labelledby={`board-${meta.id}-title`} className="flex w-[85vw] max-w-md shrink-0 snap-center flex-col gap-4 rounded-3xl border border-border bg-card p-4 xl:w-auto xl:max-w-none">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h2 id={`board-${meta.id}-title`} className="text-xl font-bold">{meta.title}</h2>
          <p className="text-xs text-muted-foreground">{meta.subtitle} · UTC</p>
        </div>
        {meta.resets && <span className="flex items-center gap-1 whitespace-nowrap rounded-full bg-muted px-2.5 py-1 text-[0.7rem] text-muted-foreground"><TimerIcon className="size-3.5" aria-hidden="true" />{meta.resets}</span>}
      </header>
      <MiniPodium board={board} hovered={hovered} onHover={onHover} />
      <ol start={4} className="flex flex-col">
        {board.slice(3).map((entry) => (
          <li key={entry.username} aria-label={entryLabel(entry)} onMouseEnter={() => onHover(entry.username)} onMouseLeave={() => onHover(null)}
            className={`flex items-center gap-2 rounded-xl px-2 py-1.5 text-sm transition-[opacity,background-color] duration-200 ${entry.isYou ? "bg-primary/10" : ""} ${highlight(entry.username, hovered)}`}>
            <span className="w-6 text-right tabular-nums text-muted-foreground">{entry.rank}</span>
            <RankChange change={entry.change} />
            <PlayerAvatar username={entry.username} size="sm" />
            <span className="flex min-w-0 flex-1 items-center gap-2 truncate"><ProfileLink username={entry.username} />{entry.isYou && <YouTag />}</span>
            <span className="font-semibold tabular-nums">{entry.wpm}</span>
          </li>
        ))}
      </ol>
      {!youListed && (
        <div onMouseEnter={() => onHover(YOU)} onMouseLeave={() => onHover(null)} className="mt-auto flex items-center gap-2 rounded-xl border border-dashed border-primary/50 bg-primary/5 px-2 py-2 text-sm">
          <span className="w-6 text-right tabular-nums text-muted-foreground">{standing.rank}</span>
          <span className="w-8" />
          <PlayerAvatar username={YOU} size="sm" />
          <span className="flex min-w-0 flex-1 items-center gap-2">{YOU}<YouTag /></span>
          <span className="font-semibold tabular-nums">{standing.wpm}</span>
        </div>
      )}
    </section>
  );
}

/** 2 · Three boards: every period at once. Hover anyone to find them on all three boards. */
export function ColumnsLeaderboard() {
  const [hovered, setHovered] = useState<string | null>(null);
  const [focused, setFocused] = useState<PeriodId>("today");
  const track = useRef<HTMLDivElement>(null);
  const jump = (period: PeriodId) => {
    setFocused(period);
    track.current?.querySelector(`#board-${period}`)?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  };
  return (
    <main className="mx-auto flex max-w-[110rem] flex-col gap-6 px-4 pt-8 md:px-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="flex items-center gap-3 text-3xl font-bold"><TrophyIcon weight="fill" className="size-8 text-[#d6a738]" aria-hidden="true" />Leaderboard</h1>
          <RulesNote />
        </div>
        <motion.p layout transition={LAB_SPRING} className="text-sm text-muted-foreground">{hovered ? <>Showing <strong className="text-foreground">{hovered}</strong> on every board</> : "Hover a player to find them on every board"}</motion.p>
      </header>
      <PeriodTabs value={focused} onChange={jump} className="w-full max-w-md self-center xl:hidden" />
      <div ref={track} className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 xl:mx-0 xl:grid xl:grid-cols-3 xl:overflow-visible xl:px-0">
        {PERIODS.map((meta) => <Board key={meta.id} meta={meta} hovered={hovered} onHover={setHovered} />)}
      </div>
    </main>
  );
}
