# UI Cleanup Audit

Reviewed September 16, 2026 against commit `de758cf`.

This is an implementation backlog for a structural UI cleanup. Preserve TypeSetGo’s flat, matte character: restrained surfaces, clear type, useful contrast, subtle borders, and purposeful motion. The goal is consistent components and reliable state ownership, with fixes at the source of each problem.

No application fixes are included in this deliverable. Trial implementation changes and temporary diagnostic tests were removed before completing the audit. Existing unrelated workspace files were left untouched. Locations below refer to the reviewed baseline; use the named component or function if line numbers move.

**Evidence labels:** “Browser verified” means reproduced on the local application; “Source confirmed” means the implementation establishes the problem, but the full interaction was not exercised; “Needs runtime validation” identifies a specific risk whose visible impact still needs reproduction. “Design cleanup” identifies a consistency or usability decision rather than a claimed functional failure. High priority means blocked interaction, incorrect state, or a shared foundation affecting many screens; medium means significant usability, accessibility, or responsive defects; low means less urgent polish or dormant code.

**Coverage and limits:** Reviewed the home practice flow, shared primitives, header, settings, theme picker, keyboard, profile/stats, achievements, leaderboards, Connect, plans, and race flows. Browser checks covered wide and narrow viewports, light mode, settings dismissal, quote switching, word-count changes, typing focus, and quote fading. Authenticated flows and live multiplayer mutations were not exercised. The local preview uses a production Clerk key, which Clerk rejects on localhost; this limits account-level verification and is not evidence of a production sign-in outage. Race and Connect findings are retained because their routes and implementations exist, even though the main Race navigation is currently disabled. Do not enable unfinished features just to resolve an audit item.

**Approach for future agents:** Start with semantic theme tokens and the application shell; establish one dialog/popover and keyboard-interaction contract; then repair prompt/session state ownership; finally polish individual screens. Validate fixes with targeted interaction tests and a small visual matrix covering narrow screens, zoom, long text, light/dark themes, keyboard-only use, reduced motion, loading, errors, and empty data. Do not work through this document as a series of unrelated cosmetic overrides.

## Shared UI color classes are disconnected from the theme

**Priority / evidence:** High · Browser verified and source confirmed.

**Description:** Shared shadcn components request utilities such as `bg-background`, `bg-primary`, `text-muted-foreground`, `border-input`, and `ring-ring`. The Tailwind v4 `@theme` block defines fonts and animations but no semantic color mappings. The separate `:root` HSL variables do not register those utilities. Browser stylesheet inspection found no generated `bg-primary` or `bg-background` rules. Inline overrides conceal the problem on some screens, leaving controls inconsistent elsewhere.

**Possible locations:** `src/index.css:1`, `src/components/ui/button.tsx:9`, `input.tsx`, `select.tsx`, `switch.tsx`, `slider.tsx`, `dialog.tsx`, `src/context/ThemeContext.tsx:56`.

**Possible resolutions:** Define the complete Tailwind semantic token bridge against the live TypeSetGo palette. Decide foreground/surface/interactive roles centrally, then remove compensating inline overrides gradually. Verify actual computed styles for every shared primitive in multiple themes.

## Shared entry and exit animations have no stylesheet

**Priority / evidence:** Medium · Browser verified and source confirmed.

**Description:** Dialogs, selects, menus, and popovers use `animate-in`, `animate-out`, `fade-in-*`, `zoom-in-*`, and slide classes. `tw-animate-css` is installed but never imported. An open settings select had computed `animation-name: none`. Intended transitions therefore snap, and exit timing cannot behave as authored.

**Possible locations:** `package.json`, `src/index.css:1`, `src/components/ui/dialog.tsx:39`, `select.tsx`, `dropdown-menu.tsx`, `popover.tsx`, `hover-card.tsx`.

**Possible resolutions:** Integrate the animation stylesheet once, define a restrained shared duration/easing policy, and test both opening and closing. Check transform composition and reduced-motion behavior after activation; importing the stylesheet can reveal previously dormant animation defects.

## Theme mode does not control native or Tailwind dark-mode styling

**Priority / evidence:** Medium · Browser verified and source confirmed.

**Description:** ThemeProvider changes custom colors but never synchronizes a root mode class, a matching Tailwind dark variant, or CSS `color-scheme`. Shared components still contain `dark:` styles. Selecting a light theme changed the page background while the root class remained empty and computed `color-scheme` remained `normal`. Component dark styling can consequently follow the OS rather than the selected app mode.

**Possible locations:** `src/context/ThemeContext.tsx:56`, `src/index.css`, `src/components/ui/input.tsx`, `select.tsx`, `switch.tsx`.

**Possible resolutions:** Make the selected effective mode authoritative for root attributes, Tailwind variants, and native controls. Test app-light/OS-dark and app-dark/OS-light combinations explicitly.

## Secondary UI text inherits typing-text contrast

**Priority / evidence:** High · Browser verified and measured from theme data.

**Description:** The default dark secondary text `#4b5563` against `#323437` has approximately 1.65:1 contrast. Small labels, footer links, helper copy, disabled-looking navigation, and instructions reuse this quiet typing color, sometimes with further opacity reduction. A read-only calculation across 9,909 supplied theme variant/mode palettes found 6,905 secondary-text/base-background pairs below 4.5:1; 29 primary-text pairs were also below that value. These are token-pair measurements, not a claim that every rendered element was measured.

**Possible locations:** `public/themes/*.json`, `public/themes/typesetgo.json`, `src/lib/themes.ts:823`, `src/index.css:36`, `src/lib/theme-vars.ts`, `src/pages/Home.tsx:35`.

**Possible resolutions:** Separate readable UI labels and helper text from deliberately subdued untyped characters. Validate semantic foreground/background pairs when loading or generating themes, and derive safe UI colors while retaining theme identity. Avoid globally brightening the typing exercise to repair unrelated labels.

## Multiple palette systems prevent consistent theming

**Priority / evidence:** Medium · Source confirmed / design cleanup.

**Description:** The application mixes ThemeProvider tokens, `GLOBAL_COLORS`, the older `Theme` object, hardcoded Tailwind gray utilities, and fixed toast colors. A theme change therefore has different reach on different screens. The toast component defaults to dark and sits outside ThemeProvider, while Connect uses the static global palette.

**Possible locations:** `src/lib/colors.ts`, `src/lib/typing-constants.ts`, `src/lib/theme-vars.ts`, `src/pages/Connect.tsx`, `src/pages/Host.tsx`, `src/components/plan/PlanResultsModal.tsx`, `src/components/ui/sonner.tsx:15`, `src/main.tsx:42`.

**Possible resolutions:** Establish one semantic palette contract, with adapters only where migration requires them. Move toast mode/color ownership into that contract. Replace hardcoded grays by role, rather than performing an indiscriminate color-class search-and-replace.

## Elevation and glow treatments conflict with the matte direction

**Priority / evidence:** Low · Design cleanup.

**Description:** The base typing page is restrained, but live-stat pills, dialogs, achievements, and race surfaces add heavy shadows, backdrop blur, glows, and hover scaling. These treatments produce several competing visual languages and occasionally move content merely to signal hover.

**Possible locations:** `src/components/typing/TypingPractice.tsx:2540`, `src/components/plan/PlanResultsModal.tsx:25`, `src/components/auth/AchievementsModal.tsx:50`, `AchievementDetailModal.tsx:62`, `src/components/race/PlayerCard.tsx:49`, `Podium.tsx:110`, `src/pages/Race.tsx:124`.

**Possible resolutions:** Define a small surface/elevation system: solid matte fills, quiet borders, limited overlay elevation, and emphasis through color/type before glow or scale. Preserve meaningful earned/ready/current-player distinctions when simplifying effects.

## The header overlaps and loses controls at narrow widths

**Priority / evidence:** High · Browser verified.

**Description:** The fixed-size logo and action groups compete with an absolutely centered navigation bar. At roughly 400 CSS pixels, controls extend beyond the viewport and navigation overlaps the logo/settings area. At intermediate widths, clicking the visible theme control can hit overlapping navigation instead.

**Possible locations:** `src/components/layout/Header.tsx:53`, `:56`, `:134`, `:177`; `src/pages/Home.tsx:21`; header-clearance spacer in `src/components/typing/TypingPractice.tsx:2188`.

**Possible resolutions:** Rebuild the header as a responsive grid or explicit multi-row layout. Reserve space for navigation and account actions; replace independent absolute centering and negative-margin compensation. Couple page clearance to the actual shell layout. Verify small phones, tablet widths, long account names, and zoom.

## Invisible header controls remain keyboard-accessible

**Priority / evidence:** Medium · Browser verified and source confirmed.

**Description:** Focus mode fades the header to zero opacity and removes pointer events, but does not remove its descendants from focus or accessibility navigation. Browser inspection found six enabled buttons/links still present while the header was fully transparent.

**Possible locations:** `src/components/layout/Header.tsx:53`, `src/pages/Home.tsx:21`, typing-state notification in `src/components/typing/TypingPractice.tsx:1755`.

**Possible resolutions:** Define the interaction state of the hidden header explicitly, using `inert` or a deliberate unmount/visibility strategy alongside the fade. Ensure a discoverable way to leave focus mode and avoid trapping focus when hiding a currently focused control.

## The theme picker has no usable phone layout

**Priority / evidence:** High · Browser verified.

**Description:** The picker always allocates 40% to its elaborate preview and 60% to browsing. On a phone, the preview wraps into a narrow word column, while the search field, expansion actions, and swatch labels overflow or clip. In one narrow inspection, the search input extended beyond the viewport despite its parent being only about 173px wide.

**Possible locations:** `src/components/typing/TypingPractice.tsx:3182`, `:3188`, `:3344`, `:3366`, `:3388`.

**Possible resolutions:** Design a dedicated compact composition: a full-width browser, a small optional preview, wrapping or consolidated toolbar actions, and intrinsic input sizing. Use container-aware grid density instead of assuming the browser panel occupies the full viewport.

## Collapsed theme categories still contain focusable controls

**Priority / evidence:** High · Browser verified.

**Description:** Categories collapse through `max-height: 0`, opacity, and overflow clipping only. Their cards remain mounted, focusable, and represented in the accessibility tree. One captured session had 51 collapsed categories containing 1,405 enabled focusable buttons. Keyboard navigation can disappear into invisible content.

**Possible locations:** `src/components/typing/TypingPractice.tsx:3455`, `:3460`, `:3484`.

**Possible resolutions:** Use an accessible collapsible contract that removes closed content from interaction and accessibility navigation. Unmount closed categories or apply `inert` with correct presence timing. Add `aria-expanded`/`aria-controls` to category triggers and test repeated keyboard expansion/collapse.

## Theme-category expansion has an arbitrary clipping ceiling

**Priority / evidence:** Medium · Source confirmed.

**Description:** Expanded categories are capped at `max-h-[5000px]`. A large category with hundreds of cards can exceed that height, especially with one column. The same oversized max-height produces uneven animation timing: the visible content finishes expanding long before the numeric transition finishes, while closing can appear delayed.

**Possible locations:** `src/components/typing/TypingPractice.tsx:3484` and the card grid immediately below it; `src/components/typing/ThemeCard.tsx:40`.

**Possible resolutions:** Animate intrinsic height or a grid track without a hard content ceiling. For large collections, render/virtualize deliberately rather than keeping every card mounted. Verify the final item remains reachable in the largest category at the narrowest supported width.

## Variant drawers cannot play their exit animation

**Priority / evidence:** Medium · Source confirmed.

**Description:** The parent inserts a drawer only while its theme is expanded and always passes `isOpen={true}`. Closing removes the entire drawer, including the `AnimatePresence` that is supposed to observe the exit. The authored collapse transition is therefore bypassed.

**Possible locations:** `src/components/typing/TypingPractice.tsx:3560`, `:3572`; `src/components/typing/VariantDrawer.tsx:43`.

**Possible resolutions:** Move presence ownership to the stable parent that conditionally renders drawers, or keep the drawer mounted and change its open state. Define behavior for switching directly between themes and for a drawer moving to another grid row.

## Variant drawer height becomes stale after layout changes

**Priority / evidence:** Medium · Source confirmed; resize appearance needs runtime validation.

**Description:** The drawer measures `scrollHeight` only when `isOpen` or `variants.length` changes, then animates to that fixed pixel height. A responsive column change, text wrap, or late font load can change the required height without triggering another measurement, leaving clipping or excess blank space.

**Possible locations:** `src/components/typing/VariantDrawer.tsx:30`, `:33`, `:48`; `src/hooks/useGridColumns.ts`.

**Possible resolutions:** Prefer intrinsic-height animation, or observe the content with ResizeObserver and clean it up. Keep grid placement and measurement tied to the same container rather than independent viewport assumptions.

## Theme loading eagerly requests the whole catalog

**Priority / evidence:** Medium · Source confirmed; unprofiled performance risk.

**Description:** Every TypingPractice mount fetches all themes, even if the picker is never opened. The current manifest contains 1,557 themes, loaded through an unbounded `Promise.all`. Only completed responses are cached, so concurrent mounts/StrictMode work can duplicate in-flight requests. Failures are filtered out, with no picker-level distinction between a complete catalog, a partial catalog, and loading.

**Possible locations:** `src/components/typing/TypingPractice.tsx:1074`, `src/lib/themes.ts:640`, `:700`, `vite-plugin-auto-manifest.ts`.

**Possible resolutions:** Serve a compact searchable catalog, load detailed palettes on demand, deduplicate in-flight requests, and bound concurrency where needed. Add explicit loading/partial-failure/retry states. Profile before claiming a specific latency improvement; local failed fetches alone do not establish the cause.

## Rapid theme selections can resolve out of order

**Priority / evidence:** Medium · Source confirmed race condition; runtime reproduction pending.

**Description:** `setTheme` and `setThemeSelection` await fetches and then unconditionally update state, CSS, and storage. A slow request for the first choice can finish after a later choice and revert the UI to the older selection. Startup theme initialization can similarly compete with an early user selection.

**Possible locations:** `src/context/ThemeContext.tsx:127`, `:160`, `:199`.

**Possible resolutions:** Give theme changes one owner and a monotonically increasing request identity, or cancel superseded work. Apply only the latest accepted selection atomically to state, CSS, and persistence. Test with deliberately reordered responses.

## Theme-card selection and expansion lack a complete interaction contract

**Priority / evidence:** Medium · Source confirmed.

**Description:** Variant-count badges are clickable `div`s. Theme selection is primarily communicated through borders, while selection, expansion, and light/dark actions lack consistent state semantics. Tiny sun/moon buttons share a narrow side rail and previews depend on mouse enter/leave, leaving touch and keyboard users with less information.

**Possible locations:** `src/components/typing/ThemeCard.tsx:44`, `:66`, `:84`; `src/components/typing/VariantDrawer.tsx:68`.

**Possible resolutions:** Use native buttons, selected/expanded state attributes, theme-specific accessible names, adequate targets, and focus-triggered previews. Decide clearly whether the main card selects a theme or expands variants and communicate that distinction visually.

## “Custom Theme” opens a read-only color display

**Priority / evidence:** Low · Browser verified / design cleanup.

**Description:** The picker offers “Custom Theme,” but the panel explicitly says the colors are read-only and exposes swatches plus a reset. The label implies a customization feature that is not available.

**Possible locations:** `src/components/typing/TypingPractice.tsx:3737` through the end of the theme modal.

**Possible resolutions:** Rename the surface to match its current purpose, such as theme details, or remove the misleading entry from the main picker. Do not implement a new custom-theme feature as part of this polish pass unless separately requested.

## Dialog behavior is implemented repeatedly and inconsistently

**Priority / evidence:** High · Browser verified and source confirmed.

**Description:** Settings, theme selection, quick settings, preset input, custom counts, plans, stats details, and several race/host overlays use independent fixed-position `div`s. Settings did not close with Escape; the theme picker had no dialog role; background controls remained in the accessibility tree. Some other overlays implement their own Escape handling, creating inconsistent focus, dismissal, scrolling, and stacking behavior.

**Possible locations:** `src/components/typing/TypingPractice.tsx:3135`, `:3170`, `:3840`, `:4442`, `:4617`; `src/components/plan/*Modal.tsx`; `src/components/auth/StatsModal.tsx`; `src/pages/UserStats.tsx:268`; `src/pages/Host.tsx`; `src/pages/RaceActive.tsx:400`; existing `src/components/ui/dialog.tsx`.

**Possible resolutions:** Consolidate on the existing dialog primitive and one modal composition pattern with titles, descriptions, focus trap/restoration, Escape, scroll locking, and nested-overlay ownership. Preserve intentional dismissal constraints for destructive/live actions. Test menus opened inside dialogs and parent-child modal transitions.

## Settings labels and selected states are not programmatically connected

**Priority / evidence:** Medium · Browser verified and source confirmed.

**Description:** Many visual labels have no `htmlFor`/id relationship to their controls. The settings snapshot exposes unlabeled comboboxes and slider thumbs. Mode, alignment, layout, modifiers, and settings-section controls communicate selection mainly through color and use plain buttons where tabs, radio groups, or toggle semantics are expected.

**Possible locations:** `src/components/typing/TypingPractice.tsx:2220`, `:3886`, `:3925`, `:3979`, `:4015`, `:4319`; `src/components/ui/slider.tsx:54`.

**Possible resolutions:** Establish reusable field, toggle-group, tab, and slider patterns with labels attached to the actual interactive element. Use `aria-pressed`, checked state, or Radix group primitives as appropriate, with keyboard movement and visible focus. Avoid attaching labels only to wrapper elements.

## Reduced-motion preferences are ignored

**Priority / evidence:** Medium · Source confirmed.

**Description:** There is no app-level MotionConfig policy, CSS reduced-motion override, or counter preference handling. Infinite progress animation, caret pulsing, race bounce, entrance transforms, hover scaling, smooth scrolling, and animated counters continue regardless of the user’s preference.

**Possible locations:** `src/main.tsx`, `src/index.css`, `src/hooks/useAnimatedCounter.ts`, `src/components/typing/TypingPractice.tsx:2543`, `src/components/race/RaceCourse.tsx:161`, `src/components/auth/AchievementsModal.tsx:240`.

**Possible resolutions:** Introduce a shared motion policy covering CSS, Framer Motion, requestAnimationFrame, and imperative scrolling. Preserve feedback with stable state changes and short opacity transitions when movement is reduced; explicitly stop infinite animations and long delays.

## Animated counters restart, leak frames, and mishandle edge cases

**Priority / evidence:** Medium · Reproduced with temporary isolated tests.

**Description:** The counter animates each new target from zero instead of the displayed value. Its zero-target branch schedules a frame without returning cleanup, truthiness checks miss frame ID zero, a start timestamp of zero is treated as uninitialized, and zero duration can produce `NaN`. Reduced motion does not bypass the animation/delay. Six temporary regression probes failed on the baseline, including the separate keyboard-resize issue below; the probes were removed for this documentation-only deliverable.

**Possible locations:** `src/hooks/useAnimatedCounter.ts:15` through `:49`.

**Possible resolutions:** Model one cancellable animation lifecycle with explicit null/undefined checks, a stored displayed value, immediate handling for resets/nonpositive duration, and reduced-motion support. Reintroduce focused regression tests when implementing the fix; the current unit suite does not exercise these cases.

## Quote metadata refuses to fade with the rest of the UI

**Priority / evidence:** Medium · Browser verified.

**Description:** The quote author/source container combines an inline `opacity` state with `animate-fade-in`. That animation uses `forwards`, so its final opacity continues to override the inline value. After typing and waiting, the browser reported inline opacity `0` but computed opacity `1` with animation `fadeIn`.

**Possible locations:** `src/index.css:6` and the `fadeIn` keyframes; `src/components/typing/TypingPractice.tsx:2622`.

**Possible resolutions:** Give the quote container one owner for visibility transitions. Use an entrance animation that releases opacity control, or a single animation/state system for entrance and focus-mode fading. Verify both quote switching and session restart.

## Focus-mode fading waits for a typing pause

**Priority / evidence:** Medium · Source confirmed.

**Description:** The effect described as “UI Fade while typing” restarts its two-second timer on every `typedText` change. Continuous typing postpones the fade indefinitely; the hints fade only after the user stops for two seconds. The header follows a different immediate-hide rule, so the screen’s focus behavior is internally inconsistent.

**Possible locations:** `src/components/typing/TypingPractice.tsx:1744`, `:1755`, `:3114`.

**Possible resolutions:** Define a focus-mode state transition based on session state and deliberate user interaction, rather than resetting a timer on each character. Keep header, metadata, controls, and instructions on the same policy, with accessible recovery behavior.

## The typing input traps Tab navigation

**Priority / evidence:** High · Browser verified and source confirmed.

**Description:** Both typing inputs prevent every Tab event, even when no restart shortcut is being requested. A browser check confirmed that ordinary Tab leaves focus on the hidden typing input. Keyboard users cannot naturally move to settings, navigation, or other controls.

**Possible locations:** `src/components/typing/TypingPractice.tsx:1832`; `src/components/typing/TypingArea.tsx:409`.

**Possible resolutions:** Define a documented shortcut that does not consume ordinary focus navigation, or provide an explicit keyboard escape from typing mode. Keep visual focus, native input focus, and session state aligned. Test forward and reverse tab order during idle and active sessions.

## Results shortcuts intercept unrelated inputs and dialogs

**Priority / evidence:** High · Source confirmed.

**Description:** While results are displayed, a window-level handler intercepts Enter, Tab, and Space without checking the event target, open overlays, composition, or `defaultPrevented`. Typing into a theme search field or navigating settings can regenerate/repeat a test or invoke Save instead of operating the focused control.

**Possible locations:** `src/components/typing/TypingPractice.tsx:1880` through `:1905`.

**Possible resolutions:** Scope shortcuts to the results surface, suspend them while an overlay or editable control owns input, and honor consumed/composition events. Maintain one shortcut registry or interaction owner rather than adding per-dialog exceptions.

## The visual caret disappears after extra characters

**Priority / evidence:** Medium · Source confirmed.

**Description:** The caret is rendered only at a character matching `typedWord.length`, or at the word end when typed length exactly equals target length. Once the user overtypes a word, extra characters render but neither caret condition applies. The user loses the edit position precisely when correcting a mistake.

**Possible locations:** `src/components/typing/TypingPractice.tsx:2070`, `:2100`; `src/components/typing/TypingArea.tsx:445`, `:489`, `:566`.

**Possible resolutions:** Derive the caret from the real displayed insertion position, including the extra-character run and terminal spaces. Prefer a single measured caret layer shared by standard/tape rendering. Verify overtyping, deletion, empty words, and end-of-prompt boundaries.

## Typing scroll calculations use already-animated geometry

**Priority / evidence:** Medium · Needs runtime validation.

**Description:** The scroll correction compares `getBoundingClientRect()` on the active word with the container while that word’s parent is transitioning its transform, then adds the difference to the target offset. Rapid updates during the transition can measure an intermediate visual position and overcorrect. The effect also lacks several layout dependencies such as font family, word wrapping, and container resizing.

**Possible locations:** `src/components/typing/TypingPractice.tsx:1979`, `:2670`, `:2688`; `src/components/typing/TypingArea.tsx:307`, `:321`, `:685`.

**Possible resolutions:** Calculate an absolute desired offset from stable layout coordinates, separating measurement from presentation animation. Observe relevant container/font/layout changes. Reproduce at high typing speed, with backspace across lines, resized windows, and changed fonts before choosing interpolation behavior.

## The on-screen keyboard disappears permanently after shrinking

**Priority / evidence:** Medium · Reproduced with a temporary component test.

**Description:** When its measured container width falls below 280px, the keyboard sets `tooSmall` and returns `null`. That removes the measured element and clears its ref. Subsequent resize callbacks have no element to measure, so expanding the window does not restore the keyboard.

**Possible locations:** `src/components/typing/keyboard/OnScreenKeyboard.tsx:43`, `:64`, `:82`.

**Possible resolutions:** Keep a stable measured wrapper mounted and hide only the contents when necessary. Test shrink→expand and layout changes while the keyboard is visible, including observer cleanup and reattachment.

## Pressed keyboard keys use an unreadable foreground/background pair

**Priority / evidence:** Medium · Source confirmed and theme-data measurement.

**Description:** Active keys use `typing.correct` for the fill and `text.inverse` for the label. In the default dark theme, this produces a near-white key with a white label. These tokens describe unrelated roles and do not guarantee contrast; the next-key and caps-lock fills need equivalent checks across themes.

**Possible locations:** `src/components/typing/keyboard/KeyboardKey.tsx:34`; `public/themes/typesetgo.json`.

**Possible resolutions:** Introduce explicit foreground-on-highlight semantics or derive a contrast-safe key label for each fill. Validate normal, next, pressed, and Caps Lock states in representative light and dark palettes.

## Color picker positioning and listener cleanup are fragile

**Priority / evidence:** Medium · Source confirmed; active through Host settings.

**Description:** The picker uses `position: fixed` but adds page scroll offsets to viewport coordinates. It registers and removes different anonymous scroll callbacks, leaking a listener on every opening. Its positioning frame is not canceled, the portal appears before its position is resolved, and all instances share one portal id for outside-click detection.

**Possible locations:** `src/components/typing/ColorPicker.tsx:25`, `:29`, `:66`, `:81`, `:85`, `:99`; caller `src/pages/Host.tsx:1451`.

**Possible resolutions:** Replace the hand-positioned portal with the shared collision-aware popover primitive and a per-instance reference. If custom positioning remains, use one coordinate system, stable listener identities, cancellable work, and resize/scroll-aware placement.

## Color picker dragging supports only a mouse

**Priority / evidence:** Medium · Source confirmed.

**Description:** Hue and saturation/value canvases bind `mousedown`, `mousemove`, and `mouseup` only. They have no pointer/touch interaction, focusable slider semantics, or keyboard adjustment. The text field is an alternate exact-value input, but does not make the visual controls usable on touch devices.

**Possible locations:** `src/components/typing/ColorPicker.tsx:275`, `:292`, `:310`, `:394`, `:402`, `:423`.

**Possible resolutions:** Use Pointer Events with pointer capture and deliberate touch-action behavior. Provide labeled keyboard-operable controls for hue, saturation, and value, while retaining hex entry. Reuse accessible color-control building blocks if they fit the existing UI.

## Notifications hide their delete action from keyboard and touch users

**Priority / evidence:** Medium · Source confirmed.

**Description:** A notification’s remove button has `opacity-0 group-hover:opacity-100`. Keyboard focus alone does not reveal it, and touch has no reliable hover state. The nested action sits inside a menu item with its own activation behavior, which also needs deliberate keyboard semantics.

**Possible locations:** `src/components/layout/NotificationCenter.tsx:218`, `:245`.

**Possible resolutions:** Reveal actions for focus-within as well as hover, provide a persistent touch affordance, and avoid ambiguous nested activation. Ensure remove operates independently from opening/marking a notification and has a clear accessible name.

## The application shell lacks route-level recovery

**Priority / evidence:** Medium · Source confirmed.

**Description:** The route table has no fallback route. Unknown URLs render no page content. There is also no visible application error boundary around route content, so failures in a feature or required provider can take down the whole UI without an in-app recovery state.

**Possible locations:** `src/App.tsx:24`, `src/main.tsx:26`.

**Possible resolutions:** Add a compact themed not-found route and a route/application error boundary with retry/home navigation. Keep backend loading/error handling local where possible so one failing panel does not replace the entire application.

## The advertised auth-disabled mode still calls Clerk-only hooks

**Priority / evidence:** High · Source confirmed integration mismatch; no auth-disabled runtime test performed.

**Description:** `main.tsx` intentionally renders without ClerkProvider when the publishable key is missing, but Header, TypingPractice, UserButton, and NotificationCenter call Clerk hooks unconditionally. The claimed anonymous fallback therefore does not provide the provider contract those components require. The current localhost production-key rejection also leaves the account affordance in loading state with no useful recovery message.

**Possible locations:** `src/main.tsx:22`, `:35`; `src/components/layout/Header.tsx:28`; `src/components/typing/TypingPractice.tsx:750`; `src/components/auth/UserButton.tsx:17`; `src/components/layout/NotificationCenter.tsx:65`.

**Possible resolutions:** Introduce an explicit auth-capability boundary or safe application auth abstraction. Render a supported anonymous experience when auth is absent and distinguish unavailable auth from loading. Configure a supported development identity environment for authenticated UI verification without changing the live backend as part of polish.

## The main practice component couples unrelated UI lifecycles

**Priority / evidence:** Medium · Source confirmed structural issue; performance impact unprofiled.

**Description:** TypingPractice is approximately 4,969 lines and owns prompt generation, session persistence, timing, sound, theme browsing, several dialogs, layout measurement, keyboard state, and results rendering. Hot typing/timer updates rerender the owner of large cold settings/theme surfaces. TypingArea separately implements similar cursor, stats, and scrolling rules, allowing fixes to diverge between solo and race.

**Possible locations:** `src/components/typing/TypingPractice.tsx`, `src/components/typing/TypingArea.tsx`, `src/components/settings/*`, `src/components/typing/GhostWriterController.tsx`, `SoundController.tsx`.

**Possible resolutions:** First define shared session, prompt, input, and presentation contracts. Extract cohesive ownership boundaries such as practice engine, typing renderer, configuration panels, and results. Share behavior deliberately; avoid merely moving JSX into files while leaving conflicting state owners intact. Characterize behavior before merging implementations.

## Word-count changes do not rebuild the prompt

**Priority / evidence:** High · Browser verified.

**Description:** The word-count selector updates `settings.wordTarget` without regenerating text. Selecting 10 left 25 rendered words in the browser. Increasing the target can be worse: completion expects more words than the prompt contains. Custom word counts follow the same path.

**Possible locations:** `src/components/typing/TypingPractice.tsx:1693`, `:2347`, `:1597`, `:1824`.

**Possible resolutions:** Apply target selection, prompt generation, local reset, and server-session invalidation as one explicit transition. Test increasing and decreasing counts before typing and ensure the rendered count, completion rule, and saved session agree.

## Quote mode can display the previous word test

**Priority / evidence:** High · Browser verified.

**Description:** On first entry to Quote mode, generation runs before the quote dataset resolves and returns without replacing the prompt. Dataset arrival does not trigger generation. The browser retained the old 200-word random list after loading; leaving and returning to Quote then displayed a real quote. Quote-length changes have the same missing transition.

**Possible locations:** `src/components/typing/TypingPractice.tsx:1112`, `:1526`, `:1693`, `:2378`.

**Possible resolutions:** Tie generation to a resolved dataset identified by the selected length. Show loading explicitly, reject stale responses, and commit prompt/author/settings/session together. Test cold-cache mode changes and rapid length changes.

## The visible caret ignores native input selection

**Priority / evidence:** Medium · Source confirmed.

**Description:** ArrowLeft, Home, and selection shortcuts move the native hidden input’s insertion point, but the painted caret always follows the end of the typed string. Subsequent typing can edit an earlier character while the visual caret stays elsewhere.

**Possible locations:** `src/components/typing/TypingPractice.tsx:1832`, `:2047`, `:2642`; `src/components/typing/TypingArea.tsx:409`, `:437`, `:591`.

**Possible resolutions:** Choose a supported editing model. Either track and render `selectionStart`/selection ranges or consistently constrain input to end editing with clear keyboard behavior. Cover arrows, Home/End, selection, deletion, composition, and pointer refocusing.

## Local settings hydration can overwrite account preferences

**Priority / evidence:** High · Source confirmed timing defect; authenticated runtime validation pending.

**Description:** Storage loading marks itself complete before its requestAnimationFrame hydration executes. The initial preference snapshot records defaults first. When nondefault stored values arrive, they can be interpreted as new anonymous user edits, suppressing database restoration and later saving local values over account preferences. The visible symptom is settings/themes unexpectedly reverting across devices or sign-in.

**Possible locations:** `src/components/typing/TypingPractice.tsx:821`, `:933`, `:940`, `:1036`.

**Possible resolutions:** Separate initialization from user edits. Complete local hydration before recording its baseline, then reconcile account preferences using explicit dirty fields or a defined precedence rule. Test slow account loading with existing local settings and actual edits during loading.

## Displayed and ranked prompts can have different owners

**Priority / evidence:** High · Source confirmed cross-layer defect; authenticated runtime validation pending.

**Description:** The server independently generates Time/Words/Zen text. If typing begins before session creation returns, the frontend retains its local text but adopts the server session ID. Final accuracy is computed against the server’s different prompt. Repeat can also acquire freshly generated server text while still displaying the repeated-test state.

**Possible locations:** `src/components/typing/TypingPractice.tsx:1141`, `:1433`, `:1476`, `:1515`; `convex/typingSessions.ts:93`, `:253`.

**Possible resolutions:** Establish prompt identity and session identity atomically before accepting ranked typing, or make the pending/unavailable state explicitly unranked. Give Repeat a supported contract that preserves the original prompt and ranking policy. Verify under delayed session creation without weakening server validation.

## Quote completion disagrees with word-aligned editing

**Priority / evidence:** High · Source confirmed.

**Description:** Quote/preset completion compares total input length with target length, while the display aligns input by words and allows missed/extra characters. For target `cat dog`, `cattt d` reaches the same length and can finish with the final word incomplete. Missing earlier characters can cause the inverse: the user reaches the last word but completion does not align with the visible cursor.

**Possible locations:** `src/components/typing/TypingPractice.tsx:1802`, `:2047`.

**Possible resolutions:** Define completion in the same reference-word/insertion-position model as rendering and scoring. Test extra letters, skipped letters, premature spaces, final punctuation, and the terminal word separately from total string length.

## Keyboard guidance keeps demanding Backspace after historical mistakes

**Priority / evidence:** Medium · Source confirmed.

**Description:** The exercise permits submitting an incorrect word with Space, but the keyboard hint compares the entire raw input to the entire prompt. Any earlier mismatch can keep the hint on Backspace even while the current word is being entered correctly. Missing or extra letters also shift the comparison against later text.

**Possible locations:** `src/components/typing/TypingPractice.tsx:1848` through `:1859`.

**Possible resolutions:** Derive next-key guidance from the same current-word model as the renderer. If the intended mode requires correcting every historical mistake, enforce that rule in input handling and explain it, rather than having the keyboard silently impose a different rule.

## Long words can be clipped with no way to see the remaining letters

**Priority / evidence:** Medium · Source-confirmed layout boundary; visual matrix pending.

**Description:** Each word is an unbreakable inline block inside an overflow-hidden viewport. At large text sizes or narrow widths, a single word can exceed that viewport. The scroll logic only follows vertical movement, so the missing letters and caret cannot be brought into view.

**Possible locations:** `src/components/typing/TypingPractice.tsx:2063`, `:2638`, `:2668`; `src/components/typing/TypingArea.tsx:481`, `:672`.

**Possible resolutions:** Choose a deliberate long-token policy: responsive size limits, controlled character wrapping, or horizontal caret-follow. Test long quote words and expert words at the maximum supported size and narrowest supported width. Avoid merely hiding horizontal page overflow.

## Result-word details are available only through hover

**Priority / evidence:** Medium · Source confirmed.

**Description:** Correct/Incorrect counts use HoverCardTrigger with plain unfocusable `div` children. Keyboard users cannot reach the word-detail disclosure, and touch users lack a dependable equivalent interaction.

**Possible locations:** `src/components/typing/TypingPractice.tsx:2778`, `:2816`.

**Possible resolutions:** Use named buttons opening an accessible disclosure/popover, with visible focus and a clear relationship to the count. Hover may remain a convenience, but must not be the only way to inspect results.

## Compact and desktop text-size controls disagree

**Priority / evidence:** Medium · Source confirmed.

**Description:** Compact settings accept numeric values advertised as 1–10, without enforcing that range in the handler. Desktop settings display a value clamped to 3–6, while the typing renderer uses the original raw value. An 8rem compact selection can therefore appear as 6rem in the desktop UI while still rendering at 8rem.

**Possible locations:** `src/components/typing/TypingPractice.tsx:2150`, `:3979`, `:4867`, `:2670`.

**Possible resolutions:** Centralize validation and allowed ranges in the settings model. Make every editor show the value actually applied. Consolidate duplicated compact/desktop control definitions so labels, constraints, and behavior cannot drift.

## Visually disabled sound and ghost settings still accept keyboard input

**Priority / evidence:** Medium · Source confirmed.

**Description:** Several disabled-looking groups rely on opacity and `pointer-events-none`, leaving descendants in the tab order. Sound Preview can still be activated through the keyboard while Sound is Off because the preview handler does not check that setting. Ghost speed is similarly presented as disabled while remaining operable.

**Possible locations:** `src/components/typing/TypingPractice.tsx:4065`, `:4102`, `:2136`, `:4249`.

**Possible resolutions:** Use actual disabled state on the controls and consistent guards in actions. Alternatively, keep configuration editable while off and visually communicate that policy accurately. Do not mix these two interaction models.

## The ghost cursor skips spaces and drifts from elapsed time

**Priority / evidence:** Medium · Source confirmed.

**Description:** Ghost indexes include spaces, but ghost elements are rendered only for letters, so the cursor vanishes at word boundaries. Pace advances by a fixed increment per interval callback while the session clock uses wall time; delayed callbacks therefore make the ghost slower than its advertised WPM.

**Possible locations:** `src/components/typing/TypingPractice.tsx:1733`, `:2065`, `:2119`.

**Possible resolutions:** Derive ghost position from the same elapsed-time source as the test and represent boundary positions explicitly. Keep animation interpolation separate from authoritative progress, including after throttling, pause, and restart.

## Leaderboard time ranges disappear on smaller screens

**Priority / evidence:** Medium · Source confirmed.

**Description:** Today and This Week columns use `hidden lg:flex`, with no mobile tab, selector, or alternate route to expose their data. A narrower viewport loses functionality rather than receiving a different layout. All three queries still run.

**Possible locations:** `src/pages/Leaderboard.tsx:319`, `:404`, `:420`.

**Possible resolutions:** Present the time ranges as tabs/segmented navigation on compact screens or stack accessible sections. Keep selection, labels, loading, and empty states consistent across layouts; avoid querying permanently inaccessible panels if no longer needed.

## Leaderboard names shrink to unreadable sizes

**Priority / evidence:** Medium · Source confirmed / design cleanup.

**Description:** Podium usernames are explicitly reduced to 7px for names over 20 characters and 8–9px for other long names. This trades away identification readability to fit a rigid card.

**Possible locations:** `src/pages/Leaderboard.tsx:75`, `:125`.

**Possible resolutions:** Keep a readable minimum type size, allow bounded wrapping or truncation, and expose the full name through an accessible disclosure. Let the podium layout accommodate content rather than repeatedly shrinking text.

## Large result lists reveal themselves too slowly

**Priority / evidence:** Medium · Source confirmed / design cleanup.

**Description:** Leaderboard rows delay by `0.9 + index * 0.04` seconds, so lower rows in a 50-entry list wait nearly three seconds to start appearing. Race table rows start after `1.2 + index * 0.08` seconds. The delay grows with list length and makes available data look absent.

**Possible locations:** `src/pages/Leaderboard.tsx:253`; `src/components/race/Podium.tsx:211`.

**Possible resolutions:** Cap total stagger time, animate the section once, or animate only a small visible leading set. Subsequent reactive updates should preserve readable content rather than replaying entrances. Remove delays under reduced motion.

## Race departure does not always disconnect the participant

**Priority / evidence:** High · Source confirmed; multiplayer runtime validation pending.

**Description:** Leaving the lobby uses navigation without updating participant connection state. A departed guest can remain connected and unready, preventing others from starting. The results page also has a navigation-only home link separate from its working disconnect action.

**Possible locations:** `src/pages/RaceLobby.tsx:60`, `:255`; `src/pages/RaceResults.tsx:72`, `:289`.

**Possible resolutions:** Establish one departure operation that updates membership before navigation, handles failure, and defines host departure/reassignment. Reuse it across lobby, active race, and results. Test readiness after a guest leaves and returns.

## Race host controls depend on a query-string flag

**Priority / evidence:** High · Source confirmed.

**Description:** Lobby host status comes from `?host=true`. An actual host who rejoins through the Join card reaches the same room without that parameter, losing settings and the client-side start responsibility. Presentation identity is disconnected from room ownership.

**Possible locations:** `src/pages/RaceLobby.tsx:30`, `:67`, `:291`; `src/pages/Race.tsx:194`.

**Possible resolutions:** Derive host capabilities from authenticated/session ownership in the room data, as the results page already does. Treat URL parameters as navigation context, not authority or the source of UI permissions.

## Missing race data produces permanent loading screens

**Priority / evidence:** Medium · Source confirmed.

**Description:** Lobby loading conditions catch a missing room before the later “Room Not Found” branch, making that recovery branch unreachable. Active race and results views similarly conflate unresolved queries with absent records. Deleted or expired room URLs can leave a spinner indefinitely.

**Possible locations:** `src/pages/RaceLobby.tsx:205`, `:220`; `src/pages/RaceActive.tsx:237`; `src/pages/RaceResults.tsx:84`.

**Possible resolutions:** Separate `undefined` loading from `null` missing, plus waiting-for-results and actual failures. Provide a themed recovery action and preserve enough room context to explain what happened.

## Race reconnect restores the avatar but not the typing state

**Priority / evidence:** High · Source confirmed; multiplayer runtime validation pending.

**Description:** Reconnection restores local visual progress/WPM, but the typing component starts with empty input. Its next update can overwrite the stored progress. The saved `typedProgress` is a count of correct characters, not a complete input history, so synthesizing a correct prefix is not necessarily faithful to what the user typed.

**Possible locations:** `src/pages/RaceActive.tsx:100`, `:190`, `:351`; `src/components/typing/TypingArea.tsx:52`.

**Possible resolutions:** Define an explicit resume contract carrying sufficient input/progress/timing state, or clearly restart the attempt if exact resume is unsupported. Initialize once per race/participant version; do not reset input on every reactive update.

## Race progress callbacks may create a mutation feedback loop

**Priority / evidence:** Medium · Needs runtime validation; source path traced.

**Description:** TypingArea’s progress effect depends on the callback identity. RaceActive’s callback depends on the full reactive participant object and writes that participant. A backend update can therefore create a new callback, retrigger the effect, and send another update without meaningful new typing. This could add network churn and visual instability.

**Possible locations:** `src/components/typing/TypingArea.tsx:267`; `src/pages/RaceActive.tsx:190` through `:214`.

**Possible resolutions:** Stabilize the callback against a participant id and separate local progress emission from reactive server objects. Deduplicate unchanged reports and set an intentional update cadence. Validate with mocked subscriptions or a dedicated test environment before asserting a live loop.

## Active race exit is hidden behind Escape

**Priority / evidence:** Medium · Source confirmed.

**Description:** Escape is the only interaction that opens the leave modal. The visible Leave action exists inside that modal, so touch users and users who do not discover the shortcut have no obvious way to exit from the race screen.

**Possible locations:** `src/pages/RaceActive.tsx:108`, `:400`, `:447`.

**Possible resolutions:** Add a visible compact Leave action in the race shell and retain Escape as a shortcut. Use the shared modal/departure contract, with appropriate confirmation for lost progress.

## Race results exceed their grid width

**Priority / evidence:** Medium · Source confirmed.

**Description:** The desktop results grid uses `30% 70%` columns and then adds a gap, exceeding the available width. When there is no current-user ranking, the podium can also occupy only the first track rather than the full available space.

**Possible locations:** `src/pages/RaceResults.tsx:137`.

**Possible resolutions:** Use fractional tracks with `minmax(0, …)` so gaps participate in sizing, and explicitly handle the absent-personal-result composition. Test spectators and long content as well as the normal racer case.

## Race podiums and tables clip on phones

**Priority / evidence:** Medium · Source-confirmed size arithmetic; browser verification pending.

**Description:** Three 112px podium stands plus their gaps require 368px before surrounding padding. The table wrapper clips overflow rather than exposing a scroll region, and long racer names have no robust compact layout.

**Possible locations:** `src/components/race/Podium.tsx:87`, `:141`, `:172`; `src/pages/RaceResults.tsx:216`.

**Possible resolutions:** Use flexible podium columns and responsive content sizing. Give tables a deliberate mobile representation or a shared horizontal-scroll container for header and body. Keep racer identity readable.

## The emoji picker can open outside the viewport

**Priority / evidence:** Medium · Source confirmed.

**Description:** The picker always opens below its trigger, with fixed 320px width and no available-height constraint. Near the bottom of a short screen, options become unreachable; at a 320px viewport, even its left inset makes it too wide.

**Possible locations:** `src/components/race/EmojiPicker.tsx:33`, `:75`.

**Possible resolutions:** Use the shared collision-aware popover, responsive width, bounded scrolling, and resize/scroll positioning. Add meaningful emoji labels and predictable keyboard navigation while replacing the placement logic.

## Race avatars are clipped at track endpoints

**Priority / evidence:** Low · Source confirmed.

**Description:** A 40px avatar is centered only 8px inside an overflow-hidden track at zero progress, cutting off part of it. The finish position has the same geometry problem, and bouncing can add vertical clipping.

**Possible locations:** `src/components/race/RaceCourse.tsx:99`, `:148` through `:168`.

**Possible resolutions:** Reserve an avatar radius at each endpoint and separate the avatar layer from the clipped progress-fill layer. Use restrained motion consistent with the matte visual direction, and verify 0%, 100%, and intermediate positions.

## Signed-in racers without usernames cannot proceed

**Priority / evidence:** High · Source confirmed; authenticated runtime validation pending.

**Description:** The create/join cards hide the editable name for signed-in users but derive identity from a Clerk username that may be absent. Submit becomes available, then silently returns for an empty name. Accounts with a first name but no username can be blocked.

**Possible locations:** `src/pages/Race.tsx:27`, `:90`, `:157`, `:229`; compare the fallback in `src/components/auth/UserButton.tsx:26`.

**Possible resolutions:** Share a validated display-name resolver, or present a required editable field when no usable name exists. Keep disabled state, validation, and submission requirements synchronized and provide an inline explanation.

## Race actions fail without useful feedback

**Priority / evidence:** Medium · Source confirmed.

**Description:** Room creation, readiness, settings updates, and race reset errors are mostly logged while the visible control returns to its idle state. Users see an action do nothing and cannot distinguish rejection, network failure, or a successful delayed update.

**Possible locations:** `src/pages/Race.tsx:57`; `src/pages/RaceLobby.tsx:153`, `:186`, `:199`; `src/pages/RaceResults.tsx:65`.

**Possible resolutions:** Use a shared pending/success/error pattern with contextual messages and deliberate retry. Preserve entered settings after failure and prevent repeated destructive submissions while a request is pending.

## Profile headers overlap on narrow screens

**Priority / evidence:** Medium · Source confirmed.

**Description:** The absolutely centered avatar/username competes with the Back to Homepage action. Narrow viewports and long names can place identity and navigation in the same space.

**Possible locations:** `src/pages/UserStats.tsx:682` through `:713`.

**Possible resolutions:** Reuse the responsive application shell or give this header explicit grid tracks and a compact back action. Bound/wrap the username rather than placing centered content over independent controls.

## Profile history has no compact layout

**Priority / evidence:** Medium · Source-confirmed size arithmetic.

**Description:** Fixed history columns require 225px before the Test Type column, plus 64px of gaps and 32px of padding. That exceeds typical phone content width. Header clipping and body scrolling do not form a coherent shared table viewport.

**Possible locations:** `src/pages/UserStats.tsx:756`, `:764`, `:799`.

**Possible resolutions:** Use compact stacked test rows or a deliberate horizontal table region containing both header and body. Preserve column associations, readable dates, and an obvious detail action at small widths.

## Profile stat cards and history rows are not keyboard-operable

**Priority / evidence:** Medium · Source confirmed.

**Description:** Clickable stat cards and test-history rows are `div` elements without focus or keyboard activation. Their chart/detail dialogs are consequently unavailable through normal keyboard navigation.

**Possible locations:** `src/pages/UserStats.tsx:568` through `:577`, `:802` through `:809`.

**Possible resolutions:** Render real buttons for cards and native detail links/buttons within rows. Provide meaningful names, selected/expanded state where relevant, and visible focus. Reuse the same interaction pattern for result disclosures elsewhere.

## Achievement refresh acts on the wrong profile

**Priority / evidence:** High · Source confirmed; authenticated runtime validation pending.

**Description:** When viewing another user’s profile, Refresh Achievements uses the signed-in viewer’s identity for the mutation while the panel continues displaying the visited user’s data. The action and visible context refer to different people.

**Possible locations:** `src/pages/UserStats.tsx:749`; `src/components/auth/AchievementsCategoryGrid.tsx:184`, `:196`, `:252`.

**Possible resolutions:** Pass ownership and mutation capability explicitly. Show refresh only where the viewer is authorized to refresh the displayed profile; keep public profile browsing read-only and independent from viewer-side mutations.

## Charts imply more history than they contain

**Priority / evidence:** Medium · Source confirmed.

**Description:** The history query is capped at 100 tests, but chart titles can display a lifetime statistic while “Best / Highest” highlights only the maximum within those recent tests. A lifetime best outside the sample appears to disagree with the highlighted point, without a visible explanation.

**Possible locations:** `convex/testResults.ts:311`; `src/pages/UserStats.tsx:857`; `src/components/stats/UserStatsChartModal.tsx:163`, `:299`.

**Possible resolutions:** Explicitly label the sample and range-specific extrema, or support range/pagination queries. Keep card totals, chart titles, tooltips, and markers on clearly defined scopes. Do not relabel a recent maximum as a lifetime record.

## Missing historical metrics are shown as real zeros

**Priority / evidence:** Medium · Source confirmed.

**Description:** Older test records without detailed character/word metrics fall back to zero in result details. The UI reports measured-looking zero correct words or zero errors when those values were never recorded.

**Possible locations:** `src/pages/UserStats.tsx:30`, `:441`, `:447`, `:465`, `:471`.

**Possible resolutions:** Preserve missing-value semantics through the presentation model and show an em dash or “Not recorded.” Use zero only for an actual recorded zero. Ensure charts and summaries do not silently treat missing metrics as measurements.

## Achievement cards compress essential text on phones

**Priority / evidence:** Medium · Source confirmed / design cleanup.

**Description:** The category grid forces three columns at narrow widths. Icons, names, counts, and padding compete for the same tiny cards; names truncate aggressively and earned-tier labels can shrink to 8px.

**Possible locations:** `src/components/auth/AchievementsCategoryGrid.tsx:115`, `:153`, `:348`.

**Possible resolutions:** Use container-aware one/two-column compact layouts, readable minimum type sizes, and wrapping category names. Keep category navigation and earned progress understandable without requiring hover.

## Host plans never activate the participant plan executor

**Priority / evidence:** High · Source-confirmed flow mismatch; multiplayer runtime validation pending.

**Description:** Host can create a plan and display plan navigation, but participants only merge plan settings into a generic settings object. The actual executor uses separate local `plan`, `planIndex`, and `isPlanActive` state that the host flow never initializes. The literal `plan` mode falls through generic word generation. Wait for All and Allow Zen Waiting have no execution consumers, and host cards fall back to Step 1/1 without real step progress.

**Possible locations:** `src/pages/Host.tsx:105`, `:1166`; `src/pages/Join.tsx:144`; `src/components/typing/TypingPractice.tsx:709`, `:1096`, `:1526`, `:1925`; `src/components/connect/UserHostCard.tsx:107`; `convex/schema.ts`.

**Possible resolutions:** Define one host/participant plan contract with plan identity/version, current step, run state, synchronization policy, and participant progress. Connect it to one executor and bound navigation to valid steps. Hide unsupported synchronization affordances until their behavior exists; do not represent them as operational settings.

## The reachable plan builder clips its editor on phones

**Priority / evidence:** High · Source-confirmed size arithmetic; browser verification pending.

**Description:** Host → Plan opens a builder with a permanent side-by-side layout. Its list has a 300px minimum width; the editor adds padding before any content; the parent clips overflow. A phone-sized dialog cannot fit both. Several duration/word/toggle rows also do not wrap.

**Possible locations:** `src/pages/Host.tsx:671`, `:1162`; `src/components/plan/PlanBuilderModal.tsx:225`, `:229`, `:287`, `:383`, `:427`, `:620`.

**Possible resolutions:** Use a stacked composition or a list/editor switch at small widths. Keep actions visible, allow option groups to wrap, and define one bounded scrolling area. Verify editing with the software keyboard open as well as desktop resizing.

## Timed presets are configured as timed but execute as completion tests

**Priority / evidence:** High · Source confirmed.

**Description:** Host permits Preset → Time and shows a countdown, but participant timing only ends `mode === "time"`; every preset instead ends when its text length is reached. The custom-duration `#` path also identifies a timed preset as a word-count edit, opens Custom Word Amount, and changes the wrong setting.

**Possible locations:** `src/pages/Host.tsx:767`, `:1507`, `:1519`, `:1657`; `src/pages/Join.tsx:136`; `src/components/typing/TypingPractice.tsx:1711`, `:1802`; `src/components/connect/UserHostCard.tsx:64`.

**Possible resolutions:** Share a single typed mode/configuration model and timed-mode predicate across configuration, display, execution, and completion. Define what happens when a timed preset exhausts its supplied text. Test both preset submodes and custom durations end to end.

## Host Stop and Reset do not control the full participant session

**Priority / evidence:** High · Source confirmed; multiplayer runtime validation pending.

**Description:** Stop changes room status and disables input, but the participant’s local timer keeps running. Reset User clears database statistics without resetting local text/clock state, so the next progress update can overwrite the reset. Only a waiting→active room transition changes the Join component key.

**Possible locations:** `src/pages/Host.tsx:272`, `:311`; `src/pages/Join.tsx:20`; `src/components/typing/TypingPractice.tsx:1703`, `:1762`, `:1782`, `:2663`; `convex/participants.ts:126`.

**Possible resolutions:** Model start, stop/pause, room reset, and participant reset as explicit session transitions. Use a server-issued run/reset version or equivalent event contract to reset local state consistently. Define whether stopping pauses or finalizes, and make timers, text, cards, and persistence agree.

## Room failures trigger automatic retry loops

**Priority / evidence:** High · Source confirmed.

**Description:** Create/join effects depend on their pending flags. Rejection clears the flag, satisfying the effect’s guard and immediately trying again. Invalid room codes can repeatedly hit the backend; Host remains on Creating Room without recovery. Join errors are not cleared, so even a later success can remain hidden by the old error screen.

**Possible locations:** `src/pages/Join.tsx:67`, `:79`, `:175`; `src/pages/Host.tsx:205`, `:224`, `:403`; `convex/participants.ts:27`.

**Possible resolutions:** Replace effect-triggered retry cycles with explicit idle/pending/success/error transitions. Stop on validation failures, offer Edit Code/Retry/Back, and clear stale errors only when beginning a deliberate new attempt. Test permanent rejection and transient recovery separately.

## Participant-card dragging blocks touch scrolling

**Priority / evidence:** Medium · Source confirmed; touch-device verification pending.

**Description:** Entire participant cards carry drag listeners and `touch-none`, with no activation threshold on the pointer sensor. Swiping a card can begin dragging instead of scrolling. Reset/Kick actions are hover-only, so keyboard users can focus invisible actions and touch users lack a dependable reveal.

**Possible locations:** `src/pages/Host.tsx:197`; `src/components/connect/UserHostCard.tsx:151`, `:216`, `:243`, `:268`.

**Possible resolutions:** Restrict dragging to a named accessible handle, add an activation constraint, and preserve vertical panning on card content. Reveal actions for focus and non-hover devices; keep destructive actions distinct from drag activation.

## Host sound-pack selections never reach participants

**Priority / evidence:** Medium · Source confirmed.

**Description:** The reachable host Sound Settings UI stores pack selections, but the transmitted room settings and participant adapter include only `soundEnabled`. Participants therefore retain different pack choices from those shown in the host’s room-wide controls.

**Possible locations:** `src/pages/Host.tsx:615`, `:230`; `src/components/settings/SoundSettingsModal.tsx:133`, `:191`, `:249`; `convex/schema.ts:82`; `src/pages/Join.tsx:125`.

**Possible resolutions:** Decide whether pack choice is host-controlled or participant-local. If shared, extend the contract and both adapters; if local, move or relabel the controls to show their actual scope. Avoid adding more UI state that is discarded at the network boundary.

## Host controls and card sizing force horizontal overflow

**Priority / evidence:** Medium · Source-confirmed layout constraints; browser verification pending.

**Description:** Large fixed outer padding, nonwrapping mode/plan/toolbar rows, and inline grid minimum widths make the Host dashboard wider than phones. The inline `minmax(300 * cardSize, 1fr)` overrides the apparent responsive column classes. At maximum size a card requires 600px regardless of its container.

**Possible locations:** `src/pages/Host.tsx:419`, `:450`, `:662`, `:937`, `:1101`, `:1107`.

**Possible resolutions:** Stack or wrap primary controls and consolidate secondary actions on compact screens. Cap card minimum width to available container width and let the size control scale internal density rather than forcing page overflow. Treat list and grid modes as separate responsive compositions.

## Unfinished settings expose implementation placeholders

**Priority / evidence:** Low · Browser/source confirmed / design cleanup.

**Description:** Race/Lesson settings tabs show implementation-oriented copy such as being ready for a future migration. Error Sound currently has no available error packs and exposes only None. These controls suggest configuration capabilities that the current product does not deliver.

**Possible locations:** `src/components/typing/TypingPractice.tsx:4409`, `:4429`, `:4167`; sound manifest generation and `public/sounds/`.

**Possible resolutions:** Hide unsupported controls or label their actual availability in user terms. Remove internal implementation plans from product copy. Given the feature-complete direction, simplify these surfaces rather than expanding features just to fill them.

## Route code loads as one large initial bundle

**Priority / evidence:** Medium · Baseline build measured; user-perceived performance not profiled.

**Description:** App imports every route eagerly, including race, admin, statistics, and their dependencies. The baseline production build emitted a main JavaScript asset of about 1,571kB, approximately 441kB gzip, and a chunk-size warning. Users opening the typing page pay for code belonging to screens they may never visit.

**Possible locations:** `src/App.tsx:3` through `:18`; `vite.config.ts`; route-level chart/race/admin imports.

**Possible resolutions:** Introduce route-level lazy boundaries with appropriate loading and error states, then inspect the bundle graph. Load heavy optional features on demand and avoid replacing one large chunk with a long dependency waterfall. Measure startup and navigation before/after on a constrained device/network.

## UI behavior has little regression coverage

**Priority / evidence:** High · Repository inspection and baseline test run.

**Description:** The current 55 unit tests pass, but the reproduced modal, responsive, focus, prompt-transition, and animation defects are not guarded by them. There are no committed browser specs in `tests/e2e`. The six temporary diagnostic failures found during this audit illustrate gaps, not failures of the existing suite.

**Possible locations:** `tests/unit/`, `tests/e2e/`, `vitest.config.ts`, `package.json` (`test:e2e`).

**Possible resolutions:** Add focused behavior tests while fixing each root cause, then establish a small browser acceptance suite for prompt changes, modal focus/Escape, narrow layout, light/dark tokens, keyboard guidance, and reduced motion. Use mocks or a dedicated test backend for live/account flows. Add visual references only where they protect intentional design decisions.

## Lint cannot currently run before UI changes are handed off

**Priority / evidence:** Medium · Verified command failure.

**Description:** `bun run lint` exits during startup because the installed typescript-eslint reports that it does not support TypeScript 7.0. It never analyzes the source. This removes an expected quality gate for a cleanup involving hooks, effects, and accessibility-related component changes.

**Possible locations:** `package.json`, `bun.lock`, `eslint.config.js`.

**Possible resolutions:** Establish a supported parser/compiler setup and document any deliberate compatibility arrangement. Restore a working lint baseline before broad UI refactors. Do not suppress lint or claim it passed because build and unit tests pass.

---

**Verification record:** On the original application source, `bun run build` passed with the bundle-size warning above, and `bun run test:run` passed all 55 tests across four files. `bun run lint` failed before analysis with the TypeScript/parser incompatibility described above. Temporary diagnostic tests reproduced counter edge cases and keyboard shrink/recovery failure, then were removed. Browser and theme-data measurements are identified in their relevant sections.

**Dormant-code note:** `useSound`, `GhostWriterController`, its `GhostWriterSettingsModal`, the standalone `PlanNavigation`, and several older stats/achievement components have no active callers in the inspected source. The solo plan-builder state is never opened, while Host’s plan builder is reachable. Do not spend active-UI cleanup effort fixing unreachable copies without first deciding whether to remove, consolidate, or intentionally restore them. The stale custom-speed state in the dormant ghost modal is a maintenance concern, not a demonstrated current-user bug.
