import { Link } from "react-router-dom";
import { useTheme } from "@/hooks/useTheme";
import type { LegacyTheme } from "@/types/theme";

export default function Privacy() {
  const { legacyTheme } = useTheme();
  const theme: LegacyTheme = legacyTheme ?? {
    cursor: "#3cb5ee",
    defaultText: "#4b5563",
    upcomingText: "#4b5563",
    correctText: "#d1d5db",
    incorrectText: "#ef4444",
    buttonUnselected: "#3cb5ee",
    buttonSelected: "#0097b2",
    backgroundColor: "#323437",
    surfaceColor: "#2c2e31",
    ghostCursor: "#a855f7",
  };

  return (
    <div
      className="min-h-[100dvh] font-mono px-4 py-12 transition-colors duration-300"
      style={{
        backgroundColor: theme.backgroundColor,
        color: theme.correctText,
      }}
    >
      <div className="w-full max-w-3xl mx-auto animate-fade-in">
        <div className="mb-6">
          <Link
            to="/"
            className="transition text-sm hover:opacity-100"
            style={{ color: theme.defaultText, opacity: 0.7 }}
          >
            ← Back to Homepage
          </Link>
        </div>

        <div className="text-center mb-12">
          <h1
            className="text-4xl font-bold mb-2"
            style={{ color: theme.cursor }}
          >
            Privacy Policy
          </h1>
          <p style={{ color: theme.defaultText }}>
            Last updated: January 15, 2026
          </p>
        </div>

        <div
          className="space-y-8 text-sm leading-relaxed"
          style={{ color: theme.defaultText }}
        >
          <section>
            <h2
              className="text-xl font-semibold mb-4"
              style={{ color: theme.correctText }}
            >
              1. Information We Collect
            </h2>
            <p className="mb-3">
              TypeSetGo collects information to provide and improve our typing
              practice service. This includes:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>
                <strong>Usage Data:</strong> Typing statistics, practice
                sessions, words per minute, accuracy rates, and progress data.
              </li>
              <li>
                <strong>Device Information:</strong> Browser type, operating
                system, and device identifiers for analytics purposes.
              </li>
              <li>
                <strong>Local Storage:</strong> Your preferences, theme
                selections, and settings are stored locally on your device.
              </li>
            </ul>
          </section>

          <section>
            <h2
              className="text-xl font-semibold mb-4"
              style={{ color: theme.correctText }}
            >
              2. How We Use Your Information
            </h2>
            <p className="mb-3">We use the collected information to:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Provide and maintain the typing practice service</li>
              <li>Track your progress and display statistics</li>
              <li>Improve and optimize our platform</li>
              <li>Enable multiplayer features when you choose to connect</li>
            </ul>
          </section>

          <section>
            <h2
              className="text-xl font-semibold mb-4"
              style={{ color: theme.correctText }}
            >
              3. Data Storage
            </h2>
            <p>
              Most of your data is stored locally in your browser using local
              storage. This means your typing statistics and preferences remain
              on your device. When using multiplayer features, session data may
              be temporarily stored on our servers to facilitate real-time
              gameplay.
            </p>
          </section>

          <section>
            <h2
              className="text-xl font-semibold mb-4"
              style={{ color: theme.correctText }}
            >
              4. Data Sharing
            </h2>
            <p>
              We do not sell, trade, or otherwise transfer your personal
              information to third parties. We may share anonymized, aggregated
              data for analytics and service improvement purposes.
            </p>
          </section>

          <section>
            <h2
              className="text-xl font-semibold mb-4"
              style={{ color: theme.correctText }}
            >
              5. Cookies and Tracking
            </h2>
            <p>
              TypeSetGo uses local storage to save your preferences and
              settings. We may use analytics tools to understand how our service
              is used and to improve the user experience.
            </p>
          </section>

          <section>
            <h2
              className="text-xl font-semibold mb-4"
              style={{ color: theme.correctText }}
            >
              6. Your Rights
            </h2>
            <p className="mb-3">You have the right to:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Access your locally stored data through your browser</li>
              <li>
                Delete your data by clearing your browser&apos;s local storage
              </li>
              <li>Opt out of analytics tracking</li>
            </ul>
          </section>

          <section>
            <h2
              className="text-xl font-semibold mb-4"
              style={{ color: theme.correctText }}
            >
              7. Changes to This Policy
            </h2>
            <p>
              We may update this Privacy Policy from time to time. We will
              notify users of any significant changes by posting the new policy
              on this page with an updated revision date.
            </p>
          </section>

          <section>
            <h2
              className="text-xl font-semibold mb-4"
              style={{ color: theme.correctText }}
            >
              8. Contact Us
            </h2>
            <p>
              If you have any questions about this Privacy Policy, please
              contact us through our official channels.
            </p>
          </section>
        </div>

      </div>
    </div>
  );
}
