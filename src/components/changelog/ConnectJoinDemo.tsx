import { useState } from "react";
import { CheckCircleIcon } from "@phosphor-icons/react";
import { JoinCodeCard } from "@/components/temp/connect/JoinCodeCard";
import { ROOM } from "@/components/temp/connect/connect-mock";

const PRETEND_ROOM = { ...ROOM, ended: false };

/** The Join side of the Connect card against one pretend room. */
export function ConnectJoinDemo() {
  const [joined, setJoined] = useState<string | null>(null);
  return (
    <div className="flex w-full max-w-md flex-col gap-3">
      <JoinCodeCard key={joined ?? "fresh"} room={PRETEND_ROOM} onJoin={(name) => setJoined(name)} />
      {joined && (
        <p role="status" className="flex items-center justify-center gap-2 text-sm text-success">
          <CheckCircleIcon weight="fill" className="size-4" aria-hidden="true" />
          {joined} would be in {ROOM.name} now. Try another code!
        </p>
      )}
    </div>
  );
}
