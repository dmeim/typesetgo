import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import TypingPractice from "@/components/typing/TypingPractice";
import Header from "@/components/layout/Header";

export default function Home() {
  const mainRef = useRef<HTMLElement>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [isTyping, setIsTyping] = useState(false);

  return (
    <div
      className="relative flex h-[100dvh] flex-col overflow-hidden bg-background text-foreground"
    >
      {/* Header with action buttons */}
      <Header focusTargetRef={mainRef} hidden={isTyping} onOpenThemeModal={() => setShowThemeModal(true)} onOpenSettings={() => setShowSettings(true)} />

      {/* Main Content - TypingPractice fills the page */}
      <main ref={mainRef} tabIndex={-1} aria-label="Typing practice" className="min-h-0 flex-1 overflow-y-auto outline-none">
        <TypingPractice
          fitToParentHeight
          showSettings={showSettings}
          setShowSettings={setShowSettings}
          showThemeModal={showThemeModal}
          setShowThemeModal={setShowThemeModal}
          onTypingStateChange={setIsTyping}
        />
      </main>

      {/* Footer with legal links - always visible for Google verification compliance */}
      <footer
        className="flex shrink-0 flex-wrap justify-center gap-x-4 gap-y-2 px-3 py-3 text-xs text-muted-foreground"
      >
        <Link to="/about" className="rounded-sm hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          About
        </Link>
        <span aria-hidden="true">|</span>
        <Link to="/privacy" className="rounded-sm hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          Privacy Policy
        </Link>
        <span aria-hidden="true">|</span>
        <Link to="/tos" className="rounded-sm hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          Terms of Service
        </Link>
      </footer>
    </div>
  );
}
