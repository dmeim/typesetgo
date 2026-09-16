import { useCallback, useRef, useState } from "react";
import { useMutation } from "convex/react";
import { useNavigate } from "react-router-dom";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

/** Explicit departure is complete only after membership has been disconnected. */
export function useRaceDeparture(participantId?: Id<"participants">) {
  const disconnect = useMutation(api.participants.disconnect);
  const navigate = useNavigate();
  const pendingRef = useRef(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [leaveError, setLeaveError] = useState("");

  const leave = useCallback(async () => {
    if (pendingRef.current) return;
    pendingRef.current = true;
    setIsLeaving(true);
    setLeaveError("");
    try {
      if (participantId) await disconnect({ participantId });
      navigate("/race");
    } catch {
      setLeaveError(
        "Could not leave the race. Your connection is still active. Try again.",
      );
    } finally {
      pendingRef.current = false;
      setIsLeaving(false);
    }
  }, [disconnect, navigate, participantId]);

  return { leave, isLeaving, leaveError };
}
