import { motion } from "framer-motion";
import { ConfettiIcon } from "@phosphor-icons/react";
import { isBreakTest, type ConnectResult, type ConnectTest } from "@/lib/connect-types";
import { connectTestLabels } from "@/lib/connect-settings";
import { CONNECT_SPRING } from "@/components/connect/connect-motion";
import { participantTestDetail } from "./test-labels";

const resultFor = (results: ConnectResult[], test: ConnectTest) => results.find((result) => result.testId === test.id);

function Stat({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div className="rounded-2xl bg-muted/50 p-4 text-center">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="text-4xl font-black tabular-nums">{value}{unit && <span className="ml-1 text-sm font-normal text-muted-foreground">{unit}</span>}</p>
    </div>
  );
}

/** All of a participant's results once the room (or their own run) is complete. */
export function RoomSummary({ tests, results, name }: { tests: ConnectTest[]; results: ConnectResult[]; name: string }) {
  const labels = connectTestLabels(tests);
  // Breaks record nothing, so the summary lists typing tests only.
  const rows = tests.flatMap((test, index) => isBreakTest(test) ? [] : [{ test, index, result: resultFor(results, test) }]);
  const recorded = rows.flatMap((row) => row.result ? [row.result] : []);
  const average = (pick: (result: ConnectResult) => number) =>
    recorded.length ? Math.round(recorded.reduce((sum, result) => sum + pick(result), 0) / recorded.length) : null;
  const averageWpm = average((result) => result.wpm);
  const averageAccuracy = average((result) => result.accuracy);

  return (
    <section aria-labelledby="summary-title" className="mx-auto flex w-full max-w-xl flex-col items-center gap-5 px-4 py-10">
      <motion.span initial={{ scale: 0, y: 20 }} animate={{ scale: 1, y: 0 }} transition={{ type: "spring", stiffness: 300, damping: 10 }} className="text-warning">
        <ConfettiIcon weight="fill" className="size-14" aria-hidden="true" />
      </motion.span>
      <div className="text-center">
        <h2 id="summary-title" className="text-3xl font-black">All done, {name}!</h2>
        <p className="text-muted-foreground">Here's how you did across the room's tests.</p>
      </div>
      <div className="grid w-full grid-cols-2 gap-3">
        <Stat label="Average speed" value={averageWpm === null ? "–" : String(averageWpm)} unit="wpm" />
        <Stat label="Average accuracy" value={averageAccuracy === null ? "–" : `${averageAccuracy}%`} />
      </div>
      <ol className="flex w-full flex-col divide-y divide-border rounded-2xl border border-border bg-card text-sm" aria-label="Your results">
        {rows.map(({ test, index, result }, position) => (
          <motion.li key={test.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ ...CONNECT_SPRING, delay: 0.2 + position * 0.06 }}
            className="flex items-center gap-3 px-4 py-3">
            <span className="w-6 shrink-0 tabular-nums text-muted-foreground">{position + 1}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-semibold">{labels[index].title}</span>
              <span className="block truncate text-xs text-muted-foreground">{participantTestDetail(test)}</span>
            </span>
            {result ? (
              <span className="shrink-0 text-right tabular-nums">
                <strong>{Math.round(result.wpm)} wpm</strong>
                <span className="ml-3 text-muted-foreground">{Math.round(result.accuracy)}%</span>
              </span>
            ) : <span className="shrink-0 text-muted-foreground">Skipped</span>}
          </motion.li>
        ))}
      </ol>
    </section>
  );
}
