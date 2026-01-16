import { useState } from "react";
import type { Theme } from "@/lib/typing-constants";
import {
  getAchievementById,
  TIER_COLORS,
  filterToHighestAchievements,
  type Achievement,
} from "@/lib/achievement-definitions";
import AchievementDetailModal from "./AchievementDetailModal";

interface AchievementsGridProps {
  // Record of achievementId -> earnedAt timestamp
  earnedAchievements: Record<string, number>;
  theme: Theme;
}

export default function AchievementsGrid({
  earnedAchievements,
  theme,
}: AchievementsGridProps) {
  const [selectedAchievement, setSelectedAchievement] = useState<{
    achievement: Achievement;
    earnedAt: number;
  } | null>(null);

  // Get all earned achievement IDs
  const earnedIds = Object.keys(earnedAchievements);

  // Filter to only show highest in each progressive group
  const displayIds = filterToHighestAchievements(earnedIds);

  // Get achievement objects with earned timestamps
  const achievements = displayIds
    .map((id) => {
      const achievement = getAchievementById(id);
      if (!achievement) return null;
      return { achievement, earnedAt: earnedAchievements[id] };
    })
    .filter(Boolean) as { achievement: Achievement; earnedAt: number }[];

  if (displayIds.length === 0) {
    return (
      <div
        className="p-4 rounded-xl flex flex-col items-center justify-center h-full"
        style={{ backgroundColor: `${theme.backgroundColor}80` }}
      >
        <div className="text-3xl mb-2 opacity-50">🏆</div>
        <div
          className="text-sm text-center"
          style={{ color: theme.defaultText }}
        >
          No achievements yet
        </div>
        <div
          className="text-xs text-center mt-1 opacity-70"
          style={{ color: theme.defaultText }}
        >
          Complete tests to earn achievements!
        </div>
      </div>
    );
  }

  return (
    <>
      <div
        className="p-3 rounded-xl h-full overflow-hidden flex flex-col"
        style={{ backgroundColor: `${theme.backgroundColor}80` }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-2 px-1">
          <div
            className="text-xs font-semibold uppercase tracking-wide"
            style={{ color: theme.defaultText }}
          >
            Achievements
          </div>
          <div
            className="text-xs font-medium"
            style={{ color: theme.buttonSelected }}
          >
            {earnedIds.length} earned
          </div>
        </div>

        {/* Scrollable Content - Flat Grid */}
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
            {achievements.map(({ achievement, earnedAt }) => {
              const tierColors = TIER_COLORS[achievement.tier];
              return (
                <button
                  key={achievement.id}
                  onClick={() =>
                    setSelectedAchievement({ achievement, earnedAt })
                  }
                  className="flex flex-col items-center p-2 rounded-lg transition-all hover:scale-105 hover:shadow-lg"
                  style={{
                    backgroundColor: `${tierColors.bg}20`,
                    borderWidth: 1,
                    borderColor: `${tierColors.border}50`,
                  }}
                  title={achievement.title}
                >
                  {/* Icon */}
                  <div className="text-xl mb-1">{achievement.icon}</div>
                  {/* Title (truncated) */}
                  <div
                    className="text-[10px] font-medium text-center leading-tight line-clamp-2"
                    style={{ color: theme.correctText }}
                  >
                    {achievement.title}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Achievement Detail Modal */}
      {selectedAchievement && (
        <AchievementDetailModal
          achievement={selectedAchievement.achievement}
          earnedAt={selectedAchievement.earnedAt}
          theme={theme}
          onClose={() => setSelectedAchievement(null)}
        />
      )}
    </>
  );
}
