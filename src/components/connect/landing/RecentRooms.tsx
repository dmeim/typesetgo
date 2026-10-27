import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "convex/react";
import { motion } from "framer-motion";
import { ArrowArcRightIcon, CircleNotchIcon, ClockCounterClockwiseIcon, PlayIcon, SignInIcon } from "@phosphor-icons/react";
import { api } from "../../../../convex/_generated/api";
import { useMultiplayerCredential } from "@/hooks/useMultiplayerCredential";
import { CONNECT_ARCHIVE_HOURS } from "@/lib/connect-types";
import { cn } from "@/lib/utils";
import { useAppAuth } from "@/components/layout/useAppAuth";
import type { RecentRoom } from "@/components/connect/types";
import { ConnectCard } from "@/components/connect/ConnectParts";
import { CONNECT_SPRING } from "@/components/connect/connect-motion";
import { readableError } from "@/components/connect/connect-errors";
import { FormError } from "./FormError";
import { formatAgo } from "./landing-helpers";

function useNow(intervalMs = 60_000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);
  return now;
}

function RoomRow({ room, index, now, pending, disabled, onOpen }: {
  room: RecentRoom;
  index: number;
  now: number;
  pending: boolean;
  disabled: boolean;
  onOpen: (room: RecentRoom) => void;
}) {
  const tests = `${room.testCount} ${room.testCount === 1 ? "test" : "tests"}`;
  return (
    <motion.li layout initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ ...CONNECT_SPRING, delay: 0.15 + index * 0.06 }}
      className={cn("flex items-center gap-3 rounded-2xl border p-3", room.live ? "border-success/40 bg-success/5" : "border-border")}>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold" title={room.name}>{room.name}</p>
        <p className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
          {room.live ? (
            <>
              <span className="flex items-center gap-1 font-bold text-success"><span aria-hidden="true" className="size-1.5 animate-pulse rounded-full bg-current" />Live</span>
              <span className="rounded-md bg-muted px-1.5 font-mono font-bold tracking-widest text-foreground">{room.code}</span>
            </>
          ) : <span>Ended {formatAgo(room.endedAt ?? room.lastActiveAt, now)}</span>}
          <span>{tests}</span>
        </p>
      </div>
      <button type="button" onClick={() => onOpen(room)} disabled={disabled} aria-label={`${room.live ? "Resume" : "Reopen"} ${room.name}`}
        className={cn("flex h-9 shrink-0 items-center gap-1.5 rounded-full px-4 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-60",
          room.live ? "bg-success text-background hover:opacity-90" : "border border-border hover:bg-accent")}>
        {pending ? <CircleNotchIcon className="size-4 animate-spin" aria-hidden="true" />
          : room.live ? <PlayIcon weight="fill" className="size-4" aria-hidden="true" /> : <ArrowArcRightIcon className="size-4" aria-hidden="true" />}
        {room.live ? "Resume" : "Reopen"}
      </button>
    </motion.li>
  );
}

function SignInHint({ onSignIn }: { onSignIn: () => void }) {
  return (
    <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <SignInIcon className="size-4 shrink-0" aria-hidden="true" />
      <span><button type="button" onClick={onSignIn} className="font-semibold text-foreground underline underline-offset-4 hover:text-primary">Sign in</button> to reopen rooms you host from any device.</span>
    </p>
  );
}

/** Rooms this browser (or the signed-in owner) hosted within the reopen window. */
export function RecentRooms() {
  const navigate = useNavigate();
  const credential = useMultiplayerCredential();
  const auth = useAppAuth();
  const rooms = useQuery(api.connect.recentRooms, { credential });
  const reopenRoom = useMutation(api.connect.reopenRoom);
  const now = useNow();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const open = async (room: RecentRoom) => {
    setPendingId(room._id);
    setError("");
    try {
      const result = await reopenRoom({ roomId: room._id, credential });
      navigate(`/connect/host/${result.roomId}`);
    } catch (caught) {
      setError(readableError(caught, "Couldn't open that room. Try again."));
      setPendingId(null);
    }
  };

  const signedOut = auth.available && auth.status === "signed-out";
  const signIn = () => void auth.openSignIn();

  if (!rooms || rooms.length === 0) {
    return signedOut ? <div className="border-t border-border pt-6"><SignInHint onSignIn={signIn} /></div> : null;
  }

  return (
    <div className="border-t border-border pt-6">
      <ConnectCard title="Your recent rooms" Icon={ClockCounterClockwiseIcon} tile="bg-muted-foreground text-background" bare
        description={`From the last ${CONNECT_ARCHIVE_HOURS} hours. Reopening an ended room keeps its tests and gives it a new code.`}>
        <ul className="flex flex-col gap-2">
          {rooms.map((room, index) => (
            <RoomRow key={room._id} room={room} index={index} now={now} pending={pendingId === room._id} disabled={pendingId !== null} onOpen={(target) => void open(target)} />
          ))}
        </ul>
        <FormError>{error}</FormError>
        {signedOut && <SignInHint onSignIn={signIn} />}
      </ConnectCard>
    </div>
  );
}
