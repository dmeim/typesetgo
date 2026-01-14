import { Link } from "react-router-dom";
import TypingPractice from "@/components/typing/TypingPractice";

export default function Home() {
  return (
    <div
      className="min-h-screen relative"
      style={{ backgroundColor: "var(--bg-primary)" }}
    >
      {/* Header - absolute positioned like the original */}
      <header className="absolute top-0 left-0 w-full md:w-auto p-4 md:p-6 z-50 flex justify-center md:block">
        <div className="w-[200px] md:w-[400px]">
          <Link to="/">
            <img
              src="/assets/Banner-Color.svg"
              alt="TypeSetGo"
              className="w-full h-auto"
            />
          </Link>
        </div>
      </header>

      {/* Main Content - TypingPractice fills the page */}
      <TypingPractice />
    </div>
  );
}
