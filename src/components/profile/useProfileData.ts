import { useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { withVerification } from "./profile-stats";

interface ProfileDataOptions {
  /** Your own profile also loads your streak (owner-only) and, when asked, your achievements. */
  clerkId?: string | null;
  achievements?: boolean;
}

/**
 * The same public queries the old /user/:userId page used, plus your streak on your own profile.
 * `undefined` values are still loading; `user === null` means no such player.
 */
export function useProfileData(userId: string | null, { clerkId = null, achievements = false }: ProfileDataOptions = {}) {
  const id = userId as Id<"users"> | null;
  const user = useQuery(api.users.getUserById, id ? { userId: id } : "skip");
  const stats = useQuery(api.testResults.getUserStatsByUserId, id ? { userId: id } : "skip");
  const earned = useQuery(api.achievements.getUserAchievementsByUserId, id && achievements ? { userId: id } : "skip");
  const streak = useQuery(api.streaks.getUserStreak, id && clerkId ? { clerkId } : "skip");
  const allResults = stats?.allResults;
  const results = useMemo(() => (allResults ? withVerification(allResults) : undefined), [allResults]);
  return { user, stats, results, earned, streak };
}

export type ProfileData = ReturnType<typeof useProfileData>;
