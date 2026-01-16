// Achievement definitions for the typing application
// ~126 total achievements across 8 categories

export type AchievementTier = "bronze" | "silver" | "gold" | "platinum";

export type AchievementCategory =
  | "speed"
  | "words"
  | "accuracy"
  | "time"
  | "streak"
  | "tests"
  | "explorer"
  | "special";

// Progressive groups - only show the highest achievement in each group
export type ProgressiveGroup =
  | "wpm"
  | "words"
  | "time"
  | "streak"
  | "tests"
  | "accuracy-95"
  | "accuracy-streak";

export interface Achievement {
  id: string;
  category: AchievementCategory;
  title: string;
  description: string;
  icon: string;
  tier: AchievementTier;
  // For progressive achievements, the target value
  target?: number;
  // If set, only the highest achievement in this group will be shown
  progressiveGroup?: ProgressiveGroup;
}

// Category display info
export const ACHIEVEMENT_CATEGORIES: Record<
  AchievementCategory,
  { name: string; icon: string; description: string }
> = {
  speed: {
    name: "Speed Demons",
    icon: "⚡",
    description: "WPM milestone achievements",
  },
  words: {
    name: "Word Warrior",
    icon: "📝",
    description: "Cumulative words typed achievements",
  },
  accuracy: {
    name: "Accuracy Ace",
    icon: "🎯",
    description: "Precision and accuracy achievements",
  },
  time: {
    name: "Time Traveler",
    icon: "⏱️",
    description: "Cumulative typing time achievements",
  },
  streak: {
    name: "Streak Star",
    icon: "🔥",
    description: "Daily streak achievements",
  },
  tests: {
    name: "Test Champion",
    icon: "🏆",
    description: "Tests completed achievements",
  },
  explorer: {
    name: "Explorer",
    icon: "🧭",
    description: "Mode and feature diversity achievements",
  },
  special: {
    name: "Special Moments",
    icon: "✨",
    description: "Unique and fun achievements",
  },
};

// Helper to determine tier based on difficulty/progression
function getWpmTier(wpm: number): AchievementTier {
  if (wpm <= 30) return "bronze";
  if (wpm <= 60) return "silver";
  if (wpm <= 120) return "gold";
  return "platinum";
}

function getWordsTier(words: number): AchievementTier {
  if (words <= 1000) return "bronze";
  if (words <= 10000) return "silver";
  if (words <= 50000) return "gold";
  return "platinum";
}

function getTimeTier(minutes: number): AchievementTier {
  if (minutes <= 30) return "bronze";
  if (minutes <= 300) return "silver"; // 5 hours
  if (minutes <= 1440) return "gold"; // 24 hours
  return "platinum";
}

function getStreakTier(days: number): AchievementTier {
  if (days <= 7) return "bronze";
  if (days <= 30) return "silver";
  if (days <= 100) return "gold";
  return "platinum";
}

function getTestsTier(tests: number): AchievementTier {
  if (tests <= 25) return "bronze";
  if (tests <= 100) return "silver";
  if (tests <= 500) return "gold";
  return "platinum";
}

// Generate Speed Demons achievements (WPM milestones)
function generateSpeedAchievements(): Achievement[] {
  const achievements: Achievement[] = [];
  const wpmMilestones = [
    10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120, 130, 140, 150, 160, 170,
    180, 190, 200,
  ];

  const wpmNames: Record<number, string> = {
    10: "Getting Started",
    20: "Finding Rhythm",
    30: "Steady Pace",
    40: "Picking Up Speed",
    50: "Half Century",
    60: "Minute Master",
    70: "Swift Fingers",
    80: "Speed Typist",
    90: "Rapid Fire",
    100: "Century Club",
    110: "Beyond Average",
    120: "Double Minute",
    130: "Lightning Hands",
    140: "Blazing Fast",
    150: "Speed Demon",
    160: "Turbo Typist",
    170: "Supersonic",
    180: "Hyperspeed",
    190: "Near Light Speed",
    200: "Ultimate Speed",
  };

  for (const wpm of wpmMilestones) {
    achievements.push({
      id: `wpm-${wpm}`,
      category: "speed",
      title: wpmNames[wpm],
      description: `Reach ${wpm} WPM in a single test`,
      icon: "⚡",
      tier: getWpmTier(wpm),
      target: wpm,
      progressiveGroup: "wpm",
    });
  }

  return achievements;
}

// Generate Word Warrior achievements (cumulative correct words)
function generateWordAchievements(): Achievement[] {
  const achievements: Achievement[] = [];

  // 100 to 1000 by 100s
  for (let words = 100; words <= 1000; words += 100) {
    achievements.push({
      id: `words-${words}`,
      category: "words",
      title:
        words === 100
          ? "First Hundred"
          : words === 500
            ? "Half Thousand"
            : words === 1000
              ? "Thousand Strong"
              : `${words} Words`,
      description: `Type ${words.toLocaleString()} correct words total`,
      icon: "📝",
      tier: getWordsTier(words),
      target: words,
      progressiveGroup: "words",
    });
  }

  // 2000 to 50000 by 1000s
  for (let words = 2000; words <= 50000; words += 1000) {
    const wordNames: Record<number, string> = {
      5000: "Five Thousand",
      10000: "Ten Thousand",
      25000: "Twenty-Five K",
      50000: "Fifty Thousand",
    };
    achievements.push({
      id: `words-${words}`,
      category: "words",
      title: wordNames[words] || `${(words / 1000).toLocaleString()}K Words`,
      description: `Type ${words.toLocaleString()} correct words total`,
      icon: "📝",
      tier: getWordsTier(words),
      target: words,
      progressiveGroup: "words",
    });
  }

  // 100000
  achievements.push({
    id: "words-100000",
    category: "words",
    title: "Word Legend",
    description: "Type 100,000 correct words total",
    icon: "📝",
    tier: "platinum",
    target: 100000,
    progressiveGroup: "words",
  });

  return achievements;
}

// Generate Accuracy Ace achievements
function generateAccuracyAchievements(): Achievement[] {
  return [
    {
      id: "accuracy-perfect-1",
      category: "accuracy",
      title: "Perfectionist",
      description: "Achieve 100% accuracy on any test",
      icon: "🎯",
      tier: "bronze",
      target: 1,
      // Not progressive - standalone achievement
    },
    {
      id: "accuracy-95-5",
      category: "accuracy",
      title: "Sharp Shooter",
      description: "Complete 5 tests with 95%+ accuracy",
      icon: "🎯",
      tier: "bronze",
      target: 5,
      progressiveGroup: "accuracy-95",
    },
    {
      id: "accuracy-95-25",
      category: "accuracy",
      title: "Precision Pro",
      description: "Complete 25 tests with 95%+ accuracy",
      icon: "🎯",
      tier: "silver",
      target: 25,
      progressiveGroup: "accuracy-95",
    },
    {
      id: "accuracy-95-100",
      category: "accuracy",
      title: "Accuracy Master",
      description: "Complete 100 tests with 95%+ accuracy",
      icon: "🎯",
      tier: "gold",
      target: 100,
      progressiveGroup: "accuracy-95",
    },
    {
      id: "accuracy-streak-2",
      category: "accuracy",
      title: "Flawless Streak x2",
      description: "Get 100% accuracy on 2 tests in a row",
      icon: "🎯",
      tier: "silver",
      target: 2,
      progressiveGroup: "accuracy-streak",
    },
    {
      id: "accuracy-streak-5",
      category: "accuracy",
      title: "Flawless Streak x5",
      description: "Get 100% accuracy on 5 tests in a row",
      icon: "🎯",
      tier: "gold",
      target: 5,
      progressiveGroup: "accuracy-streak",
    },
    {
      id: "accuracy-streak-10",
      category: "accuracy",
      title: "Flawless Streak x10",
      description: "Get 100% accuracy on 10 tests in a row",
      icon: "🎯",
      tier: "gold",
      target: 10,
      progressiveGroup: "accuracy-streak",
    },
    {
      id: "accuracy-streak-25",
      category: "accuracy",
      title: "Untouchable",
      description: "Get 100% accuracy on 25 tests in a row",
      icon: "🎯",
      tier: "platinum",
      target: 25,
      progressiveGroup: "accuracy-streak",
    },
  ];
}

// Generate Time Traveler achievements (cumulative typing time)
function generateTimeAchievements(): Achievement[] {
  const timeAchievements = [
    { minutes: 10, title: "Ten Minutes", id: "time-10m" },
    { minutes: 30, title: "Half Hour", id: "time-30m" },
    { minutes: 60, title: "One Hour", id: "time-1h" },
    { minutes: 300, title: "Five Hours", id: "time-5h" },
    { minutes: 600, title: "Ten Hours", id: "time-10h" },
    { minutes: 1440, title: "Full Day", id: "time-24h" },
    { minutes: 3000, title: "Fifty Hours", id: "time-50h" },
    { minutes: 6000, title: "Hundred Hours", id: "time-100h" },
  ];

  return timeAchievements.map(({ minutes, title, id }) => ({
    id,
    category: "time" as AchievementCategory,
    title,
    description: `Spend ${minutes >= 60 ? `${minutes / 60} hour${minutes > 60 ? "s" : ""}` : `${minutes} minutes`} typing total`,
    icon: "⏱️",
    tier: getTimeTier(minutes),
    target: minutes * 60 * 1000, // Store as milliseconds
    progressiveGroup: "time" as ProgressiveGroup,
  }));
}

// Generate Streak Star achievements
function generateStreakAchievements(): Achievement[] {
  const streakMilestones = [
    { days: 3, title: "Three Day Streak" },
    { days: 7, title: "Week Warrior" },
    { days: 14, title: "Two Week Streak" },
    { days: 30, title: "Monthly Master" },
    { days: 60, title: "Two Month Streak" },
    { days: 100, title: "Century Streak" },
    { days: 365, title: "Year of Dedication" },
  ];

  return streakMilestones.map(({ days, title }) => ({
    id: `streak-${days}`,
    category: "streak" as AchievementCategory,
    title,
    description: `Maintain a ${days}-day typing streak`,
    icon: "🔥",
    tier: getStreakTier(days),
    target: days,
    progressiveGroup: "streak" as ProgressiveGroup,
  }));
}

// Generate Test Champion achievements
function generateTestAchievements(): Achievement[] {
  const testMilestones = [
    { count: 1, title: "First Test" },
    { count: 5, title: "Getting Warmed Up" },
    { count: 10, title: "Double Digits" },
    { count: 25, title: "Quarter Century" },
    { count: 50, title: "Halfway to Hundred" },
    { count: 100, title: "Century of Tests" },
    { count: 250, title: "Test Enthusiast" },
    { count: 500, title: "Test Veteran" },
    { count: 1000, title: "Test Legend" },
  ];

  return testMilestones.map(({ count, title }) => ({
    id: `tests-${count}`,
    category: "tests" as AchievementCategory,
    title,
    description: `Complete ${count.toLocaleString()} typing test${count > 1 ? "s" : ""}`,
    icon: "🏆",
    tier: getTestsTier(count),
    target: count,
    progressiveGroup: "tests" as ProgressiveGroup,
  }));
}

// Generate Explorer achievements (mode/feature diversity)
function generateExplorerAchievements(): Achievement[] {
  return [
    {
      id: "explorer-time-mode",
      category: "explorer",
      title: "Time Keeper",
      description: "Complete a time mode test",
      icon: "🧭",
      tier: "bronze",
    },
    {
      id: "explorer-words-mode",
      category: "explorer",
      title: "Word Counter",
      description: "Complete a words mode test",
      icon: "🧭",
      tier: "bronze",
    },
    {
      id: "explorer-quote-mode",
      category: "explorer",
      title: "Quotable",
      description: "Complete a quote mode test",
      icon: "🧭",
      tier: "bronze",
    },
    {
      id: "explorer-preset-mode",
      category: "explorer",
      title: "Scholar",
      description: "Complete a preset mode test",
      icon: "🧭",
      tier: "bronze",
    },
    {
      id: "explorer-punctuation",
      category: "explorer",
      title: "Punctuation Pro",
      description: "Complete a test with punctuation enabled",
      icon: "🧭",
      tier: "silver",
    },
    {
      id: "explorer-numbers",
      category: "explorer",
      title: "Number Cruncher",
      description: "Complete a test with numbers enabled",
      icon: "🧭",
      tier: "silver",
    },
    {
      id: "explorer-all-difficulties",
      category: "explorer",
      title: "Difficulty Master",
      description: "Complete tests on easy, medium, and hard difficulty",
      icon: "🧭",
      tier: "gold",
    },
  ];
}

// Generate Special Moments achievements
function generateSpecialAchievements(): Achievement[] {
  return [
    {
      id: "special-first-test",
      category: "special",
      title: "First Steps",
      description: "Complete your very first typing test",
      icon: "✨",
      tier: "bronze",
    },
    {
      id: "special-night-owl",
      category: "special",
      title: "Night Owl",
      description: "Complete a test between midnight and 5am",
      icon: "🦉",
      tier: "silver",
    },
    {
      id: "special-early-bird",
      category: "special",
      title: "Early Bird",
      description: "Complete a test between 5am and 7am",
      icon: "🐦",
      tier: "silver",
    },
    {
      id: "special-weekend-warrior",
      category: "special",
      title: "Weekend Warrior",
      description: "Complete 10 tests on weekends",
      icon: "🎉",
      tier: "silver",
      target: 10,
    },
    {
      id: "special-marathon",
      category: "special",
      title: "Marathon Runner",
      description: "Complete a test that lasts 120+ seconds",
      icon: "🏃",
      tier: "silver",
    },
    {
      id: "special-speed-accuracy",
      category: "special",
      title: "Speed and Precision",
      description: "Achieve 100+ WPM with 95%+ accuracy in a single test",
      icon: "💫",
      tier: "gold",
    },
  ];
}

// Combine all achievements
export const ALL_ACHIEVEMENTS: Achievement[] = [
  ...generateSpeedAchievements(),
  ...generateWordAchievements(),
  ...generateAccuracyAchievements(),
  ...generateTimeAchievements(),
  ...generateStreakAchievements(),
  ...generateTestAchievements(),
  ...generateExplorerAchievements(),
  ...generateSpecialAchievements(),
];

// Create a map for quick lookup by ID
export const ACHIEVEMENTS_BY_ID: Map<string, Achievement> = new Map(
  ALL_ACHIEVEMENTS.map((a) => [a.id, a])
);

// Get achievements by category
export function getAchievementsByCategory(
  category: AchievementCategory
): Achievement[] {
  return ALL_ACHIEVEMENTS.filter((a) => a.category === category);
}

// Get achievement by ID
export function getAchievementById(id: string): Achievement | undefined {
  return ACHIEVEMENTS_BY_ID.get(id);
}

// Tier colors for UI styling
export const TIER_COLORS: Record<
  AchievementTier,
  { bg: string; border: string; text: string }
> = {
  bronze: { bg: "#CD7F32", border: "#8B4513", text: "#FFFFFF" },
  silver: { bg: "#C0C0C0", border: "#808080", text: "#000000" },
  gold: { bg: "#FFD700", border: "#DAA520", text: "#000000" },
  platinum: { bg: "#E5E4E2", border: "#B0C4DE", text: "#000000" },
};

/**
 * Filter earned achievements to only show the highest in each progressive group.
 * Non-progressive achievements are always shown.
 *
 * @param earnedAchievementIds - Array of achievement IDs the user has earned
 * @returns Array of achievement IDs to display (highest in each progressive group)
 */
export function filterToHighestAchievements(
  earnedAchievementIds: string[]
): string[] {
  // Track the highest achievement in each progressive group
  const highestInGroup: Map<ProgressiveGroup, { id: string; target: number }> =
    new Map();

  // Non-progressive achievements to include
  const nonProgressiveIds: string[] = [];

  for (const id of earnedAchievementIds) {
    const achievement = ACHIEVEMENTS_BY_ID.get(id);
    if (!achievement) continue;

    if (achievement.progressiveGroup) {
      // Progressive achievement - track the highest by target value
      const current = highestInGroup.get(achievement.progressiveGroup);
      const target = achievement.target ?? 0;

      if (!current || target > current.target) {
        highestInGroup.set(achievement.progressiveGroup, { id, target });
      }
    } else {
      // Non-progressive - always include
      nonProgressiveIds.push(id);
    }
  }

  // Combine highest progressive achievements with non-progressive ones
  const result = [
    ...nonProgressiveIds,
    ...Array.from(highestInGroup.values()).map((v) => v.id),
  ];

  return result;
}

/**
 * Get all categories that have at least one earned achievement
 */
export function getEarnedCategories(
  earnedAchievementIds: string[]
): AchievementCategory[] {
  const categories = new Set<AchievementCategory>();

  for (const id of earnedAchievementIds) {
    const achievement = ACHIEVEMENTS_BY_ID.get(id);
    if (achievement) {
      categories.add(achievement.category);
    }
  }

  // Return in a logical order
  const orderedCategories: AchievementCategory[] = [
    "speed",
    "words",
    "accuracy",
    "time",
    "streak",
    "tests",
    "explorer",
    "special",
  ];

  return orderedCategories.filter((c) => categories.has(c));
}
