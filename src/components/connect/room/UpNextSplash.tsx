import { useEffect, useRef } from "react";
import { PlayIcon } from "@phosphor-icons/react";
import { motion, useReducedMotion } from "framer-motion";
import type { ConnectTest } from "@/lib/connect-types";
import { connectTestLabels } from "@/lib/connect-settings";
import { Button } from "@/components/ui/button";
import { TestList } from "./TestList";
import { participantTestDetail } from "./test-labels";

export const UP_NEXT_AUTO_CONTINUE_MS = 2500;

/** Brief "Up next" interstitial between self-paced tests; continues on its own. */
export function UpNextSplash({ tests, nextIndex, onContinue }: { tests: ConnectTest[]; nextIndex: number; onContinue: () => void }) {
  const reducedMotion = useReducedMotion();
  const startRef = useRef<HTMLButtonElement>(null);
  const continueRef = useRef(onContinue);
  useEffect(() => { continueRef.current = onContinue; }, [onContinue]);

  useEffect(() => {
    startRef.current?.focus({ preventScroll: true });
    const timer = setTimeout(() => continueRef.current(), UP_NEXT_AUTO_CONTINUE_MS);
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Enter" || event.defaultPrevented || event.isComposing) return;
      if (event.target instanceof HTMLButtonElement) return;
      event.preventDefault();
      continueRef.current();
    };
    window.addEventListener("keydown", onKey);
    return () => { clearTimeout(timer); window.removeEventListener("keydown", onKey); };
  }, []);

  const test = tests[nextIndex];
  if (!test) return null;
  const label = connectTestLabels(tests)[nextIndex];
  const fade = (delay: number) => reducedMotion
    ? { initial: false as const }
    : { initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.3, delay, ease: "easeOut" as const } };

  return (
    <section aria-labelledby="up-next-title" className="mx-auto flex w-full max-w-md flex-col items-center gap-6 px-4 py-10 text-center">
      <div className="space-y-2">
        <motion.h2 id="up-next-title" className="text-3xl font-bold tracking-tight sm:text-4xl" {...fade(0)}>
          Up next
        </motion.h2>
        <motion.p className="text-muted-foreground" {...fade(0.08)}>
          <span className="font-medium text-foreground">{label.title}</span> · {participantTestDetail(test)}
        </motion.p>
      </div>
      <TestList tests={tests} currentIndex={nextIndex} animated />
      <Button ref={startRef} size="lg" onClick={onContinue}>
        <PlayIcon aria-hidden="true" />
        Start
      </Button>
      {!reducedMotion && (
        <div className="h-1 w-32 overflow-hidden rounded-full bg-muted" aria-hidden="true">
          <motion.div
            className="h-full bg-primary"
            initial={{ width: "0%" }}
            animate={{ width: "100%" }}
            transition={{ duration: UP_NEXT_AUTO_CONTINUE_MS / 1000, ease: "linear" }}
          />
        </div>
      )}
    </section>
  );
}
