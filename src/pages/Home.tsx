import { useState } from "react";
import { Link } from "react-router-dom";
import TypingPractice from "@/components/typing/TypingPractice";
import Header from "@/components/layout/Header";
import { useTheme } from "@/hooks/useTheme";
import type { LegacyTheme } from "@/types/theme";

export default function Home() {
  const { legacyTheme } = useTheme();
  const [showSettings, setShowSettings] = useState(false);
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [isTyping, setIsTyping] = useState(false);

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
      className="min-h-screen relative"
      style={{ backgroundColor: theme.backgroundColor }}
    >
      {/* Header with action buttons */}
      <Header hidden={isTyping} onOpenThemeModal={() => setShowThemeModal(true)} />

      {/* Main Content - TypingPractice fills the page */}
      <TypingPractice
        showSettings={showSettings}
        setShowSettings={setShowSettings}
        showThemeModal={showThemeModal}
        setShowThemeModal={setShowThemeModal}
        onTypingStateChange={setIsTyping}
      />

      {/* Footer with legal links - always visible for Google verification compliance */}
      <footer
        className="fixed bottom-4 left-0 right-0 flex justify-center gap-4 text-xs"
        style={{ color: theme.textSecondary }}
      >
        <Link to="/about" className="hover:underline opacity-70 hover:opacity-100 transition-opacity">
          About
        </Link>
        <span style={{ opacity: 0.5 }}>|</span>
        <Link to="/privacy" className="hover:underline opacity-70 hover:opacity-100 transition-opacity">
          Privacy Policy
        </Link>
        <span style={{ opacity: 0.5 }}>|</span>
        <Link to="/tos" className="hover:underline opacity-70 hover:opacity-100 transition-opacity">
          Terms of Service
        </Link>
      </footer>
    </div>
  );
}
