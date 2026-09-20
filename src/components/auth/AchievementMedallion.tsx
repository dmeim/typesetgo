import { CheckIcon } from "@phosphor-icons/react";
import AchievementIcon from "@/components/auth/AchievementIcon";
import type { AchievementIconName } from "@/lib/achievement-icons";
import type { AchievementTier } from "@/lib/achievement-definitions";

export function AchievementMedallion({ icon, earned, size = "medium" }: {
  icon: AchievementIconName;
  earned: boolean;
  size?: "small" | "medium" | "large";
}) {
  const sizes = {
    small: ["size-12", "size-6"],
    medium: ["size-16", "size-8"],
    large: ["size-24", "size-12"],
  };
  return (
    <span
      aria-hidden="true"
      data-achievement-medallion=""
      className={`relative inline-flex shrink-0 items-center justify-center rounded-full border-[3px] border-[var(--achievement-border)] bg-[var(--achievement-medallion)] text-[var(--achievement-icon)] ${sizes[size][0]} ${earned ? "shadow-[inset_0_0_0_3px_#ffffff26,0_3px_0_var(--achievement-border)]" : ""}`}
    >
      <AchievementIcon icon={icon} className={sizes[size][1]} />
      {earned && (
        <span className="absolute -right-1 -bottom-1 flex size-5 items-center justify-center rounded-full border-2 border-[var(--achievement-surface)] bg-[var(--achievement-badge)] text-[var(--achievement-badge-foreground)]">
          <CheckIcon className="size-3" />
        </span>
      )}
    </span>
  );
}

export function AchievementTierBadge({ tier }: { tier: AchievementTier }) {
  return <span className="inline-flex w-fit items-center rounded-full bg-[var(--achievement-badge)] px-2.5 py-1 text-xs font-semibold capitalize text-[var(--achievement-badge-foreground)]">{tier}</span>;
}
