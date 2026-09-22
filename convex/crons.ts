import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Clean up expired typing sessions every 5 minutes
crons.interval(
  "cleanupExpiredSessions",
  { minutes: 5 },
  internal.sessionCleanup.cleanupExpiredSessions
);

crons.interval(
  "cleanupExpiredAdminSessions",
  { hours: 1 },
  internal.sessionCleanup.cleanupExpiredAdminSessions
);

crons.interval(
  "cleanupMultiplayerPresence",
  { seconds: 30 },
  internal.multiplayerPresence.cleanup
);

export default crons;
