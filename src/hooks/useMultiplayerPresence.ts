import { useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { useMultiplayerCredential } from "./useMultiplayerCredential";

export function useMultiplayerPresence(roomId?: Id<"rooms">, participantId?: Id<"participants">) {
  const credential = useMultiplayerCredential();
  const heartbeat = useMutation(api.multiplayerPresence.heartbeat);
  useEffect(() => {
    if (!roomId) return;
    const beat = () => { void heartbeat({ roomId, participantId, credential }).catch(() => undefined); };
    beat();
    const timer = setInterval(beat, 15_000);
    window.addEventListener("online", beat);
    return () => { clearInterval(timer); window.removeEventListener("online", beat); };
  }, [roomId, participantId, credential, heartbeat]);
}
