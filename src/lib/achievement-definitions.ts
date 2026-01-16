// Achievement definitions for the typing application
// Data-driven achievement system with 5 tiers (40 levels per progressive category)

import {
  type AchievementTier,
  type ProgressiveCategory,
  getAllThresholdsForCategory,
} from "./achievement-thresholds";

export type { AchievementTier } from "./achievement-thresholds";

export type AchievementCategory =
  | "speed"
  | "words"
  | "accuracy"
  | "time"
  | "streak"
  | "tests"
  | "explorer"
  | "special"
  | "consistency"
  | "improvement"
  | "challenge"
  | "endurance"
  | "timebased"
  | "milestone"
  | "quirky"
  | "collection";

// Progressive groups - only show the highest achievement in each group
// These match the keys in PROGRESSIVE_THRESHOLDS
export type ProgressiveGroup =
  | "speed"
  | "words"
  | "time"
  | "streak"
  | "tests"
  | "accuracy-95"
  | "accuracy-streak"
  | "consistency-90plus"
  | "consistency-variance"
  | "improvement-pb"
  | "endurance-daily"
  | "collection";

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
  consistency: {
    name: "Consistency",
    icon: "📊",
    description: "Performance stability achievements",
  },
  improvement: {
    name: "Improvement",
    icon: "📈",
    description: "Personal growth and records",
  },
  challenge: {
    name: "Challenge Mode",
    icon: "💪",
    description: "Difficult setting combinations",
  },
  endurance: {
    name: "Endurance",
    icon: "🏋️",
    description: "Long sessions and marathons",
  },
  timebased: {
    name: "Time-Based",
    icon: "🕐",
    description: "Specific times and dates",
  },
  milestone: {
    name: "Milestones",
    icon: "🎖️",
    description: "Multi-requirement achievements",
  },
  quirky: {
    name: "Fun & Quirky",
    icon: "🎲",
    description: "Humor and specific numbers",
  },
  collection: {
    name: "Collection",
    icon: "🗃️",
    description: "Meta achievements",
  },
};

// =============================================================================
// GENERIC ACHIEVEMENT GENERATOR
// =============================================================================

interface ProgressiveAchievementMeta {
  category: AchievementCategory;
  progressiveGroup: ProgressiveGroup;
  icon: string;
  descriptionFn: (value: number) => string;
  titleFn?: (value: number, tier: AchievementTier, level: number) => string;
}

/**
 * Generate achievements from threshold config - data-driven approach
 * Achievement IDs use tier-based format: {category}-{tier}-{level}
 */
function generateFromThresholds(
  thresholdCategory: ProgressiveCategory,
  meta: ProgressiveAchievementMeta
): Achievement[] {
  const allThresholds = getAllThresholdsForCategory(thresholdCategory);

  return allThresholds.map(({ tier, level, value, id }) => ({
    id,
    category: meta.category,
    title: meta.titleFn
      ? meta.titleFn(value, tier, level)
      : generateDefaultTitle(value, tier, level, meta.category),
    description: meta.descriptionFn(value),
    icon: meta.icon,
    tier,
    target: value,
    progressiveGroup: meta.progressiveGroup,
  }));
}

/**
 * Generate a default title based on value and tier
 */
function generateDefaultTitle(
  _value: number,
  tier: AchievementTier,
  level: number,
  _category: AchievementCategory
): string {
  const tierNames: Record<AchievementTier, string> = {
    copper: "Copper",
    silver: "Silver",
    gold: "Gold",
    diamond: "Diamond",
    emerald: "Emerald",
  };

  // Use Roman numerals for levels
  const romanNumerals = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];
  const levelStr = level <= 10 ? romanNumerals[level - 1] : level.toString();

  return `${tierNames[tier]} ${levelStr}`;
}

// Generate Speed Demons achievements (WPM milestones)
function generateSpeedAchievements(): Achievement[] {
  return generateFromThresholds("speed", {
    category: "speed",
    progressiveGroup: "speed",
    icon: "⚡",
    descriptionFn: (wpm) => `Reach ${wpm} WPM in a single test`,
    titleFn: (wpm, tier, level) => {
      // Special names for milestone WPM values
      const specialNames: Record<number, string> = {
        10: "First Double Digits",
        20: "Finding Rhythm",
        30: "Steady Pace",
        50: "Half Century",
        60: "Minute Master",
        80: "Speed Typist",
        100: "Century Club",
      };
      if (specialNames[wpm]) return specialNames[wpm];
      return generateDefaultTitle(wpm, tier, level, "speed");
    },
  });
}

// Generate Word Warrior achievements (cumulative correct words)
function generateWordAchievements(): Achievement[] {
  return generateFromThresholds("words", {
    category: "words",
    progressiveGroup: "words",
    icon: "📝",
    descriptionFn: (words) => `Type ${words.toLocaleString()} correct words total`,
    titleFn: (words, tier, level) => {
      // Special names for milestone word counts
      const specialNames: Record<number, string> = {
        100: "First Hundred",
        500: "Half Thousand",
        1000: "Thousand Strong",
        5000: "Five Thousand",
        10000: "Ten Thousand",
        25000: "Twenty-Five K",
        50000: "Fifty Thousand",
        100000: "Word Legend",
      };
      if (specialNames[words]) return specialNames[words];
      if (words >= 1000) return `${(words / 1000).toLocaleString()}K Words`;
      return generateDefaultTitle(words, tier, level, "words");
    },
  });
}

// Generate Accuracy Ace achievements
function generateAccuracyAchievements(): Achievement[] {
  // Standalone achievement for first perfect accuracy
  const standalone: Achievement = {
    id: "accuracy-perfect-1",
    category: "accuracy",
    title: "Perfectionist",
    description: "Achieve 100% accuracy on any test",
    icon: "🎯",
    tier: "copper",
    target: 1,
    // Not progressive - standalone achievement
  };

  // Progressive: tests with 95%+ accuracy
  const accuracy95 = generateFromThresholds("accuracy-95", {
    category: "accuracy",
    progressiveGroup: "accuracy-95",
    icon: "🎯",
    descriptionFn: (count) => `Complete ${count} tests with 95%+ accuracy`,
    titleFn: (count, tier, level) => {
      const specialNames: Record<number, string> = {
        5: "Sharp Shooter",
        25: "Precision Pro",
        100: "Accuracy Master",
        500: "Accuracy Legend",
      };
      if (specialNames[count]) return specialNames[count];
      return generateDefaultTitle(count, tier, level, "accuracy");
    },
  });

  // Progressive: consecutive 100% accuracy streak
  const accuracyStreak = generateFromThresholds("accuracy-streak", {
    category: "accuracy",
    progressiveGroup: "accuracy-streak",
    icon: "🎯",
    descriptionFn: (count) => `Get 100% accuracy on ${count} tests in a row`,
    titleFn: (count, _tier, _level) => {
      if (count >= 50) return "Untouchable";
      if (count >= 25) return "Flawless Master";
      return `Flawless Streak x${count}`;
    },
  });

  return [standalone, ...accuracy95, ...accuracyStreak];
}

// Generate Time Traveler achievements (cumulative typing time)
function generateTimeAchievements(): Achievement[] {
  return generateFromThresholds("time", {
    category: "time",
    progressiveGroup: "time",
    icon: "⏱️",
    descriptionFn: (minutes) => {
      if (minutes >= 60) {
        const hours = minutes / 60;
        return `Spend ${hours} hour${hours !== 1 ? "s" : ""} typing total`;
      }
      return `Spend ${minutes} minute${minutes !== 1 ? "s" : ""} typing total`;
    },
    titleFn: (minutes, _tier, _level) => {
      // Special names for milestone times
      const specialNames: Record<number, string> = {
        10: "Ten Minutes",
        30: "Half Hour",
        60: "One Hour",
        300: "Five Hours",
        600: "Ten Hours",
        1440: "Full Day",
        3000: "Fifty Hours",
        6000: "Hundred Hours",
        9000: "Time Lord",
      };
      if (specialNames[minutes]) return specialNames[minutes];
      if (minutes >= 60) return `${minutes / 60} Hours`;
      return `${minutes} Minutes`;
    },
  });
}

// Generate Streak Star achievements
function generateStreakAchievements(): Achievement[] {
  return generateFromThresholds("streak", {
    category: "streak",
    progressiveGroup: "streak",
    icon: "🔥",
    descriptionFn: (days) => `Maintain a ${days}-day typing streak`,
    titleFn: (days, _tier, _level) => {
      // Special names for milestone streaks
      const specialNames: Record<number, string> = {
        3: "Three Day Streak",
        7: "Week Warrior",
        14: "Two Week Streak",
        30: "Monthly Master",
        60: "Two Month Streak",
        100: "Century Streak",
        365: "Year of Dedication",
        730: "Two Year Legend",
      };
      if (specialNames[days]) return specialNames[days];
      return `${days} Day Streak`;
    },
  });
}

// Generate Test Champion achievements
function generateTestAchievements(): Achievement[] {
  return generateFromThresholds("tests", {
    category: "tests",
    progressiveGroup: "tests",
    icon: "🏆",
    descriptionFn: (count) =>
      `Complete ${count.toLocaleString()} typing test${count > 1 ? "s" : ""}`,
    titleFn: (count, _tier, _level) => {
      // Special names for milestone test counts
      const specialNames: Record<number, string> = {
        1: "First Test",
        5: "Getting Warmed Up",
        10: "Double Digits",
        25: "Quarter Century",
        50: "Halfway to Hundred",
        100: "Century of Tests",
        250: "Test Enthusiast",
        500: "Test Veteran",
        1000: "Test Legend",
        5000: "Test Immortal",
      };
      if (specialNames[count]) return specialNames[count];
      return `${count.toLocaleString()} Tests`;
    },
  });
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
      tier: "copper",
    },
    {
      id: "explorer-words-mode",
      category: "explorer",
      title: "Word Counter",
      description: "Complete a words mode test",
      icon: "🧭",
      tier: "copper",
    },
    {
      id: "explorer-quote-mode",
      category: "explorer",
      title: "Quotable",
      description: "Complete a quote mode test",
      icon: "🧭",
      tier: "copper",
    },
    {
      id: "explorer-preset-mode",
      category: "explorer",
      title: "Scholar",
      description: "Complete a preset mode test",
      icon: "🧭",
      tier: "copper",
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
      tier: "copper",
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
      tier: "diamond",
    },
  ];
}

// Generate Consistency achievements
function generateConsistencyAchievements(): Achievement[] {
  // Standalone achievement for same WPM
  const standalone: Achievement = {
    id: "consistency-same-wpm-3",
    category: "consistency",
    title: "Deja Vu",
    description: "Get the same WPM (rounded) 3 times",
    icon: "📊",
    tier: "copper",
  };

  // Progressive: tests with low variance
  const variance = generateFromThresholds("consistency-variance", {
    category: "consistency",
    progressiveGroup: "consistency-variance",
    icon: "📊",
    descriptionFn: (count) => `Complete ${count} tests with less than 5 WPM variance`,
    titleFn: (count, tier, level) => {
      const specialNames: Record<number, string> = {
        5: "Rock Solid",
        10: "Steady Hands",
        50: "Laser Focused",
        100: "Machine Precision",
      };
      if (specialNames[count]) return specialNames[count];
      return generateDefaultTitle(count, tier, level, "consistency");
    },
  });

  // Progressive: consecutive 90%+ accuracy
  const accuracy90 = generateFromThresholds("consistency-90plus", {
    category: "consistency",
    progressiveGroup: "consistency-90plus",
    icon: "📊",
    descriptionFn: (count) => `${count} consecutive tests above 90% accuracy`,
    titleFn: (count, tier, level) => {
      const specialNames: Record<number, string> = {
        5: "Reliable Performer",
        10: "Dependable",
        25: "Unshakeable",
        100: "Consistency King",
      };
      if (specialNames[count]) return specialNames[count];
      return generateDefaultTitle(count, tier, level, "consistency");
    },
  });

  return [standalone, ...variance, ...accuracy90];
}

// Generate Improvement achievements
function generateImprovementAchievements(): Achievement[] {
  // Standalone achievements (not progressive)
  const standalone: Achievement[] = [
    {
      id: "improvement-pb-by-10",
      category: "improvement",
      title: "Big Leap",
      description: "Beat your PB by 10+ WPM in a single test",
      icon: "📈",
      tier: "silver",
    },
    {
      id: "improvement-pb-by-20",
      category: "improvement",
      title: "Massive Jump",
      description: "Beat your PB by 20+ WPM in a single test",
      icon: "📈",
      tier: "gold",
    },
    {
      id: "improvement-double-wpm",
      category: "improvement",
      title: "Doubled Up",
      description: "Double your first test's WPM",
      icon: "📈",
      tier: "gold",
    },
    {
      id: "improvement-avg-increase",
      category: "improvement",
      title: "Rising Average",
      description: "Improve your average WPM by 20+ since starting",
      icon: "📈",
      tier: "emerald",
    },
  ];

  // Progressive: personal bests set
  const pbCount = generateFromThresholds("improvement-pb", {
    category: "improvement",
    progressiveGroup: "improvement-pb",
    icon: "📈",
    descriptionFn: (count) =>
      count === 1 ? "Beat your previous best WPM" : `Set ${count} personal bests`,
    titleFn: (count, tier, level) => {
      const specialNames: Record<number, string> = {
        1: "Personal Best",
        5: "Record Breaker",
        10: "Serial Improver",
        50: "PB Hunter",
        100: "Improvement Legend",
      };
      if (specialNames[count]) return specialNames[count];
      return generateDefaultTitle(count, tier, level, "improvement");
    },
  });

  return [...standalone, ...pbCount];
}

// Generate Challenge Mode achievements
function generateChallengeAchievements(): Achievement[] {
  return [
    {
      id: "challenge-hard-punctuation",
      category: "challenge",
      title: "Punctuation Pro",
      description: "Complete hard difficulty with punctuation enabled",
      icon: "💪",
      tier: "silver",
    },
    {
      id: "challenge-hard-numbers",
      category: "challenge",
      title: "Number Cruncher Pro",
      description: "Complete hard difficulty with numbers enabled",
      icon: "💪",
      tier: "silver",
    },
    {
      id: "challenge-hard-both",
      category: "challenge",
      title: "Full Challenge",
      description: "Complete hard difficulty with punctuation AND numbers",
      icon: "💪",
      tier: "gold",
    },
    {
      id: "challenge-hard-80wpm",
      category: "challenge",
      title: "Hard Mode Hero",
      description: "Achieve 80+ WPM on hard difficulty",
      icon: "💪",
      tier: "diamond",
    },
    {
      id: "challenge-hard-both-80wpm",
      category: "challenge",
      title: "Ultimate Challenge",
      description: "80+ WPM on hard with punctuation and numbers",
      icon: "💪",
      tier: "emerald",
    },
    {
      id: "challenge-hard-100-accuracy",
      category: "challenge",
      title: "Perfect Challenge",
      description: "100% accuracy on hard difficulty",
      icon: "💪",
      tier: "emerald",
    },
  ];
}

// Generate Endurance achievements
function generateEnduranceAchievements(): Achievement[] {
  // Standalone achievements (not progressive)
  const standalone: Achievement[] = [
    {
      id: "endurance-180s-test",
      category: "endurance",
      title: "Ultra Marathon",
      description: "Complete a 180+ second test",
      icon: "🏋️",
      tier: "silver",
    },
    {
      id: "endurance-300s-test",
      category: "endurance",
      title: "Epic Marathon",
      description: "Complete a 300+ second test (5 minutes)",
      icon: "🏋️",
      tier: "gold",
    },
    {
      id: "endurance-500-words-test",
      category: "endurance",
      title: "Word Mountain",
      description: "Complete a 500+ word test",
      icon: "🏋️",
      tier: "gold",
    },
  ];

  // Progressive: tests in one day
  const dailyTests = generateFromThresholds("endurance-daily", {
    category: "endurance",
    progressiveGroup: "endurance-daily",
    icon: "🏋️",
    descriptionFn: (count) => `Complete ${count} tests in one day`,
    titleFn: (count, tier, level) => {
      const specialNames: Record<number, string> = {
        5: "Warming Up",
        10: "Daily Grind",
        20: "Marathon Day",
        50: "Typing Machine",
        100: "Endurance Legend",
      };
      if (specialNames[count]) return specialNames[count];
      return generateDefaultTitle(count, tier, level, "endurance");
    },
  });

  return [...standalone, ...dailyTests];
}

// Generate Time-Based achievements
function generateTimebasedAchievements(): Achievement[] {
  return [
    {
      id: "timebased-lunch",
      category: "timebased",
      title: "Lunch Break Typist",
      description: "Complete a test between 12pm-2pm",
      icon: "🕐",
      tier: "copper",
    },
    {
      id: "timebased-midnight",
      category: "timebased",
      title: "Midnight Typist",
      description: "Complete a test at exactly midnight (12am hour)",
      icon: "🕐",
      tier: "silver",
    },
    {
      id: "timebased-new-year",
      category: "timebased",
      title: "New Year Typist",
      description: "Complete a test on January 1st",
      icon: "🕐",
      tier: "gold",
    },
    {
      id: "timebased-friday",
      category: "timebased",
      title: "TGIF",
      description: "Complete a test on Friday",
      icon: "🕐",
      tier: "copper",
    },
    {
      id: "timebased-monday",
      category: "timebased",
      title: "Case of the Mondays",
      description: "Complete a test on Monday",
      icon: "🕐",
      tier: "copper",
    },
    {
      id: "timebased-holiday",
      category: "timebased",
      title: "Holiday Spirit",
      description: "Complete a test on a major holiday",
      icon: "🕐",
      tier: "silver",
    },
    {
      id: "timebased-all-weekdays",
      category: "timebased",
      title: "Weekday Warrior",
      description: "Complete tests on all 5 weekdays",
      icon: "🕐",
      tier: "silver",
    },
    {
      id: "timebased-all-weekend",
      category: "timebased",
      title: "Weekend Complete",
      description: "Complete tests on both Saturday and Sunday",
      icon: "🕐",
      tier: "copper",
    },
  ];
}

// Generate Milestone Combinations achievements
function generateMilestoneAchievements(): Achievement[] {
  return [
    {
      id: "milestone-100wpm-100acc",
      category: "milestone",
      title: "Perfect Century",
      description: "100+ WPM with 100% accuracy in a single test",
      icon: "🎖️",
      tier: "emerald",
    },
    {
      id: "milestone-80wpm-98acc",
      category: "milestone",
      title: "Elite Typist",
      description: "80+ WPM with 98%+ accuracy in a single test",
      icon: "🎖️",
      tier: "diamond",
    },
    {
      id: "milestone-50wpm-100acc-hard",
      category: "milestone",
      title: "Hard Perfection",
      description: "50+ WPM with 100% accuracy on hard difficulty",
      icon: "🎖️",
      tier: "diamond",
    },
    {
      id: "milestone-triple-digits",
      category: "milestone",
      title: "Triple Threat",
      description: "100+ WPM on a 100+ word test lasting 100+ seconds",
      icon: "🎖️",
      tier: "diamond",
    },
    {
      id: "milestone-speed-endurance",
      category: "milestone",
      title: "Speed Marathoner",
      description: "80+ WPM on a 120+ second test",
      icon: "🎖️",
      tier: "gold",
    },
    {
      id: "milestone-1000-words-95acc",
      category: "milestone",
      title: "Accurate Thousand",
      description: "1000 total words with 95%+ average accuracy",
      icon: "🎖️",
      tier: "silver",
    },
    {
      id: "milestone-all-modes-80wpm",
      category: "milestone",
      title: "Mode Master",
      description: "80+ WPM in time, words, and quote modes",
      icon: "🎖️",
      tier: "diamond",
    },
    {
      id: "milestone-week-streak-100wpm",
      category: "milestone",
      title: "Consistent Speed",
      description: "7-day streak with 100+ WPM each day",
      icon: "🎖️",
      tier: "emerald",
    },
  ];
}

// Generate Fun/Quirky achievements
function generateQuirkyAchievements(): Achievement[] {
  return [
    {
      id: "quirky-67",
      category: "quirky",
      title: "The Meme",
      description: "Get exactly 67 WPM",
      icon: "🎲",
      tier: "copper",
    },
    {
      id: "quirky-lucky-7",
      category: "quirky",
      title: "Lucky Sevens",
      description: "Get exactly 77 WPM",
      icon: "🎲",
      tier: "copper",
    },
    {
      id: "quirky-100-exact",
      category: "quirky",
      title: "Perfectly Round",
      description: "Get exactly 100 WPM",
      icon: "🎲",
      tier: "silver",
    },
    {
      id: "quirky-palindrome",
      category: "quirky",
      title: "Palindrome",
      description: "Get a palindrome WPM (11, 22, 33, etc.)",
      icon: "🎲",
      tier: "copper",
    },
    {
      id: "quirky-42",
      category: "quirky",
      title: "Answer to Everything",
      description: "Get exactly 42 WPM",
      icon: "🎲",
      tier: "copper",
    },
    {
      id: "quirky-123",
      category: "quirky",
      title: "Easy as 123",
      description: "Get exactly 123 WPM",
      icon: "🎲",
      tier: "gold",
    },
    {
      id: "quirky-pi",
      category: "quirky",
      title: "Pi Day",
      description: "Get 31 WPM on March 14th",
      icon: "🎲",
      tier: "gold",
    },
  ];
}

// Generate Collection achievements
function generateCollectionAchievements(): Achievement[] {
  // Standalone achievement
  const standalone: Achievement = {
    id: "collection-category-complete",
    category: "collection",
    title: "Category Master",
    description: "Complete all achievements in any category",
    icon: "🗃️",
    tier: "emerald",
  };

  // Progressive: total achievements earned
  const collection = generateFromThresholds("collection", {
    category: "collection",
    progressiveGroup: "collection",
    icon: "🗃️",
    descriptionFn: (count) => `Earn ${count} achievements`,
    titleFn: (count, tier, level) => {
      const specialNames: Record<number, string> = {
        10: "Collector",
        25: "Enthusiast",
        50: "Dedicated",
        100: "Achievement Hunter",
        150: "Completionist",
        500: "Trophy Case",
        1000: "Achievement Legend",
      };
      if (specialNames[count]) return specialNames[count];
      return generateDefaultTitle(count, tier, level, "collection");
    },
  });

  return [standalone, ...collection];
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
  ...generateConsistencyAchievements(),
  ...generateImprovementAchievements(),
  ...generateChallengeAchievements(),
  ...generateEnduranceAchievements(),
  ...generateTimebasedAchievements(),
  ...generateMilestoneAchievements(),
  ...generateQuirkyAchievements(),
  ...generateCollectionAchievements(),
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
  copper: { bg: "#B87333", border: "#8B4513", text: "#FFFFFF" },
  silver: { bg: "#C0C0C0", border: "#808080", text: "#000000" },
  gold: { bg: "#FFD700", border: "#DAA520", text: "#000000" },
  diamond: { bg: "#4FC3F7", border: "#0288D1", text: "#000000" },
  emerald: { bg: "#50C878", border: "#2E8B57", text: "#FFFFFF" },
};

// =============================================================================
// LEGACY ID MAP - Maps old achievement IDs to new tier-based IDs
// This ensures backward compatibility with existing DB entries
// =============================================================================

/**
 * Generate legacy ID map automatically from old milestone values
 * Old format: wpm-60, streak-30, tests-100, etc.
 * New format: speed-silver-10, streak-silver-10, tests-gold-4, etc.
 */
function generateLegacyIdMap(): Record<string, string> {
  const map: Record<string, string> = {};

  // Old WPM milestones -> new speed IDs
  const oldWpmMilestones = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120, 130, 140, 150, 160, 170, 180, 190, 200];
  for (const wpm of oldWpmMilestones) {
    const thresholds = getAllThresholdsForCategory("speed");
    const matching = thresholds.find(t => t.value === wpm);
    if (matching) {
      map[`wpm-${wpm}`] = matching.id;
    }
  }

  // Old word milestones -> new words IDs
  const oldWordMilestones = [100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, ...Array.from({ length: 49 }, (_, i) => (i + 2) * 1000), 100000];
  for (const words of oldWordMilestones) {
    const thresholds = getAllThresholdsForCategory("words");
    const matching = thresholds.find(t => t.value === words);
    if (matching) {
      map[`words-${words}`] = matching.id;
    }
  }

  // Old streak milestones -> new streak IDs
  const oldStreakMilestones = [3, 7, 14, 30, 60, 100, 365];
  for (const days of oldStreakMilestones) {
    const thresholds = getAllThresholdsForCategory("streak");
    const matching = thresholds.find(t => t.value === days);
    if (matching) {
      map[`streak-${days}`] = matching.id;
    }
  }

  // Old test milestones -> new tests IDs
  const oldTestMilestones = [1, 5, 10, 25, 50, 100, 250, 500, 1000];
  for (const count of oldTestMilestones) {
    const thresholds = getAllThresholdsForCategory("tests");
    const matching = thresholds.find(t => t.value === count);
    if (matching) {
      map[`tests-${count}`] = matching.id;
    }
  }

  // Old time milestones (stored as IDs with suffixes)
  const oldTimeMilestones: Record<string, number> = {
    "time-10m": 10,
    "time-30m": 30,
    "time-1h": 60,
    "time-5h": 300,
    "time-10h": 600,
    "time-24h": 1440,
    "time-50h": 3000,
    "time-100h": 6000,
  };
  for (const [oldId, minutes] of Object.entries(oldTimeMilestones)) {
    const thresholds = getAllThresholdsForCategory("time");
    const matching = thresholds.find(t => t.value === minutes);
    if (matching) {
      map[oldId] = matching.id;
    }
  }

  // Old accuracy milestones
  map["accuracy-95-5"] = "accuracy-95-copper-5";
  map["accuracy-95-25"] = "accuracy-95-silver-7";
  map["accuracy-95-100"] = "accuracy-95-gold-10";
  map["accuracy-streak-2"] = "accuracy-streak-copper-2";
  map["accuracy-streak-5"] = "accuracy-streak-copper-5";
  map["accuracy-streak-10"] = "accuracy-streak-copper-10";
  map["accuracy-streak-25"] = "accuracy-streak-gold-5";

  // Old consistency milestones
  map["consistency-low-variance-5"] = "consistency-variance-copper-5";
  map["consistency-low-variance-10"] = "consistency-variance-copper-10";
  map["consistency-90plus-5"] = "consistency-90plus-copper-5";
  map["consistency-90plus-10"] = "consistency-90plus-copper-10";
  map["consistency-90plus-25"] = "consistency-90plus-gold-5";

  // Old improvement milestones
  map["improvement-pb-first"] = "improvement-pb-copper-1";
  map["improvement-pb-5"] = "improvement-pb-copper-5";
  map["improvement-pb-10"] = "improvement-pb-copper-10";

  // Old endurance milestones
  map["endurance-5-tests-day"] = "endurance-daily-copper-5";
  map["endurance-10-tests-day"] = "endurance-daily-copper-10";
  map["endurance-20-tests-day"] = "endurance-daily-silver-5";

  // Old collection milestones
  map["collection-10"] = "collection-copper-10";
  map["collection-25"] = "collection-silver-3";
  map["collection-50"] = "collection-silver-8";
  map["collection-100"] = "collection-gold-4";
  map["collection-150"] = "collection-gold-7";

  return map;
}

export const LEGACY_ID_MAP = generateLegacyIdMap();

/**
 * Translate a legacy achievement ID to the new tier-based ID
 * Returns the original ID if no mapping exists (for non-progressive achievements)
 */
export function translateLegacyId(id: string): string {
  return LEGACY_ID_MAP[id] || id;
}

/**
 * Translate all legacy IDs in a record of achievements
 * Used when loading user achievements from the database
 */
export function translateLegacyAchievements(
  achievements: Record<string, number>
): Record<string, number> {
  const translated: Record<string, number> = {};
  for (const [id, timestamp] of Object.entries(achievements)) {
    translated[translateLegacyId(id)] = timestamp;
  }
  return translated;
}

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
    "consistency",
    "improvement",
    "challenge",
    "endurance",
    "timebased",
    "milestone",
    "quirky",
    "collection",
  ];

  return orderedCategories.filter((c) => categories.has(c));
}

/**
 * Get all earned achievements in the same progressive group as the given achievement.
 * For non-progressive achievements, returns just that achievement.
 * Results are sorted by target value ascending (lowest to highest).
 *
 * @param achievementId - The achievement ID to find group members for
 * @param earnedAchievementIds - Array of all achievement IDs the user has earned
 * @returns Array of achievement IDs in the same progressive group, sorted by target
 */
export function getEarnedInProgressiveGroup(
  achievementId: string,
  earnedAchievementIds: string[]
): string[] {
  const achievement = ACHIEVEMENTS_BY_ID.get(achievementId);
  if (!achievement?.progressiveGroup) {
    return [achievementId]; // Non-progressive, return just this one
  }

  // Filter all earned achievements that share the same progressive group
  return earnedAchievementIds
    .filter((id) => {
      const a = ACHIEVEMENTS_BY_ID.get(id);
      return a?.progressiveGroup === achievement.progressiveGroup;
    })
    .sort((a, b) => {
      // Sort by target value ascending
      const aTarget = ACHIEVEMENTS_BY_ID.get(a)?.target ?? 0;
      const bTarget = ACHIEVEMENTS_BY_ID.get(b)?.target ?? 0;
      return aTarget - bTarget;
    });
}
