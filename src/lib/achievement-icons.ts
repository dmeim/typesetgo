import {
  Archive, BicepsFlexed, ChartNoAxesColumn, Clock, Compass, Dices, Dumbbell,
  FileText, Flame, Footprints, Medal, Moon, Orbit, PartyPopper, Sparkles,
  Sunrise, Target, Timer, TrendingUp, Trophy, Zap,
} from "lucide-react";

export const achievementIcons = {
  archive: Archive,
  "biceps-flexed": BicepsFlexed,
  "chart-no-axes-column": ChartNoAxesColumn,
  clock: Clock,
  compass: Compass,
  dices: Dices,
  dumbbell: Dumbbell,
  "file-text": FileText,
  flame: Flame,
  footprints: Footprints,
  medal: Medal,
  moon: Moon,
  orbit: Orbit,
  "party-popper": PartyPopper,
  sparkles: Sparkles,
  sunrise: Sunrise,
  target: Target,
  timer: Timer,
  "trending-up": TrendingUp,
  trophy: Trophy,
  zap: Zap,
} as const;

export type AchievementIconName = keyof typeof achievementIcons;
