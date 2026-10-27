import {
  ChatCircleDotsIcon, ClipboardTextIcon, CookieIcon, GearSixIcon, HardDrivesIcon, NotePencilIcon, ShareNetworkIcon, ShieldCheckIcon, UserCircleCheckIcon,
} from "@phosphor-icons/react";
import { LegalPage, type LegalSection } from "@/components/legal/LegalPage";

const SECTIONS: LegalSection[] = [
  {
    id: "information-we-collect",
    title: "Information We Collect",
    Icon: ClipboardTextIcon,
    short: "We keep your typing scores, and your account details if you sign in. Your settings stay on your device.",
    body: (
      <>
        <p>TypeSetGo collects information to provide and improve our typing practice service. This includes:</p>
        <ul>
          <li><strong>Usage Data:</strong> Typing statistics, practice sessions, words per minute, accuracy rates, and progress data.</li>
          <li>
            <strong>Account Information:</strong> When you sign in, Clerk handles authentication. Your account identifier, email, display name, and
            avatar are stored in Convex to associate your progress with you.
          </li>
          <li>
            <strong>Local Storage:</strong> Your preferences, theme selections, and settings are stored locally on your device. Notification history is
            kept separately for each account and for guests in this browser. Multiplayer uses a browser identifier and a private credential to resume
            your own rooms and participation.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "how-we-use-your-information",
    title: "How We Use Your Information",
    Icon: GearSixIcon,
    short: "To run TypeSetGo, show your progress, make it better, and make multiplayer work.",
    body: (
      <>
        <p>We use the collected information to:</p>
        <ul>
          <li>Provide and maintain the typing practice service</li>
          <li>Track your progress and display statistics</li>
          <li>Improve and optimize our platform</li>
          <li>Enable multiplayer features when you choose to connect</li>
        </ul>
      </>
    ),
  },
  {
    id: "data-storage",
    title: "Data Storage",
    Icon: HardDrivesIcon,
    short: "Saved results and account data are kept in Convex. Some settings stay in your browser.",
    body: (
      <p>
        Signed-in saved results, typing-session validation data, account preferences, achievements, and streaks are stored in Convex. Multiplayer
        rooms, progress, and race results are also stored there. Some preferences and notification history stay in browser storage. Clearing browser
        storage does not delete saved account data.
      </p>
    ),
  },
  {
    id: "data-sharing",
    title: "Data Sharing",
    Icon: ShareNetworkIcon,
    short: "Your name, picture, scores and achievements show on profiles and leaderboards. Your email does not.",
    body: (
      <p>
        Public profiles and leaderboards display your name, avatar, saved typing statistics, and achievements. Multiplayer participants can see room
        names and progress. Public profile responses exclude email and authentication identifiers. Cloudflare hosts the website, Clerk provides
        authentication, and Convex stores application data.
      </p>
    ),
  },
  {
    id: "cookies-and-tracking",
    title: "Cookies and Tracking",
    Icon: CookieIcon,
    short: "Your browser saves your settings, and Clerk keeps you signed in.",
    body: (
      <p>
        TypeSetGo uses local storage to save your preferences and settings. Clerk manages sign-in session storage. Hosting and authentication
        providers process requests to deliver their services.
      </p>
    ),
  },
  {
    id: "your-rights",
    title: "Your Rights",
    Icon: UserCircleCheckIcon,
    short: "You can look at and clear what your browser keeps, delete saved tests, and manage your account.",
    body: (
      <>
        <p>You have the right to:</p>
        <ul>
          <li>Access your locally stored data through your browser</li>
          <li>Clear browser storage to remove local settings and notifications</li>
          <li>Delete individual saved tests from your signed-in profile</li>
          <li>Manage your sign-in account through the account menu</li>
        </ul>
      </>
    ),
  },
  {
    id: "changes-to-this-policy",
    title: "Changes to This Policy",
    Icon: NotePencilIcon,
    short: "If this policy changes, the new version and its date will be posted here.",
    body: (
      <p>
        We may update this Privacy Policy from time to time. We will notify users of any significant changes by posting the new policy on this page
        with an updated revision date.
      </p>
    ),
  },
  {
    id: "contact-us",
    title: "Contact Us",
    Icon: ChatCircleDotsIcon,
    short: "Questions? Ask on our public issue tracker, and never post private details there.",
    body: (
      <p>
        For questions about this page, use the{" "}
        <a href="https://github.com/dmeim/typesetgo/issues" className="text-foreground underline underline-offset-4">project issue tracker</a>.
        Issues are public; do not include private account information. Deleting a sign-in account does not currently provide automatic deletion of
        associated Convex records.
      </p>
    ),
  },
];

export default function Privacy() {
  return (
    <LegalPage
      title="Privacy Policy"
      updated="September 22, 2026"
      intro="What TypeSetGo keeps, where it lives, who can see it, and what you can do about it."
      Icon={ShieldCheckIcon}
      sections={SECTIONS}
      other={{ to: "/tos", label: "Read the Terms of Service" }}
    />
  );
}
