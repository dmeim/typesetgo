import { achievementIcons, type AchievementIconName } from "@/lib/achievement-icons";
import { cn } from "@/lib/utils";

export default function AchievementIcon({ icon, className }: { icon: AchievementIconName; className?: string }) {
  const Icon = achievementIcons[icon];
  return <Icon aria-hidden="true" className={cn("shrink-0", className)} />;
}
