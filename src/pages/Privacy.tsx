import { ArrowLeftIcon } from "@phosphor-icons/react";
import { Link } from "react-router-dom";
import { useTheme } from "@/hooks/useTheme";
import { tv } from "@/lib/theme-vars";

export default function Privacy() {
  useTheme();

  return (
    <div
      className="min-h-[100dvh] font-mono px-4 py-12 transition-colors duration-300"
      style={{
        backgroundColor: tv.ui.background,
        color: tv.ui.foreground,
      }}
    >
      <div className="w-full max-w-3xl mx-auto animate-fade-in">
        <div className="mb-6">
          <Link
            to="/"
            className="inline-flex items-center gap-2 transition text-sm hover:opacity-100"
            style={{ color: tv.ui.mutedForeground }}
          >
            <ArrowLeftIcon className="size-4 shrink-0" aria-hidden="true" />
            Back to Homepage
          </Link>
        </div>

        <div className="text-center mb-12">
          <h1
            className="text-4xl font-bold mb-2"
            style={{ color: tv.ui.primary }}
          >
            Privacy Policy
          </h1>
          <p style={{ color: tv.ui.mutedForeground }}>
            Last updated: September 22, 2026
          </p>
        </div>

        <div
          className="space-y-8 text-sm leading-relaxed"
          style={{ color: tv.ui.mutedForeground }}
        >
          <section>
            <h2
              className="text-xl font-semibold mb-4"
              style={{ color: tv.ui.foreground }}
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
                <strong>Account Information:</strong> When you sign in, Clerk handles
                authentication. Your account identifier, email, display name, and
                avatar are stored in Convex to associate your progress with you.
              </li>
              <li>
                <strong>Local Storage:</strong> Your preferences, theme
                selections, and settings are stored locally on your device.
                Notification history is kept separately for each account and for
                guests in this browser. Multiplayer uses a browser identifier and
                a private credential to resume your own rooms and participation.
              </li>
            </ul>
          </section>

          <section>
            <h2
              className="text-xl font-semibold mb-4"
              style={{ color: tv.ui.foreground }}
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
              style={{ color: tv.ui.foreground }}
            >
              3. Data Storage
            </h2>
            <p>
              Signed-in saved results, typing-session validation data, account
              preferences, achievements, and streaks are stored in Convex.
              Multiplayer rooms, progress, and race results are also stored there.
              Some preferences and notification history stay in browser storage.
              Clearing browser storage does not delete saved account data.
            </p>
          </section>

          <section>
            <h2
              className="text-xl font-semibold mb-4"
              style={{ color: tv.ui.foreground }}
            >
              4. Data Sharing
            </h2>
            <p>
              Public profiles and leaderboards display your name, avatar, saved
              typing statistics, and achievements. Multiplayer participants can
              see room names and progress. Public profile responses exclude email
              and authentication identifiers. Cloudflare hosts the website,
              Clerk provides authentication, and Convex stores application data.
            </p>
          </section>

          <section>
            <h2
              className="text-xl font-semibold mb-4"
              style={{ color: tv.ui.foreground }}
            >
              5. Cookies and Tracking
            </h2>
            <p>
              TypeSetGo uses local storage to save your preferences and
              settings. Clerk manages sign-in session storage. Hosting and
              authentication providers process requests to deliver their services.
            </p>
          </section>

          <section>
            <h2
              className="text-xl font-semibold mb-4"
              style={{ color: tv.ui.foreground }}
            >
              6. Your Rights
            </h2>
            <p className="mb-3">You have the right to:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Access your locally stored data through your browser</li>
              <li>Clear browser storage to remove local settings and notifications</li>
              <li>Delete individual saved tests from your signed-in profile</li>
              <li>Manage your sign-in account through the account menu</li>
            </ul>
          </section>

          <section>
            <h2
              className="text-xl font-semibold mb-4"
              style={{ color: tv.ui.foreground }}
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
              style={{ color: tv.ui.foreground }}
            >
              8. Contact Us
            </h2>
            <p>
              For questions about this page, use the <a
                href="https://github.com/dmeim/typesetgo/issues"
                className="underline underline-offset-4"
              >project issue tracker</a>. Issues are public; do not include private
              account information. Deleting a sign-in account does not currently
              provide automatic deletion of associated Convex records.
            </p>
          </section>
        </div>

      </div>
    </div>
  );
}
