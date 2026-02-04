import { useState } from "react";
import { Link } from "react-router-dom";
import TypingPractice from "@/components/typing/TypingPractice";
import Header from "@/components/layout/Header";
import { useTheme } from "@/hooks/useTheme";

export default function Home() {
  const { legacyTheme } = useTheme();
  const [showSettings, setShowSettings] = useState(false);
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [isTyping, setIsTyping] = useState(false);

  // Fallback theme for when context is loading
  const theme = legacyTheme ?? {
    backgroundColor: "#323437",
    defaultText: "#4b5563",
  };

  return (
    <div
      className="min-h-screen relative"
      style={{ backgroundColor: theme.backgroundColor }}
    >
      {/* Header with action buttons */}
      <Header hidden={isTyping} />

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
        style={{ color: theme.defaultText }}
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
