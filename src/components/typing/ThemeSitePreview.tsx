import { useMemo, type CSSProperties } from "react";
import {
  ArrowClockwiseIcon,
  GearIcon,
  KeyboardIcon,
  PaletteIcon,
  TimerIcon,
  TrophyIcon,
  UsersIcon,
} from "@phosphor-icons/react";
import { deriveThemeUI } from "@/lib/colors";
import type { ThemeColors } from "@/types/theme";

/** A decorative homepage scene. It shares UI color derivation, never app state. */
export default function ThemeSitePreview({ colors, label }: { colors: ThemeColors; label: string }) {
  const style = useMemo(() => {
    const ui = deriveThemeUI(colors);
    return {
      ...Object.fromEntries(Object.entries(ui).map(([key, value]) => [
        `--${key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}`, value,
      ])),
      containerType: "inline-size",
    } as CSSProperties;
  }, [colors]);

  return (
    <div data-theme-site-preview role="img" aria-label={`${label}: miniature typing homepage`} style={style} className="w-full overflow-hidden rounded-md bg-background text-foreground">
      <div aria-hidden="true" className="flex aspect-[4/3] flex-col gap-[2cqw] p-[3cqw] [font-size:2.35cqw] leading-normal">
        <div className="flex items-center justify-between border-b border-border pb-[1.5cqw]">
          <span className="flex items-center gap-[1cqw] font-semibold [font-size:3.7cqw]">
            <KeyboardIcon className="size-[5cqw] text-primary" />TypeSetGo
          </span>
          <span className="flex items-center gap-[3cqw] text-muted-foreground">
            <span className="flex items-center gap-[1cqw]"><TrophyIcon className="size-[3cqw]" />Ranks</span>
            <span className="flex items-center gap-[1cqw]"><UsersIcon className="size-[3cqw]" />Connect</span>
            <GearIcon className="size-[3.5cqw]" />
          </span>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-[1.5cqw] rounded-md border border-border bg-card p-[1.5cqw] text-card-foreground">
          <span className="flex items-center gap-[1cqw] rounded bg-secondary px-[2cqw] py-[1cqw] text-secondary-foreground"><TimerIcon className="size-[3cqw]" />Time</span>
          <span>Words</span><span>Quotes</span><span className="mx-[1cqw] h-[3cqw] border-l border-border" />
          <span className="text-primary">30s</span><span>60s</span><span className="ml-[1cqw] rounded bg-muted px-[2cqw] py-[1cqw] text-muted-foreground">Beginner</span>
        </div>
        <div className="flex flex-1 flex-col justify-center gap-[2cqw]">
          <span className="font-mono [font-size:3cqw] text-primary">30</span>
          <p className="font-mono [font-size:4.8cqw] leading-relaxed">
            <span style={{ color: colors.typing.correct }}>the quick brown </span>
            <span style={{ color: colors.typing.incorrect }}>fox </span>
            <span style={{ color: colors.typing.default, borderLeft: `2px solid ${colors.typing.cursor}` }}>jumps over the lazy dog</span>
          </p>
          <ArrowClockwiseIcon className="mx-auto size-[3.6cqw] text-muted-foreground" />
        </div>
        <div className="mx-auto flex w-4/5 flex-col gap-[0.7cqw] font-mono">
          {["qwertyuiop", "asdfghjkl", "zxcvbnm"].map((row) => (
            <div key={row} className="flex justify-center gap-[0.7cqw]">
              {[...row].map((key) => (
                <span key={key} className={`flex h-[3.5cqw] w-[5.5cqw] items-center justify-center rounded-sm border border-border ${key === "j" ? "bg-primary text-primary-foreground" : "bg-card text-card-foreground"}`}>{key}</span>
              ))}
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between text-muted-foreground">
          <span>ctrl / ⌘ + enter to repeat</span><span className="flex items-center gap-[1cqw]"><PaletteIcon className="size-[3cqw]" />Make it yours</span>
        </div>
      </div>
    </div>
  );
}
