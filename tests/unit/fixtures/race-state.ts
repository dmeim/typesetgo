import type { Doc } from "../../../convex/_generated/dataModel";

export type RaceParticipant = Doc<"participants"> & { resetVersion?: number };

export function raceFixture() {
  const room = {
    _id: "race-room",
    _creationTime: 0,
    code: "ABC123",
    hostId: "self",
    hostName: "Racer",
    status: "waiting",
    gameMode: "race",
    readyParticipants: [],
    createdAt: 0,
    updatedAt: 0,
    settings: {
      mode: "words",
      difficulty: "medium",
      wordTarget: 25,
      timeLimit: 30,
      soundEnabled: false,
    },
  } as unknown as Doc<"rooms">;
  const participant = {
    _id: "participant-self",
    _creationTime: 0,
    roomId: room._id,
    sessionId: "self",
    name: "Racer",
    emoji: "🚀",
    isReady: false,
    isConnected: true,
    joinedAt: 1,
    lastSeen: 1,
    typedProgress: 0,
    resetVersion: 0,
    stats: {
      wpm: 0,
      accuracy: 100,
      progress: 0,
      wordsTyped: 0,
      timeElapsed: 0,
      isFinished: false,
    },
  } as RaceParticipant;
  const rankings = Array.from({ length: 50 }, (_, index) => ({
    sessionId: index ? `other-${index}` : "self",
    name: index ? `AnExceptionallyLongUnbrokenRacerName${index}` : "Racer",
    position: index + 1,
    emoji: "🚀",
    wpm: 120 - index,
    accuracy: 98,
    finishTime: 20000 + index * 1000,
    didFinish: index < 40,
  }));
  const results = {
    _id: "results",
    _creationTime: 0,
    raceId: room._id,
    rankings,
    targetText: "hello world",
    totalRacers: rankings.length,
    createdAt: 0,
  } as Doc<"raceResults">;
  return { room, participant, participants: [participant], results };
}
