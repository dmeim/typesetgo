import { useState } from "react";
import TypingPractice from "@/components/typing/TypingPractice";
import Header from "@/components/layout/Header";
import { StatsModal } from "@/components/auth";
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
    </div>
  );
}
