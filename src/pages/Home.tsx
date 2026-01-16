import { useState } from "react";
import { Link } from "react-router-dom";
import TypingPractice from "@/components/typing/TypingPractice";
import Header from "@/components/layout/Header";
import { StatsModal, LeaderboardModal } from "@/components/auth";
import type { Theme } from "@/lib/typing-constants";
import { DEFAULT_THEME } from "@/lib/typing-constants";
import { loadTheme, loadThemeName } from "@/lib/storage-utils";

// Initialize theme from storage (lazy initialization)
const getInitialTheme = (): Theme => {
  const stored = loadTheme();
  return stored ?? DEFAULT_THEME;
};

const getInitialThemeName = (): string => {
  const stored = loadThemeName();
  return stored ?? "TypeSetGo";
};

export default function Home() {
  const [theme, setTheme] = useState<Theme>(getInitialTheme);
  const [selectedThemeName, setSelectedThemeName] = useState(getInitialThemeName);
  const [showSettings, setShowSettings] = useState(false);
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [showLeaderboardModal, setShowLeaderboardModal] = useState(false);
  const [isTyping, setIsTyping] = useState(false);

  return (
    <div
      className="min-h-screen relative"
      style={{ backgroundColor: theme.backgroundColor }}
    >
      {/* Header with action buttons */}
      <Header
        theme={theme}
        onShowSettings={() => setShowSettings(true)}
        onShowTheme={() => setShowThemeModal(true)}
        onShowStats={() => setShowStatsModal(true)}
        onShowLeaderboard={() => setShowLeaderboardModal(true)}
        hidden={isTyping}
      />

      {/* Main Content - TypingPractice fills the page */}
      <TypingPractice
        theme={theme}
        setTheme={setTheme}
        selectedThemeName={selectedThemeName}
        setSelectedThemeName={setSelectedThemeName}
        showSettings={showSettings}
        setShowSettings={setShowSettings}
        showThemeModal={showThemeModal}
        setShowThemeModal={setShowThemeModal}
        onTypingStateChange={setIsTyping}
      />

      {/* Stats Modal */}
      {showStatsModal && (
        <StatsModal theme={theme} onClose={() => setShowStatsModal(false)} />
      )}

      {/* Leaderboard Modal */}
      {showLeaderboardModal && (
        <LeaderboardModal theme={theme} onClose={() => setShowLeaderboardModal(false)} />
      )}

      {/* Footer with legal links - always visible for Google verification compliance */}
      <footer
        className="fixed bottom-4 left-0 right-0 flex justify-center gap-4 text-xs"
        style={{ color: theme.defaultText }}
      >
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
