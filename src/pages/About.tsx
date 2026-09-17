import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { useTheme } from "@/hooks/useTheme";
import { tv } from "@/lib/theme-vars";
import type { ThemeColors } from "@/types/theme";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export default function About() {
  const { colors } = useTheme();
  const [activeTab, setActiveTab] = useState("validity");

  return (
    <div
      className="min-h-[100dvh] font-mono px-4 py-12 transition-colors duration-300"
      style={{
        backgroundColor: tv.bg.base,
        color: tv.typing.correct,
      }}
    >
      <div className="w-full max-w-4xl mx-auto animate-fade-in">
        <div className="mb-6">
          <Link
            to="/"
            className="inline-flex items-center gap-2 transition text-sm hover:opacity-100"
            style={{ color: tv.typing.default, opacity: 0.7 }}
          >
            <ArrowLeft className="size-4 shrink-0" aria-hidden="true" />
            Back to Homepage
          </Link>
        </div>

        <div className="text-center mb-12">
          <h1
            className="text-4xl font-bold mb-2"
            style={{ color: tv.typing.cursor }}
          >
            About TypeSetGo
          </h1>
          <p style={{ color: tv.text.secondary }}>
            Learn more about how TypeSetGo works
          </p>
        </div>

        <Tabs defaultValue="validity" className="w-full" onValueChange={setActiveTab}>
          <TabsList
            className="w-full justify-start mb-8 rounded-lg p-1"
            style={{
              backgroundColor: `${colors.typing.default}15`,
            }}
          >
            <TabsTrigger
              value="validity"
              className="rounded-md px-4 py-2 text-sm font-medium transition-all"
              style={{
                color: activeTab === "validity" ? tv.typing.cursor : tv.typing.default,
                backgroundColor: activeTab === "validity" ? `${colors.typing.cursor}20` : "transparent",
              }}
            >
              Test Validity
            </TabsTrigger>
          </TabsList>

          <TabsContent value="validity">
            <TestValidityContent colors={colors} />
          </TabsContent>
        </Tabs>

      </div>
    </div>
  );
}

function TestValidityContent({ colors }: { colors: ThemeColors }) {
  return (
    <div
      className="space-y-8 text-sm leading-relaxed"
      style={{ color: tv.text.secondary }}
    >
      <section>
        <h2
          className="text-xl font-semibold mb-4"
          style={{ color: tv.text.primary }}
        >
          What is Test Validity?
        </h2>
        <p className="mb-3">
          Solo practice tests are checked on the server after you finish. Tests
          that pass are marked <strong>verified</strong>. Tests that fail are
          still saved to your history as <strong>unverified</strong>, but they
          do not count toward leaderboards, achievements, or streaks.
        </p>
        <p>
          Leaderboard ranking is a separate, server-enforced filter:{" "}
          <strong>90%+ accuracy</strong> and either <strong>30 seconds</strong> or{" "}
          <strong>50 correct words</strong>. A verified 15-second test can still
          count for history, personal bests, and some achievements — it just
          does not rank.
        </p>
      </section>

      <section>
        <h2
          className="text-xl font-semibold mb-4"
          style={{ color: tv.text.primary }}
        >
          Leaderboard Eligibility
        </h2>
        <p className="mb-4">
          These rules are enforced in the leaderboard query (not only in this
          page&apos;s copy):
        </p>
        <div className="space-y-4">
          <ValidityItem
            colors={colors}
            title="Accuracy and length"
            description="90% or higher accuracy, and either at least 30 seconds or at least 50 correct words. 15-second tests are valid for history but do not appear on the leaderboard."
          />
          <ValidityItem
            colors={colors}
            title="WPM cap"
            description="Scores above 300 WPM are excluded. Speeds of 170–200 WPM are allowed — that range is treated as normal fast typing, not as cheating."
          />
          <ValidityItem
            colors={colors}
            title="Verified only"
            description="Only verified tests can rank. You must be signed in for a test to be verified. Unsigned tests cannot appear on the leaderboard."
          />
        </div>
      </section>

      <section>
        <h2
          className="text-xl font-semibold mb-4"
          style={{ color: tv.text.primary }}
        >
          Universal Requirements
        </h2>
        <p className="mb-4">
          These checks apply to all solo test modes:
        </p>
        <div className="space-y-4">
          <ValidityItem
            colors={colors}
            title="WPM Ceiling"
            description="Typing speed must not exceed 300 WPM. That cap is well above sustained world-record pace and is the hard limit — 170–200 WPM is fully allowed."
          />
          <ValidityItem
            colors={colors}
            title="Paste blocking"
            description="Pasting into the solo typing input is blocked. Type normally; the client does not wait on the network between keystrokes."
          />
          <ValidityItem
            colors={colors}
            title="Signed-in session"
            description="Signed-in solo tests open a server session and send progress while you type. Guest tests cannot be verified for ranking."
          />
        </div>
      </section>

      <section>
        <h2
          className="text-xl font-semibold mb-4"
          style={{ color: tv.text.primary }}
        >
          Mode-Specific Requirements
        </h2>
        <p className="mb-4">
          Each test mode has additional validation rules:
        </p>

        <div className="space-y-6">
          <ModeSection colors={colors} mode="Time Mode">
            <p className="mb-3">
              Time mode tests must run for the selected duration (with a small
              tolerance for latency). A 15-second test can still be verified if
              it passes these checks, but it does not qualify for the
              leaderboard.
            </p>
            <p>
              If you want a ranked time test, use 30 seconds or longer (or
              combine with the 50-word ranking path in words mode).
            </p>
          </ModeSection>

          <ModeSection colors={colors} mode="Words Mode">
            <p className="mb-3">
              You must reach your selected word target. Tests with at least 50
              correct words can rank even if they are shorter than 30 seconds,
              as long as accuracy is 90%+ and the test is verified.
            </p>
          </ModeSection>

          <ModeSection colors={colors} mode="Quote Mode">
            <p className="mb-3">
              You must complete the entire quote. Ranking still requires 90%+
              accuracy and either 30 seconds or 50 correct words.
            </p>
          </ModeSection>

          <ModeSection colors={colors} mode="Preset Mode">
            <p className="mb-3">
              You must complete the entire preset text. The same ranking filter
              applies: 90%+ accuracy and 30 seconds or 50 correct words.
            </p>
          </ModeSection>

          <ModeSection colors={colors} mode="Zen Mode">
            <p className="mb-3">
              Zen mode uses relaxed validation — the 300 WPM cap still applies,
              and there is no duration or word-target failure. Zen tests are
              not a ranked leaderboard mode.
            </p>
          </ModeSection>
        </div>
      </section>

      <section>
        <h2
          className="text-xl font-semibold mb-4"
          style={{ color: tv.text.primary }}
        >
          Why Was My Test Unverified?
        </h2>
        <p className="mb-4">
          Common reasons a test might be marked as unverified:
        </p>
        <ul className="list-disc list-inside space-y-2 ml-4">
          <li>
            <strong>Speed over 300 WPM:</strong> The hard cap is 300. 170–200
            WPM is allowed.
          </li>
          <li>
            <strong>Completed too quickly:</strong> Time mode tests must run
            for the selected duration.
          </li>
          <li>
            <strong>Paste or instant dump:</strong> Pasting is blocked on solo
            practice. Unusual instant input can still fail server checks.
          </li>
          <li>
            <strong>Not signed in:</strong> Guest tests cannot be verified for
            leaderboard eligibility.
          </li>
          <li>
            <strong>Session progress missing:</strong> If the server did not
            receive enough progress during the test, it may not mark the result
            verified.
          </li>
          <li>
            <strong>Test not completed:</strong> For words, quote, and preset
            modes, you must finish the entire test.
          </li>
        </ul>
        <p className="mt-4">
          A short verified test (for example 15 seconds) is not unverified —
          it simply does not rank. TypeSetGo does not replay keystrokes or
          provide live human review of each test.
        </p>
      </section>

      <section
        className="p-4 rounded-lg"
        style={{
          backgroundColor: `${colors.typing.cursor}15`,
          borderLeft: `3px solid ${tv.typing.cursor}`,
        }}
      >
        <h3
          className="font-semibold mb-2"
          style={{ color: tv.text.primary }}
        >
          Note on False Positives
        </h3>
        <p>
          The checks are meant to stay out of the way of legitimate fast
          typists. 170–200 WPM is allowed. Only scores above 300 WPM are
          over the cap. If a test is unverified, it is still in your history;
          it just will not rank or award achievements and streaks.
        </p>
      </section>
    </div>
  );
}

function ValidityItem({
  colors,
  title,
  description,
}: {
  colors: ThemeColors;
  title: string;
  description: string;
}) {
  return (
    <div
      className="p-4 rounded-lg"
      style={{ backgroundColor: `${colors.typing.default}08` }}
    >
      <h4
        className="font-semibold mb-1"
        style={{ color: tv.text.primary }}
      >
        {title}
      </h4>
      <p>{description}</p>
    </div>
  );
}

function ModeSection({
  colors,
  mode,
  children,
}: {
  colors: ThemeColors;
  mode: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="p-4 rounded-lg border"
      style={{
        backgroundColor: `${colors.typing.default}05`,
        borderColor: `${colors.typing.default}20`,
      }}
    >
      <h3
        className="font-semibold mb-3 flex items-center gap-2"
        style={{ color: tv.typing.cursor }}
      >
        {mode}
      </h3>
      <div style={{ color: tv.text.secondary }}>{children}</div>
    </div>
  );
}
