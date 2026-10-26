import { ResultChips } from "./ResultChips";
import { CountUp, ResultActions } from "./ResultsPrimitives";
import { MOCK_SUMMARY } from "./mock-results";

/** Mockup 1: a calm hero, with summary chips that morph into detail panels when tapped. */
export function MorphingHeroResults() {
  return (
    <div className="flex w-full max-w-3xl flex-col items-center gap-8">
      <div className="flex items-end gap-10">
        <Hero value={MOCK_SUMMARY.wpm} label="words per minute" big />
        <Hero value={MOCK_SUMMARY.accuracy} label="accuracy" suffix="%" delay={150} />
      </div>
      <ResultChips />
      <ResultActions />
    </div>
  );
}

function Hero({ value, label, suffix = "", delay = 0, big = false }: { value: number; label: string; suffix?: string; delay?: number; big?: boolean }) {
  return (
    <div className="flex flex-col items-center">
      <CountUp value={value} suffix={suffix} delay={delay} className={`font-black leading-none ${big ? "text-7xl text-primary md:text-8xl" : "text-5xl text-foreground md:text-6xl"}`} />
      <span className="mt-2 text-xs uppercase tracking-widest text-muted-foreground">{label}</span>
    </div>
  );
}
