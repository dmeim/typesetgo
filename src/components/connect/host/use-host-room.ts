import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import type { HostRoom } from "@/components/connect/types";
import type { ConnectOverrides, ConnectPacing, ConnectTest } from "@/lib/connect-types";
import { useMultiplayerCredential } from "@/hooks/useMultiplayerCredential";
import { toast } from "@/lib/toast-manager";
import { readableError } from "@/components/connect/connect-errors";

export const OVERRIDE_SAVE_DELAY_MS = 400;

export type HostAction = "rename" | "pacing" | "start" | "pause" | "restart" | "goto" | "reset" | "end" | "participant";

function reportFailure(title: string, error: unknown) {
  toast.add({ type: "error", title, description: readableError(error, "Check your connection and try again.") });
}

/** Optimistic test list: shows the edited list until the save settles, then follows the server. */
function useTestList(room: HostRoom, credential: string) {
  const setTestsMutation = useMutation(api.connect.setTests);
  const [optimistic, setOptimistic] = useState<ConnectTest[] | null>(null);
  const revision = useRef(0);
  const roomId = room._id;

  const saveTests = useCallback(async (tests: ConnectTest[]) => {
    const current = ++revision.current;
    setOptimistic(tests);
    try {
      await setTestsMutation({ roomId, credential, tests });
      return true;
    } catch (error) {
      reportFailure("The test list couldn't be saved", error);
      return false;
    } finally {
      if (current === revision.current) setOptimistic(null);
    }
  }, [credential, roomId, setTestsMutation]);

  return { tests: optimistic ?? (room.tests as ConnectTest[]), saveTests };
}

/**
 * Local overrides stay authoritative while edits are debounced or saving, so slider
 * drags never jump back to an older server value. Failures roll back to the server copy.
 */
function useOverrides(room: HostRoom, credential: string) {
  const updateRoom = useMutation(api.connect.updateRoom);
  const [local, setLocal] = useState<ConnectOverrides | null>(null);
  const latest = useRef<ConnectOverrides | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const revision = useRef(0);
  const roomId = room._id;

  const flush = useCallback(async () => {
    const value = latest.current;
    if (!value) return;
    const current = ++revision.current;
    try {
      await updateRoom({ roomId, credential, overrides: value });
    } catch (error) {
      reportFailure("Participant settings couldn't be saved", error);
    }
    if (current === revision.current && timer.current === undefined) {
      latest.current = null;
      setLocal(null);
    }
  }, [credential, roomId, updateRoom]);

  const changeOverrides = useCallback((next: ConnectOverrides, options?: { debounce?: boolean }) => {
    latest.current = next;
    setLocal(next);
    clearTimeout(timer.current);
    timer.current = undefined;
    if (!options?.debounce) {
      void flush();
      return;
    }
    timer.current = setTimeout(() => {
      timer.current = undefined;
      void flush();
    }, OVERRIDE_SAVE_DELAY_MS);
  }, [flush]);

  // Leaving the panel mid-debounce still saves the last change.
  useEffect(() => () => {
    if (timer.current === undefined) return;
    clearTimeout(timer.current);
    timer.current = undefined;
    void flush();
  }, [flush]);

  return { overrides: local ?? (room.overrides as ConnectOverrides), changeOverrides };
}

/** Host-panel actions with optimistic list/override state and toast feedback on failure. */
export function useHostRoom(room: HostRoom) {
  const credential = useMultiplayerCredential();
  const roomId = room._id;
  const updateRoom = useMutation(api.connect.updateRoom);
  const startMutation = useMutation(api.connect.start);
  const pauseMutation = useMutation(api.connect.pause);
  const restartMutation = useMutation(api.connect.restartTest);
  const goToMutation = useMutation(api.connect.goToTest);
  const resetMutation = useMutation(api.connect.resetRoom);
  const endMutation = useMutation(api.connect.endRoom);
  const resetParticipantMutation = useMutation(api.connect.resetParticipant);
  const removeParticipantMutation = useMutation(api.connect.removeParticipant);
  const [busy, setBusy] = useState<HostAction | null>(null);
  const [pendingPacing, setPendingPacing] = useState<ConnectPacing | null>(null);
  const testList = useTestList(room, credential);
  const overrideState = useOverrides(room, credential);

  const run = useCallback(async (action: HostAction, failure: string, perform: () => Promise<unknown>) => {
    setBusy(action);
    try {
      await perform();
      return true;
    } catch (error) {
      reportFailure(failure, error);
      return false;
    } finally {
      setBusy(null);
    }
  }, []);

  const host = { roomId, credential };
  return {
    ...testList,
    ...overrideState,
    busy,
    pacing: pendingPacing ?? room.pacing,
    rename: (name: string) => run("rename", "The room name couldn't be saved", () => updateRoom({ ...host, name })),
    setPacing: async (pacing: ConnectPacing) => {
      setPendingPacing(pacing);
      const ok = await run("pacing", "Pacing couldn't be changed", () => updateRoom({ ...host, pacing }));
      setPendingPacing(null);
      return ok;
    },
    start: () => run("start", "The room couldn't start", () => startMutation(host)),
    pause: () => run("pause", "The room couldn't pause", () => pauseMutation(host)),
    restartTest: () => run("restart", "The test couldn't restart", () => restartMutation(host)),
    goToTest: (index: number) => run("goto", "The test couldn't change", () => goToMutation({ ...host, index })),
    resetRoom: () => run("reset", "The room couldn't reset", () => resetMutation(host)),
    endRoom: () => run("end", "The room couldn't end", () => endMutation(host)),
    resetParticipant: (participantId: Id<"connectParticipants">) =>
      run("participant", "The participant couldn't be reset", () => resetParticipantMutation({ ...host, participantId })),
    removeParticipant: (participantId: Id<"connectParticipants">) =>
      run("participant", "The participant couldn't be removed", () => removeParticipantMutation({ ...host, participantId })),
  };
}

export type HostRoomActions = ReturnType<typeof useHostRoom>;
