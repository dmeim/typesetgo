import { useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { LightningIcon, PaintBrushIcon, SpeakerHighIcon, XIcon } from "@phosphor-icons/react";
import { Segmented } from "@/components/profile/settings-controls";
import { SoundPanel, TextPanel, TypingPanel } from "@/components/profile/settings-panels";
import { PROFILE_SPRING } from "@/components/profile/profile-sections";
import { cn } from "@/lib/utils";
import { featuredThemes, type ConceptProps, type SurfaceTarget } from "./home-settings-mock";
import { AllSettingsLink, KeyboardGroup, PracticeSample, ThemeSummary, ThemeTiles } from "./QuickControls";
import { useSurface } from "./home-settings-utils";

type Tab = "typing" | "look" | "sound";
const TAB_FOR: Record<SurfaceTarget, Tab> = { settings: "typing", theme: "look", sound: "sound" };
const TABS = [
  { value: "typing" as const, label: <><LightningIcon className="size-4" aria-hidden="true" />Typing</> },
  { value: "look" as const, label: <><PaintBrushIcon className="size-4" aria-hidden="true" />Look</> },
  { value: "sound" as const, label: <><SpeakerHighIcon className="size-4" aria-hidden="true" />Sound</> },
];

/** 01 Side sheet: a panel slides in from the right with three tabs; Home moves over so the text stays in view. */
export function SideSheetConcept({ device, open, target, look, update, setTheme, themes, close }: ConceptProps) {
  const phone = device === "phone";
  const [tab, setTab] = useState<Tab>(TAB_FOR[target]);
  const [opened, setOpened] = useState(`${open}-${target}`);
  if (opened !== `${open}-${target}`) {
    setOpened(`${open}-${target}`);
    if (open) setTab(TAB_FOR[target]);
  }
  const [surfaceRef, onSurfaceKeyDown] = useSurface<HTMLElement>(open, () => close());
  const { settings, theme } = look;

  const panels: Record<Tab, ReactNode> = {
    look: (
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <h3 className="px-4 text-xs uppercase tracking-wider text-muted-foreground">Theme</h3>
          <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4">
            <ThemeSummary themes={featuredThemes(themes)} all={themes} theme={theme} setTheme={setTheme} />
            <ThemeTiles themes={featuredThemes(themes, 9)} theme={theme} setTheme={setTheme} className="grid-cols-[repeat(auto-fill,minmax(6rem,1fr))]" />
            <AllSettingsLink to="/profile/theme" className="self-start text-xs">Browse every theme</AllSettingsLink>
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <h3 className="px-4 text-xs uppercase tracking-wider text-muted-foreground">Text</h3>
          <TextPanel settings={settings} update={update} />
        </div>
      </div>
    ),
    typing: (
      <div className="flex flex-col gap-5">
        <TypingPanel settings={settings} update={update} />
        <KeyboardGroup settings={settings} update={update} />
      </div>
    ),
    sound: <SoundPanel settings={settings} update={update} />,
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.aside
          key="sheet"
          ref={surfaceRef}
          tabIndex={-1}
          role="dialog"
          aria-label="Quick settings"
          onKeyDown={onSurfaceKeyDown}
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={PROFILE_SPRING}
          className={cn(
            "absolute inset-y-0 right-0 z-30 flex flex-col bg-background outline-none",
            phone ? "w-full" : "w-[min(24rem,100%)] border-l border-border shadow-2xl",
          )}
        >
          <div className="flex items-center justify-between gap-3 px-4 pb-3 pt-4">
            <div className="min-w-0">
              <h2 className="text-lg font-bold">Quick settings</h2>
              {!phone && <p className="text-xs text-muted-foreground">Your text updates as you change things.</p>}
            </div>
            {phone ? (
              <button type="button" onClick={() => close()} className="rounded-full bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
                Done
              </button>
            ) : (
              <button type="button" aria-label="Close quick settings" onClick={() => close()} className="rounded-full p-2 text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring">
                <XIcon className="size-4" aria-hidden="true" />
              </button>
            )}
          </div>
          {phone && (
            <div className="mx-4 mb-3 rounded-2xl border border-border bg-card px-3 py-2">
              <span className="text-[0.65rem] uppercase tracking-wider text-muted-foreground">Your text</span>
              <PracticeSample settings={settings} scale={0.26} lines={Math.min(settings.linePreview, 2)} />
            </div>
          )}
          <div className="px-4 pb-3">
            <Segmented label="Settings group" value={tab} onChange={setTab} options={TABS} />
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div key={tab} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.18 }}>
                {panels[tab]}
              </motion.div>
            </AnimatePresence>
          </div>
          <div className="flex items-center justify-between gap-2 border-t border-border px-4 py-3 text-xs text-muted-foreground">
            <span>Saved as you go.</span>
            <AllSettingsLink className="text-xs">Everything on your profile</AllSettingsLink>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
