import type { Plan, PlanStepResult } from "@/types/plan";
import { GLOBAL_COLORS } from "@/lib/colors";

interface PlanResultsModalProps {
  user: {
    id: string;
    name: string;
  };
  plan: Plan;
  results: Record<string, PlanStepResult>;
  onClose: () => void;
}

export default function PlanResultsModal({
  user,
  plan,
  results,
  onClose,
}: PlanResultsModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl max-h-[80vh] flex flex-col rounded-xl overflow-hidden shadow-2xl border border-gray-800 animate-fade-in"
        style={{ backgroundColor: GLOBAL_COLORS.surface }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-800 flex justify-between items-center bg-gray-900/50">
          <div>
            <h2 className="text-xl font-bold text-gray-200">Session Results</h2>
            <div className="text-sm text-gray-400">
              User: <span className="text-sky-400 font-medium">{user.name}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-800 text-gray-500 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-gray-700">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-800 text-xs text-gray-500 uppercase tracking-wider">
                <th className="pb-3 pl-2 font-medium">Step</th>
                <th className="pb-3 font-medium">Test</th>
                <th className="pb-3 text-right font-medium">WPM</th>
                <th className="pb-3 text-right font-medium">Acc</th>
                <th className="pb-3 text-right font-medium pr-2">Raw</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/50">
              {plan.map((item, index) => {
                const result = results[item.id];
                const isCompleted = !!result;

                return (
                  <tr
                    key={item.id}
                    className="group hover:bg-white/5 transition-colors"
                  >
                    {/* Step Info */}
                    <td className="py-4 pl-2">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-mono text-gray-600 w-6">
                          {index + 1}
                        </span>
                        <div>
                          <div className="font-medium text-gray-300 group-hover:text-white transition-colors">
                            {item.metadata.title}
                          </div>
                          <div className="text-xs text-gray-500">
                            {item.metadata.subtitle}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Mode Info */}
                    <td className="py-4">
                      <span className="px-2 py-0.5 rounded text-[10px] bg-gray-800 text-gray-400 border border-gray-700 uppercase tracking-wider font-semibold">
                        {item.mode}
                      </span>
                    </td>

                    {/* Stats */}
                    <td className="py-4 text-right font-mono text-lg font-bold text-gray-200">
                      {isCompleted ? (
                        Math.round(result.wpm)
                      ) : (
                        <span className="text-gray-700">-</span>
                      )}
                    </td>
                    <td className="py-4 text-right font-mono text-lg font-bold text-gray-200">
                      {isCompleted ? (
                        <span
                          className={
                            result.accuracy < 90
                              ? "text-red-400"
                              : result.accuracy < 95
                                ? "text-yellow-400"
                                : "text-green-400"
                          }
                        >
                          {Math.round(result.accuracy)}%
                        </span>
                      ) : (
                        <span className="text-gray-700">-</span>
                      )}
                    </td>
                    <td className="py-4 text-right pr-2 font-mono text-gray-500">
                      {isCompleted ? (
                        Math.round(result.raw || result.wpm)
                      ) : (
                        <span className="text-gray-700">-</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {plan.length === 0 && (
            <div className="text-center text-gray-500 py-10">
              No plan steps found.
            </div>
          )}
        </div>

        {/* Footer Summary */}
        <div className="p-4 border-t border-gray-800 bg-gray-900/30 flex justify-between items-center text-sm text-gray-400">
          <div>Total Steps: {plan.length}</div>
          <div>Completed: {Object.keys(results).length}</div>
        </div>
      </div>
    </div>
  );
}
