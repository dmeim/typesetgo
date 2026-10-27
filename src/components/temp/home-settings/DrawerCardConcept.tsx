import { useState, type ReactNode } from "react";
import { AnimatePresence, motion, useDragControls } from "framer-motion";
import { CaretDownIcon, XIcon } from "@phosphor-icons/react";
import { KeyboardPanel, SoundPanel, TextPanel, TypingPanel } from "@/components/profile/settings-panels";
import { IconTile } from "@/components/profile/SectionTiles";
import { PROFILE_SPRING, SECTIONS, type SectionId } from "@/components/profile/profile-sections";
import { KEYBOARD_STYLES } from "@/lib/keyboard-model";
import { TYPING_FONT_OPTIONS } from "@/lib/typing-fonts";
import { cn } from "@/lib/utils";
import { featuredThemes, type ConceptProps, type SurfaceTarget } from "./home-settings-mock";
import { useSurface } from "./home-settings-utils";
import { AllSettingsLink, KeyboardGroup, PracticeSample, ThemeSummary, ThemeTiles } from "./QuickControls";

const SECTION_FOR: Record<SurfaceTarget, SectionId> = { settings: "text", theme: "theme", sound: "sound" };

/** 04 Drawer and card: a bottom drawer on phones and a centred card on computers, both laid out like the profile page. */
export function DrawerCardConcept(props: ConceptProps) {
  const { open, target } = props;
  const [section, setSection] = useState<SectionId | null>(SECTION_FOR[target]);
  const [opened, setOpened] = useState(`${open}-${target}`);
  if (opened !== `${open}-${target}`) {
    setOpened(`${open}-${target}`);
    if (open) setSection(SECTION_FOR[target]);
  }
  return props.device === "phone"
    ? <Drawer {...props} section={section} setSection={setSection} />
    : <Card {...props} section={section ?? "theme"} setSection={setSection} />;
}

function panelsFor({ device, look, update, setTheme, themes }: ConceptProps): Record<SectionId, ReactNode> {
  const { settings, theme } = look;
  return {
    theme: (
      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4">
        <ThemeSummary themes={featuredThemes(themes)} all={themes} theme={theme} setTheme={setTheme} />
        <ThemeTiles themes={featuredThemes(themes)} theme={theme} setTheme={setTheme} />
        <AllSettingsLink to="/profile/theme" className="self-start text-xs">Browse every theme</AllSettingsLink>
      </div>
    ),
    text: <TextPanel settings={settings} update={update} />,
    typing: <TypingPanel settings={settings} update={update} />,
    sound: <SoundPanel settings={settings} update={update} />,
    keyboard: device === "phone" ? <KeyboardGroup settings={settings} update={update} /> : <KeyboardPanel settings={settings} update={update} />,
  };
}

function summaries({ look, themes }: ConceptProps): Record<SectionId, string> {
  const { settings, theme } = look;
  const font = TYPING_FONT_OPTIONS.find((option) => option.value === settings.typingFontFamily)?.label ?? settings.typingFontFamily;
  return {
    theme: `${themes?.find((entry) => entry.id === theme.themeId)?.name ?? "TypeSetGo"} · ${theme.mode}`,
    text: `${font} · ${settings.typingFontSize}rem`,
    typing: `${settings.linePreview} lines${settings.ghostWriterEnabled ? ` · ghost ${settings.ghostWriterSpeed} wpm` : ""}`,
    sound: settings.soundEnabled ? `${settings.typingSound} · ${settings.warningSound}` : "Off",
    keyboard: settings.showOnScreenKeyboard ? `${KEYBOARD_STYLES.find((style) => style.value === settings.keyboardStyle)?.name} · ${settings.keyboardLayout.toUpperCase()}` : "Hidden",
  };
}

type WithSection<T> = ConceptProps & { section: T; setSection: (section: SectionId | null) => void };

function Card(props: WithSection<SectionId>) {
  const { open, close, section, setSection } = props;
  const [surfaceRef, onSurfaceKeyDown] = useSurface<HTMLDivElement>(open, () => close());
  const panels = panelsFor(props);
  const details = summaries(props);
  const meta = SECTIONS.find((entry) => entry.id === section) ?? SECTIONS[0];

  return (
    <AnimatePresence>
      {open && (
        <motion.div key="card" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-30 flex items-center justify-center p-4">
          <button type="button" tabIndex={-1} aria-label="Close settings" onClick={() => close()} className="absolute inset-0 cursor-default bg-background/60 backdrop-blur-sm" />
          <motion.div
            ref={surfaceRef}
            tabIndex={-1}
            role="dialog"
            aria-label="Settings"
            onKeyDown={onSurfaceKeyDown}
            initial={{ y: 20, scale: 0.96 }}
            animate={{ y: 0, scale: 1 }}
            exit={{ y: 12, scale: 0.97 }}
            transition={PROFILE_SPRING}
            className="@container relative flex h-full max-h-[30rem] w-full max-w-[46rem] flex-col overflow-hidden rounded-3xl border border-border bg-background shadow-2xl outline-none"
          >
            <div className="flex min-h-0 flex-1 flex-col @lg:flex-row">
              <nav aria-label="Settings sections" className="flex shrink-0 gap-1 overflow-x-auto border-b border-border p-2 @lg:w-52 @lg:flex-col @lg:border-b-0 @lg:border-r">
                {SECTIONS.map((entry) => {
                  const current = entry.id === section;
                  return (
                    <button
                      key={entry.id}
                      type="button"
                      aria-current={current ? "page" : undefined}
                      onClick={() => setSection(entry.id)}
                      className={cn("relative flex shrink-0 items-center gap-2.5 rounded-xl px-2 py-1.5 text-left focus-visible:outline-2 focus-visible:outline-ring", current ? "text-foreground" : "text-muted-foreground hover:text-foreground")}
                    >
                      {current && <motion.span layoutId="drawer-card-current" transition={PROFILE_SPRING} className="absolute inset-0 rounded-xl bg-card shadow-sm" />}
                      <span className="relative"><IconTile section={entry} small /></span>
                      <span className="relative flex min-w-0 flex-col">
                        <span className="text-sm">{entry.title}</span>
                        <span className="hidden max-w-36 truncate text-[0.7rem] text-muted-foreground @lg:block">{details[entry.id]}</span>
                      </span>
                    </button>
                  );
                })}
              </nav>
              <div className="flex min-h-0 flex-1 flex-col">
                <div className="flex items-start justify-between gap-3 px-5 pb-3 pt-4">
                  <div className="min-w-0">
                    <h2 className="text-lg font-bold">{meta.title}</h2>
                    <p className="text-xs text-muted-foreground">{meta.description}</p>
                  </div>
                  <button type="button" aria-label="Close settings" onClick={() => close()} className="rounded-full p-2 text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring">
                    <XIcon className="size-4" aria-hidden="true" />
                  </button>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5">
                  {section !== "sound" && section !== "keyboard" && (
                    <div className="mb-4 rounded-2xl border border-border bg-card px-4 py-2">
                      <span className="text-[0.65rem] uppercase tracking-wider text-muted-foreground">Your text</span>
                      <PracticeSample settings={props.shown.settings} scale={0.3} lines={Math.min(props.shown.settings.linePreview, 3)} />
                    </div>
                  )}
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.div key={section} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.16 }}>
                      {panels[section]}
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between gap-2 border-t border-border px-5 py-2.5 text-xs text-muted-foreground">
              <span>Saved as you go. Esc to get back to typing.</span>
              <AllSettingsLink to={`/profile/${section}`} className="text-xs">Open on your profile</AllSettingsLink>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Drawer(props: WithSection<SectionId | null>) {
  const { open, close, section, setSection } = props;
  const [surfaceRef, onSurfaceKeyDown] = useSurface<HTMLDivElement>(open, () => close());
  const [tall, setTall] = useState(false);
  const drag = useDragControls();
  const panels = panelsFor(props);
  const details = summaries(props);

  return (
    <AnimatePresence onExitComplete={() => setTall(false)}>
      {open && (
        <>
          <motion.button
            key="scrim"
            type="button"
            tabIndex={-1}
            aria-label="Close settings"
            onClick={() => close()}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-20 cursor-default bg-background/50"
          />
          <motion.div
            key="drawer"
            ref={surfaceRef}
            tabIndex={-1}
            role="dialog"
            aria-label="Settings"
            onKeyDown={onSurfaceKeyDown}
            drag="y"
            dragControls={drag}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0.08, bottom: 0.6 }}
            onDragEnd={(_, info) => {
              if (info.offset.y < -50) setTall(true);
              else if (info.offset.y > 90) { if (tall) setTall(false); else close(); }
            }}
            initial={{ y: "100%" }}
            animate={{ y: 0, height: tall ? "92%" : "62%" }}
            exit={{ y: "100%" }}
            transition={PROFILE_SPRING}
            className="absolute inset-x-0 bottom-0 z-30 flex flex-col rounded-t-3xl border-t border-border bg-background shadow-2xl outline-none"
          >
            <button
              type="button"
              aria-label={tall ? "Make settings smaller" : "Make settings taller"}
              aria-expanded={tall}
              onPointerDown={(event) => drag.start(event)}
              onClick={() => setTall((value) => !value)}
              className="flex touch-none justify-center pb-1 pt-2.5 focus-visible:outline-2 focus-visible:outline-ring"
            >
              <span className="h-1.5 w-10 rounded-full bg-muted-foreground/40" />
            </button>
            <div className="flex items-center justify-between px-4 pb-2">
              <h2 className="text-lg font-bold">Settings</h2>
              <button type="button" onClick={() => close()} className="rounded-full bg-muted px-3 py-1 text-sm focus-visible:outline-2 focus-visible:outline-ring">Done</button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-4">
              <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
                {SECTIONS.map((entry) => {
                  const expanded = section === entry.id;
                  return (
                    <div key={entry.id}>
                      <button
                        type="button"
                        aria-expanded={expanded}
                        onClick={() => setSection(expanded ? null : entry.id)}
                        className="flex w-full items-center gap-3 px-3 py-2.5 text-left focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
                      >
                        <IconTile section={entry} />
                        <span className="flex min-w-0 flex-1 flex-col">
                          <span className="text-sm font-medium">{entry.title}</span>
                          <span className="truncate text-xs text-muted-foreground">{details[entry.id]}</span>
                        </span>
                        <motion.span animate={{ rotate: expanded ? 180 : 0 }} transition={PROFILE_SPRING}>
                          <CaretDownIcon className="size-4 text-muted-foreground" aria-hidden="true" />
                        </motion.span>
                      </button>
                      <AnimatePresence initial={false}>
                        {expanded && (
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={PROFILE_SPRING} className="overflow-hidden">
                            <div className="bg-background/60 p-2">{panels[entry.id]}</div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
              <AllSettingsLink className="mt-3 flex justify-center text-xs">Everything on your profile</AllSettingsLink>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
