import { useState, type ComponentType, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { LayoutGroup } from "framer-motion";
import { ArrowClockwiseIcon, ArrowLeftIcon, FlaskIcon } from "@phosphor-icons/react";
import { LiveStatsDemo } from "@/components/temp/LiveStatsDemo";
import { SettingsPillDemo } from "@/components/temp/SettingsPillDemo";
import { BentoResults } from "@/components/temp/results/BentoResults";
import { DualAxisGraphResults } from "@/components/temp/results/DualAxisGraphResults";
import { MorphingHeroResults } from "@/components/temp/results/MorphingHeroResults";
import { ReportCardResults } from "@/components/temp/results/ReportCardResults";
import { SpeedGraphResults } from "@/components/temp/results/SpeedGraphResults";
import { TranscriptResults } from "@/components/temp/results/TranscriptResults";

interface ResultsMockup {
  id: string;
  title: string;
  summary: string;
  notes: string[];
  Component: ComponentType;
}

const RESULTS_MOCKUPS: ResultsMockup[] = [
  {
    id: "morphing-hero",
    title: "Morphing hero",
    summary: "Speed and accuracy count up in a calm hero. Correct, mistakes, characters and test details sit in small chips that morph into a detail panel when tapped, then shrink back.",
    notes: ["Same morph language as the settings pill", "Very little on screen until asked", "Uses only data we already have"],
    Component: MorphingHeroResults,
  },
  {
    id: "transcript",
    title: "Transcript",
    summary: "The passage you typed becomes the result. Mistakes are highlighted in place; hover or focus one to see what you typed. Filter to mistakes only, or replay the reveal.",
    notes: ["Mistakes shown in context", "Stats line matches the in-test ticker", "Long tests need a scroll or a mistakes-first view"],
    Component: TranscriptResults,
  },
  {
    id: "speed-graph",
    title: "Speed graph",
    summary: "Stat tiles over a speed-over-time chart that draws itself in. Red markers show where mistakes happened; drag across the chart to read any second.",
    notes: ["Shows how the test went, not just the end", "Familiar to experienced typists", "Needs new per-second speed and error tracking"],
    Component: SpeedGraphResults,
  },
  {
    id: "report-card",
    title: "Report card",
    summary: "Stars pop in with a friendly message, bars compare today with your average and best, and tricky words are flip cards: tap to see what you typed.",
    notes: ["Built for younger students", "Encouraging, practice-focused", "Average and best need account history"],
    Component: ReportCardResults,
  },
  {
    id: "bento",
    title: "Bento grid",
    summary: "Tiles slide in one after another: a big speed tile, an accuracy ring, a characters bar you can hover to isolate, and a words tile with sliding tabs.",
    notes: ["Everything visible at once, still organized", "Each tile has its own small interaction", "Densest of the five"],
    Component: BentoResults,
  },
  {
    id: "dual-axis-graph",
    title: "Speed and accuracy graph",
    summary: "Mockup 3 with accuracy on a second axis: speed is the solid line on the left scale, accuracy the dashed line on the right. Mistakes are marked on both lines, and the summary sentence is replaced by the morphing chips from mockup 1.",
    notes: ["Shows where accuracy dipped and why", "Chips keep word details one tap away", "Needs per-second speed, accuracy and error tracking"],
    Component: DualAxisGraphResults,
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
            Interactive mockups for the UI overhaul. Everything here uses local or fake data and does not change your saved preferences.
          </p>
        </header>

        <div className="flex flex-col gap-8">
          <Section id="settings-pill" title="Test settings pill" badge="on Home" summary="Difficulty and extras share the top row, then mode, then length.">
            <Stage className="min-h-[19rem] items-start">
              <SettingsPillDemo />
            </Stage>
          </Section>
          <Section id="live-stats" title="In-test stats ticker" badge="on Home" summary="Accuracy, speed, then time or words, over a 3px progress line. Driven by a simulated test.">
            <Stage>
              <LiveStatsDemo />
            </Stage>
          </Section>
        </div>

        <h2 className="mb-1 mt-12 text-xl font-semibold">Results page</h2>
        <p className="mb-6 max-w-2xl text-sm text-muted-foreground">
          Takes on the screen after a test, using the same fake 30-second attempt with four mistakes.
        </p>
        <div className="flex flex-col gap-8">
          {RESULTS_MOCKUPS.map((mockup, index) => (
            <ResultsSection key={mockup.id} entry={mockup} number={index + 1} />
          ))}
        </div>
      </div>
    </div>
  );
}

function ResultsSection({ entry, number }: { entry: ResultsMockup; number: number }) {
  const [run, setRun] = useState(0);
  const { Component } = entry;
  const replay = (
    <button type="button" onClick={() => setRun((value) => value + 1)} className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted-foreground transition hover:bg-accent hover:text-foreground">
      <ArrowClockwiseIcon className="size-3.5 shrink-0" aria-hidden="true" />
      Replay
    </button>
  );
  return (
    <Section id={entry.id} title={`${String(number).padStart(2, "0")} ${entry.title}`} summary={entry.summary} actions={replay}>
      <Stage>
        <LayoutGroup id={entry.id} key={run}>
          <Component />
        </LayoutGroup>
      </Stage>
      <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {entry.notes.map((note) => <li key={note}>· {note}</li>)}
      </ul>
    </Section>
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

function Stage({ className = "items-center", children }: { className?: string; children: ReactNode }) {
  return <div className={`flex justify-center rounded-xl bg-background px-4 py-10 ring-1 ring-border/60 ${className}`}>{children}</div>;
}
