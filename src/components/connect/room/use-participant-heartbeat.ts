import { useEffect, useRef, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { CONNECT_PARTICIPANT_HEARTBEAT_MS } from "@/lib/connect-types";
import { useMultiplayerCredential } from "@/hooks/useMultiplayerCredential";

/** A beat that has not settled by then counts as a failure (the client queues while offline). */
export const HEARTBEAT_TIMEOUT_MS = 10_000;
export const HEARTBEAT_RETRY_MS = 3_000;
/** Consecutive failures before the "Reconnecting…" indicator appears. */
export const RECONNECTING_AFTER_FAILURES = 2;

/**
 * Keeps the participant marked online. Never removes the seat: `offline`
 * (after an explicit leave elsewhere) triggers a rejoin, failures retry quietly,
 * and removed/ended states are left to the reactive participant view.
 */
export function useParticipantHeartbeat(participantId: string | undefined, onOffline: () => void) {
  const credential = useMultiplayerCredential();
  const heartbeat = useMutation(api.connect.participantHeartbeat);
  const [failures, setFailures] = useState({ participantId, count: 0 });
  const onOfflineRef = useRef(onOffline);
  useEffect(() => { onOfflineRef.current = onOffline; }, [onOffline]);

  useEffect(() => {
    if (!participantId) return;
    let current = true;
    let count = 0;
    let inFlight = false;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    const record = (next: number) => {
      count = next;
      setFailures({ participantId, count: next });
    };
    const fail = () => {
      record(count + 1);
      clearTimeout(retryTimer);
      retryTimer = setTimeout(beat, HEARTBEAT_RETRY_MS);
    };
    function beat() {
      if (!current || inFlight) return;
      inFlight = true;
      let settled = false;
      const timeout = setTimeout(() => {
        if (!current || settled) return;
        settled = true;
        inFlight = false;
        fail();
      }, HEARTBEAT_TIMEOUT_MS);
      heartbeat({ participantId: participantId!, credential }).then((result) => {
        if (!current || settled) return;
        settled = true;
        inFlight = false;
        clearTimeout(timeout);
        if (count !== 0) record(0);
        if (result.state === "offline") onOfflineRef.current();
      }, () => {
        if (!current || settled) return;
        settled = true;
        inFlight = false;
        clearTimeout(timeout);
        fail();
      });
    }
    const onVisible = () => { if (document.visibilityState === "visible") beat(); };
    beat();
    const interval = setInterval(beat, CONNECT_PARTICIPANT_HEARTBEAT_MS);
    window.addEventListener("online", beat);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      current = false;
      clearInterval(interval);
      clearTimeout(retryTimer);
      window.removeEventListener("online", beat);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [participantId, credential, heartbeat]);

  const count = failures.participantId === participantId ? failures.count : 0;
  return { reconnecting: count >= RECONNECTING_AFTER_FAILURES };
}
