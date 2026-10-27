import { useCallback, useRef, useState, type ComponentType, type RefObject } from "react";
import { motion } from "framer-motion";
import {
  ArrowClockwiseIcon, BellIcon, DesktopIcon, DeviceMobileIcon, FlagCheckeredIcon, GearSixIcon, GraduationCapIcon, KeyboardIcon, PaletteIcon, TrophyIcon, UsersThreeIcon,
} from "@phosphor-icons/react";
import { DockDivider } from "@/components/layout/header/DockParts";
import { Avatar, UnreadDot } from "@/components/temp/header/HeaderParts";
import { iconButton } from "@/components/temp/header/header-utils";
import { LAB_SPRING } from "@/components/temp/settings/lab-settings";
import { cn } from "@/lib/utils";
import { CelebrationConcept } from "./CelebrationConcept";
import { CompactListConcept } from "./CompactListConcept";
import { DayCardsConcept } from "./DayCardsConcept";
import { InboxDrawerConcept } from "./InboxDrawerConcept";
import { ToastStackConcept } from "./ToastStackConcept";
import { CONCEPTS } from "./notifications-mock";
import { useMockInbox, type ConceptProps } from "./use-mock-inbox";

const COMPONENTS: ComponentType<ConceptProps>[] = [DayCardsConcept, InboxDrawerConcept, ToastStackConcept, CelebrationConcept, CompactListConcept];
const FRAMES = [
  { id: "desktop", label: "Desktop", Icon: DesktopIcon },
  { id: "phone", label: "Phone", Icon: DeviceMobileIcon },
] as const;
const DOCK_ICONS = [KeyboardIcon, FlagCheckeredIcon, GraduationCapIcon, UsersThreeIcon];
const TOOL_ICONS = [TrophyIcon, PaletteIcon, GearSixIcon];
const WORDS = "the quick brown fox jumps over the lazy dog while the class races to type every word".split(" ");

const toggle = "inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring aria-pressed:bg-card aria-pressed:text-foreground aria-pressed:shadow-sm";

/** Five takes on the Dock's notification center, each in a page-sized frame whose bell opens it. Mock data only. */
export function NotificationsShowcase() {
  const [concept, setConcept] = useState(0);
  const [frame, setFrame] = useState<(typeof FRAMES)[number]["id"]>("desktop");
  const [open, setOpen] = useState(false);
  const inbox = useMockInbox();
  const bell = useRef<HTMLButtonElement>(null);
  const Concept = COMPONENTS[concept];
  const phone = frame === "phone";

  const close = useCallback(() => {
    setOpen(false);
    bell.current?.focus({ preventScroll: true });
  }, []);
  const pick = (index: number) => {
    setConcept(index);
    setOpen(true);
  };

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="group" aria-label="Concept" className="flex flex-wrap gap-1 rounded-2xl bg-muted/60 p-1">
          {CONCEPTS.map((entry, index) => (
            <button key={entry.name} type="button" aria-pressed={concept === index} onClick={() => pick(index)} className={toggle}>
              <span className="text-muted-foreground">{String(index + 1).padStart(2, "0")}</span>{entry.name}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div role="group" aria-label="Frame" className="flex gap-1 rounded-2xl bg-muted/60 p-1">
            {FRAMES.map(({ id, label, Icon }) => (
              <button key={id} type="button" aria-pressed={frame === id} onClick={() => setFrame(id)} className={toggle}>
                <Icon className="size-3.5" aria-hidden="true" />{label}
              </button>
            ))}
          </div>
          <button type="button" onClick={() => { inbox.reset(); setOpen(false); }} className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
            <ArrowClockwiseIcon className="size-3.5" aria-hidden="true" />Reset
          </button>
        </div>
      </div>
      <p className="px-1 text-sm text-muted-foreground">
        <span className="font-semibold text-foreground">{CONCEPTS[concept].name}.</span> {CONCEPTS[concept].summary}
      </p>

      <motion.div
        layout
        transition={LAB_SPRING}
        className={cn("@container relative isolate mx-auto flex w-full flex-col overflow-hidden rounded-3xl border border-border bg-background shadow-sm", phone ? "h-[40rem] max-w-[375px]" : "h-[36rem]")}
      >
        <MiniDock bell={bell} unread={inbox.unread} open={open} onBell={() => (open ? close() : setOpen(true))} />
        <FakePage />
        <Concept key={`${concept}-${frame}`} inbox={inbox} open={open} onClose={close} />
      </motion.div>
    </div>
  );
}

/** A small copy of the Dock: only the bell works; the rest is set dressing. */
function MiniDock({ bell, unread, open, onBell }: { bell: RefObject<HTMLButtonElement | null>; unread: number; open: boolean; onBell: () => void }) {
  return (
    <div className="relative z-40 flex justify-center px-3 pt-3">
      <div className="flex items-center gap-1 rounded-full border border-border bg-card/80 p-2 shadow-lg backdrop-blur">
        <img src="/assets/Icon-Color.svg" alt="" className="mx-1 size-7" />
        <DockDivider className="mx-1.5 hidden @min-[30rem]:block" />
        <span aria-hidden="true" className="hidden items-center gap-1 @min-[30rem]:flex">
          {DOCK_ICONS.map((Icon, index) => (
            <span key={index} className={cn("flex size-9 items-center justify-center rounded-full text-muted-foreground", index === 0 && "bg-accent text-foreground")}>
              <Icon className="size-5" />
            </span>
          ))}
          <DockDivider className="mx-1.5" />
          {TOOL_ICONS.map((Icon, index) => (
            <span key={index} className="flex size-9 items-center justify-center rounded-full text-muted-foreground"><Icon className="size-5" /></span>
          ))}
        </span>
        <DockDivider className="mx-1.5" />
        <button ref={bell} type="button" onClick={onBell} aria-expanded={open} aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"} className={cn(iconButton, open && "bg-accent text-foreground")}>
          <BellIcon className="size-5" aria-hidden="true" />
          <UnreadDot count={unread} />
        </button>
        <span className="flex size-9 items-center justify-center"><Avatar signedIn /></span>
      </div>
    </div>
  );
}

function FakePage() {
  return (
    <div aria-hidden="true" className="flex flex-1 flex-col items-center justify-center gap-6 px-6 pb-10">
      <span className="flex gap-1.5 rounded-full bg-muted/60 p-1">
        {["time", "words", "quote"].map((mode, index) => (
          <span key={mode} className={cn("rounded-full px-3 py-1 text-xs text-muted-foreground", index === 0 && "bg-card text-foreground shadow-sm")}>{mode}</span>
        ))}
      </span>
      <p className="max-w-xl text-center text-lg leading-relaxed text-muted-foreground/60 @2xl:text-2xl">{WORDS.join(" ")}</p>
      <span className="text-xs text-muted-foreground">Press the bell in the dock to open notifications.</span>
    </div>
  );
}
