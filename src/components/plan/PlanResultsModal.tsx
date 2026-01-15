import type { Plan, PlanStepResult } from "@/types/plan";
import type { Theme } from "@/lib/typing-constants";
import { DEFAULT_THEME } from "@/lib/typing-constants";

interface PlanResultsModalProps {
  user: {
    id: string;
    name: string;
  };
  plan: Plan;
  results: Record<string, PlanStepResult>;
  onClose: () => void;
  theme?: Theme;
}

export default function PlanResultsModal({
  user,
  plan,
  results,
  onClose,
  theme = DEFAULT_THEME,
}: PlanResultsModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl max-h-[80vh] flex flex-col rounded-xl overflow-hidden shadow-2xl animate-fade-in"
        style={{ backgroundColor: theme.surfaceColor, borderWidth: 1, borderColor: `${theme.defaultText}30` }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 flex justify-between items-center" style={{ borderBottomWidth: 1, borderColor: `${theme.defaultText}30`, backgroundColor: `${theme.backgroundColor}80` }}>
          <div>
            <h2 className="text-xl font-bold" style={{ color: theme.correctText }}>Session Results</h2>
            <div className="text-sm" style={{ color: theme.defaultText }}>
              User: <span className="font-medium" style={{ color: theme.buttonSelected }}>{user.name}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full transition-colors hover:opacity-80"
            style={{ color: theme.defaultText }}
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-xs uppercase tracking-wider" style={{ borderBottomWidth: 1, borderColor: `${theme.defaultText}30` }}>
                <th className="pb-3 pl-2 font-medium" style={{ color: theme.defaultText }}>Step</th>
                <th className="pb-3 font-medium" style={{ color: theme.defaultText }}>Test</th>
                <th className="pb-3 text-right font-medium" style={{ color: theme.defaultText }}>WPM</th>
                <th className="pb-3 text-right font-medium" style={{ color: theme.defaultText }}>Acc</th>
                <th className="pb-3 text-right font-medium pr-2" style={{ color: theme.defaultText }}>Raw</th>
              </tr>
            </thead>
            <tbody>
              {plan.map((item, index) => {
                const result = results[item.id];
                const isCompleted = !!result;

                return (
                  <tr
                    key={item.id}
                    className="group hover:opacity-80 transition-opacity"
                    style={{ borderBottomWidth: 1, borderColor: `${theme.defaultText}15` }}
                  >
                    {/* Step Info */}
                    <td className="py-4 pl-2">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-mono w-6" style={{ color: theme.defaultText }}>
                          {index + 1}
                        </span>
                        <div>
                          <div className="font-medium transition-colors" style={{ color: theme.correctText }}>
                            {item.metadata.title}
                          </div>
                          <div className="text-xs" style={{ color: theme.defaultText }}>
                            {item.metadata.subtitle}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Mode Info */}
                    <td className="py-4">
                      <span 
                        className="px-2 py-0.5 rounded text-[10px] uppercase tracking-wider font-semibold"
                        style={{ backgroundColor: `${theme.buttonSelected}20`, color: theme.buttonSelected, borderWidth: 1, borderColor: `${theme.buttonSelected}40` }}
                      >
                        {item.mode}
                      </span>
                    </td>

                    {/* Stats */}
                    <td className="py-4 text-right font-mono text-lg font-bold" style={{ color: theme.correctText }}>
                      {isCompleted ? (
                        Math.round(result.wpm)
                      ) : (
                        <span style={{ color: theme.defaultText }}>-</span>
                      )}
                    </td>
                    <td className="py-4 text-right font-mono text-lg font-bold">
                      {isCompleted ? (
                        <span
                          style={{
                            color: result.accuracy < 90
                              ? theme.incorrectText
                              : result.accuracy < 95
                                ? theme.cursor
                                : theme.buttonSelected
                          }}
                        >
                          {Math.round(result.accuracy)}%
                        </span>
                      ) : (
                        <span style={{ color: theme.defaultText }}>-</span>
                      )}
                    </td>
                    <td className="py-4 text-right pr-2 font-mono" style={{ color: theme.defaultText }}>
                      {isCompleted ? (
                        Math.round(result.raw || result.wpm)
                      ) : (
                        <span style={{ color: `${theme.defaultText}50` }}>-</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {plan.length === 0 && (
            <div className="text-center py-10" style={{ color: theme.defaultText }}>
              No plan steps found.
            </div>
          )}
        </div>

        {/* Footer Summary */}
        <div className="p-4 flex justify-between items-center text-sm" style={{ borderTopWidth: 1, borderColor: `${theme.defaultText}30`, backgroundColor: `${theme.backgroundColor}50`, color: theme.defaultText }}>
          <div>Total Steps: {plan.length}</div>
          <div>Completed: {Object.keys(results).length}</div>
        </div>
      </div>
    </div>
  );
}
