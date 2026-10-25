import { useEffect, useId, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "convex/react";
import { ArrowArcRightIcon, CircleNotchIcon, PlayIcon } from "@phosphor-icons/react";
import { api } from "../../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { useMultiplayerCredential } from "@/hooks/useMultiplayerCredential";
import { useAppAuth } from "@/components/layout/useAppAuth";
import type { RecentRoom } from "@/components/connect/types";
import { FormError } from "@/components/connect/landing/LandingCard";
import { readableError } from "@/components/connect/connect-errors";
import { formatAgo } from "@/components/connect/landing/landing-helpers";
import { CONNECT_ARCHIVE_HOURS } from "@/lib/connect-types";

function useNow(intervalMs = 60_000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);
  return now;
}

function RoomRow({ room, now, pending, disabled, onOpen }: {
  room: RecentRoom;
  now: number;
  pending: boolean;
  disabled: boolean;
  onOpen: (room: RecentRoom) => void;
}) {
  const tests = `${room.testCount} ${room.testCount === 1 ? "test" : "tests"}`;
  return (
    <li className="flex items-center gap-3 py-2.5">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium" title={room.name}>{room.name}</p>
        <p className="flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">
          {room.live ? (
            <>
              <span className="inline-flex items-center gap-1 font-medium text-[var(--theme-status-success)]">
                <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
                Live
              </span>
              <span aria-hidden="true">·</span>
              <span>code <span className="font-mono tracking-wider text-foreground">{room.code}</span></span>
            </>
          ) : (
            <span>Ended {formatAgo(room.endedAt ?? room.lastActiveAt, now)}</span>
          )}
          <span aria-hidden="true">·</span>
          <span>{tests}</span>
        </p>
      </div>
      <Button
        size="sm"
        variant={room.live ? "default" : "outline"}
        disabled={disabled}
        aria-label={`${room.live ? "Resume" : "Reopen"} ${room.name}`}
        onClick={() => onOpen(room)}
      >
        {pending
          ? <CircleNotchIcon className="animate-spin" aria-hidden="true" />
          : room.live ? <PlayIcon aria-hidden="true" /> : <ArrowArcRightIcon aria-hidden="true" />}
        {room.live ? "Resume" : "Reopen"}
      </Button>
    </li>
  );
}

/** Rooms this browser (or the signed-in owner) hosted within the reopen window. */
export function RecentRooms() {
  const id = useId();
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
  const hasEnded = rooms?.some((room) => !room.live) ?? false;

  if (!rooms || rooms.length === 0) {
    return signedOut ? (
      <p className="border-t border-border pt-4 text-xs text-muted-foreground">
        <button type="button" className="font-medium text-foreground underline underline-offset-4 hover:text-primary" onClick={() => void auth.openSignIn()}>Sign in</button>
        {" "}to reopen rooms you host from any device.
      </p>
    ) : null;
  }

  return (
    <section aria-labelledby={`${id}-recent`} className="space-y-1 border-t border-border pt-4">
      <h3 id={`${id}-recent`} className="text-sm font-semibold">
        Recent rooms <span className="font-normal text-muted-foreground">(last {CONNECT_ARCHIVE_HOURS} hours)</span>
      </h3>
      {hasEnded && <p className="text-xs text-muted-foreground">Reopening an ended room keeps its tests and gives it a new code.</p>}
      <ul className="divide-y divide-border">
        {rooms.map((room) => (
          <RoomRow
            key={room._id}
            room={room}
            now={now}
            pending={pendingId === room._id}
            disabled={pendingId !== null}
            onOpen={(target) => void open(target)}
          />
        ))}
      </ul>
      <FormError>{error}</FormError>
      {signedOut && (
        <p className="pt-1 text-xs text-muted-foreground">
          <button type="button" className="font-medium text-foreground underline underline-offset-4 hover:text-primary" onClick={() => void auth.openSignIn()}>Sign in</button>
          {" "}to reopen these rooms from other devices.
        </p>
      )}
    </section>
  );
}
