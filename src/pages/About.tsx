import { useState } from "react";
import { Link } from "react-router-dom";
import { useTheme } from "@/hooks/useTheme";
import type { LegacyTheme } from "@/types/theme";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

// Local type alias for components
type Theme = LegacyTheme;

export default function About() {
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
  const [activeTab, setActiveTab] = useState("validity");

  return (
    <div
      className="min-h-[100dvh] font-mono px-4 py-12 transition-colors duration-300"
      style={{
        backgroundColor: theme.backgroundColor,
        color: theme.correctText,
      }}
    >
      <div className="w-full max-w-4xl mx-auto animate-fade-in">
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
            About TypeSetGo
          </h1>
          <p style={{ color: theme.defaultText }}>
            Learn more about how TypeSetGo works
          </p>
        </div>

        <Tabs defaultValue="validity" className="w-full" onValueChange={setActiveTab}>
          <TabsList
            className="w-full justify-start mb-8 rounded-lg p-1"
            style={{
              backgroundColor: `${theme.defaultText}15`,
            }}
          >
            <TabsTrigger
              value="validity"
              className="rounded-md px-4 py-2 text-sm font-medium transition-all"
              style={{
                color: activeTab === "validity" ? theme.cursor : theme.defaultText,
                backgroundColor: activeTab === "validity" ? `${theme.cursor}20` : "transparent",
              }}
            >
              Test Validity
            </TabsTrigger>
          </TabsList>

          <TabsContent value="validity">
            <TestValidityContent theme={theme} />
          </TabsContent>
        </Tabs>

      </div>
    </div>
  );
}

function TestValidityContent({ theme }: { theme: Theme }) {
  return (
    <div
      className="space-y-8 text-sm leading-relaxed"
      style={{ color: theme.defaultText }}
    >
      <section>
        <h2
          className="text-xl font-semibold mb-4"
          style={{ color: theme.correctText }}
        >
          What is Test Validity?
        </h2>
        <p className="mb-3">
          TypeSetGo uses a server-authoritative validation system to ensure fair
          competition on leaderboards and accurate achievement tracking. Tests
          that pass all validation checks are marked as <strong>verified</strong>,
          while tests that fail any check are marked as <strong>unverified</strong>.
        </p>
        <p>
          Unverified tests are still saved to your history but do not count toward
          leaderboards, achievements, or streaks. This system helps maintain
          integrity without penalizing legitimate users.
        </p>
      </section>

      <section>
        <h2
          className="text-xl font-semibold mb-4"
          style={{ color: theme.correctText }}
        >
          Universal Requirements
        </h2>
        <p className="mb-4">
          These checks apply to all test modes:
        </p>
        <div className="space-y-4">
          <ValidityItem
            theme={theme}
            title="WPM Ceiling"
            description="Your typing speed must not exceed 300 WPM. This threshold is well above the world record (~216 WPM sustained) to allow headroom for legitimate fast typists."
          />
          <ValidityItem
            theme={theme}
            title="Burst Character Limit"
            description="No more than 50 characters can be typed between progress events. This detects copy-paste or automated input while allowing for natural typing bursts."
          />
          <ValidityItem
            theme={theme}
            title="Session Tracking"
            description="You must be signed in to have your test verified. Guest tests cannot be validated for leaderboard eligibility."
          />
        </div>
      </section>

      <section>
        <h2
          className="text-xl font-semibold mb-4"
          style={{ color: theme.correctText }}
        >
          Mode-Specific Requirements
        </h2>
        <p className="mb-4">
          Each test mode has additional validation rules:
        </p>

        <div className="space-y-6">
          <ModeSection theme={theme} mode="Time Mode">
            <p className="mb-3">
              Time mode tests must run for the full duration (with a 2-second
              tolerance for network latency). If you select a 30-second test, the
              server must record at least 28 seconds of elapsed time.
            </p>
            <p>
              This is the primary validation for time mode — if you want a shorter
              test, simply select a shorter duration in the settings.
            </p>
          </ModeSection>

          <ModeSection theme={theme} mode="Words Mode">
            <p className="mb-3">
              You must type at least as many words as your selected word target.
              Additionally, at least 3 progress events must be recorded during
              your test to prove real-time typing.
            </p>
          </ModeSection>

          <ModeSection theme={theme} mode="Quote Mode">
            <p className="mb-3">
              You must complete the entire quote — your typed text length must
              match or exceed the target quote length. At least 3 progress events
              are required.
            </p>
          </ModeSection>

          <ModeSection theme={theme} mode="Preset Mode">
            <p className="mb-3">
              Similar to quote mode, you must complete the entire preset text.
              Your typed text length must match or exceed the target text length,
              and at least 3 progress events are required.
            </p>
          </ModeSection>

          <ModeSection theme={theme} mode="Zen Mode">
            <p className="mb-3">
              Zen mode has relaxed validation — only the universal requirements
              (WPM ceiling, burst limit) and minimum 3 progress events are checked.
              Since there&apos;s no set goal, you end the test when you choose.
            </p>
          </ModeSection>
        </div>
      </section>

      <section>
        <h2
          className="text-xl font-semibold mb-4"
          style={{ color: theme.correctText }}
        >
          Why Was My Test Unverified?
        </h2>
        <p className="mb-4">
          Common reasons a test might be marked as unverified:
        </p>
        <ul className="list-disc list-inside space-y-2 ml-4">
          <li>
            <strong>Completed too quickly:</strong> Time mode tests must run for
            the expected duration.
          </li>
          <li>
            <strong>Large text paste detected:</strong> Typing more than 50
            characters in a short burst triggers the paste detection.
          </li>
          <li>
            <strong>Not signed in:</strong> Guest tests cannot be verified for
            leaderboard eligibility.
          </li>
          <li>
            <strong>Network issues:</strong> If progress events fail to reach the
            server, the test may not have enough data points for validation.
          </li>
          <li>
            <strong>Test not completed:</strong> For words, quote, and preset
            modes, you must finish the entire test.
          </li>
        </ul>
      </section>

      <section
        className="p-4 rounded-lg"
        style={{
          backgroundColor: `${theme.cursor}15`,
          borderLeft: `3px solid ${theme.cursor}`,
        }}
      >
        <h3
          className="font-semibold mb-2"
          style={{ color: theme.correctText }}
        >
          Note on False Positives
        </h3>
        <p>
          The validation system is designed to minimize false positives — legitimate
          fast typists should never be incorrectly flagged. If you believe your
          test was incorrectly marked as unverified, the thresholds are intentionally
          generous (300 WPM ceiling, 50-character burst limit) to accommodate
          exceptional typists.
        </p>
      </section>
    </div>
  );
}

function ValidityItem({
  theme,
  title,
  description,
}: {
  theme: Theme;
  title: string;
  description: string;
}) {
  return (
    <div
      className="p-4 rounded-lg"
      style={{ backgroundColor: `${theme.defaultText}08` }}
    >
      <h4
        className="font-semibold mb-1"
        style={{ color: theme.correctText }}
      >
        {title}
      </h4>
      <p>{description}</p>
    </div>
  );
}

function ModeSection({
  theme,
  mode,
  children,
}: {
  theme: Theme;
  mode: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="p-4 rounded-lg border"
      style={{
        backgroundColor: `${theme.defaultText}05`,
        borderColor: `${theme.defaultText}20`,
      }}
    >
      <h3
        className="font-semibold mb-3 flex items-center gap-2"
        style={{ color: theme.cursor }}
      >
        {mode}
      </h3>
      <div style={{ color: theme.defaultText }}>{children}</div>
    </div>
  );
}
