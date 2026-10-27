import { getFunctionName } from "convex/server";
import { ALL_ACHIEVEMENTS } from "@/lib/achievement-definitions";

const options = new URLSearchParams(window.location.search);
export const scenario = options.get("scenario") ?? "owner";
export const calls: Array<{ name: string; args: unknown }> = [];
Object.assign(window, { profileFixtureCalls: calls });

export function useAppAuth() {
  const user = scenario === "anonymous" ? null
    : showcase ? { id: "clerk-owner", username: "Riley Chen", imageUrl: OWNER_PICTURE } : { id: "clerk-owner" };
  return {
    user,
    available: !!user,
    isLoaded: true,
    isSignedIn: !!user,
    status: user ? "signed-in" : "unavailable",
    unavailableReason: user ? null : "not-configured",
  };
}

export const useUser = useAppAuth;
export function useAccount() {
  // ?you=leaderboard-user-N signs in as a ranked leaderboard player.
  const userId = options.get("you") ?? (scenario === "visitor" ? "profile-visitor" : "profile-owner");
  return { status: scenario === "anonymous" ? "unavailable" : "ready", userId };
}

const now = Date.now();
// Screenshot scenario (scripts/capture-changelog-shots.mjs): ordinary names, pictures and a varied history.
const showcase = scenario === "showcase";
const SHOWCASE_NAMES = ["Maya", "keysmith", "Leo Park", "Priya", "quietfox", "Jonah", "Sofia R", "tapdancer", "Ava", "Theo",
  "Riley Chen", "nightowl", "Sam", "Noor", "inkwell", "Mateo", "Hana", "lowercase", "Felix", "Zara",
  "Elif", "homerow", "Oscar", "Mina", "Kai", "spacebar", "Lucia", "Ben", "Ivy", "Omar",
  "Wren", "Arjun", "Nell", "Jude", "Rosa", "Tomas", "Isla", "Dev", "Clara", "Remy",
  "Ines", "Hugo", "Yara", "Milo", "Alba", "Emre", "June", "Pax", "Lena", "Ruth"];
const portrait = (from: string, to: string, skin: string) => `data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'><defs><linearGradient id='g' x2='1' y2='1'><stop stop-color='${from}'/><stop offset='1' stop-color='${to}'/></linearGradient></defs><rect width='64' height='64' fill='url(#g)'/><circle cx='32' cy='26' r='12' fill='${skin}'/><path d='M10 64c2-14 11-20 22-20s20 6 22 20z' fill='${skin}' opacity='.9'/></svg>`,
)}`;
const SHOWCASE_PICTURES: Record<number, string> = {
  0: portrait("#f59e0b", "#ef4444", "#fde7d0"),
  2: portrait("#06b6d4", "#6366f1", "#8d5a3b"),
  3: portrait("#22c55e", "#0ea5e9", "#c68a5e"),
  6: portrait("#ec4899", "#8b5cf6", "#f1c7a5"),
  10: portrait("#a78bfa", "#38bdf8", "#e8b796"),
};
const OWNER_PICTURE = SHOWCASE_PICTURES[10];

function leaderboardUsername(index: number, range = "all-time") {
  if (showcase) return SHOWCASE_NAMES[index];
  return scenario === "podium" && index < 3
    ? ["Maya", "SecondPlaceWithAnExceptionallyLongUnbrokenName", "Leo the typist"][index]
    : `${range} ExtremelyLongUnbrokenUsernameNumber${index + 1}`;
}

// Showcase tests land at different times of day rather than all at this minute.
const resultTime = (index: number) => now - index * 86400000 - (showcase ? ((index * 47) % 300) * 60000 : 0);
const recentResults = Array.from({ length: 100 }, (_, index) => ({
  _id: `result-${index}`,
  _creationTime: resultTime(index),
  userId: "profile-owner",
  wpm: showcase ? Math.round(84 - index * 0.25 + 9 * Math.sin(index * 1.7) + 4 * Math.cos(index * 0.6))
    : scenario === "charm" && index === 0 ? 300 : 60 + (index % 30),
  accuracy: showcase ? Math.round((98.2 - index * 0.03 + [0.6, -0.9, 0.3, 1.1, -0.4, 0.8, -1.2][index % 7]) * 10) / 10
    : scenario === "charm" && index === 0 ? 100 : 95 + (index % 5),
  duration: 30000,
  wordCount: 30,
  mode: scenario === "charm" || showcase ? ["time", "words", "quote", "zen", "preset"][index % 5] : "time",
  difficulty: "intermediate",
  punctuation: index % 2 === 0,
  numbers: index % 3 === 0,
  capitalization: true,
  isValid: showcase || index !== 4,
  verification: index === 4 && !showcase ? "invalid" : "verified",
  invalidReason: index === 4 && !showcase ? "Fixture invalid result" : undefined,
  createdAt: resultTime(index),
  ...(index === 0 && !showcase ? {} : {
    wordsCorrect: index === 1 && !showcase ? 0 : 28,
    wordsIncorrect: showcase ? index % 3 : 0,
    charsMissed: 0,
    charsExtra: showcase ? index % 2 : 0,
  }),
}));

export function useQuery(reference: Parameters<typeof getFunctionName>[0], args: unknown) {
  if (args === "skip") return undefined;
  const name = getFunctionName(reference);
  if (scenario === "loading") return undefined;
  if (name === "users:getUserById") {
    if (scenario === "missing") return null;
    const userId = (args as { userId: string }).userId;
    if (userId !== "profile-owner") {
      const rank = Number(/^leaderboard-user-(\d+)$/.exec(userId)?.[1]);
      if (!rank || rank > 50) return null;
      return { _id: userId, username: leaderboardUsername(rank - 1), avatarUrl: showcase ? SHOWCASE_PICTURES[rank - 1] ?? null : null, createdAt: now - 365 * 86400000 };
    }
    return {
      _id: "profile-owner",
      username: showcase ? "Riley Chen" : "A very long profile name that must remain readable at narrow widths",
      avatarUrl: showcase ? OWNER_PICTURE : null,
      createdAt: now - 365 * 86400000,
    };
  }
  if (name === "users:getUser") {
    return { _id: scenario === "visitor" ? "profile-visitor" : "profile-owner" };
  }
  if (name === "testResults:getUserStatsByUserId") {
    const empty = scenario === "empty";
    const userId = (args as { userId: string }).userId;
    return {
      totalTests: empty ? 0 : 350,
      bestWpm: empty ? 0 : showcase ? Math.max(...recentResults.map((result) => result.wpm)) : 180,
      averageWpm: empty ? 0 : showcase ? 74 : 100,
      averageAccuracy: empty ? 0 : showcase ? 96.9 : 98.5,
      totalTimeTyped: empty ? 0 : 10500000,
      totalWordsTyped: empty ? 0 : 12000,
      totalCharactersTyped: empty ? 0 : 60000,
      allResults: empty ? [] : userId === "profile-owner" ? recentResults : recentResults.map((result) => ({ ...result, userId })),
    };
  }
  if (name === "achievements:getUserAchievementsByUserId" || name === "achievements:getUserAchievements") {
    if (scenario === "achievements-loading") return undefined;
    if (showcase) {
      // The easier part of each journey, so earned levels match a few months of practice.
      return Object.fromEntries(ALL_ACHIEVEMENTS.filter((achievement) => {
        const journey = ALL_ACHIEVEMENTS.filter((other) => other.category === achievement.category);
        return journey.indexOf(achievement) < journey.length * (0.15 + (achievement.category.length % 4) * 0.08);
      }).map((a) => [a.id, now]));
    }
    return scenario === "empty" ? {} : Object.fromEntries(
      ALL_ACHIEVEMENTS.filter((achievement, index) => index % 3 === 0 && (scenario !== "charm" || achievement.category !== "special")).map((a) => [a.id, now]),
    );
  }
  if (name === "testResults:getLeaderboard") {
    const range = (args as { timeRange: string }).timeRange;
    const count = scenario === "podium" ? Number(options.get("podiumCount") ?? 50) : 50;
    return scenario === "empty" ? [] : Array.from({ length: count }, (_, index) => ({
      userId: `leaderboard-user-${index + 1}`,
      rank: index + 1,
      username: leaderboardUsername(index, range),
      avatarUrl: showcase ? SHOWCASE_PICTURES[index] ?? null
        : scenario === "podium" && index < 2 ? ["/assets/Banner-Color.svg", "/fixtures/missing-avatar.png"][index] : null,
      wpm: showcase ? Math.round(142 - index * 1.9 - (index > 2 ? 4 : 0)) : scenario === "podium" && index === 1 ? 150 : 150 - index,
      createdAt: now - index * 60000,
    }));
  }
  if (name === "streaks:getUserStreak") {
    return scenario === "empty" ? { currentStreak: 0, longestStreak: 0, lastActivityDate: null } : { currentStreak: 3, longestStreak: 21, lastActivityDate: null };
  }
  // No saved account defaults: the Profile page keeps local settings and saves nothing until an edit.
  if (name === "preferences:getPreferences") return null;
  throw new Error(`Unmocked profile query: ${name}`);
}

export function useMutation(reference: Parameters<typeof getFunctionName>[0]) {
  const name = getFunctionName(reference);
  return async (args: unknown) => {
    calls.push({ name, args });
    if (scenario === "error") throw new Error("Fixture request failed. Please try again.");
    return { pending: false };
  };
}
