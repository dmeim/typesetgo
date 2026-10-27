import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ChalkboardTeacherIcon, UsersThreeIcon } from "@phosphor-icons/react";
import { ConnectShell } from "@/components/connect/ConnectShell";
import { Pills, type PillOption } from "@/components/connect/ConnectParts";
import { CONNECT_SPRING } from "@/components/connect/connect-motion";
import { HostRoomCard } from "@/components/connect/landing/HostRoomCard";
import { JoinRoomCard } from "@/components/connect/landing/JoinRoomCard";
import { LandingHero } from "@/components/connect/landing/LandingHero";
import { RecentRooms } from "@/components/connect/landing/RecentRooms";
import { cn } from "@/lib/utils";

type Mode = "join" | "host";

const MODES: PillOption<Mode>[] = [
  { value: "join", label: "Join a room", short: "Join", Icon: UsersThreeIcon },
  { value: "host", label: "Host a room", short: "Host", Icon: ChalkboardTeacherIcon },
];

// Join sits on the left and host on the right, so each side slides in from its own edge.
const SLIDE = {
  enter: (mode: Mode) => ({ opacity: 0, x: mode === "join" ? -48 : 48 }),
  center: { opacity: 1, x: 0 },
  exit: (mode: Mode) => ({ opacity: 0, x: mode === "join" ? -48 : 48 }),
};

/** Landing: one card that opens on joining (what most people do), with a switch over to hosting. */
export default function Connect() {
  const [params] = useSearchParams();
  const code = params.get("code") ?? "";
  const [mode, setMode] = useState<Mode>("join");

  return (
    <ConnectShell footer className="flex max-w-xl flex-col gap-8 overflow-x-clip pt-8 md:pt-12">
      <LandingHero />
      <motion.div layout transition={CONNECT_SPRING}
        className={cn("flex min-w-0 flex-col gap-5 overflow-hidden rounded-3xl border bg-card p-4 text-card-foreground transition-[border-color,box-shadow] sm:p-6",
          mode === "join" ? "border-primary/30 shadow-[0_20px_60px_-30px_var(--primary)]" : "border-border shadow-[0_20px_60px_-30px_var(--accent-emphasis)]")}>
        <Pills<Mode> label="Join or host" value={mode} onChange={setMode} size="lg" options={MODES} />
        <AnimatePresence mode="popLayout" initial={false} custom={mode}>
          <motion.div key={mode} custom={mode} variants={SLIDE} initial="enter" animate="center" exit="exit" transition={CONNECT_SPRING} className="flex min-w-0 flex-col gap-6">
            {mode === "join" ? (
              <JoinRoomCard key={code} initialCode={code} focusName={code.length > 0} />
            ) : (
              <>
                <HostRoomCard />
                <RecentRooms />
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </motion.div>
    </ConnectShell>
  );
}
