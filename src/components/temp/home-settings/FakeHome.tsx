import type { CSSProperties, MouseEvent } from "react";
import { motion } from "framer-motion";
import {
  BookOpenIcon, CaretDownIcon, FlagCheckeredIcon, GearSixIcon, KeyboardIcon, PaletteIcon, SpeakerHighIcon, SpeakerSlashIcon, UsersThreeIcon,
} from "@phosphor-icons/react";
import { KeyboardPreview } from "@/components/profile/KeyboardPreview";
import { PROFILE_SPRING } from "@/components/profile/profile-sections";
import { cn } from "@/lib/utils";
import { SAMPLE_TEXT, SAMPLE_TYPED, type Device, type HomeLook, type SurfaceTarget } from "./home-settings-mock";
import { PracticeSample } from "./QuickControls";

const iconButton = "relative flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring aria-expanded:bg-accent aria-expanded:text-foreground";
const NAV = [
  { label: "Type", Icon: KeyboardIcon },
  { label: "Race", Icon: FlagCheckeredIcon },
  { label: "Lessons", Icon: BookOpenIcon },
  { label: "Connect", Icon: UsersThreeIcon },
];

interface FakeHomeProps {
  device: Device;
  look: HomeLook;
  /** The surface that is open, so its button reads as expanded. */
  openTarget: SurfaceTarget | null;
  onOpen: (target: SurfaceTarget, trigger: HTMLElement) => void;
  /** Room Home leaves for a surface docked to its side. */
  style?: CSSProperties;
  hint?: string;
}

/** A pared-down Home: the Dock, the test settings pill, the practice text and keyboard. */
export function FakeHome({ device, look, openTarget, onOpen, style, hint }: FakeHomeProps) {
  const { settings } = look;
  const phone = device === "phone";
  const open = (target: SurfaceTarget) => (event: MouseEvent<HTMLButtonElement>) => onOpen(target, event.currentTarget);
  const expanded = (target: SurfaceTarget) => openTarget === target;

  return (
    <motion.div layout transition={PROFILE_SPRING} className="flex h-full min-w-0 flex-col" style={style}>
      <div className="flex justify-center px-3 pt-3">
        <nav aria-label="Mock site" className="flex min-w-0 items-center gap-1 rounded-full border border-border bg-card/80 p-1 shadow-sm backdrop-blur">
          <span aria-hidden="true" className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">T</span>
          {!phone && NAV.map(({ label, Icon }, index) => (
            <span key={label} aria-hidden="true" className={cn("hidden items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs @md:flex", index === 0 ? "bg-accent text-foreground" : "text-muted-foreground")}>
              <Icon className="size-4" />
              {index === 0 && label}
            </span>
          ))}
          {!phone && <span aria-hidden="true" className="mx-1 hidden h-5 w-px bg-border @md:block" />}
          <button type="button" data-anchor="theme" aria-label="Theme" aria-expanded={expanded("theme")} onClick={open("theme")} className={iconButton}>
            <PaletteIcon className="size-5" aria-hidden="true" />
          </button>
          <button type="button" data-anchor="settings" aria-label="Settings" aria-expanded={expanded("settings")} onClick={open("settings")} className={iconButton}>
            <GearSixIcon className="size-5" aria-hidden="true" />
          </button>
        </nav>
      </div>

      <div className={cn("flex min-h-0 flex-1 flex-col items-center gap-5 overflow-hidden px-4", phone ? "pt-8" : "justify-center pb-6")}>
        <div className="flex items-center gap-2">
          <span aria-hidden="true" className="flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-xs text-muted-foreground shadow-sm">
            <span className="text-foreground">time</span> 30s <span>beginner</span>
            <CaretDownIcon className="size-3" />
          </span>
          <button type="button" data-anchor="sound" aria-label="Sound settings" aria-expanded={expanded("sound")} onClick={open("sound")} className={iconButton}>
            {settings.soundEnabled ? <SpeakerHighIcon className="size-4" aria-hidden="true" /> : <SpeakerSlashIcon className="size-4" aria-hidden="true" />}
          </button>
        </div>
        <div className="w-full max-w-[46rem]">
          <PracticeSample settings={settings} scale={phone ? 0.3 : 0.42} />
        </div>
        {!phone && settings.showOnScreenKeyboard && (
          <div aria-hidden="true" className="pointer-events-none w-full max-w-[30rem]">
            <KeyboardPreview style={settings.keyboardStyle} layoutId={settings.keyboardLayout} nextChar={SAMPLE_TEXT[SAMPLE_TYPED.length]} bare />
          </div>
        )}
        {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
      </div>
    </motion.div>
  );
}
