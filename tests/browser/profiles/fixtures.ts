import { getFunctionName } from "convex/server";
import { ALL_ACHIEVEMENTS } from "@/lib/achievement-definitions";

const options = new URLSearchParams(window.location.search);
export const scenario = options.get("scenario") ?? "owner";
export const calls: Array<{ name: string; args: unknown }> = [];
Object.assign(window, { profileFixtureCalls: calls });

export function useAppAuth() {
  const user = scenario === "anonymous" ? null : { id: "clerk-owner" };
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

const now = Date.now();
const recentResults = Array.from({ length: 100 }, (_, index) => ({
  _id: `result-${index}`,
  _creationTime: now - index * 86400000,
  userId: "profile-owner",
  wpm: 60 + (index % 30),
  accuracy: 95 + (index % 5),
  duration: 30000,
  wordCount: 30,
  mode: "time",
  difficulty: "intermediate",
  punctuation: index % 2 === 0,
  numbers: index % 3 === 0,
  capitalization: true,
  isValid: index !== 4,
  invalidReason: index === 4 ? "Fixture invalid result" : undefined,
  createdAt: now - index * 86400000,
  ...(index === 0 ? {} : {
    wordsCorrect: index === 1 ? 0 : 28,
    wordsIncorrect: 0,
    charsMissed: 0,
    charsExtra: 0,
  }),
}));

export function useQuery(reference: Parameters<typeof getFunctionName>[0], args: unknown) {
  if (args === "skip") return undefined;
  const name = getFunctionName(reference);
  if (scenario === "loading") return undefined;
  if (name === "users:getUserById") {
    if (scenario === "missing") return null;
    return {
      _id: "profile-owner",
      username: "A very long profile name that must remain readable at narrow widths",
      avatarUrl: null,
      createdAt: now - 365 * 86400000,
    };
  }
  if (name === "users:getUser") {
    return { _id: scenario === "visitor" ? "profile-visitor" : "profile-owner" };
  }
  if (name === "testResults:getUserStatsByUserId") {
    const empty = scenario === "empty";
    return {
      totalTests: empty ? 0 : 350,
      bestWpm: empty ? 0 : 180,
      averageWpm: empty ? 0 : 100,
      averageAccuracy: empty ? 0 : 98.5,
      totalTimeTyped: empty ? 0 : 10500000,
      totalWordsTyped: empty ? 0 : 12000,
      totalCharactersTyped: empty ? 0 : 60000,
      allResults: empty ? [] : recentResults,
    };
  }
  if (name === "achievements:getUserAchievementsByUserId" || name === "achievements:getUserAchievements") {
    if (scenario === "achievements-loading") return undefined;
    return scenario === "empty" ? {} : Object.fromEntries(
      ALL_ACHIEVEMENTS.filter((_, index) => index % 3 === 0).map((a) => [a.id, now]),
    );
  }
  if (name === "testResults:getLeaderboard") {
    const range = (args as { timeRange: string }).timeRange;
    return scenario === "empty" ? [] : Array.from({ length: 50 }, (_, index) => ({
      rank: index + 1,
      username: `${range} ExtremelyLongUnbrokenUsernameNumber${index + 1}`,
      avatarUrl: null,
      wpm: 150 - index,
      createdAt: now - index * 60000,
    }));
  }
  throw new Error(`Unmocked profile query: ${name}`);
}

export function useMutation(reference: Parameters<typeof getFunctionName>[0]) {
  const name = getFunctionName(reference);
  return async (args: unknown) => {
    calls.push({ name, args });
    if (scenario === "error") throw new Error("Fixture request failed. Please try again.");
    return null;
  };
}
