import NotificationCenter from "@/components/layout/NotificationCenter";
import { AchievementCelebration } from "@/components/achievements/AchievementCelebration";
import { useNotify } from "@/hooks/useNotify";
import { getAchievementsByCategory } from "@/lib/achievement-definitions";

// The bell plus the app-level celebration host; the buttons award real achievement levels through useNotify.
export function NotificationFixture() {
  const notify = useNotify();
  const award = (count: number) => getAchievementsByCategory("speed").slice(1, 1 + count).forEach((achievement) => notify({
    type: "achievement", title: achievement.title, description: achievement.description,
    metadata: { achievementId: achievement.id, achievementTier: achievement.tier },
  }));
  return (
    <main className="min-h-dvh bg-background p-4 text-foreground">
      <h1>Notification fixture</h1>
      <NotificationCenter />
      <button type="button" onClick={() => award(1)}>Award achievement</button>
      <button type="button" onClick={() => award(3)}>Award three</button>
      <AchievementCelebration />
    </main>
  );
}
