// Mock boards for the /temp-leaderboard mockups. The same players appear on every board in a different order,
// so switching periods shows people moving between the podium and the list. Nothing is fetched.
import { msUntilNextUtcDay, todayTitleUTC, utcDayStart, weekTitleUTC } from "@/lib/leaderboard-period";

export type PeriodId = "today" | "week" | "all";

export interface BoardEntry {
  rank: number;
  username: string;
  wpm: number;
  accuracy: number;
  test: string;
  createdAt: number;
  /** Places moved since yesterday; positive is up. */
  change: number;
  isYou?: boolean;
}

export const entryLabel = (entry: BoardEntry) => `Rank ${entry.rank}: ${entry.username}, ${entry.wpm} WPM${entry.isYou ? " (you)" : ""}`;

export interface PeriodMeta {
  id: PeriodId;
  label: string;
  title: string;
  subtitle: string;
  resets?: string;
}

export const YOU = "pixelpenguin";
export const METALS = ["#d6a738", "#98a7be", "#c58150"] as const;
export const RULES = "Ranked tests need 90%+ accuracy and at least 30 seconds or 50 correct words. 15-second tests don’t count.";

const now = Date.now();
const start = utcDayStart(now);
const HOUR = 3_600_000;

function countdown(ms: number) {
  const hours = Math.floor(ms / HOUR);
  const minutes = Math.floor((ms % HOUR) / 60_000);
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}

export const PERIODS: PeriodMeta[] = [
  { id: "today", label: "Today", title: "Today", subtitle: todayTitleUTC(start), resets: `Resets in ${countdown(msUntilNextUtcDay(now))}` },
  { id: "week", label: "7 days", title: "Last 7 days", subtitle: weekTitleUTC(start), resets: "Rolls over daily" },
  { id: "all", label: "All time", title: "All time", subtitle: "Every ranked test ever" },
];

const TESTS = ["Time · 60s", "Words · 50", "Time · 30s", "Quote · long", "Words · 100"];

type Row = [username: string, wpm: number, hoursAgo: number];

const ROWS: Record<PeriodId, Row[]> = {
  today: [
    ["neonnarwhal", 138, 1], ["zapzebra", 131, 3], ["keyqueen", 127, 2], ["mintymoose", 115, 5], ["jellybean", 104, 4], ["hushhedgehog", 97, 7],
    ["mapleleaf", 88, 6], [YOU, 74, 2], ["captaincomma", 71, 8], ["sprinkles42", 66, 9], ["typhoon_ty", 61, 3], ["orbit_otter", 58, 10],
  ],
  week: [
    ["keyqueen", 151, 30], ["neonnarwhal", 147, 1], ["QuickFox", 140, 52], ["byteowl", 132, 75], ["zapzebra", 129, 3], ["turbo_turtle", 126, 96],
    ["mintymoose", 118, 26], ["lunalynx", 112, 120], ["orbit_otter", 105, 60], ["jellybean", 101, 4], ["hushhedgehog", 96, 7], ["mapleleaf", 92, 140],
  ],
  all: [
    ["QuickFox", 168, 900], ["keyqueen", 162, 2_300], ["turbo_turtle", 155, 410], ["neonnarwhal", 149, 1_200], ["byteowl", 144, 75], ["lunalynx", 139, 3_100],
    ["zapzebra", 133, 650], ["captaincomma", 128, 1_900], ["orbit_otter", 124, 800], ["mintymoose", 119, 2_700], ["sprinkles42", 115, 1_500], ["jellybean", 111, 380],
  ],
};

/** Your own placing when you are off the visible list. */
const YOUR_PLACE: Record<PeriodId, { rank: number; wpm: number }> = {
  today: { rank: 8, wpm: 74 },
  week: { rank: 15, wpm: 74 },
  all: { rank: 27, wpm: 74 },
};

function hash(text: string) {
  return [...text].reduce((total, char) => (total * 31 + char.charCodeAt(0)) >>> 0, 7);
}

function entry([username, wpm, hoursAgo]: Row, index: number, period: PeriodId): BoardEntry {
  const seed = hash(username + period);
  return {
    rank: index + 1,
    username,
    wpm,
    accuracy: 94 + (seed % 55) / 10,
    test: TESTS[seed % TESTS.length],
    createdAt: now - hoursAgo * HOUR,
    change: period === "all" ? 0 : [0, 0, 1, -1, 2, 0, -2, 3][seed % 8],
    isYou: username === YOU,
  };
}

export const BOARDS: Record<PeriodId, BoardEntry[]> = {
  today: ROWS.today.map((row, index) => entry(row, index, "today")),
  week: ROWS.week.map((row, index) => entry(row, index, "week")),
  all: ROWS.all.map((row, index) => entry(row, index, "all")),
};

export interface Standing {
  rank: number;
  wpm: number;
  /** The player directly above you, and how far ahead they are. */
  next?: { username: string; gap: number };
}

export function yourStanding(period: PeriodId): Standing {
  const place = YOUR_PLACE[period];
  const board = BOARDS[period];
  const above = board[place.rank - 2] ?? board[board.length - 1];
  const gap = place.rank - 1 <= board.length ? above.wpm - place.wpm : 3 + (place.rank % 5);
  const username = place.rank - 1 <= board.length ? above.username : `#${place.rank - 1}`;
  return { ...place, next: { username, gap } };
}

const AVATAR_TONES = [
  "bg-primary text-primary-foreground",
  "bg-(--accent-emphasis) text-background",
  "bg-warning text-background",
  "bg-success text-background",
  "bg-destructive text-background",
  "bg-muted-foreground text-background",
];

export const avatarTone = (username: string) => AVATAR_TONES[hash(username) % AVATAR_TONES.length];

export function when(timestamp: number) {
  const hours = Math.round((now - timestamp) / HOUR);
  if (hours < 1) return "just now";
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
}
