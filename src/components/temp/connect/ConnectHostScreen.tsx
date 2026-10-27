import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeftIcon, DoorOpenIcon } from "@phosphor-icons/react";
import { LAB_SPRING } from "@/components/temp/settings/lab-settings";
import { cn } from "@/lib/utils";
import { ROOM } from "./connect-mock";
import { KidAvatar } from "./ConnectParts";
import { RunCard, TestsCard } from "./HostRunCards";
import { CodeCard, RoomSettingsCard, RosterCard } from "./HostSideCards";
import type { MockRoom } from "./use-mock-room";

/** Ending a room takes two taps, so a stray click never sends the class home. */
function EndRoomButton({ onEnd }: { onEnd: () => void }) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const timer = setTimeout(() => setArmed(false), 3000);
    return () => clearTimeout(timer);
  }, [armed]);
  return (
    <motion.button layout type="button" transition={LAB_SPRING} onClick={() => (armed ? onEnd() : setArmed(true))}
      className={cn("flex h-10 items-center gap-2 overflow-hidden whitespace-nowrap rounded-full px-4 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-ring",
        armed ? "bg-destructive text-background" : "border border-border text-muted-foreground hover:text-foreground")}>
      <DoorOpenIcon className="size-4 shrink-0" aria-hidden="true" />
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span key={armed ? "sure" : "end"} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={LAB_SPRING}>
          {armed ? "Tap again to end" : "End room"}
        </motion.span>
      </AnimatePresence>
    </motion.button>
  );
}

/** Host panel: run controls and tests on the left; code, roster and room settings on the right. On phones the code comes first. */
export function ConnectHostScreen({ room, onBack, onOpenBoard }: { room: MockRoom; onBack: () => void; onOpenBoard: () => void }) {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 pt-6 md:px-6 md:pt-10">
      <header className="flex flex-col gap-3">
        <button type="button" onClick={onBack} className="flex w-fit items-center gap-2 rounded-full px-2 py-1 text-sm text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring">
          <ArrowLeftIcon className="size-4" aria-hidden="true" />Connect
        </button>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <KidAvatar name={ROOM.host} size="lg" />
            <div className="min-w-0">
              <h1 className="text-2xl font-black leading-tight [overflow-wrap:anywhere] sm:text-3xl">{ROOM.name}</h1>
              <p className="text-sm text-muted-foreground">Hosted by {ROOM.host}</p>
            </div>
          </div>
          <EndRoomButton onEnd={onBack} />
        </div>
      </header>
      <div className="flex flex-col gap-5 lg:grid lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-start">
        <div className="contents lg:flex lg:flex-col lg:gap-5">
          <RunCard room={room} className="order-2" />
          <TestsCard room={room} className="order-4" />
        </div>
        <div className="contents lg:flex lg:flex-col lg:gap-5">
          <CodeCard className="order-1" />
          <RosterCard room={room} onOpenBoard={onOpenBoard} className="order-3" />
          <RoomSettingsCard className="order-5" />
        </div>
      </div>
    </main>
  );
}
