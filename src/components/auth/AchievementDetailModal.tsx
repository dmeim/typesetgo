import type { Theme } from "@/lib/typing-constants";
import {
  ACHIEVEMENT_CATEGORIES,
  TIER_COLORS,
  type Achievement,
} from "@/lib/achievement-definitions";

interface AchievementDetailModalProps {
  achievement: Achievement;
  earnedAt: number;
  theme: Theme;
  onClose: () => void;
}

function formatDateTime(timestamp: number): string {
  const date = new Date(timestamp);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const year = date.getFullYear();
  const hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  const hour12 = hours % 12 || 12;
  return `${month}/${day}/${year} at ${hour12}:${minutes} ${ampm}`;
}

export default function AchievementDetailModal({
  achievement,
  earnedAt,
  theme,
  onClose,
}: AchievementDetailModalProps) {
  const category = ACHIEVEMENT_CATEGORIES[achievement.category];
  const tierColors = TIER_COLORS[achievement.tier];

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-lg p-6 shadow-xl mx-4"
        style={{ backgroundColor: theme.surfaceColor }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <div className="flex justify-end mb-2">
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg transition hover:bg-gray-700/50"
            style={{ color: theme.defaultText }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </div>

        {/* Top Section: Icon/Tier + Title/Category */}
        <div className="flex items-center justify-center gap-4 mb-4">
          {/* Left: Achievement Icon & Tier Badge */}
          <div className="flex flex-col items-center shrink-0">
            {/* Large Icon with Tier Border */}
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center text-3xl mb-2"
              style={{
                backgroundColor: `${tierColors.bg}30`,
                borderWidth: 3,
                borderColor: tierColors.border,
                boxShadow: `0 0 20px ${tierColors.bg}40`,
              }}
            >
              {achievement.icon}
            </div>

            {/* Tier Badge */}
            <div
              className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider"
              style={{
                backgroundColor: tierColors.bg,
                color: tierColors.text,
              }}
            >
              {achievement.tier}
            </div>
          </div>

          {/* Right: Title & Category */}
          <div className="flex flex-col min-w-0">
            <h3
              className="text-xl font-bold mb-1 truncate"
              style={{ color: theme.correctText }}
            >
              {achievement.title}
            </h3>
            <div
              className="text-sm flex items-center gap-1"
              style={{ color: theme.defaultText }}
            >
              <span>{category.icon}</span>
              <span>{category.name}</span>
            </div>
          </div>
        </div>

        {/* Bottom Section: Description & Earned Date */}
        <div
          className="text-sm text-center px-4 py-3 rounded-lg mb-3"
          style={{
            backgroundColor: `${theme.backgroundColor}80`,
            color: theme.correctText,
          }}
        >
          {achievement.description}
        </div>

        <div
          className="text-xs text-center"
          style={{ color: theme.defaultText }}
        >
          <span className="opacity-70">Earned on </span>
          <span className="font-medium" style={{ color: theme.buttonSelected }}>
            {formatDateTime(earnedAt)}
          </span>
        </div>
      </div>
    </div>
  );
}
