import { useRef, useState } from "react";
import TypingPractice from "@/components/typing/TypingPractice";
import Header from "@/components/layout/Header";
import { SiteFooter } from "@/components/layout/SiteFooter";

export default function Home() {
  const mainRef = useRef<HTMLElement>(null);
  const [isTyping, setIsTyping] = useState(false);

  return (
    <div
      className="relative flex h-[100dvh] flex-col overflow-hidden bg-background text-foreground"
    >
      {/* Theme and Settings in the header open the Profile tabs; test settings live in the pill above the prompt. */}
      <Header focusTargetRef={mainRef} hidden={isTyping} />

      {/* Main Content - TypingPractice fills the page */}
      <main ref={mainRef} tabIndex={-1} aria-label="Typing practice" className="min-h-0 flex-1 overflow-y-auto outline-none">
        <TypingPractice
          fitToParentHeight
          onTypingStateChange={setIsTyping}
        />
      </main>

      {/* Legal links stay on Home for Google verification; the bar steps aside (keeping its space) while you type. */}
      <SiteFooter hidden={isTyping} />
    </div>
  );
}
