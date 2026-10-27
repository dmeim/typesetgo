import { useEffect, useRef } from "react";
import { PlayIcon } from "@phosphor-icons/react";
import { motion, useReducedMotion } from "framer-motion";
import type { ConnectTest } from "@/lib/connect-types";
import { connectTestLabels } from "@/lib/connect-settings";
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

  return (
    <section aria-labelledby="up-next-title" className="mx-auto flex w-full max-w-md flex-col gap-5 px-4 py-10">
      <motion.div className="text-center" initial={reducedMotion ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: "easeOut" }}>
        <h2 id="up-next-title" className="text-xs font-bold uppercase tracking-widest text-primary">Up next</h2>
        <p className="text-2xl font-black">{label.title}</p>
        <p className="text-sm text-muted-foreground">{participantTestDetail(test)}</p>
      </motion.div>
      <TestList tests={tests} currentIndex={nextIndex} animated />
      <div className="h-1 overflow-hidden rounded-full bg-muted" aria-hidden="true">
        {!reducedMotion && (
          <motion.div className="h-full bg-primary" initial={{ width: "0%" }} animate={{ width: "100%" }}
            transition={{ duration: UP_NEXT_AUTO_CONTINUE_MS / 1000, ease: "linear" }} />
        )}
      </div>
      <motion.button ref={startRef} type="button" onClick={onContinue} whileTap={{ scale: 0.96 }}
        className="flex h-11 items-center justify-center gap-2 self-center rounded-full bg-primary px-6 text-sm font-bold text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
        <PlayIcon weight="fill" className="size-4" aria-hidden="true" />
        Start
      </motion.button>
    </section>
  );
}
