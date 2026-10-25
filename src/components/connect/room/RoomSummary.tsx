import { isBreakTest, type ConnectResult, type ConnectTest } from "@/lib/connect-types";
import { connectTestLabels } from "@/lib/connect-settings";
import { participantTestDetail } from "./test-labels";

const resultFor = (results: ConnectResult[], test: ConnectTest) => results.find((result) => result.testId === test.id);

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
    <section aria-labelledby="summary-title" className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-10">
      <div className="space-y-1 text-center">
        <h2 id="summary-title" className="text-3xl font-bold tracking-tight">All done, {name}!</h2>
        <p className="text-muted-foreground">Here's how you did across the room's tests.</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Average WPM</div>
          <div className="text-4xl font-black tabular-nums text-primary">{averageWpm ?? "—"}</div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Average accuracy</div>
          <div className="text-4xl font-black tabular-nums text-primary">{averageAccuracy === null ? "—" : `${averageAccuracy}%`}</div>
        </div>
      </div>
      <ol className="flex flex-col divide-y divide-border rounded-xl border border-border bg-card" aria-label="Your results">
        {rows.map(({ test, index, result }, position) => (
          <li key={test.id} className="flex items-center gap-3 px-4 py-3 text-sm">
            <span className="w-6 shrink-0 tabular-nums text-muted-foreground">{position + 1}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium">{labels[index].title}</span>
              <span className="block truncate text-xs text-muted-foreground">{participantTestDetail(test)}</span>
            </span>
            {result ? (
              <span className="shrink-0 text-right tabular-nums">
                <span className="font-semibold">{Math.round(result.wpm)} wpm</span>
                <span className="ml-3 text-muted-foreground">{Math.round(result.accuracy)}%</span>
              </span>
            ) : <span className="shrink-0 text-muted-foreground">No result</span>}
          </li>
        ))}
      </ol>
    </section>
  );
}
