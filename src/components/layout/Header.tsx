import { useLayoutEffect, useRef, type RefObject } from "react";
import { useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { GearSixIcon, PaletteIcon } from "@phosphor-icons/react";
import { useTheme } from "@/hooks/useTheme";
import NotificationCenter from "@/components/layout/NotificationCenter";
import { useAppAuth } from "@/components/layout/useAppAuth";
import { AccountButton } from "@/components/layout/header/AccountButton";
import { DockDivider, DockItem, HeaderLogo, HeaderTip, ModeIcon } from "@/components/layout/header/DockParts";
import { LEADERBOARD_PAGE, PRACTICE_PAGES } from "@/components/layout/header/header-nav";
import { DOCK_SPRING, iconButton } from "@/components/layout/header/header-utils";
import { TooltipProvider } from "@/components/ui/tooltip";

interface HeaderProps {
  hidden?: boolean;
  focusTargetRef?: RefObject<HTMLElement | null>;
  onOpenThemeModal?: () => void;
  onOpenSettings?: () => void;
}

// Phones: logo and your buttons on top, the pages pill below. From a 48rem header up, everything sits in one pill.
const dockClass = "mx-3 mb-1 mt-3 grid sm:mx-6 grid-cols-[auto_minmax(0,1fr)] items-center gap-x-2 gap-y-2 @min-[48rem]:mx-auto @min-[48rem]:flex @min-[48rem]:w-fit @min-[48rem]:max-w-[calc(100%-3rem)] @min-[48rem]:gap-1 @min-[48rem]:rounded-full @min-[48rem]:border @min-[48rem]:border-border @min-[48rem]:bg-card/80 @min-[48rem]:p-2 @min-[48rem]:shadow-lg @min-[48rem]:backdrop-blur";
const pagesPillClass = "col-span-2 row-start-2 flex items-center justify-self-center gap-0.5 rounded-full border border-border bg-card/80 p-1.5 shadow-lg backdrop-blur @min-[48rem]:contents";
const groupClass = "flex items-center gap-0.5 @min-[48rem]:gap-1 @min-[52rem]:gap-1.5";
const sideDivider = "hidden @min-[48rem]:block @min-[48rem]:mx-1.5 @min-[52rem]:mx-3";

function ThemeModeButton() {
  const { mode, toggleMode, supportsLightMode } = useTheme();
  const dark = mode === "dark";
  const label = supportsLightMode ? `Switch to ${dark ? "light" : "dark"} mode` : "Light mode unavailable for this theme";
  return (
    <HeaderTip hint={supportsLightMode ? label : "This theme supports dark mode only"}>
      <button type="button" aria-label={label} aria-disabled={!supportsLightMode || undefined} onClick={supportsLightMode ? () => toggleMode() : undefined} className={iconButton}>
        <ModeIcon dark={dark} />
      </button>
    </HeaderTip>
  );
}

/**
 * The Dock: one floating pill with the logo, practice modes, leaderboard, theme and settings, then light/dark,
 * notifications and the account button. The current page grows its name. Hidden and inert while typing.
 */
export default function Header({ hidden = false, focusTargetRef, onOpenThemeModal, onOpenSettings }: HeaderProps) {
  const { isSignedIn, isLoaded, available } = useAppAuth();
  const { pathname } = useLocation();
  const headerRef = useRef<HTMLElement>(null);
  const hiddenFocusRef = useRef<HTMLElement | null>(null);
  const chromeFocusRef = useRef<HTMLElement | null>(null);
  const chromeTriggerRef = useRef<HTMLElement | null>(null);
  const accountFeaturesEnabled = available && isLoaded && isSignedIn;

  useLayoutEffect(() => {
    const trackOutsideFocus = (event: FocusEvent) => {
      if (event.target !== chromeFocusRef.current && !headerRef.current?.contains(event.target as Node)) {
        chromeFocusRef.current = null;
      }
    };
    document.addEventListener("focusin", trackOutsideFocus);
    return () => document.removeEventListener("focusin", trackOutsideFocus);
  }, []);

  // Hiding moves focus out of the header (or its portaled menus) and brings it back afterwards.
  useLayoutEffect(() => {
    const focusTarget = focusTargetRef?.current ?? document.querySelector<HTMLElement>("main");
    if (hidden && (headerRef.current?.contains(document.activeElement) || chromeFocusRef.current)) {
      hiddenFocusRef.current = chromeTriggerRef.current;
      chromeFocusRef.current = null;
      focusTarget?.focus({ preventScroll: true });
    } else if (!hidden && hiddenFocusRef.current) {
      if (document.activeElement === focusTarget || document.activeElement === document.body) {
        hiddenFocusRef.current.focus({ preventScroll: true });
      }
      hiddenFocusRef.current = null;
    }
  }, [hidden, focusTargetRef]);

  return (
    <TooltipProvider>
      <motion.header
        ref={headerRef}
        onFocusCapture={(event) => {
          chromeFocusRef.current = event.target as HTMLElement;
          chromeTriggerRef.current = headerRef.current?.contains(event.target)
            ? event.target as HTMLElement
            : headerRef.current?.querySelector<HTMLElement>('[aria-expanded="true"]') ?? null;
        }}
        inert={hidden}
        aria-hidden={hidden || undefined}
        initial={false}
        animate={{ opacity: hidden ? 0 : 1, y: hidden ? -24 : 0 }}
        transition={DOCK_SPRING}
        className="@container relative z-40 shrink-0"
      >
        <div data-header-dock className={dockClass}>
          <HeaderLogo className="col-start-1 row-start-1 w-28 @min-[48rem]:px-2 @min-[52rem]:w-34" />
          <DockDivider className={sideDivider} />

          <div className={pagesPillClass}>
            <nav aria-label="Practice modes" className={groupClass}>
              {PRACTICE_PAGES.map((page) => (
                <HeaderTip key={page.path} hint={page.soon ? `${page.label} is coming soon` : page.label}>
                  <DockItem label={page.label} Icon={page.Icon} to={page.path} soon={page.soon} active={!page.soon && page.isActive(pathname)} group="header" size="responsive" />
                </HeaderTip>
              ))}
            </nav>
            <DockDivider className="mx-1 @min-[48rem]:mx-1.5 @min-[52rem]:mx-3" />
            <div className={groupClass}>
              <HeaderTip hint={LEADERBOARD_PAGE.label}>
                <DockItem label={LEADERBOARD_PAGE.label} Icon={LEADERBOARD_PAGE.Icon} to={LEADERBOARD_PAGE.path} active={LEADERBOARD_PAGE.isActive(pathname)} group="header" size="responsive" />
              </HeaderTip>
              {onOpenThemeModal && (
                <HeaderTip hint="Change theme">
                  <DockItem label="Change theme" Icon={PaletteIcon} onClick={onOpenThemeModal} group="header" size="responsive" />
                </HeaderTip>
              )}
              {onOpenSettings && (
                <HeaderTip hint="Settings">
                  <DockItem label="Settings" Icon={GearSixIcon} onClick={onOpenSettings} group="header" size="responsive" />
                </HeaderTip>
              )}
            </div>
          </div>

          <DockDivider className={sideDivider} />
          <div className="col-start-2 row-start-1 flex items-center justify-self-end gap-1 @min-[52rem]:gap-1.5">
            <ThemeModeButton />
            <NotificationCenter disabled={!accountFeaturesEnabled || hidden} className={iconButton} />
            <AccountButton inactive={hidden} />
          </div>
        </div>
      </motion.header>
    </TooltipProvider>
  );
}
