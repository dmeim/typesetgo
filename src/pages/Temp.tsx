import { useState, type ComponentType, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { LayoutGroup } from "framer-motion";
import { ArrowClockwiseIcon, ArrowLeftIcon, FlaskIcon } from "@phosphor-icons/react";
import { SettingsPillDemo } from "@/components/temp/SettingsPillDemo";
import { FillCapsuleMockup } from "@/components/temp/stats/FillCapsuleMockup";
import { InlineTickerMockup } from "@/components/temp/stats/InlineTickerMockup";
import { MorphingStatsMockup } from "@/components/temp/stats/MorphingStatsMockup";
import { RaceTrackMockup } from "@/components/temp/stats/RaceTrackMockup";
import { RingTimerMockup } from "@/components/temp/stats/RingTimerMockup";
import { MockPrompt } from "@/components/temp/stats/StatsPrimitives";
import { useSimulatedRun, type SimulatedMode, type SimulatedRun } from "@/components/temp/stats/useSimulatedRun";

interface StatsMockup {
  id: string;
  title: string;
  summary: string;
  notes: string[];
  Component: ComponentType<{ run: SimulatedRun }>;
}

const STATS_MOCKUPS: StatsMockup[] = [
  {
    id: "morphing-stats",
    title: "Morphing stats pill",
    summary: "Speed and time in one small pill with a hairline of progress. Hover or click and it morphs into a full card with accuracy and a speed graph. In the last ten seconds it grows the countdown on its own.",
    notes: ["Same morph language as the settings pill", "Smallest footprint while typing", "Detail on demand"],
    Component: MorphingStatsMockup,
  },
  {
    id: "inline-ticker",
    title: "Inline ticker",
    summary: "No pills or cards. Numbers roll like an odometer on a single quiet line, with a one-pixel progress line the width of the prompt.",
    notes: ["Least visual weight", "Progress lines up with the text", "Numbers may be harder for young kids to spot"],
    Component: InlineTickerMockup,
  },
  {
    id: "ring-timer",
    title: "Ring timer",
    summary: "Progress wraps around the countdown as a ring. Speed sits on the left, accuracy on the right, and the countdown pops each second near the end.",
    notes: ["Instantly readable time left", "One focal point", "Taller than a single line"],
    Component: RingTimerMockup,
  },
  {
    id: "fill-capsule",
    title: "Filling capsule",
    summary: "The three pills and the progress bar merge into one capsule. The capsule itself fills from left to right as the test goes on.",
    notes: ["Four elements become one", "Familiar layout, less clutter", "Fill is subtle on low-contrast themes"],
    Component: FillCapsuleMockup,
  },
  {
    id: "race-track",
    title: "Race track",
    summary: "A small track where your speed rides along in a bubble toward the finish flag. Time or words left and accuracy wait at the flag.",
    notes: ["Playful and clear for kids", "Progress you can feel", "Wider than the other options"],
    Component: RaceTrackMockup,
  },
];

export default function Temp() {
  return (
    <div className="min-h-[100dvh] bg-background px-4 py-12 font-mono text-foreground transition-colors duration-300">
      <div className="mx-auto w-full max-w-5xl animate-fade-in">
        <Link to="/" className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground">
          <ArrowLeftIcon className="size-4 shrink-0" aria-hidden="true" />
          Back to Homepage
        </Link>
        <header className="mb-10 flex flex-col gap-2">
          <h1 className="inline-flex items-center gap-3 text-3xl font-bold text-primary">
            <FlaskIcon className="size-7 shrink-0" aria-hidden="true" />
            UI Lab
          </h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Interactive mockups for the UI overhaul. Everything here uses local state and does not change your saved preferences.
          </p>
        </header>

        <Section id="settings-pill" title="Test settings pill" badge="on Home" summary="The shipping settings pill: difficulty and extras share the top row, then mode, then length.">
          <div className="flex min-h-[19rem] items-start justify-center rounded-xl bg-background px-4 py-10 ring-1 ring-border/60">
            <SettingsPillDemo />
          </div>
        </Section>

        <h2 className="mb-1 mt-12 text-xl font-semibold">In-test stats</h2>
        <p className="mb-6 max-w-2xl text-sm text-muted-foreground">
          Five takes on the live WPM, accuracy, time or word count, and progress shown above the prompt. Each runs a simulated test that loops.
        </p>
        <div className="flex flex-col gap-8">
          {STATS_MOCKUPS.map((mockup, index) => (
            <StatsSection key={mockup.id} entry={mockup} number={index + 1} />
          ))}
        </div>
      </div>
    </div>
  );
}

function Section({ id, title, badge, summary, actions, children }: { id: string; title: string; badge?: string; summary: string; actions?: ReactNode; children: ReactNode }) {
  return (
    <section aria-labelledby={`${id}-title`} className="rounded-2xl border border-border p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="flex max-w-2xl flex-col gap-1">
          <h3 id={`${id}-title`} className="flex items-center gap-2 text-lg font-semibold">
            {title}
            {badge && <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-primary">{badge}</span>}
          </h3>
          <p className="text-sm text-muted-foreground">{summary}</p>
        </div>
        {actions}
      </div>
      {children}
    </section>
  );
}

const SIM_MODES: SimulatedMode[] = ["time", "words", "zen"];

function StatsSection({ entry, number }: { entry: StatsMockup; number: number }) {
  const [mode, setMode] = useState<SimulatedMode>("time");
  const [seed, setSeed] = useState(number);
  const run = useSimulatedRun(mode, seed);
  const { Component } = entry;
  const actions = (
    <div className="flex items-center gap-1 text-xs">
      {SIM_MODES.map((option) => (
        <button
          key={option}
          type="button"
          aria-pressed={mode === option}
          onClick={() => setMode(option)}
          className={`rounded-md px-2 py-1 transition ${mode === option ? "bg-accent text-primary" : "text-muted-foreground hover:text-foreground"}`}
        >
          {option}
        </button>
      ))}
      <button type="button" onClick={() => setSeed((value) => value + 1)} className="ml-1 inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-muted-foreground transition hover:bg-accent hover:text-foreground">
        <ArrowClockwiseIcon className="size-3.5 shrink-0" aria-hidden="true" />
        Restart
      </button>
    </div>
  );

  return (
    <Section id={entry.id} title={`${String(number).padStart(2, "0")} ${entry.title}`} summary={entry.summary} actions={actions}>
      <div className="flex min-h-64 flex-col items-center justify-center gap-8 overflow-hidden rounded-xl bg-background px-4 py-10 ring-1 ring-border/60">
        <LayoutGroup id={entry.id}>
          <Component run={run} />
        </LayoutGroup>
        <MockPrompt run={run} />
      </div>
      <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {entry.notes.map((note) => <li key={note}>· {note}</li>)}
      </ul>
    </Section>
  );
}
