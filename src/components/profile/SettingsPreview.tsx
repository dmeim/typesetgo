import { AnimatePresence, motion } from "framer-motion";
import ThemeSitePreview from "@/components/typing/ThemeSitePreview";
import type { ThemeColors } from "@/types/theme";
import { PROFILE_SPRING, type SectionId } from "./profile-sections";
import type { ProfileSettings } from "./profile-settings";
import { LivePreviewButton, TextPreview } from "./TextPreview";
import { useThemeColors, type ThemeSelection } from "./theme-catalog";

/**
 * One preview card that stays put while tabs change: the theme miniature and the practice text together,
 * with the part that matters for the open tab on top. Under xl only that part shows, above the content.
 */
export function SettingsPreview({ settings, theme, themeName, fallbackColors, active }: {
  settings: ProfileSettings;
  theme: ThemeSelection;
  themeName: string;
  /** The site's current palette, shown until the picked theme's palette has loaded. */
  fallbackColors: ThemeColors;
  active: SectionId;
}) {
  const colors = useThemeColors(theme) ?? fallbackColors;
  const themeFirst = active === "theme";
  const site = (
    <motion.div layout key="site" transition={PROFILE_SPRING} className={themeFirst ? "" : "hidden xl:block"}>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.div key={`${theme.themeId}-${theme.variantId}-${theme.mode}`} initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
          <ThemeSitePreview colors={colors} label={themeName} />
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
  const text = (
    <motion.div layout key="text" transition={PROFILE_SPRING} className={themeFirst ? "hidden xl:block" : ""}>
      <TextPreview colors={colors} settings={settings} label="Practice text" livePreview={false} />
    </motion.div>
  );
  return (
    <aside aria-label="Previews" className="order-first flex w-full flex-col xl:sticky xl:top-6 xl:order-none xl:w-[24rem] xl:shrink-0 2xl:w-[28rem]">
      <section aria-labelledby="settings-preview-title" className="flex flex-col gap-3 rounded-3xl border border-border bg-card p-3">
        <header className="flex min-w-0 items-start justify-between gap-2 px-1">
          <h2 id="settings-preview-title" className="min-w-0 text-sm font-semibold [overflow-wrap:anywhere]">
            Preview
            <span className="block text-xs font-normal text-muted-foreground">{themeName}{theme.mode === "light" ? " · light" : ""}</span>
          </h2>
          <LivePreviewButton colors={colors} settings={settings} themeName={themeName} />
        </header>
        {themeFirst ? <>{site}{text}</> : <>{text}{site}</>}
      </section>
    </aside>
  );
}
