import { useSyncExternalStore } from "react";
import { getFunctionName } from "convex/server";

const listeners = new Set<() => void>();
let revision = 0;
const defaults = {
  mode: "time",
  duration: 30,
  wordTarget: 25,
  difficulty: "medium",
  punctuation: false,
  numbers: false,
  capitalization: false,
  quoteLength: "all",
  ghostWriterEnabled: false,
  ghostWriterSpeed: 60,
  soundEnabled: false,
  typingFontSize: 3.5,
  textAlign: "left",
};
const stats = {
  wpm: 65,
  accuracy: 97,
  progress: 40,
  wordsTyped: 12,
  timeElapsed: 12000,
  isFinished: false,
};
export const fixture = {
  room: {
    _id: "fixture-room",
    hostName: "Fixture host",
    code: "DEMO1",
    status: "waiting",
    runVersion: 0,
    settings: defaults as Record<string, unknown>,
  },
  participants: Array.from({ length: 12 }, (_, index) => ({
    _id: `participant-${index}`,
    name:
      index === 0
        ? "AlexandriaVeryLongUnbrokenParticipantNameForLayout"
        : `Participant ${index + 1}`,
    isConnected: true,
    resetVersion: 0,
    joinedAt: index,
    stats: { ...stats, wpm: 65 + index },
  })),
  requests: [] as { name: string; args: Record<string, unknown> }[],
  emit() {
    revision++;
    listeners.forEach((listener) => listener());
  },
};
const mutationCache = new Map<
  string,
  (args: Record<string, unknown>) => Promise<unknown>
>();
export function useMutation(reference: Parameters<typeof getFunctionName>[0]) {
  const name = getFunctionName(reference);
  if (!mutationCache.has(name))
    mutationCache.set(name, async (args) => {
      fixture.requests.push({ name, args });
      const failure = new URLSearchParams(location.search).get("failure");
      if (failure === "create" && name === "rooms:create")
        throw new Error("Fixture connection unavailable");
      if (failure === "join" && name === "participants:join")
        throw new Error("Fixture room not found");
      if (name === "rooms:create")
        return { code: fixture.room.code, roomId: fixture.room._id };
      if (name === "participants:join")
        return { participantId: "participant-0" };
      if (name === "rooms:updateSettings")
        fixture.room.settings = {
          ...fixture.room.settings,
          ...(args.settings as object),
        };
      if (name === "rooms:setStatus") {
        fixture.room.status = String(args.status);
        if (args.status === "active") fixture.room.runVersion++;
      }
      if (name === "rooms:resetPractice") {
        fixture.room.status = "waiting";
        fixture.room.runVersion++;
      }
      if (name === "participants:resetStats")
        fixture.participants.find((item) => item._id === args.participantId)!
          .resetVersion++;
      if (name === "participants:kick")
        fixture.participants = fixture.participants.filter(
          (item) => item._id !== args.participantId,
        );
      if (name === "participants:disconnect")
        fixture.participants.find(
          (item) => item._id === args.participantId,
        )!.isConnected = false;
      fixture.emit();
      return null;
    });
  return mutationCache.get(name)!;
}
export function useQuery(
  reference: Parameters<typeof getFunctionName>[0],
  args: unknown,
) {
  useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    () => revision,
  );
  if (args === "skip") return undefined;
  return getFunctionName(reference).startsWith("rooms:")
    ? fixture.room
    : fixture.participants;
}
Object.assign(window, { connectFixture: fixture });
