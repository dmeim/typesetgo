import { useEffect, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { CONNECT_HOST_HEARTBEAT_MS } from "@/lib/connect-types";
import { useMultiplayerCredential } from "@/hooks/useMultiplayerCredential";

export type HostHeartbeatState = "pending" | "ok" | "ended" | "missing" | "forbidden";

/** Keeps a hosted room live from any tab showing it (host panel or pop-out board). */
export function useHostHeartbeat(roomId: string | undefined) {
  const credential = useMultiplayerCredential();
  const heartbeat = useMutation(api.connect.hostHeartbeat);
  const [state, setState] = useState<{ roomId?: string; value: HostHeartbeatState }>({ value: "pending" });

  useEffect(() => {
    if (!roomId) return;
    let current = true;
    const beat = () => {
      void heartbeat({ roomId, credential })
        .then((result) => { if (current) setState({ roomId, value: result.state }); })
        // A failed beat is retried on the next interval; liveness spans CONNECT_LIVE_IDLE_HOURS.
        .catch(() => undefined);
    };
    const onVisible = () => { if (document.visibilityState === "visible") beat(); };
    beat();
    const timer = setInterval(beat, CONNECT_HOST_HEARTBEAT_MS);
    window.addEventListener("online", beat);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      current = false;
      clearInterval(timer);
      window.removeEventListener("online", beat);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [roomId, credential, heartbeat]);

  return state.roomId === roomId ? state.value : "pending";
}
