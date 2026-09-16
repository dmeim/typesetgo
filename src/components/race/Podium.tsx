import { Trophy, Medal, Award } from "lucide-react";
import { tv } from "@/lib/theme-vars";

interface RaceRanking {
  sessionId: string;
  name: string;
  emoji?: string;
  position: number;
  wpm: number;
  accuracy: number;
  finishTime?: number;
  didFinish: boolean;
}

function formatTime(ms?: number) {
  if (ms === undefined) return "—";
  const seconds = Math.floor(ms / 1000);
  return `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, "0")}`;
}

export default function Podium({
  rankings,
  currentSessionId,
  showTable = true,
  showPodium = true,
}: {
  rankings: RaceRanking[];
  currentSessionId: string;
  showTable?: boolean;
  showPodium?: boolean;
}) {
  const finishers = rankings.filter((racer) => racer.didFinish).slice(0, 3);
  const podiumOrder = [finishers[1], finishers[0], finishers[2]].filter(
    Boolean,
  );
  return (
    <div className="min-w-0 w-full mx-auto">
      {showPodium && (
        <div className={showTable ? "mb-6" : ""}>
          {podiumOrder.length ? (
            <div className="flex items-end justify-center gap-2 sm:gap-4">
              {podiumOrder.map((racer) => {
                const Icon =
                  racer.position === 1
                    ? Trophy
                    : racer.position === 2
                      ? Medal
                      : Award;
                const color =
                  racer.position === 1
                    ? tv.status.warning.DEFAULT
                    : racer.position === 2
                      ? tv.ui.mutedForeground
                      : tv.ui.primary;
                return (
                  <div
                    key={racer.sessionId}
                    className="flex-1 min-w-0 max-w-40 text-center"
                  >
                    <div className="text-3xl mb-2" aria-hidden="true">
                      {racer.emoji || "🏎️"}
                    </div>
                    <p
                      className="text-sm font-semibold [overflow-wrap:anywhere]"
                      style={{
                        color:
                          racer.sessionId === currentSessionId
                            ? tv.ui.primary
                            : tv.ui.foreground,
                      }}
                    >
                      {racer.name}
                    </p>
                    <p
                      className="text-sm mt-1 mb-3"
                      style={{ color: tv.ui.mutedForeground }}
                    >
                      {racer.wpm} WPM
                    </p>
                    <div
                      className="rounded-t-lg border flex flex-col items-center justify-center gap-1"
                      style={{
                        height:
                          racer.position === 1
                            ? 144
                            : racer.position === 2
                              ? 112
                              : 80,
                        backgroundColor: tv.ui.secondary,
                        borderColor: color,
                        color,
                      }}
                    >
                      <Icon aria-hidden="true" size={24} />
                      <span
                        className="text-lg font-bold"
                        style={{ color: tv.ui.foreground }}
                      >
                        #{racer.position}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p
              className="text-center py-8"
              style={{ color: tv.ui.mutedForeground }}
            >
              No racers finished this race.
            </p>
          )}
        </div>
      )}
      {showTable && (
        <div
          role="region"
          aria-label="Race results table, scroll horizontally for more columns"
          tabIndex={0}
          className="w-full overflow-x-auto rounded-xl border"
          style={{ borderColor: tv.ui.border, backgroundColor: tv.ui.card }}
        >
          <table className="w-full min-w-[30rem] text-sm">
            <caption className="sr-only">All race results</caption>
            <thead
              style={{
                backgroundColor: tv.ui.secondary,
                color: tv.ui.mutedForeground,
              }}
            >
              <tr>
                <th scope="col" className="px-4 py-3 text-left">
                  Rank
                </th>
                <th scope="col" className="px-4 py-3 text-left">
                  Racer
                </th>
                <th scope="col" className="px-4 py-3 text-right">
                  WPM
                </th>
                <th scope="col" className="px-4 py-3 text-right">
                  Accuracy
                </th>
                <th scope="col" className="px-4 py-3 text-right">
                  Time
                </th>
              </tr>
            </thead>
            <tbody>
              {rankings.map((racer) => (
                <tr
                  key={racer.sessionId}
                  style={{
                    backgroundColor:
                      racer.sessionId === currentSessionId
                        ? tv.interactive.accent.subtle
                        : undefined,
                    color: tv.ui.foreground,
                    borderTop: `1px solid ${tv.ui.border}`,
                  }}
                >
                  <td className="px-4 py-3 font-semibold">{racer.position}</td>
                  <th scope="row" className="px-4 py-3 text-left font-medium">
                    <div className="flex items-center gap-2">
                      <span aria-hidden="true">{racer.emoji || "🏎️"}</span>
                      <span className="min-w-0 max-w-64 [overflow-wrap:anywhere]">
                        {racer.name}
                        {racer.sessionId === currentSessionId && " (you)"}
                      </span>
                    </div>
                  </th>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {racer.wpm}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {racer.accuracy}%
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums whitespace-nowrap">
                    {racer.didFinish ? (
                      formatTime(racer.finishTime)
                    ) : (
                      <abbr title="Did not finish" className="no-underline">
                        DNF
                      </abbr>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
