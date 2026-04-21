import { useState } from "react";
import { Link } from "react-router-dom";
import TypingPractice from "@/components/typing/TypingPractice";
import Header from "@/components/layout/Header";
import { useTheme } from "@/hooks/useTheme";
import { tv } from "@/lib/theme-vars";

export default function Home() {
  useTheme();
  const [showSettings, setShowSettings] = useState(false);
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [isTyping, setIsTyping] = useState(false);

  return (
    <div
      className="relative flex h-[100dvh] flex-col overflow-hidden"
      style={{ backgroundColor: tv.bg.base }}
    >
      {/* Header with action buttons */}
      <Header hidden={isTyping} onOpenThemeModal={() => setShowThemeModal(true)} onOpenSettings={() => setShowSettings(true)} />

      {/* Main Content - TypingPractice fills the page */}
      <div className="min-h-0 flex-1">
        <TypingPractice
          fitToParentHeight
          showSettings={showSettings}
          setShowSettings={setShowSettings}
          showThemeModal={showThemeModal}
          setShowThemeModal={setShowThemeModal}
          onTypingStateChange={setIsTyping}
        />
      </div>

      {/* Footer with legal links - always visible for Google verification compliance */}
      <footer
        className="shrink-0 py-3 flex justify-center gap-4 text-xs"
        style={{ color: tv.text.secondary }}
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
