import { AnimatePresence, motion } from "framer-motion";
import ThemeSitePreview from "@/components/typing/ThemeSitePreview";
import type { ThemeColors } from "@/types/theme";
import { PROFILE_SPRING, type SectionId } from "./profile-sections";
import type { ProfileSettings } from "./profile-settings";
import { TextPreview } from "./TextPreview";
import { useThemeColors, type ThemeSelection } from "./theme-catalog";

/**
 * Stays put while tabs change. The preview that matters for the open tab moves to the top;
 * under xl only that one shows, above the content.
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
    <motion.section layout key="site" transition={PROFILE_SPRING} aria-label="Theme preview" className={`flex flex-col gap-2 rounded-3xl border border-border bg-card p-3 ${themeFirst ? "" : "hidden xl:flex"}`}>
      <span className="px-1 text-xs text-muted-foreground">Theme preview · {themeName}{theme.mode === "light" ? " · light" : ""}</span>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.div key={`${theme.themeId}-${theme.variantId}-${theme.mode}`} initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
          <ThemeSitePreview colors={colors} label={themeName} />
        </motion.div>
      </AnimatePresence>
    </motion.section>
  );
  const text = (
    <motion.section layout key="text" transition={PROFILE_SPRING} aria-label="Text preview" className={`rounded-3xl border border-border bg-card p-3 ${themeFirst ? "hidden xl:block" : ""}`}>
      <TextPreview colors={colors} settings={settings} />
    </motion.section>
  );
  return (
    <aside aria-label="Previews" className="order-first flex w-full flex-col gap-4 xl:sticky xl:top-6 xl:order-none xl:w-[24rem] xl:shrink-0 2xl:w-[28rem]">
      {themeFirst ? <>{site}{text}</> : <>{text}{site}</>}
    </aside>
  );
}
