import { Link } from "react-router-dom";
import Header from "@/components/layout/Header";
import { useTheme } from "@/hooks/useTheme";
import type { LegacyTheme } from "@/types/theme";
import { GraduationCap } from "lucide-react";

export default function Lessons() {
  const { legacyTheme } = useTheme();

  // Fallback theme for when context is loading
  const theme: LegacyTheme = legacyTheme ?? {
    cursor: "#3cb5ee",
    defaultText: "#4b5563",
    upcomingText: "#4b5563",
    correctText: "#d1d5db",
    incorrectText: "#ef4444",
    ghostCursor: "#a855f7",
    buttonUnselected: "#3cb5ee",
    buttonSelected: "#0097b2",
    accentColor: "#a855f7",
    accentMuted: "rgba(168, 85, 247, 0.3)",
    accentSubtle: "rgba(168, 85, 247, 0.1)",
    backgroundColor: "#323437",
    surfaceColor: "#2c2e31",
    elevatedColor: "#37383b",
    overlayColor: "rgba(0, 0, 0, 0.5)",
    textPrimary: "#d1d5db",
    textSecondary: "#4b5563",
    textMuted: "rgba(75, 85, 99, 0.6)",
    textInverse: "#ffffff",
    borderDefault: "rgba(75, 85, 99, 0.3)",
    borderSubtle: "rgba(75, 85, 99, 0.15)",
    borderFocus: "#3cb5ee",
    statusSuccess: "#22c55e",
    statusSuccessMuted: "rgba(34, 197, 94, 0.3)",
    statusError: "#ef4444",
    statusErrorMuted: "rgba(239, 68, 68, 0.3)",
    statusWarning: "#f59e0b",
    statusWarningMuted: "rgba(245, 158, 11, 0.3)",
  };

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: theme.backgroundColor }}
    >
      <Header />

      {/* Main Content */}
      <main className="flex flex-1 flex-col items-center justify-center px-4 pt-20 pb-8">
        <div 
          className="text-center p-8 rounded-2xl max-w-md"
          style={{ backgroundColor: theme.surfaceColor }}
        >
          <div 
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6"
            style={{ backgroundColor: theme.accentMuted }}
          >
            <GraduationCap 
              className="w-8 h-8" 
              style={{ color: theme.accentColor }} 
            />
          </div>
          
          <h1 
            className="text-2xl font-bold mb-3"
            style={{ color: theme.textPrimary }}
          >
            Lessons Coming Soon
          </h1>
          
          <p 
            className="mb-6"
            style={{ color: theme.textSecondary }}
          >
            Structured typing lessons to help you improve your skills step by step. 
            From beginner fundamentals to advanced techniques.
          </p>
          
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors"
            style={{ 
              backgroundColor: theme.accentColor, 
              color: theme.textInverse 
            }}
          >
            Practice Typing
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="shrink-0 p-6 flex justify-center gap-8">
        <Link
          to="/about"
          className="text-sm transition-colors hover:opacity-80"
          style={{ color: theme.textSecondary }}
        >
          About
        </Link>
        <Link
          to="/privacy"
          className="text-sm transition-colors hover:opacity-80"
          style={{ color: theme.textSecondary }}
        >
          Privacy
        </Link>
        <Link
          to="/tos"
          className="text-sm transition-colors hover:opacity-80"
          style={{ color: theme.textSecondary }}
        >
          Terms
        </Link>
      </footer>
    </div>
  );
}
