import { useLayoutEffect, useRef, useState, type ComponentType, type ReactNode } from "react";
import { motion } from "framer-motion";
import { ArrowsVerticalIcon, CheckCircleIcon, LockSimpleIcon } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { DockHeader } from "@/components/temp/header/DockHeader";
import { NOTIFICATIONS } from "@/components/temp/header/header-mock";
import { LAB_SPRING } from "@/components/temp/settings/lab-settings";
import { BentoResults } from "./BentoResults";
import { GraphFirstResults } from "./GraphFirstResults";
import { ScoreboardResults } from "./ScoreboardResults";
import { SideColumnResults } from "./SideColumnResults";
import { TabbedResults } from "./TabbedResults";
import { LAYOUTS, SCREENS, useSaveDemo, type ResultsLayoutProps, type ScreenId } from "./results-layouts";

const COMPONENTS: ComponentType<ResultsLayoutProps>[] = [SideColumnResults, ScoreboardResults, GraphFirstResults, BentoResults, TabbedResults];

/** The five one-screen results layouts in a page-sized frame that reports whether they fit or scroll. */
export function ResultsLayoutShowcase() {
  const [layout, setLayout] = useState(0);
  const [screenId, setScreenId] = useState<ScreenId>("laptop");
  const [run, setRun] = useState(0);
  const save = useSaveDemo();
  const screen = SCREENS.find((candidate) => candidate.id === screenId) ?? SCREENS[0];
  const Layout = COMPONENTS[layout];
  const replay = () => {
    save.reset();
    setRun((value) => value + 1);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Switcher
          label="Layout"
          options={LAYOUTS.map((entry, index) => ({ id: String(index), label: <><span className="text-muted-foreground">{String(index + 1).padStart(2, "0")}</span> {entry.name}</> }))}
          value={String(layout)}
          onChange={(value) => { setLayout(Number(value)); replay(); }}
        />
        <Switcher
          label="Screen"
          options={SCREENS.map((entry) => ({ id: entry.id, label: entry.label }))}
          value={screenId}
          onChange={(value) => setScreenId(value as ScreenId)}
        />
      </div>
      <p className="px-1 text-sm text-muted-foreground">
        <span className="font-semibold text-foreground">{LAYOUTS[layout].name}.</span> {LAYOUTS[layout].summary}
        <span className="block text-xs">Screen: {screen.detail}.</span>
      </p>
      <MockScreen frame={screen.frame} height={screen.height} watch={`${layout}-${screenId}-${run}`}>
        <Layout key={run} save={save} replay={replay} />
      </MockScreen>
    </div>
  );
}

function Switcher({ label, options, value, onChange }: { label: string; options: { id: string; label: ReactNode }[]; value: string; onChange: (value: string) => void }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-1 rounded-2xl bg-muted/60 p-1">
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          role="radio"
          aria-checked={value === option.id}
          onClick={() => onChange(option.id)}
          className="relative rounded-xl px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring aria-checked:text-foreground"
        >
          {value === option.id && <motion.span layoutId={`results-switch-${label}`} transition={LAB_SPRING} className="absolute inset-0 rounded-xl bg-card shadow-sm" />}
          <span className="relative">{option.label}</span>
        </button>
      ))}
    </div>
  );
}

/** A browser-sized frame: the locked-in header, the results, and the footer. Measures how far the results overflow. */
function MockScreen({ frame, height, watch, children }: { frame: string; height: number; watch: string; children: ReactNode }) {
  const main = useRef<HTMLElement>(null);
  const [overflow, setOverflow] = useState(0);

  useLayoutEffect(() => {
    const node = main.current;
    if (!node) return;
    const measure = () => setOverflow(Math.max(0, node.scrollHeight - node.clientHeight));
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    for (const child of node.querySelectorAll(":scope > *, :scope > * > *")) observer.observe(child);
    // Counters and bars settle after mounting.
    const late = window.setTimeout(measure, 700);
    measure();
    return () => {
      observer.disconnect();
      window.clearTimeout(late);
    };
  }, [watch]);

  return (
    <motion.div layout transition={LAB_SPRING} className={cn("mx-auto w-full overflow-hidden rounded-3xl border border-border bg-background shadow-sm", frame)}>
      <div className="flex items-center gap-1.5 border-b border-border/60 bg-muted/40 px-3 py-2">
        <span aria-hidden="true" className="size-2.5 rounded-full bg-destructive/60" />
        <span aria-hidden="true" className="size-2.5 rounded-full bg-warning/60" />
        <span aria-hidden="true" className="size-2.5 rounded-full bg-success/60" />
        <span aria-hidden="true" className="ml-2 flex min-w-0 items-center gap-1 truncate rounded-full bg-background px-3 py-0.5 text-[11px] text-muted-foreground">
          <LockSimpleIcon className="size-3 shrink-0" />typesetgo.app
        </span>
        <span role="status" className={cn("ml-auto inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold", overflow ? "bg-warning/15 text-warning" : "bg-success/15 text-success")}>
          {overflow ? <ArrowsVerticalIcon className="size-3.5" aria-hidden="true" /> : <CheckCircleIcon className="size-3.5" weight="fill" aria-hidden="true" />}
          {overflow ? `Scrolls ${overflow}px` : "Fits on one screen"}
        </span>
      </div>
      <div className="@container flex flex-col" style={{ height }}>
        {/* The dock header's root grows with its content; min-h-0 lets the results area scroll instead. */}
        <div className="flex min-h-0 flex-1 flex-col [&>div]:min-h-0">
          <DockHeader signedIn typing={false} page="type" go={() => {}} dark toggleDark={() => {}} notifications={NOTIFICATIONS} readAll={() => {}}>
            <main ref={main} className="@container min-h-0 flex-1 overflow-y-auto px-4 pt-4 pb-2 @min-[60rem]:px-[7%]">
              <div className="mx-auto h-full w-full max-w-5xl">{children}</div>
            </main>
            <footer className="flex shrink-0 justify-center gap-3 py-2 text-[11px] text-muted-foreground" aria-hidden="true">
              <span>About</span><span>|</span><span>Privacy Policy</span><span>|</span><span>Terms of Service</span>
            </footer>
          </DockHeader>
        </div>
      </div>
    </motion.div>
  );
}
