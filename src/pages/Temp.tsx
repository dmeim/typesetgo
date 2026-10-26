import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { LayoutGroup } from "framer-motion";
import { ArrowClockwiseIcon, ArrowLeftIcon, FlaskIcon } from "@phosphor-icons/react";
import { LiveStatsDemo } from "@/components/temp/LiveStatsDemo";
import { SettingsPillDemo } from "@/components/temp/SettingsPillDemo";
import { ResultsDemo } from "@/components/temp/ResultsDemo";

const SETTINGS_MOCKUPS: [number, string, string][] = [
  [1, "Split view", "Your stats, history and achievements plus every setting in one place, with live previews. Five achievement and five history styles to compare."],
  [3, "Studio", "A big live preview beside tabbed controls. Kept for reference."],
];

const LEADERBOARD_MOCKUPS: [number, string, string][] = [
  [1, "Arena", "One big podium; switching period morphs players between places."],
  [2, "Three boards", "Today, 7 days and all time side by side; hover a player to find them on every board."],
  [3, "Spotlight", "The leader in a spotlight, period cards with reset timers, and who to chase next."],
  [4, "Race track", "Everyone in a lane, positioned by speed, racing to the finish line."],
  [5, "Standings", "Your rank in every period beside a searchable, dense table."],
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
          <ResultsSection />
          <Section id="settings-page" title="Settings page" summary="Full-page takes on one combined settings and themes page. Each opens on its own page with a switcher at the bottom.">
            <div className="grid gap-3 sm:grid-cols-2">
              {SETTINGS_MOCKUPS.map(([number, name, summary]) => (
                <Link key={name} to={`/temp-settings${number}`} className="flex flex-col gap-1 rounded-xl border border-border bg-card p-4 transition hover:-translate-y-0.5 hover:border-primary">
                  <span className="text-xs text-muted-foreground">{String(number).padStart(2, "0")}</span>
                  <span className="font-semibold">{name}</span>
                  <span className="text-xs text-muted-foreground">{summary}</span>
                </Link>
              ))}
            </div>
          </Section>
          <Section id="leaderboard-page" title="Leaderboard page" summary="Five takes on the leaderboard, each keeping the top-three podium and the Today, 7 days and All time boards.">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {LEADERBOARD_MOCKUPS.map(([number, name, summary]) => (
                <Link key={name} to={`/temp-leaderboard${number}`} className="flex flex-col gap-1 rounded-xl border border-border bg-card p-4 transition hover:-translate-y-0.5 hover:border-primary">
                  <span className="text-xs text-muted-foreground">{String(number).padStart(2, "0")}</span>
                  <span className="font-semibold">{name}</span>
                  <span className="text-xs text-muted-foreground">{summary}</span>
                </Link>
              ))}
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}

function ResultsSection() {
  const [run, setRun] = useState(0);
  const [signedIn, setSignedIn] = useState(true);
  const actions = (
    <div className="flex items-center gap-1">
      <button type="button" aria-pressed={signedIn} onClick={() => setSignedIn((value) => !value)} className="rounded-md px-2 py-1 text-xs text-muted-foreground transition hover:bg-accent hover:text-foreground">
        {signedIn ? "Signed in" : "Guest"}
      </button>
      <button type="button" onClick={() => setRun((value) => value + 1)} className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted-foreground transition hover:bg-accent hover:text-foreground">
        <ArrowClockwiseIcon className="size-3.5 shrink-0" aria-hidden="true" />
        Replay
      </button>
    </div>
  );
  return (
    <Section id="results" title="Results page" badge="on Home" summary="Speed and accuracy compared with your recent average and best, a two-axis graph with mistakes marked, and chips that morph into word details. Fake 30-second test; toggle Guest to hide the comparison." actions={actions}>
      <Stage>
        <LayoutGroup id="results" key={`${run}-${signedIn}`}>
          <ResultsDemo signedIn={signedIn} />
        </LayoutGroup>
      </Stage>
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
