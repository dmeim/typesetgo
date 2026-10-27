import { motion } from "framer-motion";
import { HourglassMediumIcon } from "@phosphor-icons/react";
import type { ConnectTest } from "@/lib/connect-types";
import { connectTestLabels } from "@/lib/connect-settings";
import { TestList } from "./TestList";

/** Host pacing: shown to someone who joined partway through a test until the host starts the next one. */
export function LateJoinScreen({ tests, index, name }: { tests: ConnectTest[]; index: number; name: string }) {
  const labels = connectTestLabels(tests);
  const current = labels[index]?.title ?? "a test";
  const next = labels[index + 1]?.title;
  return (
    <div className="flex w-full max-w-md flex-col items-center gap-5 text-center">
      <motion.span initial={{ scale: 0.6, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 300, damping: 12 }}
        className="flex size-20 items-center justify-center rounded-full bg-warning/15 text-warning">
        <HourglassMediumIcon weight="fill" className="size-10" aria-hidden="true" />
      </motion.span>
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-black">You'll start with the next test</h1>
        <p className="text-muted-foreground">
          The class is partway through <strong className="text-foreground">{current}</strong>. You're in
          as <strong className="text-foreground">{name}</strong> and jump in{next ? <> for <strong className="text-foreground">{next}</strong></> : " when the host starts the next test"}.
        </p>
        <p className="text-xs text-muted-foreground">Your teacher can also let you start now.</p>
      </div>
      <TestList tests={tests} currentIndex={index} />
    </div>
  );
}
