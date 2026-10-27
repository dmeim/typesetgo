import { useState, type ComponentType, type ReactNode } from "react";
import { motion } from "framer-motion";
import { ArrowCounterClockwiseIcon, BatteryFullIcon, CellSignalFullIcon, LockSimpleIcon, WifiHighIcon } from "@phosphor-icons/react";
import { LAB_SPRING } from "@/components/temp/settings/lab-settings";
import { cn } from "@/lib/utils";
import { AnchoredConcept } from "./AnchoredConcept";
import { CardConcept } from "./CardConcept";
import { DialConcept } from "./DialConcept";
import { ClosedPill } from "./MockPill";
import { SheetConcept } from "./SheetConcept";
import { UnfoldConcept } from "./UnfoldConcept";
import { CONCEPTS, INITIAL_APPLIED, SEEDS, type Applied, type ConceptProps, type LengthKind, type SeedId, type SurfaceKind } from "./practice-dialogs-mock";
import { useElementWidth } from "./use-surface";

const COMPONENTS: ComponentType<ConceptProps>[] = [UnfoldConcept, AnchoredConcept, DialConcept, CardConcept, SheetConcept];
const SURFACES: { id: SurfaceKind; label: string }[] = [{ id: "length", label: "Custom length" }, { id: "text", label: "Your own text" }];
const KINDS: { id: LengthKind; label: string }[] = [{ id: "time", label: "Time" }, { id: "words", label: "Words" }];
const FRAMES = [{ id: "desktop", label: "Desktop" }, { id: "phone", label: "Phone" }];
// Below this stage width the concepts use their phone layout.
const COMPACT_WIDTH = 560;

/** Five takes on the custom length picker and the own-text editor that the settings pill opens. Mock state only. */
export function PracticeDialogsShowcase() {
  const [concept, setConcept] = useState(0);
  const [surface, setSurface] = useState<SurfaceKind>("length");
  const [kind, setKind] = useState<LengthKind>("time");
  const [frame, setFrame] = useState("desktop");
  const [applied, setApplied] = useState<Applied>(INITIAL_APPLIED);
  const [launch, setLaunch] = useState<{ seed: SeedId | null; run: number }>({ seed: null, run: 0 });
  const [stageRef, stageWidth] = useElementWidth();
  const phone = frame === "phone";
  const Concept = COMPONENTS[concept];
  const restart = (seed: SeedId | null = null) => setLaunch((current) => ({ seed, run: current.run + 1 }));
  const apply = (patch: Partial<Applied>) => setApplied((current) => ({ ...current, ...patch }));

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Switcher label="Concept" value={String(concept)} onChange={(value) => { setConcept(Number(value)); restart(); }}
          options={CONCEPTS.map((entry, index) => ({ id: String(index), label: <><span className="text-muted-foreground">{String(index + 1).padStart(2, "0")}</span> {entry.name}</> }))} />
        <Switcher label="Frame" options={FRAMES} value={frame} onChange={setFrame} />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Switcher label="What opens" options={SURFACES} value={surface} onChange={(value) => { setSurface(value as SurfaceKind); restart(); }} />
        {surface === "length" && <Switcher label="Test type" options={KINDS} value={kind} onChange={(value) => { setKind(value as LengthKind); restart(); }} />}
      </div>
      <p className="px-1 text-sm text-muted-foreground">
        <span className="font-semibold text-foreground">{CONCEPTS[concept].name}.</span> {CONCEPTS[concept].summary}
      </p>
      <div className="flex flex-wrap items-center gap-1.5 px-1">
        <span className="mr-1 text-xs text-muted-foreground">Open it with</span>
        {SEEDS.filter((seed) => surface === "text" || !seed.textOnly).map((seed) => (
          <button key={seed.id} type="button" onClick={() => restart(seed.id)}
            className={cn("h-7 rounded-full px-3 text-xs transition focus-visible:outline-2 focus-visible:outline-ring",
              seed.id === "current" ? "bg-primary/15 text-primary hover:bg-primary/25" : "bg-muted/70 text-muted-foreground hover:bg-accent hover:text-foreground")}>
            {seed.label}
          </button>
        ))}
      </div>

      <motion.div layout transition={LAB_SPRING} className={cn("mx-auto w-full", phone && "max-w-[375px]")}>
        <div className={cn("overflow-hidden bg-background shadow-sm", phone ? "rounded-[2.5rem] border-[6px] border-muted" : "rounded-3xl border border-border")}>
          {phone ? <PhoneBar /> : <BrowserBar />}
          <div ref={stageRef} className="@container relative overflow-hidden" style={{ height: phone ? 680 : 640 }}>
            <Concept key={`${concept}-${surface}-${kind}-${frame}-${launch.run}`} surface={surface} kind={kind} compact={stageWidth < COMPACT_WIDTH}
              applied={applied} apply={apply} initialSeed={launch.seed} />
          </div>
        </div>
      </motion.div>

      <div className="@container flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-xs text-muted-foreground">
        <span>Closed pill on Home</span>
        <ClosedPill surface={surface} kind={kind} applied={applied} />
        <button type="button" onClick={() => { setApplied(INITIAL_APPLIED); restart(); }}
          className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 transition hover:bg-accent hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring">
          <ArrowCounterClockwiseIcon className="size-3.5" aria-hidden="true" />
          Reset values
        </button>
      </div>
    </div>
  );
}

function Switcher({ label, options, value, onChange }: { label: string; options: { id: string; label: ReactNode }[]; value: string; onChange: (value: string) => void }) {
  return (
    <div role="group" aria-label={label} className="flex max-w-full flex-wrap gap-1 rounded-2xl bg-muted/60 p-1">
      {options.map((option) => (
        <button key={option.id} type="button" aria-pressed={value === option.id} onClick={() => onChange(option.id)}
          className="relative rounded-xl px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring aria-pressed:text-foreground">
          {value === option.id && <motion.span layoutId={`practice-dialogs-${label}`} transition={LAB_SPRING} className="absolute inset-0 rounded-xl bg-card shadow-sm" />}
          <span className="relative">{option.label}</span>
        </button>
      ))}
    </div>
  );
}

function BrowserBar() {
  return (
    <div aria-hidden="true" className="flex items-center gap-1.5 border-b border-border/60 bg-muted/40 px-3 py-2">
      <span className="size-2.5 rounded-full bg-destructive/60" />
      <span className="size-2.5 rounded-full bg-warning/60" />
      <span className="size-2.5 rounded-full bg-success/60" />
      <span className="ml-2 flex min-w-0 items-center gap-1 truncate rounded-full bg-background px-3 py-0.5 text-[11px] text-muted-foreground">
        <LockSimpleIcon className="size-3 shrink-0" />typesetgo.app
      </span>
    </div>
  );
}

function PhoneBar() {
  return (
    <div aria-hidden="true" className="flex items-center justify-between px-6 pt-2.5 pb-1 text-[11px] font-semibold">
      <span>9:41</span>
      <span className="h-5 w-20 rounded-full bg-muted" />
      <span className="flex items-center gap-1">
        <CellSignalFullIcon className="size-3.5" weight="fill" />
        <WifiHighIcon className="size-3.5" />
        <BatteryFullIcon className="size-4" weight="fill" />
      </span>
    </div>
  );
}
