import { useState, type ComponentType } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeftIcon } from "@phosphor-icons/react";
import { ArenaLeaderboard } from "@/components/temp/leaderboard/ArenaLeaderboard";
import { ColumnsLeaderboard } from "@/components/temp/leaderboard/ColumnsLeaderboard";
import { RaceTrackLeaderboard } from "@/components/temp/leaderboard/RaceTrackLeaderboard";
import { SpotlightLeaderboard } from "@/components/temp/leaderboard/SpotlightLeaderboard";
import { StandingsLeaderboard } from "@/components/temp/leaderboard/StandingsLeaderboard";
import { LAB_SPRING } from "@/components/temp/settings/lab-settings";

const MOCKUPS: { number: number; name: string; Component: ComponentType }[] = [
  { number: 1, name: "Arena", Component: ArenaLeaderboard },
  { number: 2, name: "Three boards", Component: ColumnsLeaderboard },
  { number: 3, name: "Spotlight", Component: SpotlightLeaderboard },
  { number: 4, name: "Race track", Component: RaceTrackLeaderboard },
  { number: 5, name: "Standings", Component: StandingsLeaderboard },
];

// /temp-leaderboard1 in the app, ?temp-leaderboard=1 in the local fixture.
function initialMockup() {
  const fromPath = /^\/temp-leaderboard(\d)$/.exec(location.pathname)?.[1];
  const value = Number(fromPath ?? new URLSearchParams(location.search).get("temp-leaderboard") ?? 1);
  return MOCKUPS.some((entry) => entry.number === value) ? value : 1;
}

/** Leaderboard page mockups. Mock players only; nothing is fetched. */
export default function TempLeaderboard() {
  const [mockup, setMockup] = useState(initialMockup);
  const { Component } = MOCKUPS.find((entry) => entry.number === mockup) ?? MOCKUPS[0];
  const choose = (next: number) => {
    setMockup(next);
    const url = location.pathname.startsWith("/temp-leaderboard") ? `/temp-leaderboard${next}` : `/?temp-leaderboard=${next}`;
    window.history.replaceState(window.history.state, "", url);
    window.scrollTo({ top: 0 });
  };

  return (
    <div className="min-h-[100dvh] bg-background pb-24 font-mono text-foreground">
      <Component key={mockup} />
      <nav aria-label="Leaderboard mockups" className="fixed bottom-4 left-1/2 z-50 flex max-w-[calc(100vw-1rem)] -translate-x-1/2 items-center gap-1 overflow-x-auto rounded-full border border-border bg-popover/95 p-1 text-xs shadow-xl backdrop-blur">
        <Link to="/temp" className="flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-muted-foreground hover:text-foreground">
          <ArrowLeftIcon className="size-3.5" aria-hidden="true" />UI Lab
        </Link>
        {MOCKUPS.map((entry) => (
          <button
            key={entry.name}
            type="button"
            aria-current={mockup === entry.number ? "page" : undefined}
            onClick={() => choose(entry.number)}
            className={`relative whitespace-nowrap rounded-full px-3 py-1.5 ${mockup === entry.number ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            {mockup === entry.number && <motion.span layoutId="leaderboard-mockup-tab" transition={LAB_SPRING} className="absolute inset-0 rounded-full bg-primary" />}
            <span className="relative">{entry.number}<span className="hidden lg:inline"> {entry.name}</span></span>
          </button>
        ))}
      </nav>
    </div>
  );
}
