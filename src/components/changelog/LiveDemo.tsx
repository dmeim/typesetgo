import { lazy, Suspense, useState, type ReactNode } from "react";
import { LayoutGroup } from "framer-motion";
import { ArrowClockwiseIcon, CircleNotchIcon } from "@phosphor-icons/react";
import type { ChangelogDemo } from "@/lib/changelog";

// The demos are the UI Lab's working copies with pretend data, loaded only when someone opens one.
const SettingsPillDemo = lazy(async () => ({ default: (await import("@/components/temp/SettingsPillDemo")).SettingsPillDemo }));
const LiveStatsDemo = lazy(async () => ({ default: (await import("@/components/temp/LiveStatsDemo")).LiveStatsDemo }));
const ResultsDemo = lazy(async () => ({ default: (await import("@/components/temp/ResultsDemo")).ResultsDemo }));
const KeyboardShowcase = lazy(async () => ({ default: (await import("@/components/temp/keyboard/KeyboardShowcase")).KeyboardShowcase }));
const HeaderShowcase = lazy(async () => ({ default: (await import("@/components/temp/header/HeaderShowcase")).HeaderShowcase }));
const ConnectJoinDemo = lazy(async () => ({ default: (await import("./ConnectJoinDemo")).ConnectJoinDemo }));

const toggle = "rounded-full px-3 py-1 text-xs font-medium text-muted-foreground transition hover:bg-accent hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring aria-pressed:bg-accent aria-pressed:text-foreground";

function Stage({ className = "items-center", children }: { className?: string; children: ReactNode }) {
  return <div className={`flex justify-center overflow-hidden rounded-2xl bg-background px-4 py-8 ring-1 ring-border/60 ${className}`}>{children}</div>;
}

function Toggle({ pressed, onClick, children }: { pressed?: boolean; onClick: () => void; children: ReactNode }) {
  return <button type="button" aria-pressed={pressed} onClick={onClick} className={toggle}>{children}</button>;
}

function ResultsPlayground() {
  const [signedIn, setSignedIn] = useState(true);
  const [run, setRun] = useState(0);
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-1">
        <Toggle pressed={signedIn} onClick={() => setSignedIn((value) => !value)}>{signedIn ? "Signed in" : "Guest"}</Toggle>
        <Toggle onClick={() => setRun((value) => value + 1)}>
          <span className="flex items-center gap-1.5"><ArrowClockwiseIcon className="size-3.5" aria-hidden="true" />Replay</span>
        </Toggle>
      </div>
      <Stage>
        <LayoutGroup id="changelog-results" key={`${run}-${signedIn}`}>
          <ResultsDemo signedIn={signedIn} />
        </LayoutGroup>
      </Stage>
    </div>
  );
}

function HeaderPlayground() {
  const [typing, setTyping] = useState(false);
  const [phone, setPhone] = useState(false);
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-1">
        <Toggle pressed={typing} onClick={() => setTyping((value) => !value)}>Typing</Toggle>
        <Toggle pressed={phone} onClick={() => setPhone((value) => !value)}>Phone</Toggle>
      </div>
      <HeaderShowcase signedIn typing={typing} phone={phone} shippedOnly />
    </div>
  );
}

function DemoBody({ demo }: { demo: ChangelogDemo }) {
  switch (demo) {
    case "settings-pill":
      return <Stage className="min-h-[19rem] items-start"><SettingsPillDemo /></Stage>;
    case "live-stats":
      return <Stage><LiveStatsDemo /></Stage>;
    case "results":
      return <ResultsPlayground />;
    case "keyboard":
      return <KeyboardShowcase shippedOnly />;
    case "header":
      return <HeaderPlayground />;
    case "connect-landing":
      return <Stage><ConnectJoinDemo /></Stage>;
  }
}

/** A working copy of the feature with pretend data, so you can try it without leaving the page. */
export function LiveDemo({ demo }: { demo: ChangelogDemo }) {
  return (
    <Suspense
      fallback={
        <p role="status" className="flex items-center justify-center gap-2 rounded-2xl bg-background py-12 text-sm text-muted-foreground ring-1 ring-border/60">
          <CircleNotchIcon className="size-4 animate-spin" aria-hidden="true" />Loading the demo…
        </p>
      }
    >
      <DemoBody demo={demo} />
    </Suspense>
  );
}
