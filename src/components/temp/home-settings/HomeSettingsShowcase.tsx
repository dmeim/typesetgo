import { useEffect, useMemo, useRef, useState, type ComponentType, type CSSProperties, type KeyboardEvent, type ReactNode } from "react";
import { motion } from "framer-motion";
import { ArrowCounterClockwiseIcon, DeviceMobileIcon, LockSimpleIcon, MonitorIcon } from "@phosphor-icons/react";
import { PROFILE_SPRING } from "@/components/profile/profile-sections";
import { mergeProfileSettings, type ProfileSettings } from "@/components/profile/profile-settings";
import { useThemeCatalog, useThemeColors, type ThemeSelection } from "@/components/profile/theme-catalog";
import { themeCSSVariables } from "@/lib/theme-css";
import { cn } from "@/lib/utils";
import { CommandPaletteConcept } from "./CommandPaletteConcept";
import { DockPopoverConcept } from "./DockPopoverConcept";
import { DrawerCardConcept } from "./DrawerCardConcept";
import { FakeHome } from "./FakeHome";
import { INITIAL_LOOK, type ConceptProps, type Device, type HomeLook, type SurfaceTarget } from "./home-settings-mock";
import { SideSheetConcept } from "./SideSheetConcept";
import { StudioConcept } from "./StudioConcept";

interface Concept {
  name: string;
  summary: string;
  Component: ComponentType<ConceptProps>;
  /** Edits a draft that is only kept on "Keep changes". */
  drafts?: boolean;
  /** Home moves over for a panel docked at its side (computer only). */
  reserve?: CSSProperties;
  hint?: string;
}

const CONCEPTS: Concept[] = [
  {
    name: "Side sheet",
    summary: "A panel slides in from the right with three tabs: Typing, Look and Sound. On a computer the text moves over so you can watch it change; on a phone the sheet fills the screen and keeps a small preview of your text at the top.",
    Component: SideSheetConcept,
    reserve: { paddingRight: "min(24rem, 50%)" },
  },
  {
    name: "Dock popover",
    summary: "A small card opens right under the button you pressed with only the everyday switches: sound, keyboard, ghost, text size and lines, or a row of theme colours. \"All settings\" goes to your profile. On a phone it becomes a Control Center card with big tiles and sliders.",
    Component: DockPopoverConcept,
  },
  {
    name: "Search",
    summary: "One search box for every setting and theme. Type \"dark\", \"bigger\" or \"nord\" and change the setting right in the results; arrow keys move, Enter flips or steps it. Ctrl K or ⌘K opens it on a computer. On a phone it fills the screen with group chips to browse.",
    Component: CommandPaletteConcept,
    hint: "Press Ctrl K or ⌘K in this frame",
  },
  {
    name: "Drawer and card",
    summary: "The profile page in miniature: a centred card with the same five tabs and controls on a computer, and a drawer from the bottom on a phone with each group opening in place. Drag the handle up for more room or down to close.",
    Component: DrawerCardConcept,
  },
  {
    name: "Studio",
    summary: "The page dims and your text moves to the centre. Pick a tool along the bottom and every change is tried on the text first; hold Compare to see the before, then keep the changes or cancel.",
    Component: StudioConcept,
    drafts: true,
  },
];

/** Five ways to change quick settings, theme and sound from Home without leaving the test. */
export function HomeSettingsShowcase() {
  const [concept, setConcept] = useState(0);
  const [device, setDevice] = useState<Device>("desktop");
  const [saved, setSaved] = useState<HomeLook>(INITIAL_LOOK);
  const [draft, setDraft] = useState<HomeLook | null>(null);
  const [comparing, setComparing] = useState(false);
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState<SurfaceTarget>("settings");
  const stageRef = useRef<HTMLDivElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const themes = useThemeCatalog();
  const meta = CONCEPTS[concept];

  const look = draft ?? saved;
  const shown = comparing ? saved : look;
  const colors = useThemeColors(shown.theme);
  const themeStyle = useMemo(() => (colors ? themeCSSVariables(colors) : {}) as CSSProperties, [colors]);

  useEffect(() => {
    if (open || !opener.current) return;
    if (opener.current.isConnected) opener.current.focus({ preventScroll: true });
    opener.current = null;
  }, [open]);

  const reset = () => { setOpen(false); setDraft(null); setComparing(false); };
  const close = (keep = true) => {
    if (draft && keep) setSaved(draft);
    reset();
  };
  const openSurface = (next: SurfaceTarget, trigger: HTMLElement | null) => {
    if (open && next === target) return close();
    opener.current = trigger;
    setTarget(next);
    setOpen(true);
    if (meta.drafts) setDraft(saved);
  };
  const update = (changes: Partial<ProfileSettings>) => {
    const apply = (current: HomeLook) => ({ ...current, settings: mergeProfileSettings(current.settings, changes) });
    if (draft) setDraft(apply(draft));
    else setSaved(apply);
  };
  const setTheme = (theme: ThemeSelection) => {
    if (draft) setDraft({ ...draft, theme });
    else setSaved((current) => ({ ...current, theme }));
  };
  const onStageKeyDown = (event: KeyboardEvent) => {
    if (meta.name !== "Search" || event.key.toLowerCase() !== "k" || !(event.metaKey || event.ctrlKey)) return;
    event.preventDefault();
    openSurface("settings", document.activeElement instanceof HTMLElement ? document.activeElement : null);
  };

  const { Component } = meta;
  const phone = device === "phone";
  const screen = (
    <div
      ref={stageRef}
      onKeyDown={onStageKeyDown}
      className={cn("@container relative overflow-hidden bg-background text-foreground transition-colors duration-500", phone ? "h-[40rem]" : "h-[34rem]", shown.theme.mode === "light" && "light")}
      style={themeStyle}
    >
      <FakeHome
        device={device}
        look={shown}
        openTarget={open ? target : null}
        onOpen={openSurface}
        style={!phone && open && meta.reserve ? meta.reserve : undefined}
        hint={!phone ? meta.hint : undefined}
      />
      <Component
        device={device}
        open={open}
        target={target}
        look={look}
        shown={shown}
        update={update}
        setTheme={setTheme}
        themes={themes}
        close={close}
        setComparing={setComparing}
        stageRef={stageRef}
      />
    </div>
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="group" aria-label="Concept" className="flex flex-wrap gap-1 rounded-2xl bg-muted/60 p-1">
          {CONCEPTS.map((entry, index) => (
            <PressButton key={entry.name} pressed={concept === index} layoutId="home-settings-concept" onClick={() => { reset(); setConcept(index); }}>
              <span className="text-muted-foreground">{String(index + 1).padStart(2, "0")}</span> {entry.name}
            </PressButton>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div role="group" aria-label="Screen" className="flex gap-1 rounded-2xl bg-muted/60 p-1">
            <PressButton pressed={!phone} layoutId="home-settings-device" onClick={() => { reset(); setDevice("desktop"); }}>
              <MonitorIcon className="mr-1 inline size-3.5" aria-hidden="true" />Desktop
            </PressButton>
            <PressButton pressed={phone} layoutId="home-settings-device" onClick={() => { reset(); setDevice("phone"); }}>
              <DeviceMobileIcon className="mr-1 inline size-3.5" aria-hidden="true" />Phone
            </PressButton>
          </div>
          <button type="button" onClick={() => { reset(); setSaved(INITIAL_LOOK); }} className="inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring">
            <ArrowCounterClockwiseIcon className="size-3.5" aria-hidden="true" />
            Reset
          </button>
        </div>
      </div>
      <p className="px-1 text-sm text-muted-foreground">
        <span className="font-semibold text-foreground">{meta.name}.</span> {meta.summary} Open it with the theme or settings button in the Dock, or the speaker beside the test pill.
      </p>

      <motion.div layout transition={PROFILE_SPRING} className={cn("mx-auto w-full", phone ? "max-w-[375px]" : "max-w-none")}>
        {phone ? (
          <div className="overflow-hidden rounded-[2.25rem] border-[6px] border-muted bg-muted shadow-sm">
            <div aria-hidden="true" className="flex items-center justify-between bg-background px-6 pb-1 pt-2 text-[11px] font-semibold text-muted-foreground" style={themeStyle}>
              <span>9:41</span>
              <span className="h-4 w-20 rounded-full bg-muted" />
              <span>100%</span>
            </div>
            {screen}
          </div>
        ) : (
          <div className="overflow-hidden rounded-3xl border border-border bg-background shadow-sm">
            <div aria-hidden="true" className="flex items-center gap-1.5 border-b border-border/60 bg-muted/40 px-3 py-2">
              <span className="size-2.5 rounded-full bg-destructive/60" />
              <span className="size-2.5 rounded-full bg-warning/60" />
              <span className="size-2.5 rounded-full bg-success/60" />
              <span className="ml-2 flex min-w-0 items-center gap-1 truncate rounded-full bg-background px-3 py-0.5 text-[11px] text-muted-foreground">
                <LockSimpleIcon className="size-3 shrink-0" />typesetgo.app/
              </span>
            </div>
            {screen}
          </div>
        )}
      </motion.div>
    </div>
  );
}

function PressButton({ pressed, layoutId, onClick, children }: { pressed: boolean; layoutId: string; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className="relative rounded-xl px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring aria-pressed:text-foreground"
    >
      {pressed && <motion.span layoutId={layoutId} transition={PROFILE_SPRING} className="absolute inset-0 rounded-xl bg-card shadow-sm" />}
      <span className="relative">{children}</span>
    </button>
  );
}
