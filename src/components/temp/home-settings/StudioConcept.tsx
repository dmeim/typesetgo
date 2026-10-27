import { useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  EyeIcon, GhostIcon, KeyboardIcon, PaletteIcon, RowsIcon, SpeakerHighIcon, TextAaIcon, TextTIcon, XIcon, type Icon,
} from "@phosphor-icons/react";
import { ScrollRow } from "@/components/ui/scroll-row";
import { KeyboardPreview } from "@/components/profile/KeyboardPreview";
import { SettingSlider, SettingSwitch } from "@/components/profile/settings-controls";
import { KeyboardLayoutPicker } from "@/components/profile/settings-panels";
import { FONT_GROUPS, PROFILE_SPRING } from "@/components/profile/profile-sections";
import { MAX_GHOST_SPEED, TEXT_SIZE_MAX, TEXT_SIZE_MIN } from "@/lib/practice-limits";
import { TYPING_FONT_OPTIONS } from "@/lib/typing-fonts";
import { cn } from "@/lib/utils";
import { featuredThemes, SAMPLE_TEXT, SAMPLE_TYPED, type ConceptProps, type SurfaceTarget } from "./home-settings-mock";
import { useSurface } from "./home-settings-utils";
import { AlignPicker, KeyboardStyleChoices, PracticeSample, SoundQuick, ThemeDots, ThemeSummary } from "./QuickControls";

type Tool = "theme" | "font" | "size" | "lines" | "ghost" | "keyboard" | "sound";
const TOOLS: { id: Tool; label: string; Icon: Icon }[] = [
  { id: "theme", label: "Theme", Icon: PaletteIcon },
  { id: "font", label: "Font", Icon: TextAaIcon },
  { id: "size", label: "Size", Icon: TextTIcon },
  { id: "lines", label: "Lines", Icon: RowsIcon },
  { id: "ghost", label: "Ghost", Icon: GhostIcon },
  { id: "keyboard", label: "Keyboard", Icon: KeyboardIcon },
  { id: "sound", label: "Sound", Icon: SpeakerHighIcon },
];
const TOOL_FOR: Record<SurfaceTarget, Tool> = { settings: "size", theme: "theme", sound: "sound" };
// A few from each group so the strip stays short; the profile page lists every font.
const STUDIO_FONTS = FONT_GROUPS.flatMap((group) => group.values.slice(0, 4))
  .map((value) => TYPING_FONT_OPTIONS.find((font) => font.value === value))
  .filter((font): font is (typeof TYPING_FONT_OPTIONS)[number] => Boolean(font));

/** 05 Studio: the page dims, your text moves centre stage, and every change is tried on it before you keep it. */
export function StudioConcept({ device, open, target, look, shown, update, setTheme, themes, close, setComparing }: ConceptProps) {
  const phone = device === "phone";
  const [tool, setTool] = useState<Tool>(TOOL_FOR[target]);
  const [held, setHeld] = useState(false);
  const [opened, setOpened] = useState(`${open}-${target}`);
  if (opened !== `${open}-${target}`) {
    setOpened(`${open}-${target}`);
    if (open) setTool(TOOL_FOR[target]);
  }
  const [surfaceRef, onSurfaceKeyDown] = useSurface<HTMLDivElement>(open, () => close(false));
  const { settings, theme } = look;
  const compare = (on: boolean) => { setHeld(on); setComparing(on); };

  const trays: Record<Tool, ReactNode> = {
    theme: (
      <div className="flex flex-col gap-3">
        <ThemeSummary themes={featuredThemes(themes)} all={themes} theme={theme} setTheme={setTheme} />
        <ThemeDots themes={featuredThemes(themes)} theme={theme} setTheme={setTheme} size="size-9" />
      </div>
    ),
    font: (
      <ScrollRow role="radiogroup" aria-label="Font">
        {[...STUDIO_FONTS.some((font) => font.value === settings.typingFontFamily) ? [] : TYPING_FONT_OPTIONS.filter((font) => font.value === settings.typingFontFamily), ...STUDIO_FONTS].map((font) => {
          const selected = font.value === settings.typingFontFamily;
          return (
            <button
              key={font.value}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={font.label}
              onClick={() => update({ typingFontFamily: font.value })}
              className={cn("flex w-24 shrink-0 flex-col items-start gap-1 rounded-xl border bg-background p-2 text-left focus-visible:outline-2 focus-visible:outline-ring", selected ? "border-primary ring-1 ring-primary" : "border-border")}
            >
              <span className={cn("text-2xl leading-none", selected && "text-primary")} style={{ fontFamily: font.fontFamily }}>Aa</span>
              <span className="w-full truncate text-[0.7rem] text-muted-foreground">{font.label}</span>
            </button>
          );
        })}
      </ScrollRow>
    ),
    size: (
      <div className="grid items-end gap-4 @2xl:grid-cols-[1fr_auto]">
        <SettingSlider label="Text size" value={settings.typingFontSize} min={TEXT_SIZE_MIN} max={TEXT_SIZE_MAX} step={0.25} onChange={(typingFontSize) => update({ typingFontSize })} format={(value) => `${value}rem`} />
        <AlignPicker iconsOnly value={settings.textAlign} onChange={(textAlign) => update({ textAlign })} />
      </div>
    ),
    lines: (
      <div className="grid gap-4 @2xl:grid-cols-2">
        <SettingSlider label="Lines shown" value={settings.linePreview} min={1} max={6} step={1} onChange={(linePreview) => update({ linePreview })} format={(value) => `${value} ${value === 1 ? "line" : "lines"}`} />
        <SettingSlider label="Words per line" value={settings.maxWordsPerLine} min={1} max={10} step={1} onChange={(maxWordsPerLine) => update({ maxWordsPerLine })} format={(value) => `${value} ${value === 1 ? "word" : "words"}`} />
      </div>
    ),
    ghost: (
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm">Race a ghost <span className="text-xs text-muted-foreground">· a second cursor at your target speed</span></span>
          <SettingSwitch label="Race a ghost" checked={settings.ghostWriterEnabled} onChange={(ghostWriterEnabled) => update({ ghostWriterEnabled })} />
        </div>
        <motion.div animate={{ opacity: settings.ghostWriterEnabled ? 1 : 0.45 }}>
          <SettingSlider label="Ghost speed" value={settings.ghostWriterSpeed} min={10} max={MAX_GHOST_SPEED} step={5} onChange={(ghostWriterSpeed) => update({ ghostWriterSpeed })} format={(value) => `${value} wpm`} />
        </motion.div>
      </div>
    ),
    keyboard: (
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm">On-screen keyboard{phone && <span className="text-xs text-muted-foreground"> · shows on bigger screens</span>}</span>
          <SettingSwitch label="On-screen keyboard" checked={settings.showOnScreenKeyboard} onChange={(showOnScreenKeyboard) => update({ showOnScreenKeyboard })} />
        </div>
        <motion.div animate={{ opacity: settings.showOnScreenKeyboard ? 1 : 0.45 }} className="flex flex-col gap-3">
          <KeyboardStyleChoices value={settings.keyboardStyle} onChange={(keyboardStyle) => update({ keyboardStyle })} />
          <KeyboardLayoutPicker value={settings.keyboardLayout} onChange={(keyboardLayout) => update({ keyboardLayout })} />
        </motion.div>
      </div>
    ),
    sound: <SoundQuick settings={settings} update={update} />,
  };

  const compareButton = (
    <button
      type="button"
      aria-pressed={held}
      onPointerDown={() => compare(true)}
      onPointerUp={() => compare(false)}
      onPointerLeave={() => { if (held) compare(false); }}
      onKeyDown={(event) => { if ((event.key === " " || event.key === "Enter") && !event.repeat) { event.preventDefault(); compare(true); } }}
      onKeyUp={(event) => { if (event.key === " " || event.key === "Enter") compare(false); }}
      onBlur={() => { if (held) compare(false); }}
      className="flex touch-none select-none items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring aria-pressed:border-primary aria-pressed:text-foreground"
    >
      <EyeIcon className="size-4" aria-hidden="true" />
      Hold to compare
    </button>
  );

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="studio"
          ref={surfaceRef}
          tabIndex={-1}
          role="dialog"
          aria-label="Studio"
          onKeyDown={onSurfaceKeyDown}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="@container absolute inset-0 z-30 flex flex-col outline-none"
        >
          <div aria-hidden="true" className="absolute inset-0 bg-background/80 backdrop-blur-md" />

          <motion.div initial={{ y: -16 }} animate={{ y: 0 }} transition={PROFILE_SPRING} className="relative flex items-center justify-between gap-2 px-3 pt-3">
            <button type="button" onClick={() => close(false)} aria-label={phone ? "Cancel changes" : undefined} className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring">
              <XIcon className="size-4" aria-hidden="true" />
              {!phone && "Cancel"}
            </button>
            <span className="min-w-0 truncate text-center text-sm">
              <span className="font-semibold">Studio</span>
              {!phone && <span className="text-muted-foreground"> · try it on your text, then keep it</span>}
            </span>
            <span className="flex shrink-0 items-center gap-2">
              {!phone && compareButton}
              <button type="button" onClick={() => close(true)} className="shrink-0 rounded-full bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
                {phone ? "Keep" : "Keep changes"}
              </button>
            </span>
          </motion.div>

          <div className="relative flex min-h-0 flex-1 flex-col items-center justify-center gap-3 overflow-hidden px-4 py-3">
            <motion.div layout transition={PROFILE_SPRING} className="relative flex w-full max-w-[40rem] flex-col gap-4 rounded-3xl bg-background px-4 py-4 shadow-2xl ring-1 ring-border @2xl:px-8">
              <AnimatePresence>
                {held && (
                  <motion.span initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-foreground px-2.5 py-0.5 text-xs font-medium text-background">
                    Before
                  </motion.span>
                )}
              </AnimatePresence>
              <PracticeSample settings={shown.settings} scale={phone ? 0.3 : 0.36} />
              {!phone && shown.settings.showOnScreenKeyboard && (
                <div aria-hidden="true" className="pointer-events-none mx-auto w-full max-w-[20rem]">
                  <KeyboardPreview style={shown.settings.keyboardStyle} layoutId={shown.settings.keyboardLayout} nextChar={SAMPLE_TEXT[SAMPLE_TYPED.length]} bare />
                </div>
              )}
            </motion.div>
            {phone && compareButton}
          </div>

          <div className="relative flex flex-col gap-2 px-3 pb-3">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={tool}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                transition={{ duration: 0.16 }}
                role="group"
                aria-label={TOOLS.find((entry) => entry.id === tool)?.label}
                className={cn("mx-auto w-full max-w-[40rem] overflow-y-auto rounded-2xl border border-border bg-card p-3 shadow-xl", phone ? "max-h-52" : "max-h-40")}
              >
                {trays[tool]}
              </motion.div>
            </AnimatePresence>
            <div className="mx-auto w-full max-w-[40rem]">
              <ScrollRow role="radiogroup" aria-label="Studio tools" className="rounded-full border border-border bg-card p-1 shadow-lg">
                {TOOLS.map(({ id, label, Icon: ToolIcon }) => (
                  <button
                    key={id}
                    type="button"
                    role="radio"
                    aria-checked={tool === id}
                    onClick={() => setTool(id)}
                    className={cn("relative flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-sm focus-visible:outline-2 focus-visible:outline-ring", tool === id ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground")}
                  >
                    {tool === id && <motion.span layoutId="studio-tool" transition={PROFILE_SPRING} className="absolute inset-0 rounded-full bg-primary" />}
                    <ToolIcon className="relative size-4" weight={tool === id ? "fill" : "regular"} aria-hidden="true" />
                    <span className="relative">{label}</span>
                  </button>
                ))}
              </ScrollRow>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
