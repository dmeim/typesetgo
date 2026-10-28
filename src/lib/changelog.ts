// What changed on TypeSetGo, newest first. Add an entry with every user-facing commit; /changelog renders it.

export type ChangeKind = "new" | "improved" | "fixed";
/** Live is on the site; preview is a locked-in design you can try in the UI Lab before it ships. */
export type ChangeStatus = "live" | "preview";
export type ChangelogDemo = "settings-pill" | "live-stats" | "results" | "keyboard" | "header" | "connect-landing";

export interface ChangelogShot {
  /** Path under public/, e.g. "/changelog/results-page.webp". */
  src: string;
  alt: string;
  caption?: string;
}

export interface ChangelogEntry {
  /** Stable anchor, e.g. /changelog#connect-accounts. */
  id: string;
  /** YYYY-MM-DD, the day it was committed. */
  date: string;
  title: string;
  kind: ChangeKind;
  status: ChangeStatus;
  /** Where on the site it shows up, e.g. "Home" or "Connect". */
  area: string;
  summary: string;
  highlights: string[];
  shots?: ChangelogShot[];
  /** A working copy of the feature you can play with on the changelog page. */
  demo?: ChangelogDemo;
  /** Where to see the rest, usually the UI Lab for previews. */
  link?: { to: string; label: string };
}

export const CHANGE_KIND_LABELS: Record<ChangeKind, string> = { new: "New", improved: "Improved", fixed: "Fixed" };
export const CHANGE_STATUS_LABELS: Record<ChangeStatus, string> = { live: "Live", preview: "Coming soon" };

export const CHANGELOG: ChangelogEntry[] = [
  {
    id: "steady-pill-and-mode",
    date: "2026-10-27",
    title: "Light or dark sticks on every page, and the settings pill stops nudging the words",
    kind: "fixed",
    status: "live",
    area: "Everywhere",
    summary: "Light and dark mode is one choice for the whole site, the words sit halfway between the settings pill and the keyboard, and opening the settings pill no longer moves anything.",
    highlights: [
      "Switch to light or dark on any page and it stays that way everywhere, and on your account, instead of each page going back to its own mode",
      "The words sit halfway between the settings pill and the keyboard, or the bottom of the screen when the keyboard is off",
      "The settings pill, custom length and your own text open over the words instead of pushing them down",
      "The keyboard fades when you click away but keeps its place, so nothing jumps",
    ],
  },
  {
    id: "last-sweep-touches",
    date: "2026-10-27",
    title: "The profile page meets the header, and new players get a friendlier start",
    kind: "improved",
    status: "live",
    area: "Profile",
    summary: "The header floats over the profile page like everywhere else, a brand-new account no longer shows a page of zeros, and a few phone layouts read better.",
    highlights: [
      "The profile sidebar runs from the top of the window to the bottom, and the page fades out under the header as you scroll instead of being cut off",
      "Before your first test, Stats says \"No stats yet\" with a Start a test button instead of zeros and a 0-day streak",
      "On phones a long name in the profile header wraps into a few readable lines",
      "On the Connect board on a phone, the join address gets its own line above the code",
    ],
  },
  {
    id: "steady-practice-screen",
    date: "2026-10-27",
    title: "The keyboard stays at the bottom and the words stay in the middle",
    kind: "improved",
    status: "live",
    area: "Home",
    summary: "The practice screen no longer shifts around. The on-screen keyboard sits at the bottom of the screen, and the whole block of words sits in the middle, whatever your text size, line count or test.",
    highlights: [
      "The keyboard is pinned just above the footer and doesn't move when you change settings or start typing",
      "All the lines you see are centred together, not just the first one; short quotes are centred too",
      "The stats that appear while you type take the settings pill's place, so the words don't jump when a test starts",
      "With the keyboard on, the words sit as close to the middle as the keyboard leaves room for",
    ],
  },
  {
    id: "small-screen-touches",
    date: "2026-10-27",
    title: "Room for the keyboard on small phones, and a few finishing touches",
    kind: "fixed",
    status: "live",
    area: "Everywhere",
    summary: "On short screens the practice text now shrinks a little so the whole keyboard stays above the footer, and a handful of pages got the finishing touches they were missing.",
    highlights: [
      "Small phones and short laptop windows keep the whole on-screen keyboard in view; tall screens keep your chosen text size",
      "The keyboard shortcut hint hides on touch screens, and on short windows while the keyboard is showing",
      "The Text settings tab has its own title card, like the other settings",
      "The page-not-found screen now has the Dock and footer",
      "The profile sidebar fades at the edge when more sections are hidden, and the phone preview takes less of the screen",
    ],
  },
  {
    id: "polish-after-overhaul",
    date: "2026-10-27",
    title: "Kids mode keyboard, a side-by-side leaderboard, and a calmer results page",
    kind: "improved",
    status: "live",
    area: "Home",
    summary: "A round of polish after the overhaul. Kids mode now turns on the Finger guide keyboard and puts your own settings back when you leave it, the leaderboard opens on 7 days with the podium beside a scrolling list, and results sit in the middle of the screen instead of stretching to the edges.",
    highlights: [
      "Kids mode switches the keyboard on with the Finger guide, then restores your keyboard, text size and layout, even after a trip to your profile",
      "The leaderboard opens on 7 days: the top three on the podium, everyone else in a list beside it that scrolls on its own",
      "Results stay on one screen, centred with room around them. The line above the graph and the notes under the buttons are gone, and the scores and buttons end level with the graph",
      "Settings show one preview card, with a Live Preview window for the real size",
      "Font cards show just \"Aa\" and the name, in that font",
    ],
  },
  {
    id: "settings-before-the-test",
    date: "2026-10-27",
    title: "Settings before the test, custom lengths in the pill",
    kind: "improved",
    status: "live",
    area: "Home",
    summary: "The typing screen now stays clean: you pick the test in the settings pill before you start, and everything else lives on your profile. A custom length or your own text unfolds right inside the pill instead of opening a dialog.",
    highlights: [
      "Phones get the same settings pill as desktop, in place of the Quick Settings button",
      "Custom length: type 90, 1:30 or 2m 30s, or tap a quick pick, and see roughly how many words that is",
      "Your own text: paste it, start from a sample, fix characters a keyboard can't type, and see the word count and typing time",
      "Theme and Settings in the header open your profile; changes there are waiting when you come back",
    ],
    link: { to: "/profile/typing", label: "Your settings" },
  },
  {
    id: "achievement-celebration",
    date: "2026-10-27",
    title: "Achievements get a celebration, and the bell gets day cards",
    kind: "improved",
    status: "live",
    area: "Everywhere",
    summary: "Earning an achievement now plays a full-screen moment with the medal, your tier bar filling up and the levels around it. The bell groups notifications by day and shows achievements as collector cards you can open.",
    highlights: [
      "\"Achievement unlocked\" with confetti, the medal and the tier bar, then the levels just behind and ahead",
      "Several at once play one after another, with Skip the rest",
      "Waits until your test is over, and skips the confetti if you prefer reduced motion",
      "The bell groups by Today, Yesterday and earlier; opening an achievement grows it into the full card and its journey",
    ],
    link: { to: "/profile/achievements", label: "Your achievements" },
  },
  {
    id: "race-refresh",
    date: "2026-10-27",
    title: "Race gets a track",
    kind: "improved",
    status: "preview",
    area: "Race",
    summary: "Race is ready in its new look and opens soon. Join or host from one card, roll out to the start line of an oval track in the lobby, watch everyone go round as you type, and finish on a podium.",
    highlights: [
      "One card with a Join and Host switch, like Connect",
      "Ready racers line up on the grid while everyone else waits in the pit lane",
      "Finishers park in the middle of the track in finishing order",
      "Results show a podium, your place, speed, accuracy and time, and everyone else below",
    ],
  },
  {
    id: "date-versions",
    date: "2026-10-27",
    title: "Versions named by date",
    kind: "improved",
    status: "live",
    area: "Everywhere",
    summary: "Releases are now named by the day they ship, with a last number for a second release the same day. This one is v2026.10.27.1, and the footer shows which version you're on.",
    highlights: [
      "The version sits on the left of the footer",
      "Each release has notes in the project's release notes",
    ],
  },
  {
    id: "to-go-wording",
    date: "2026-10-27",
    title: "\"1 day to go\", not \"1 days to go\"",
    kind: "fixed",
    status: "live",
    area: "Profile",
    summary: "Achievement progress now uses the right word when you're one step away.",
    highlights: ["Days, tests, words and minutes all read correctly for one"],
  },
  {
    id: "site-footer-info-pages",
    date: "2026-10-27",
    title: "A new footer and tidier info pages",
    kind: "improved",
    status: "live",
    area: "Everywhere",
    summary: "A thin bar along the bottom of the page shows the version and your theme, with links to About, Privacy, Terms and this page. About, Privacy and Terms now share one page with tabs.",
    highlights: [
      "The footer steps out of the way while you type and comes back when you stop",
      "About, Privacy and Terms keep the site header, with tabs to switch between them",
      "A contents list follows you down the page, or a jump menu on phones",
    ],
    link: { to: "/privacy", label: "Open the Privacy Policy" },
  },
  {
    id: "changelog-page",
    date: "2026-10-27",
    title: "A page for what's new",
    kind: "new",
    status: "live",
    area: "Profile",
    summary: "This page. Every change to TypeSetGo lands here with screenshots, and many come with a working copy you can try without leaving the page.",
    highlights: [
      "Open it from the Changelog button at the bottom of your profile",
      "Filter to just the new things, improvements or fixes",
      "Press Try it here on a change to play with it right on the page",
    ],
  },
  {
    id: "profile-page",
    date: "2026-10-27",
    title: "One page for your profile and settings",
    kind: "new",
    status: "live",
    area: "Profile",
    summary: "Your stats, history, achievements and every setting now live on one page, with a live preview of the site as you change things.",
    highlights: [
      "A theme gallery with live previews, plus light and dark versions",
      "History as a timeline of your days, with rows that open into the details",
      "Achievements as collector cards that open the journey through every level",
      "Your stats have their own link you can share; old profile links still work",
    ],
    shots: [
      { src: "/changelog/profile-stats.webp", alt: "The profile page with the sidebar of sections and lifetime statistics", caption: "Stats" },
      { src: "/changelog/profile-settings.webp", alt: "The theme gallery on the profile page with live previews", caption: "Themes" },
      { src: "/changelog/profile-history.webp", alt: "The history tab as a timeline of days with one test opened", caption: "History" },
      { src: "/changelog/profile-achievements.webp", alt: "Achievements shown as collector cards", caption: "Achievements" },
    ],
    link: { to: "/profile", label: "Open your profile" },
  },
  {
    id: "keyboard-designs",
    date: "2026-10-27",
    title: "New on-screen keyboards",
    kind: "new",
    status: "live",
    area: "Home",
    summary: "The practice keyboard has a fresh default, Spotlight, and you can switch to a colour-coded Finger guide, chunky Keycaps or the classic look.",
    highlights: [
      "Still shows the next key and the Shift to hold, and warns when Caps Lock is on",
      "The Shift on the other hand lights up, the way touch typists are taught",
      "A clear hint when a letter is wrong, with delete lit up to fix it",
      "A real keyboard shape with Tab, Enter and a right Shift",
      "Pick a style in Settings or on your profile's Keyboard tab",
    ],
    shots: [
      { src: "/changelog/keyboard-designs.webp", alt: "The Spotlight keyboard highlighting the next key while a sentence is typed", caption: "Spotlight on Home" },
      { src: "/changelog/keyboard-styles.webp", alt: "The keyboard style picker with Spotlight, Finger guide, Keycaps and Legacy", caption: "Choose a style" },
    ],
    demo: "keyboard",
    link: { to: "/profile/keyboard", label: "Choose your keyboard" },
  },
  {
    id: "one-screen-results",
    date: "2026-10-27",
    title: "Results that fit on one screen",
    kind: "improved",
    status: "live",
    area: "Home",
    summary: "Your scores sit in a column on the left and the graph fills the rest of the screen. Details open over the graph instead of pushing the page down.",
    highlights: [
      "The graph grows or shrinks with your window",
      "Correct words, mistakes and characters open over the graph; a Graph pill brings it back",
      "Keyboard hints sit right on the Save, Repeat and Next buttons",
      "With the ghost writer on, its speed shows as a dashed line",
    ],
    shots: [
      { src: "/changelog/results-page.webp", alt: "The results screen with scores on the left and the speed and accuracy graph on the right" },
    ],
    demo: "results",
    link: { to: "/", label: "Take a test" },
  },
  {
    id: "dock-header",
    date: "2026-10-27",
    title: "Header with everything in one dock",
    kind: "improved",
    status: "live",
    area: "Every page",
    summary: "The header is now one pill: practice modes, then the leaderboard, theme and settings, and a single account button for your profile.",
    highlights: ["The page you're on grows its name", "Hides while you type, like before", "On a phone your buttons sit on top with the pages below"],
    shots: [{ src: "/changelog/dock-header.webp", alt: "The dock header with the logo, practice modes, leaderboard, theme, settings and account button" }],
    demo: "header",
  },
  {
    id: "arena-leaderboard",
    date: "2026-10-27",
    title: "A leaderboard with one big podium",
    kind: "improved",
    status: "live",
    area: "Leaderboard",
    summary: "Switch between Today, 7 days and All time and watch players move to their new places on the podium.",
    highlights: [
      "Ranks 4 to 50 in a list under the podium",
      "Signed in, a bar shows your rank and how close the next player is",
      "Today shows when the board resets",
    ],
    shots: [{ src: "/changelog/leaderboard-arena.webp", alt: "The leaderboard with a podium for the top three and your standing at the bottom" }],
    link: { to: "/leaderboard", label: "See the leaderboard" },
  },
  {
    id: "connect-refresh",
    date: "2026-10-27",
    title: "A friendlier Connect for classrooms",
    kind: "improved",
    status: "live",
    area: "Connect",
    summary: "A fresh look for hosting a room: the code front and centre, one place to run the room, and a live board where cards move as everyone types.",
    highlights: [
      "Build the test list in place, drag or use the arrow keys to reorder, and add breaks",
      "\"Everyone gets\" settings: one theme, font, ghost and sound for the whole room",
      "Late arrivals wait for the next test, and you can let them start early",
      "Pop the board out into its own window, choose the card size and sort it your way",
    ],
    shots: [
      { src: "/changelog/connect-host.webp", alt: "The host panel with the room code, run controls, test list and who's here", caption: "Host panel" },
      { src: "/changelog/connect-board.webp", alt: "The live board with a card for each student", caption: "Live board" },
    ],
    link: { to: "/connect", label: "Host a room" },
  },
  {
    id: "connect-landing-switch",
    date: "2026-10-27",
    title: "One card to join or host a room",
    kind: "improved",
    status: "live",
    area: "Connect",
    summary: "The Connect page is a single card. It opens on joining, since that is what most people come for, and a sliding switch flips it over to hosting.",
    highlights: [
      "Big letter boxes for the room code that cheer when the room is found",
      "Signed in, you only type the code; guests also give a name",
      "The host side keeps the create form and your recent rooms",
    ],
    shots: [{ src: "/changelog/connect-landing.webp", alt: "The Connect card on its Join side with letter boxes for the room code" }],
    demo: "connect-landing",
    link: { to: "/connect", label: "Join a room" },
  },
  {
    id: "connect-accounts",
    date: "2026-10-27",
    title: "Join Connect rooms with your account",
    kind: "new",
    status: "live",
    area: "Connect",
    summary: "Signed in? Just type the room code. You join under your account name with your profile picture, and the host sees it on your card.",
    highlights: [
      "Your seat follows your account: open the room on another device and carry on with your results",
      "Guests still join with a name and get a coloured letter instead of a picture",
      "Hosts can turn pictures off from the board settings, handy on a projector",
      "On a shared computer, the next person can't carry on in your seat after you sign out",
    ],
    shots: [{ src: "/changelog/connect-pictures.webp", alt: "Board cards showing a profile picture for signed-in players and letters for guests" }],
  },
  {
    id: "friendly-legal",
    date: "2026-10-26",
    title: "Privacy, Terms and About in plain words",
    kind: "improved",
    status: "live",
    area: "Info pages",
    summary: "Each section now starts with a short version anyone can read, with the full text right under it.",
    highlights: ["A contents list that follows you down the page", "One card per section", "The About page uses the same layout"],
    shots: [{ src: "/changelog/friendly-legal.webp", alt: "The Privacy page with a contents list and a plain-words summary for each section" }],
    link: { to: "/privacy", label: "Read the Privacy page" },
  },
  {
    id: "keycap-screens",
    date: "2026-10-26",
    title: "Keyboard-key loading and error screens",
    kind: "improved",
    status: "live",
    area: "Every page",
    summary: "Loading, error and page-not-found screens are now drawn with keyboard keys, with a clear way back.",
    highlights: ["A page that doesn't exist spells it out in keys", "Errors offer a reload and a way back to practice"],
    shots: [{ src: "/changelog/keycap-screens.webp", alt: "The not-found screen spelled out in keyboard keys" }],
  },
  {
    id: "more-fonts",
    date: "2026-10-26",
    title: "45 more typing fonts",
    kind: "new",
    status: "live",
    area: "Settings",
    summary: "72 font choices in total, all served from TypeSetGo itself so they load fast and work anywhere.",
    highlights: ["Popular coding and reading fonts, including OpenDyslexic", "Each font previews in its own lettering"],
    link: { to: "/profile/text", label: "Pick a font" },
    shots: [{ src: "/changelog/fonts.webp", alt: "The font picker showing a grid of fonts, each in its own lettering" }],
  },
  {
    id: "theme-catalog",
    date: "2026-10-26",
    title: "2,600 theme looks in 18 categories",
    kind: "new",
    status: "live",
    area: "Themes",
    summary: "The theme picker now has 18 categories and variants for many themes, so one theme can come in several looks.",
    highlights: ["Arrows and an expandable panel make every category reachable with a mouse", "Themes with several looks show a variants button"],
    shots: [{ src: "/changelog/theme-catalog.webp", alt: "The theme picker with category chips and a grid of theme previews" }],
  },
  {
    id: "results-page",
    date: "2026-10-26",
    title: "A new results page",
    kind: "new",
    status: "live",
    area: "Home",
    summary: "See speed and accuracy together on one graph with your mistakes marked, and compare the test with your recent average and best.",
    highlights: ["Speed and accuracy on two axes, with mistakes marked", "Cards that compare you with your average and best", "Chips that open into the details of every word"],
    shots: [{ src: "/changelog/results-details.webp", alt: "Results with the word details open over the graph" }],
    demo: "results",
  },
  {
    id: "stats-ticker",
    date: "2026-10-26",
    title: "A calmer stats line while you type",
    kind: "improved",
    status: "live",
    area: "Home",
    summary: "Accuracy, speed and time now roll by in one quiet line above a thin progress bar, instead of separate boxes.",
    highlights: ["Numbers roll smoothly instead of jumping", "A 3px progress line shows how far you are"],
    shots: [{ src: "/changelog/stats-ticker.webp", alt: "A test in progress with the stats line above the words" }],
    demo: "live-stats",
  },
  {
    id: "settings-pill",
    date: "2026-10-26",
    title: "Test settings in one pill",
    kind: "improved",
    status: "live",
    area: "Home",
    summary: "The rows of test settings fold into one pill that says what you're about to type. Open it and it morphs into the full controls.",
    highlights: ["Difficulty and extras on top, then mode, then length", "One click to open, and the summary updates as you choose"],
    shots: [{ src: "/changelog/settings-pill.webp", alt: "The Home screen with the test settings pill open" }],
    demo: "settings-pill",
  },
];

export interface ChangelogDay {
  date: string;
  entries: ChangelogEntry[];
}

/** Entries grouped by day, newest day first, keeping each day's own order. */
export function groupChangelogByDay(entries: ChangelogEntry[]): ChangelogDay[] {
  const days = new Map<string, ChangelogEntry[]>();
  for (const entry of entries) days.set(entry.date, [...(days.get(entry.date) ?? []), entry]);
  return [...days].sort(([a], [b]) => b.localeCompare(a)).map(([date, dayEntries]) => ({ date, entries: dayEntries }));
}

const dayFormat = new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });

/** "Tuesday, October 27, 2026" for "2026-10-27", the same in every time zone. */
export function formatChangelogDay(date: string): string {
  return dayFormat.format(new Date(`${date}T00:00:00Z`));
}
