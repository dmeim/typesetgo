import type { ReactNode } from "react";
import type { SectionMeta } from "./profile-sections";

/** The iOS-style coloured square each tab uses as its icon. */
export function IconTile({ section, small = false }: { section: SectionMeta; small?: boolean }) {
  const { Icon } = section;
  return (
    <span className={`relative flex shrink-0 items-center justify-center rounded-lg ${section.tile} ${small ? "size-6" : "size-8"}`}>
      <Icon weight="fill" className={small ? "size-3.5" : "size-[18px]"} aria-hidden="true" />
    </span>
  );
}

/** The heading card at the top of a settings tab. */
export function SectionHero({ section, children }: { section: SectionMeta; children?: ReactNode }) {
  const { Icon } = section;
  return (
    <div className="flex flex-col gap-3 rounded-3xl border border-border bg-card p-6">
      <span className={`flex size-14 items-center justify-center rounded-2xl ${section.tile}`}><Icon weight="fill" className="size-8" aria-hidden="true" /></span>
      <h2 className="text-2xl font-bold">{section.title}</h2>
      <p className="text-sm text-muted-foreground">{section.description}</p>
      {children}
    </div>
  );
}
