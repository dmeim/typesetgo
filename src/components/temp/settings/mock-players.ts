// Public profiles for everyone on the mock leaderboards, so a name links to /temp-profile/:userId.
// Each player's numbers are derived from their name, so links stay stable between visits.
import { BOARDS, YOU } from "@/components/temp/leaderboard/mock-leaderboard";
import { MOCK_CHART_RESULTS, MOCK_STATS, MOCK_USER } from "./mock-profile";

export interface PublicProfile {
  id: string;
  username: string;
  joined: string;
  streak: number;
  bestStreak: number;
  stats: typeof MOCK_STATS;
  chartResults: typeof MOCK_CHART_RESULTS;
}

function hash(text: string) {
  return [...text].reduce((total, char) => (total * 31 + char.charCodeAt(0)) >>> 0, 7);
}

const ID_CHARS = "0123456789abcdefghjkmnpqrstvwxyz";

/** A 32-character lowercase ID shaped like a Convex document ID. */
export function playerId(username: string) {
  let seed = hash(username) || 1;
  let id = "";
  for (let index = 0; index < 32; index++) {
    seed = (Math.imul(seed, 1_103_515_245) + 12_345) >>> 0;
    id += ID_CHARS[(seed >>> 16) % ID_CHARS.length];
  }
  return id;
}

export const MY_PROFILE: PublicProfile = { id: playerId(YOU), ...MOCK_USER, stats: MOCK_STATS, chartResults: MOCK_CHART_RESULTS };

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October"];

function profileOf(username: string, best: number): PublicProfile {
  const seed = hash(username);
  const scale = best / MOCK_STATS.bestWpm;
  const totalTests = 60 + (seed % 900);
  const averageWpm = Math.round(best * 0.8);
  const totalTimeTyped = totalTests * 41_000;
  const totalWordsTyped = Math.round(totalTimeTyped / 60_000 * averageWpm);
  return {
    id: playerId(username),
    username,
    joined: `${MONTHS[seed % MONTHS.length]} ${2024 + (seed % 3)}`,
    streak: seed % 12,
    bestStreak: 10 + (seed % 90),
    stats: {
      totalTests,
      totalTimeTyped,
      bestWpm: best,
      averageWpm,
      averageAccuracy: Math.round((94 + (seed % 50) / 10) * 10) / 10,
      totalWordsTyped,
      totalCharactersTyped: totalWordsTyped * 5,
      trend: MOCK_STATS.trend.map((value) => Math.round(value * scale)),
      accuracyTrend: MOCK_STATS.accuracyTrend,
    },
    chartResults: MOCK_CHART_RESULTS.map((result) => ({ ...result, wpm: Math.round(result.wpm * scale) })),
  };
}

const bestByPlayer = new Map<string, number>();
for (const entry of Object.values(BOARDS).flat()) {
  if (entry.username !== YOU) bestByPlayer.set(entry.username, Math.max(bestByPlayer.get(entry.username) ?? 0, entry.wpm));
}

export const PLAYERS: PublicProfile[] = [MY_PROFILE, ...[...bestByPlayer].map(([username, best]) => profileOf(username, best))];

export const findPlayer = (userId: string) => PLAYERS.find((player) => player.id === userId);

/** Where a leaderboard name links to. */
export const profileHref = (username: string) => `/temp-profile/${playerId(username)}`;
