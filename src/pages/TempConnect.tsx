import { useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeftIcon, ChalkboardTeacherIcon, DeviceMobileIcon, DoorOpenIcon, ProjectorScreenChartIcon, type Icon } from "@phosphor-icons/react";
import { ConnectBoardScreen, type BoardView } from "@/components/temp/connect/ConnectBoardScreen";
import { ConnectHostScreen } from "@/components/temp/connect/ConnectHostScreen";
import { ConnectLanding } from "@/components/temp/connect/ConnectLanding";
import { useMockRoom } from "@/components/temp/connect/use-mock-room";
import { LAB_SPRING } from "@/components/temp/settings/lab-settings";

type Tab = "landing" | "host" | "board" | "student";

const TABS: { id: Tab; label: string; Icon: Icon }[] = [
  { id: "landing", label: "Landing", Icon: DoorOpenIcon },
  { id: "host", label: "Host", Icon: ChalkboardTeacherIcon },
  { id: "board", label: "Board", Icon: ProjectorScreenChartIcon },
  { id: "student", label: "Student", Icon: DeviceMobileIcon },
];

function initialTab(): Tab {
  const value = new URLSearchParams(location.search).get("screen");
  return TABS.some((tab) => tab.id === value) ? value as Tab : "landing";
}

/** Connect mockups: landing, host panel and the live board/student screens. One pretend room is shared by all of them; nothing is fetched. */
export default function TempConnect() {
  const room = useMockRoom();
  const [tab, setTab] = useState<Tab>(initialTab);
  const screen = tab === "student" ? "board" : tab;

  const go = (next: Tab) => {
    setTab(next);
    const url = new URL(location.href);
    url.searchParams.set("screen", next);
    window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}`);
    window.scrollTo({ top: 0 });
  };
  const join = (name: string) => {
    room.actions.setYourName(name);
    go("student");
  };
  const setView = (view: BoardView) => go(view === "student" ? "student" : "board");

  return (
    <div className="min-h-[100dvh] overflow-x-clip bg-background pb-28 font-mono text-foreground">
      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={screen} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10, transition: { duration: 0.15 } }} transition={LAB_SPRING}>
          {screen === "landing" && <ConnectLanding onJoin={join} onHost={() => go("host")} />}
          {screen === "host" && <ConnectHostScreen room={room} onBack={() => go("landing")} onOpenBoard={() => go("board")} />}
          {screen === "board" && <ConnectBoardScreen room={room} view={tab === "student" ? "student" : "board"} onViewChange={setView} onLeave={() => go("landing")} />}
        </motion.div>
      </AnimatePresence>
      <nav aria-label="Connect mockups" className="fixed bottom-4 left-1/2 z-50 flex max-w-[calc(100vw-1rem)] -translate-x-1/2 items-center gap-1 overflow-x-auto rounded-full border border-border bg-popover/95 p-1 text-xs [scrollbar-width:none] shadow-xl backdrop-blur">
        <Link to="/temp" aria-label="UI Lab" className="flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1.5 text-muted-foreground hover:text-foreground sm:px-3">
          <ArrowLeftIcon className="size-3.5" aria-hidden="true" /><span className="hidden sm:inline">UI Lab</span>
        </Link>
        {TABS.map((entry) => (
          <button key={entry.id} type="button" aria-current={tab === entry.id ? "page" : undefined} onClick={() => go(entry.id)}
            className={`relative flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1.5 sm:px-3 ${tab === entry.id ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
            {tab === entry.id && <motion.span layoutId="connect-mockup-tab" transition={LAB_SPRING} className="absolute inset-0 rounded-full bg-primary" />}
            <entry.Icon weight={tab === entry.id ? "fill" : "bold"} className="relative hidden size-3.5 sm:block" aria-hidden="true" />
            <span className="relative">{entry.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
