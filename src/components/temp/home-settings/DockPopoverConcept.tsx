import type { ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { GhostIcon, KeyboardIcon, MoonIcon, SpeakerHighIcon, SunIcon } from "@phosphor-icons/react";
import { SettingSlider } from "@/components/profile/settings-controls";
import { PROFILE_SPRING } from "@/components/profile/profile-sections";
import { findVariant } from "@/components/profile/theme-catalog";
import { KEYBOARD_STYLES } from "@/lib/keyboard-model";
import { TEXT_SIZE_MAX, TEXT_SIZE_MIN } from "@/lib/practice-limits";
import { featuredThemes, type ConceptProps, type SurfaceTarget } from "./home-settings-mock";
import { useAnchor, useSurface } from "./home-settings-utils";
import { AlignPicker, AllSettingsLink, SoundQuick, Stepper, ThemeDots, ThemeSummary, ToggleTile } from "./QuickControls";

const TITLES: Record<SurfaceTarget, string> = { settings: "Quick settings", theme: "Theme", sound: "Sound" };
const WIDTHS: Record<SurfaceTarget, number> = { settings: 320, theme: 300, sound: 300 };

/** 02 Dock popover: a small card opens under the button you pressed, with just the everyday switches. */
export function DockPopoverConcept(props: ConceptProps) {
  return props.device === "phone" ? <ControlCentre {...props} /> : <AnchoredPopover {...props} />;
}

function AnchoredPopover({ open, target, look, update, setTheme, themes, close, stageRef }: ConceptProps) {
  const anchor = useAnchor(stageRef, target, open);
  const [surfaceRef, onSurfaceKeyDown] = useSurface<HTMLDivElement>(open, () => close(), Boolean(anchor));
  const width = anchor ? Math.min(WIDTHS[target], anchor.stageWidth - 16) : WIDTHS[target];
  const left = anchor ? Math.max(8, Math.min(anchor.centre - width / 2, anchor.stageWidth - width - 8)) : 8;
  const arrow = anchor ? Math.max(16, Math.min(anchor.centre - left, width - 16)) : width / 2;
  const { settings, theme } = look;
  const keyboardName = KEYBOARD_STYLES.find((style) => style.value === settings.keyboardStyle)?.name ?? "";

  const bodies: Record<SurfaceTarget, ReactNode> = {
    settings: (
      <>
        <div className="grid grid-cols-3 gap-2">
          <ToggleTile label="Sound" detail={settings.soundEnabled ? settings.typingSound : "Off"} icon={SpeakerHighIcon} checked={settings.soundEnabled} onChange={(soundEnabled) => update({ soundEnabled })} />
          <ToggleTile label="Keys" detail={settings.showOnScreenKeyboard ? keyboardName : "Hidden"} icon={KeyboardIcon} checked={settings.showOnScreenKeyboard} onChange={(showOnScreenKeyboard) => update({ showOnScreenKeyboard })} />
          <ToggleTile label="Ghost" detail={settings.ghostWriterEnabled ? `${settings.ghostWriterSpeed} wpm` : "Off"} icon={GhostIcon} checked={settings.ghostWriterEnabled} onChange={(ghostWriterEnabled) => update({ ghostWriterEnabled })} />
        </div>
        <div className="flex flex-col divide-y divide-border rounded-2xl border border-border">
          <Row label="Text size"><Stepper compact label="Text size" value={settings.typingFontSize} min={TEXT_SIZE_MIN} max={TEXT_SIZE_MAX} step={0.25} format={(value) => `${value}rem`} onChange={(typingFontSize) => update({ typingFontSize })} /></Row>
          <Row label="Lines shown"><Stepper compact label="Lines shown" value={settings.linePreview} min={1} max={6} step={1} format={String} onChange={(linePreview) => update({ linePreview })} /></Row>
          <div className="px-3 py-2"><AlignPicker iconsOnly value={settings.textAlign} onChange={(textAlign) => update({ textAlign })} /></div>
        </div>
      </>
    ),
    theme: (
      <>
        <ThemeSummary themes={featuredThemes(themes)} all={themes} theme={theme} setTheme={setTheme} />
        <ThemeDots themes={featuredThemes(themes, 10)} theme={theme} setTheme={setTheme} />
      </>
    ),
    sound: <SoundQuick settings={settings} update={update} />,
  };

  return (
    <AnimatePresence>
      {open && anchor && (
        <motion.div
          key={target}
          ref={surfaceRef}
          tabIndex={-1}
          role="dialog"
          aria-label={TITLES[target]}
          onKeyDown={onSurfaceKeyDown}
          initial={{ opacity: 0, y: -8, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -6, scale: 0.97 }}
          transition={PROFILE_SPRING}
          className="absolute z-30 flex flex-col gap-3 rounded-2xl border border-border bg-card p-3 shadow-2xl outline-none"
          style={{ left, top: (anchor?.bottom ?? 56) + 10, width, transformOrigin: `${arrow}px 0` }}
        >
          <span aria-hidden="true" className="absolute -top-1.5 size-3 rotate-45 border-l border-t border-border bg-card" style={{ left: arrow - 6 }} />
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold">{TITLES[target]}</h2>
            <AllSettingsLink to={target === "theme" ? "/profile/theme" : target === "sound" ? "/profile/sound" : "/profile/text"} className="text-xs">
              {target === "theme" ? "All themes" : "All settings"}
            </AllSettingsLink>
          </div>
          {bodies[target]}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2 px-3 py-1.5">
      <span className="text-sm">{label}</span>
      {children}
    </div>
  );
}

/** On a phone the same idea becomes a Control Center card that drops from the Dock. */
function ControlCentre({ open, target, look, update, setTheme, themes, close }: ConceptProps) {
  const [surfaceRef, onSurfaceKeyDown] = useSurface<HTMLDivElement>(open, () => close());
  const { settings, theme } = look;
  const entry = themes?.find((candidate) => candidate.id === theme.themeId);
  const lightAvailable = findVariant(entry, theme.variantId)?.light ?? false;
  const light = theme.mode === "light";

  const themeBlock = (
    <div key="theme" className="flex flex-col gap-2 rounded-2xl bg-muted/50 p-3">
      <span className="text-xs text-muted-foreground">Theme · {entry?.name ?? "TypeSetGo"}</span>
      <ThemeDots themes={featuredThemes(themes, 8)} theme={theme} setTheme={setTheme} size="size-9" />
    </div>
  );
  const tiles = (
    <div key="tiles" className="grid grid-cols-2 gap-2">
      <ToggleTile label="Sound" detail={settings.soundEnabled ? settings.typingSound : "Off"} icon={SpeakerHighIcon} checked={settings.soundEnabled} onChange={(soundEnabled) => update({ soundEnabled })} />
      <ToggleTile label="Light mode" detail={lightAvailable ? (light ? "On" : "Off") : "Dark only"} icon={light ? SunIcon : MoonIcon} checked={light} onChange={(on) => { if (!on || lightAvailable) setTheme({ ...theme, mode: on ? "light" : "dark" }); }} />
      <ToggleTile label="Keyboard" detail={settings.showOnScreenKeyboard ? "Shown" : "Hidden"} icon={KeyboardIcon} checked={settings.showOnScreenKeyboard} onChange={(showOnScreenKeyboard) => update({ showOnScreenKeyboard })} />
      <ToggleTile label="Ghost" detail={settings.ghostWriterEnabled ? `${settings.ghostWriterSpeed} wpm` : "Off"} icon={GhostIcon} checked={settings.ghostWriterEnabled} onChange={(ghostWriterEnabled) => update({ ghostWriterEnabled })} />
    </div>
  );
  const sliders = (
    <div key="sliders" className="flex flex-col gap-3 rounded-2xl bg-muted/50 p-3">
      <SettingSlider label="Text size" value={settings.typingFontSize} min={TEXT_SIZE_MIN} max={TEXT_SIZE_MAX} step={0.25} onChange={(typingFontSize) => update({ typingFontSize })} format={(value) => `${value}rem`} />
      <SettingSlider label="Lines shown" value={settings.linePreview} min={1} max={6} step={1} onChange={(linePreview) => update({ linePreview })} format={String} />
    </div>
  );
  const sound = (
    <div key="sound" className="rounded-2xl bg-muted/50 p-3">
      <SoundQuick settings={settings} update={update} showSwitch={false} />
    </div>
  );
  const blocks = target === "theme" ? [themeBlock, tiles, sliders] : target === "sound" ? [sound, tiles, themeBlock] : [tiles, sliders, themeBlock];

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.button
            key="scrim"
            type="button"
            aria-label="Close quick settings"
            tabIndex={-1}
            onClick={() => close()}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-20 cursor-default bg-background/60 backdrop-blur-sm"
          />
          <motion.div
            key="centre"
            ref={surfaceRef}
            tabIndex={-1}
            role="dialog"
            aria-label={TITLES[target]}
            onKeyDown={onSurfaceKeyDown}
            initial={{ opacity: 0, y: -24, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.96 }}
            transition={PROFILE_SPRING}
            className="absolute inset-x-3 top-14 z-30 flex max-h-[calc(100%-4.5rem)] flex-col gap-2 overflow-y-auto rounded-3xl border border-border bg-card p-3 shadow-2xl outline-none"
            style={{ transformOrigin: "50% 0" }}
          >
            {blocks}
            <AllSettingsLink className="self-center py-1 text-xs">All settings</AllSettingsLink>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
