import { Link } from "react-router-dom";
import Header from "@/components/layout/Header";
import { useTheme } from "@/hooks/useTheme";
import { tv } from "@/lib/theme-vars";
import { GraduationCap } from "lucide-react";

export default function Lessons() {
  useTheme();

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: tv.bg.base }}
    >
      <Header />

      {/* Main Content */}
      <main className="flex flex-1 flex-col items-center justify-center px-4 pt-20 pb-8">
        <div
          className="text-center p-8 rounded-2xl max-w-md"
          style={{ backgroundColor: tv.bg.surface }}
        >
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6"
            style={{ backgroundColor: tv.interactive.accent.muted }}
          >
            <GraduationCap
              className="w-8 h-8"
              style={{ color: tv.interactive.accent.DEFAULT }}
            />
          </div>

          <h1
            className="text-2xl font-bold mb-3"
            style={{ color: tv.text.primary }}
          >
            Lessons Coming Soon
          </h1>

          <p
            className="mb-6"
            style={{ color: tv.text.secondary }}
          >
            Structured typing lessons to help you improve your skills step by step.
            From beginner fundamentals to advanced techniques.
          </p>

          <Link
            to="/"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors"
            style={{
              backgroundColor: tv.interactive.accent.DEFAULT,
              color: tv.text.inverse,
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
          style={{ color: tv.text.secondary }}
        >
          About
        </Link>
        <Link
          to="/privacy"
          className="text-sm transition-colors hover:opacity-80"
          style={{ color: tv.text.secondary }}
        >
          Privacy
        </Link>
        <Link
          to="/tos"
          className="text-sm transition-colors hover:opacity-80"
          style={{ color: tv.text.secondary }}
        >
          Terms
        </Link>
      </footer>
    </div>
  );
}
