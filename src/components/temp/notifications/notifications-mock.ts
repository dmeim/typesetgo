// Mock inbox for the notification center concepts in the /temp UI Lab. Nothing here reads or writes saved data.
import { ALL_ACHIEVEMENTS, getAchievementById, type Achievement, type AchievementCategory } from "@/lib/achievement-definitions";
import { buildLadders, relativeDay, type AchievementProgress, type Ladder, type LadderStep } from "@/components/profile/profile-stats";

export type NoticeKind = "achievement" | "streak" | "best" | "room" | "system";

export interface MockNotice {
  id: string;
  kind: NoticeKind;
  title: string;
  body: string;
  at: number;
  unread: boolean;
  /** Achievement notices point at the level they announce. */
  achievementId?: string;
  /** Extra numbers some kinds show when opened. */
  detail?: { from?: number; to?: number; code?: string; host?: string; days?: boolean[] };
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const NOW = Date.now();

export const MOCK_PROGRESS: AchievementProgress = {
  bestWpm: 72,
  totalWordsTyped: 12_480,
  totalTimeTypedMs: 9.5 * HOUR,
  totalTests: 164,
  longestStreak: 7,
};

/** The highest level in a category at or under a target. */
function levelAt(category: AchievementCategory, value: number): Achievement {
  const steps = ALL_ACHIEVEMENTS.filter((achievement) => achievement.category === category && (achievement.target ?? 0) <= value);
  return steps[steps.length - 1];
}

const SPEED = levelAt("speed", 72);
const STREAK = levelAt("streak", 7);
const WORDS = levelAt("words", 12_480);
const EXPLORER = getAchievementById("explorer-punctuation") ?? ALL_ACHIEVEMENTS[0];

function earnedMap(): Record<string, number> {
  const earned: Record<string, number> = {};
  const fill = (category: AchievementCategory, upTo: number, newest: number, spread: number) => {
    const steps = ALL_ACHIEVEMENTS.filter((achievement) => achievement.category === category && (achievement.target ?? Infinity) <= upTo);
    steps.forEach((achievement, index) => {
      earned[achievement.id] = newest - (steps.length - 1 - index) * spread;
    });
  };
  fill("speed", 72, NOW - 2 * MINUTE, 2 * DAY);
  fill("streak", 7, NOW - 3 * HOUR, DAY);
  fill("words", 12_480, NOW - 4 * DAY, 3 * DAY);
  fill("tests", 164, NOW - 6 * DAY, 2 * DAY);
  for (const id of ["explorer-time-mode", "explorer-words-mode", "explorer-quote-mode"]) earned[id] = NOW - 40 * DAY;
  earned[EXPLORER.id] = NOW - DAY - 2 * HOUR;
  return earned;
}

export const MOCK_LADDERS: Ladder[] = buildLadders(earnedMap(), MOCK_PROGRESS);

/** The ladder and level an achievement notice announces. */
export function achievementOf(notice: MockNotice): { ladder: Ladder; step: LadderStep } | undefined {
  if (!notice.achievementId) return undefined;
  for (const ladder of MOCK_LADDERS) {
    const step = ladder.steps.find((candidate) => candidate.achievement.id === notice.achievementId);
    if (step) return { ladder, step };
  }
  return undefined;
}

export const INITIAL_NOTICES: MockNotice[] = [
  { id: "speed", kind: "achievement", title: SPEED.title, body: SPEED.description, at: NOW - 2 * MINUTE, unread: true, achievementId: SPEED.id },
  { id: "best", kind: "best", title: "New personal best: 72 WPM", body: "4 WPM faster than your old best, in a 30-second test.", at: NOW - 3 * MINUTE, unread: true, detail: { from: 68, to: 72 } },
  { id: "room", kind: "room", title: "Ms. Rivera opened a Connect room", body: "Room 4B warm-up is open. Join with code K7QM.", at: NOW - 40 * MINUTE, unread: true, detail: { code: "K7QM", host: "Ms. Rivera" } },
  { id: "streak-nudge", kind: "streak", title: "Keep your streak going", body: "Type today to make it 8 days in a row.", at: NOW - 2 * HOUR, unread: true, detail: { days: [true, true, true, true, true, true, true] } },
  { id: "streak", kind: "achievement", title: STREAK.title, body: STREAK.description, at: NOW - 3 * HOUR, unread: true, achievementId: STREAK.id },
  { id: "explorer", kind: "achievement", title: EXPLORER.title, body: EXPLORER.description, at: NOW - DAY - 2 * HOUR, unread: false, achievementId: EXPLORER.id },
  { id: "themes", kind: "system", title: "640 new themes", body: "Browse them in Profile, then Theme. Your current theme stays put.", at: NOW - DAY - 5 * HOUR, unread: false },
  { id: "words", kind: "achievement", title: WORDS.title, body: WORDS.description, at: NOW - 4 * DAY, unread: false, achievementId: WORDS.id },
  { id: "maintenance", kind: "system", title: "Short maintenance on Sunday", body: "Results may take a minute to save between 2:00 and 2:15 am.", at: NOW - 5 * DAY, unread: false },
];

export const KIND_LABELS: Record<NoticeKind, string> = {
  achievement: "Achievements",
  streak: "Streaks",
  best: "Personal bests",
  room: "Rooms",
  system: "Updates",
};

/** "just now", "12m ago", "3h ago", then the day. */
export function ago(at: number, now = Date.now()) {
  const minutes = Math.floor((now - at) / MINUTE);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (minutes < 24 * 60) return `${Math.floor(minutes / 60)}h ago`;
  return relativeDay(at, now);
}

/** Earned within the last day. */
export const isRecent = (at: number, now = Date.now()) => now - at < DAY;

export const clockTime = (at: number) => new Date(at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

/** Notices grouped by day label, newest first. */
export function byDay(notices: MockNotice[]) {
  const groups: { label: string; notices: MockNotice[] }[] = [];
  for (const notice of [...notices].sort((a, b) => b.at - a.at)) {
    const label = relativeDay(notice.at);
    const group = groups.find((entry) => entry.label === label);
    if (group) group.notices.push(notice);
    else groups.push({ label, notices: [notice] });
  }
  return groups;
}

export interface Concept {
  name: string;
  summary: string;
}

export const CONCEPTS: Concept[] = [
  { name: "Day cards", summary: "A popover grouped by Today, Yesterday and earlier. Achievements show up as wide collector cards right in the list; opening one grows it into the full card with the levels just behind and ahead of it." },
  { name: "Inbox drawer", summary: "A drawer slides in from the right with filters for each kind and an unread-only switch. Opening an achievement slides to its own page with the card and every level on the journey." },
  { name: "Toast stack", summary: "Your recent pop-ups wait in a stack under the bell; tap it to fan them out along a timeline. An achievement flies to the middle as a card you can flip to see the journey on the back." },
  { name: "Celebration", summary: "New achievements play first, with confetti, the medal and the tier bar filling up, then a sideways journey of levels. Skip or finish to land on a short list of everything else." },
  { name: "Compact list", summary: "One tight line per notification that opens in place: achievements open into a small card and the next levels, streaks show your week, bests show old against new, rooms show a join button." },
];
