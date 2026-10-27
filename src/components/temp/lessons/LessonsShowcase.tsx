import { useState, type ComponentType, type ReactNode } from "react";
import { motion } from "framer-motion";
import { DesktopIcon, DeviceMobileIcon, HourglassIcon, LockSimpleIcon, PlayIcon } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { LESSON_SPRING } from "./lessons-mock";
import { CourseSyllabus } from "./CourseSyllabus";
import { KeyPicker } from "./KeyPicker";
import { LessonMap } from "./LessonMap";
import { TodayCoach } from "./TodayCoach";
import { UnitGrid } from "./UnitGrid";

interface Concept {
  name: string;
  summary: string;
  Component: ComponentType<{ preview: boolean }>;
}

const CONCEPTS: Concept[] = [
  { name: "Lesson map", summary: "One winding trail of lesson stops, unit by unit, with stars under every finished stop and a badge at the end of each unit.", Component: LessonMap },
  { name: "Unit cards", summary: "A card for each unit showing its keys and progress; open a card to see its lessons and start the next one.", Component: UnitGrid },
  { name: "Key picker", summary: "A big keyboard coloured by what you have learned; tap keys or a whole row to see which lessons teach them.", Component: KeyPicker },
  { name: "Syllabus", summary: "The whole course as a tidy list with goals, results and progress per unit, easy for a class or teacher to scan.", Component: CourseSyllabus },
  { name: "Today's coach", summary: "Just today's lesson in one friendly card: the new keys, a pretend student typing them, the star goals and a big start button.", Component: TodayCoach },
];

const FRAMES = [
  { id: "desktop", label: "Desktop", Icon: DesktopIcon },
  { id: "phone", label: "Phone", Icon: DeviceMobileIcon },
] as const;

const STATES = [
  { id: "preview", label: "Today: coming soon", Icon: HourglassIcon },
  { id: "live", label: "Later: lessons live", Icon: PlayIcon },
] as const;

/** Five concepts for the /lessons page with a sample course, shown as it reads today (coming soon) and once lessons are live. */
export function LessonsShowcase() {
  const [concept, setConcept] = useState(0);
  const [frame, setFrame] = useState<"desktop" | "phone">("desktop");
  const [state, setState] = useState<"preview" | "live">("preview");
  const { Component, name, summary } = CONCEPTS[concept];
  const phone = frame === "phone";

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <PressedGroup label="Lessons concept">
        {CONCEPTS.map((entry, index) => (
          <PressedButton key={entry.name} pressed={concept === index} onClick={() => setConcept(index)} layoutId="lessons-concept">
            <span className="text-muted-foreground">{String(index + 1).padStart(2, "0")}</span> {entry.name}
          </PressedButton>
        ))}
      </PressedGroup>
      <div className="flex flex-wrap items-center gap-2">
        <PressedGroup label="State">
          {STATES.map((entry) => (
            <PressedButton key={entry.id} pressed={state === entry.id} onClick={() => setState(entry.id)} layoutId="lessons-state">
              <entry.Icon className="size-3.5" aria-hidden="true" />{entry.label}
            </PressedButton>
          ))}
        </PressedGroup>
        <PressedGroup label="Frame">
          {FRAMES.map((entry) => (
            <PressedButton key={entry.id} pressed={frame === entry.id} onClick={() => setFrame(entry.id)} layoutId="lessons-frame">
              <entry.Icon className="size-3.5" aria-hidden="true" />{entry.label}
            </PressedButton>
          ))}
        </PressedGroup>
      </div>
      <p className="px-1 text-sm text-muted-foreground">
        <span className="font-semibold text-foreground">{name}.</span> {summary}
      </p>

      <motion.div layout transition={LESSON_SPRING} className={cn("mx-auto w-full min-w-0 overflow-hidden rounded-3xl border border-border bg-background shadow-sm", phone && "max-w-[375px]")}>
        <div aria-hidden="true" className="flex items-center gap-1.5 border-b border-border/60 bg-muted/40 px-3 py-2">
          <span className="size-2.5 shrink-0 rounded-full bg-destructive/60" />
          <span className="size-2.5 shrink-0 rounded-full bg-warning/60" />
          <span className="size-2.5 shrink-0 rounded-full bg-success/60" />
          <span className="ml-2 flex min-w-0 items-center gap-1 truncate rounded-full bg-background px-3 py-0.5 text-[11px] text-muted-foreground">
            <LockSimpleIcon className="size-3 shrink-0" />typesetgo.app/lessons
          </span>
        </div>
        {/* The stage scrolls on its own so the concept never depends on the page height. */}
        <div className={cn("@container h-[40rem] overflow-y-auto overflow-x-hidden overscroll-contain font-mono text-foreground", phone && "h-[44rem]")}>
          <div className="px-4 py-6 @lg:px-8 @lg:py-8">
            <Component key={`${concept}-${state}`} preview={state === "preview"} />
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function PressedGroup({ label, children }: { label: string; children: ReactNode }) {
  return <div role="group" aria-label={label} className="flex max-w-full flex-wrap gap-1 rounded-2xl bg-muted/60 p-1">{children}</div>;
}

function PressedButton({ pressed, onClick, layoutId, children }: { pressed: boolean; onClick: () => void; layoutId: string; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className="relative rounded-xl px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring aria-pressed:text-foreground"
    >
      {pressed && <motion.span layoutId={layoutId} transition={LESSON_SPRING} className="absolute inset-0 rounded-xl bg-card shadow-sm" />}
      <span className="relative inline-flex items-center gap-1.5">{children}</span>
    </button>
  );
}
