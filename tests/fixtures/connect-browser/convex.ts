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
    typedText: undefined as string | undefined,
    targetText: undefined as string | undefined,
  })),
  requests: [] as { name: string; args: Record<string, unknown> }[],
  resetAttempt(participantId?: string) {
    for (const participant of this.participants) {
      if (!participantId || participant._id === participantId) resetAttempt(participant);
    }
  },
  emit() {
    sessionStorage.setItem("connect-browser-state", JSON.stringify({ room: this.room, participants: this.participants, requests: this.requests }));
    revision++;
    listeners.forEach((listener) => listener());
  },
};
function resetAttempt(participant: typeof fixture.participants[number]) {
  participant.stats = { wpm: 0, accuracy: 0, progress: 0, wordsTyped: 0, timeElapsed: 0, isFinished: false };
  participant.typedText = undefined;
  participant.targetText = undefined;
}

const restored = sessionStorage.getItem("connect-browser-state");
if (restored) Object.assign(fixture, JSON.parse(restored));
const mutationCache = new Map<
  string,
  (args: Record<string, unknown>) => Promise<unknown>
>();
export function useMutation(reference: Parameters<typeof getFunctionName>[0]) {
  const name = getFunctionName(reference);
  if (!mutationCache.has(name))
    mutationCache.set(name, async (args) => {
      fixture.requests.push({ name, args });
      if (name === "multiplayerPresence:heartbeat") { fixture.emit(); return null; }
      const failure = new URLSearchParams(location.search).get("failure");
      if (failure === "create" && name === "rooms:create")
        throw new Error("Fixture connection unavailable");
      if (failure === "join" && name === "participants:join")
        throw new Error("Fixture room not found");
      if (name === "rooms:create" || name === "rooms:resume") {
        fixture.emit();
        return { code: fixture.room.code, roomId: fixture.room._id };
      }
      if (name === "participants:join") {
        fixture.participants[0].isConnected = true;
        fixture.participants[0].name = String(args.name);
        fixture.emit();
        return { participantId: "participant-0" };
      }
      if (name === "rooms:updateSettings")
        fixture.room.settings = {
          ...fixture.room.settings,
          ...(args.settings as object),
        };
      if (name === "rooms:setStatus") {
        fixture.room.status = String(args.status);
        if (args.status === "active") {
          fixture.room.runVersion++;
          for (const participant of fixture.participants) resetAttempt(participant);
        }
      }
      if (name === "rooms:resetPractice") {
        fixture.room.status = "waiting";
        fixture.room.runVersion++;
        for (const participant of fixture.participants) resetAttempt(participant);
      }
      if (name === "participants:resetStats") {
        const participant = fixture.participants.find((item) => item._id === args.participantId)!;
        participant.resetVersion++;
        resetAttempt(participant);
      }
      if (name === "participants:updateStats") {
        const participant = fixture.participants.find((item) => item._id === args.participantId)!;
        if (fixture.room.status === "active" && participant.isConnected && !participant.stats.isFinished &&
          args.runVersion === fixture.room.runVersion && args.resetVersion === participant.resetVersion) {
          participant.stats = { ...(args.stats as typeof stats) };
          participant.typedText = args.typedText as string | undefined;
          participant.targetText = args.targetText as string | undefined;
        }
      }
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
