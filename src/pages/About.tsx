import type { ReactNode } from "react";
import {
  FileTextIcon, FlowerLotusIcon, HandHeartIcon, InfoIcon, ListChecksIcon, QuestionIcon, QuotesIcon, SealCheckIcon, ShieldCheckIcon, TextAaIcon, TimerIcon, TrophyIcon, type Icon,
} from "@phosphor-icons/react";
import { LegalPage, type LegalSection } from "@/components/legal/LegalPage";

function Rule({ title, Icon, children }: { title: string; Icon?: Icon; children: ReactNode }) {
  return (
    <div className="rounded-2xl bg-muted/50 p-4">
      <h3 className="mb-1.5 flex items-center gap-2 font-semibold text-foreground">
        {Icon && <Icon className="size-4 shrink-0 text-primary" weight="fill" aria-hidden="true" />}
        {title}
      </h3>
      {children}
    </div>
  );
}

const SECTIONS: LegalSection[] = [
  {
    id: "what-is-test-validity",
    title: "What is Test Validity?",
    Icon: SealCheckIcon,
    short: "Finished tests get checked. Tests that pass are verified; the rest are still saved, but don't count for leaderboards, achievements or streaks.",
    body: (
      <>
        <p>
          Solo practice tests are checked on the server after you finish. Tests that pass are marked <strong>verified</strong>. Tests that fail are
          still saved to your history as <strong>unverified</strong>, but they do not count toward leaderboards, achievements, or streaks.
        </p>
        <p>
          Leaderboard ranking is a separate, server-enforced filter: <strong>90%+ accuracy</strong> and either <strong>30 seconds</strong> or{" "}
          <strong>50 correct words</strong>. A verified 15-second test can still count for history, personal bests, and some achievements — it just
          does not rank.
        </p>
      </>
    ),
  },
  {
    id: "leaderboard-eligibility",
    title: "Leaderboard Eligibility",
    Icon: TrophyIcon,
    short: "To rank: be signed in, get 90% or more right, and type for 30 seconds or 50 correct words. Over 300 WPM doesn't count.",
    body: (
      <>
        <p>These rules are enforced in the leaderboard query (not only in this page&apos;s copy):</p>
        <div className="space-y-3">
          <Rule title="Accuracy and length">
            <p>90% or higher accuracy, and either at least 30 seconds or at least 50 correct words. 15-second tests are valid for history but do not appear on the leaderboard.</p>
          </Rule>
          <Rule title="WPM cap">
            <p>Scores above 300 WPM are excluded. Speeds of 170–200 WPM are allowed — that range is treated as normal fast typing, not as cheating.</p>
          </Rule>
          <Rule title="Verified only">
            <p>Only verified tests can rank. You must be signed in for a test to be verified. Unsigned tests cannot appear on the leaderboard.</p>
          </Rule>
        </div>
      </>
    ),
  },
  {
    id: "universal-requirements",
    title: "Universal Requirements",
    Icon: ShieldCheckIcon,
    short: "Every solo test: no more than 300 WPM, no pasting, and sign in so it can be verified.",
    body: (
      <>
        <p>These checks apply to all solo test modes:</p>
        <div className="space-y-3">
          <Rule title="WPM Ceiling">
            <p>Typing speed must not exceed 300 WPM. That cap is well above sustained world-record pace and is the hard limit — 170–200 WPM is fully allowed.</p>
          </Rule>
          <Rule title="Paste blocking">
            <p>Pasting into the solo typing input is blocked. Type normally; the client does not wait on the network between keystrokes.</p>
          </Rule>
          <Rule title="Signed-in session">
            <p>Signed-in solo tests open a server session and send progress while you type. Guest tests cannot be verified for ranking.</p>
          </Rule>
        </div>
      </>
    ),
  },
  {
    id: "mode-specific-requirements",
    title: "Mode-Specific Requirements",
    Icon: ListChecksIcon,
    short: "Finish what you start: run the full time, reach your word goal, or complete the quote or preset. Zen is relaxed and never ranks.",
    body: (
      <>
        <p>Each test mode has additional validation rules:</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Rule title="Time Mode" Icon={TimerIcon}>
            <p className="mb-2">
              Time mode tests must run for the selected duration (with a small tolerance for latency). A 15-second test can still be verified if it
              passes these checks, but it does not qualify for the leaderboard.
            </p>
            <p>If you want a ranked time test, use 30 seconds or longer (or combine with the 50-word ranking path in words mode).</p>
          </Rule>
          <Rule title="Words Mode" Icon={TextAaIcon}>
            <p>
              You must reach your selected word target. Tests with at least 50 correct words can rank even if they are shorter than 30 seconds, as long
              as accuracy is 90%+ and the test is verified.
            </p>
          </Rule>
          <Rule title="Quote Mode" Icon={QuotesIcon}>
            <p>You must complete the entire quote. Ranking still requires 90%+ accuracy and either 30 seconds or 50 correct words.</p>
          </Rule>
          <Rule title="Preset Mode" Icon={FileTextIcon}>
            <p>You must complete the entire preset text. The same ranking filter applies: 90%+ accuracy and 30 seconds or 50 correct words.</p>
          </Rule>
          <Rule title="Zen Mode" Icon={FlowerLotusIcon}>
            <p>
              Zen mode uses relaxed validation — the 300 WPM cap still applies, and there is no duration or word-target failure. Zen tests are not a
              ranked leaderboard mode.
            </p>
          </Rule>
        </div>
      </>
    ),
  },
  {
    id: "why-was-my-test-unverified",
    title: "Why Was My Test Unverified?",
    Icon: QuestionIcon,
    short: "Usually it went over 300 WPM, ended too early, was pasted, wasn't finished, or you weren't signed in.",
    body: (
      <>
        <p>Common reasons a test might be marked as unverified:</p>
        <ul>
          <li><strong>Speed over 300 WPM:</strong> The hard cap is 300. 170–200 WPM is allowed.</li>
          <li><strong>Completed too quickly:</strong> Time mode tests must run for the selected duration.</li>
          <li><strong>Paste or instant dump:</strong> Pasting is blocked on solo practice. Unusual instant input can still fail server checks.</li>
          <li><strong>Not signed in:</strong> Guest tests cannot be verified for leaderboard eligibility.</li>
          <li><strong>Session progress missing:</strong> If the server did not receive enough progress during the test, it may not mark the result verified.</li>
          <li><strong>Test not completed:</strong> For words, quote, and preset modes, you must finish the entire test.</li>
        </ul>
        <p>
          A short verified test (for example 15 seconds) is not unverified — it simply does not rank. TypeSetGo does not replay keystrokes or provide
          live human review of each test.
        </p>
      </>
    ),
  },
  {
    id: "note-on-false-positives",
    title: "Note on False Positives",
    Icon: HandHeartIcon,
    short: "Fast typists are welcome. Anything up to 300 WPM is fine, and unverified tests still stay in your history.",
    body: (
      <p>
        The checks are meant to stay out of the way of legitimate fast typists. 170–200 WPM is allowed. Only scores above 300 WPM are over the cap.
        If a test is unverified, it is still in your history; it just will not rank or award achievements and streaks.
      </p>
    ),
  },
];

export default function About() {
  return (
    <LegalPage
      title="About TypeSetGo"
      intro="How TypeSetGo checks your tests, and what it takes for a score to count on the leaderboard."
      note="Each section starts with the short version. The details follow underneath."
      Icon={InfoIcon}
      sections={SECTIONS}
      other={{ to: "/", label: "Start typing" }}
    />
  );
}
