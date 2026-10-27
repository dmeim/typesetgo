import { useCallback, useState, type ComponentType } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeftIcon, CrownSimpleIcon, DoorOpenIcon, FlagCheckeredIcon, TrophyIcon, UserIcon, UsersThreeIcon, type Icon } from "@phosphor-icons/react";
import Header from "@/components/layout/Header";
import { ClubhouseConcept } from "@/components/temp/race/ClubhouseConcept";
import { DragStripConcept } from "@/components/temp/race/DragStripConcept";
import { GridConcept } from "@/components/temp/race/GridConcept";
import { RACE_SPRING, SCREENS, type Screen } from "@/components/temp/race/race-mock";
import { ScoreboardConcept } from "@/components/temp/race/ScoreboardConcept";
import { TrackMapConcept } from "@/components/temp/race/TrackMapConcept";
import { useRaceLab, type ConceptProps } from "@/components/temp/race/use-race-lab";

const CONCEPTS: { number: number; name: string; Component: ComponentType<ConceptProps> }[] = [
  { number: 1, name: "Clubhouse", Component: ClubhouseConcept },
  { number: 2, name: "Starting grid", Component: GridConcept },
  { number: 3, name: "Track map", Component: TrackMapConcept },
  { number: 4, name: "Drag strip", Component: DragStripConcept },
  { number: 5, name: "Scoreboard", Component: ScoreboardConcept },
];

const SCREEN_TABS: Record<Screen, { label: string; Icon: Icon }> = {
  landing: { label: "Landing", Icon: DoorOpenIcon },
  lobby: { label: "Lobby", Icon: UsersThreeIcon },
  race: { label: "Race", Icon: FlagCheckeredIcon },
  results: { label: "Results", Icon: TrophyIcon },
};

const pillNav = "flex max-w-[calc(100vw-1rem)] items-center gap-1 overflow-x-auto rounded-full border border-border bg-popover/95 p-1 text-xs [scrollbar-width:none] shadow-xl backdrop-blur";
const tabClass = (active: boolean) => `relative flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1.5 sm:px-3 ${active ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`;

function readParams() {
  const params = new URLSearchParams(location.search);
  const concept = Number(params.get("concept") ?? 1);
  const screen = params.get("screen") as Screen | null;
  return {
    concept: CONCEPTS.some((entry) => entry.number === concept) ? concept : 1,
    screen: screen && SCREENS.includes(screen) ? screen : "landing",
  };
}

function writeParams(concept: number, screen: Screen) {
  const url = new URL(location.href);
  url.searchParams.set("concept", `${concept}`);
  url.searchParams.set("screen", screen);
  window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}`);
}

/**
 * Race flow mockups: five design concepts, each with a landing, lobby, live race and results screen.
 * `?concept=1..5&screen=landing|lobby|race|results`. One pretend room with scripted racers; nothing is saved.
 */
export default function TempRace() {
  const [initial] = useState(readParams);
  const [concept, setConcept] = useState(initial.concept);
  const [screen, setScreen] = useState<Screen>(initial.screen);
  const lab = useRaceLab();
  const { Component } = CONCEPTS.find((entry) => entry.number === concept) ?? CONCEPTS[0];

  const go = useCallback((next: Screen) => {
    setScreen(next);
    writeParams(Number(new URLSearchParams(location.search).get("concept") ?? 1), next);
    window.scrollTo({ top: 0 });
  }, []);
  const choose = (next: number) => {
    setConcept(next);
    writeParams(next, screen);
    window.scrollTo({ top: 0 });
  };

  return (
    <div className="min-h-[100dvh] overflow-x-clip bg-background pb-36 font-mono text-foreground">
      <Header />
      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={`${concept}-${screen}`} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10, transition: { duration: 0.15 } }} transition={RACE_SPRING}>
          <Component screen={screen} lab={lab} go={go} />
        </motion.div>
      </AnimatePresence>
      <div className="fixed inset-x-0 bottom-3 z-50 flex flex-col items-center gap-1.5 px-2">
        <nav aria-label="Race concepts" className={pillNav}>
          <Link to="/temp" aria-label="UI Lab" className="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1.5 text-muted-foreground hover:text-foreground sm:px-3">
            <ArrowLeftIcon className="size-3.5" aria-hidden="true" /><span className="hidden sm:inline">UI Lab</span>
          </Link>
          {CONCEPTS.map((entry) => (
            <button key={entry.number} type="button" aria-current={concept === entry.number ? "page" : undefined} aria-label={`Concept ${entry.number}: ${entry.name}`} onClick={() => choose(entry.number)} className={tabClass(concept === entry.number)}>
              {concept === entry.number && <motion.span layoutId="race-concept-tab" transition={RACE_SPRING} className="absolute inset-0 rounded-full bg-primary" />}
              <span className="relative">{entry.number}<span className={concept === entry.number ? "hidden sm:inline" : "hidden lg:inline"}> {entry.name}</span></span>
            </button>
          ))}
          <span aria-hidden="true" className="mx-0.5 h-5 w-px shrink-0 bg-border" />
          <button type="button" aria-pressed={lab.role === "host"} onClick={() => lab.setRole(lab.role === "host" ? "guest" : "host")}
            aria-label={lab.role === "host" ? "Viewing as the host. Switch to a racer" : "Viewing as a racer. Switch to the host"}
            className="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1.5 text-muted-foreground hover:text-foreground sm:px-3">
            {lab.role === "host" ? <CrownSimpleIcon weight="fill" className="size-3.5 text-warning" aria-hidden="true" /> : <UserIcon className="size-3.5" aria-hidden="true" />}
            <span className="hidden sm:inline">{lab.role === "host" ? "Host" : "Racer"}</span>
          </button>
        </nav>
        <nav aria-label="Race screens" className={pillNav}>
          {SCREENS.map((id) => {
            const { label, Icon: TabIcon } = SCREEN_TABS[id];
            return (
              <button key={id} type="button" aria-current={screen === id ? "page" : undefined} onClick={() => go(id)} className={tabClass(screen === id)}>
                {screen === id && <motion.span layoutId="race-screen-tab" transition={RACE_SPRING} className="absolute inset-0 rounded-full bg-primary" />}
                <TabIcon weight={screen === id ? "fill" : "bold"} className="relative hidden size-3.5 sm:block" aria-hidden="true" />
                <span className="relative">{label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
