import { useLayoutEffect, useRef, type ComponentProps, type RefObject } from "react";
import { Link, useLocation } from "react-router-dom";
import { useQuery } from "convex/react";
import { Sun, Moon, Keyboard, Flag, GraduationCap, Palette, Settings, Trophy, ChartNoAxesColumn } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { useTheme } from "@/hooks/useTheme";
import UserButton from "@/components/auth/UserButton";
import NotificationCenter from "@/components/layout/NotificationCenter";
import { useAppAuth } from "@/components/layout/useAppAuth";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface HeaderProps {
  hidden?: boolean;
  focusTargetRef?: RefObject<HTMLElement | null>;
  onOpenThemeModal?: () => void;
  onOpenSettings?: () => void;
}

const NAV_TABS = [
  { label: "Type", path: "/", icon: Keyboard, enabled: true },
  { label: "Race", path: "/race", icon: Flag, enabled: false },
  { label: "Lessons", path: "/lessons", icon: GraduationCap, enabled: false },
] as const;

function HeaderAction({ label, hint = label, ...props }: ComponentProps<typeof Button> & { label: string; hint?: string }) {
  const button = <Button
  variant="ghost" size="icon-lg" aria-label={label} {...props} />;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {props.disabled ? <span tabIndex={0} aria-label={label} className="inline-flex rounded-md focus-visible:outline-2 focus-visible:outline-ring">{button}</span> : button}
      </TooltipTrigger>
      <TooltipContent>{hint}</TooltipContent>
    </Tooltip>
  );
}

export default function Header({ hidden = false, focusTargetRef, onOpenThemeModal, onOpenSettings }: HeaderProps) {
  const { user, isSignedIn, isLoaded, available } = useAppAuth();
  const { mode, toggleMode, supportsLightMode } = useTheme();
  const location = useLocation();
  const headerRef = useRef<HTMLElement>(null);
  const hiddenFocusRef = useRef<HTMLElement | null>(null);
  const chromeFocusRef = useRef<HTMLElement | null>(null);
  const chromeTriggerRef = useRef<HTMLElement | null>(null);
  const accountFeaturesEnabled = available && isLoaded && isSignedIn;
  const convexUser = useQuery(
    api.users.getUser,
    accountFeaturesEnabled && user ? { clerkId: user.id } : "skip"
  );
  const statsUrl = convexUser?._id ? `/user/${convexUser._id}` : null;

  useLayoutEffect(() => {
    const trackOutsideFocus = (event: FocusEvent) => {
      if (event.target !== chromeFocusRef.current && !headerRef.current?.contains(event.target as Node)) {
        chromeFocusRef.current = null;
      }
    };
    document.addEventListener("focusin", trackOutsideFocus);
    return () => document.removeEventListener("focusin", trackOutsideFocus);
  }, []);

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
      <header
        ref={headerRef}
        onFocusCapture={(event) => {
          chromeFocusRef.current = event.target as HTMLElement;
          chromeTriggerRef.current = headerRef.current?.contains(event.target)
            ? event.target as HTMLElement
            : headerRef.current?.querySelector<HTMLElement>('[aria-expanded="true"]') ?? null;
        }}
        inert={hidden}
        aria-hidden={hidden || undefined}
        className="relative z-40 grid shrink-0 grid-cols-2 items-center gap-x-2 gap-y-2 border-b border-transparent px-3 py-3 transition-opacity duration-200 motion-reduce:transition-none sm:px-6 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:gap-x-4"
        style={{ opacity: hidden ? 0 : 1 }}
      >
        <div className="contents lg:col-start-1 lg:row-start-1 lg:flex lg:min-w-0 lg:flex-wrap lg:items-center lg:gap-x-4 lg:gap-y-2">
          <Link to="/" aria-label="TypeSetGo home" className="order-1 w-36 max-w-full rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:w-44">
            <img src="/assets/Banner-Color.svg" alt="TypeSetGo" className="h-auto w-full" />
          </Link>

          <div className="order-3 flex flex-wrap items-center gap-1 lg:order-2">
            {onOpenSettings && (
              <HeaderAction type="button" onClick={onOpenSettings} label="Settings">
                <Settings className="size-5" aria-hidden="true" />
              </HeaderAction>
            )}
            {onOpenThemeModal && (
              <HeaderAction type="button" onClick={onOpenThemeModal} label="Change theme">
                <Palette className="size-5" aria-hidden="true" />
              </HeaderAction>
            )}
            <HeaderAction
              type="button"
              onClick={toggleMode}
              disabled={!supportsLightMode}
              label={supportsLightMode ? `Switch to ${mode === "dark" ? "light" : "dark"} mode` : "Light mode unavailable for this theme"}
              hint={supportsLightMode ? `Switch to ${mode === "dark" ? "light" : "dark"} mode` : "This theme supports dark mode only"}
            >
              {mode === "dark" ? <Sun className="size-5" aria-hidden="true" /> : <Moon className="size-5" aria-hidden="true" />}
            </HeaderAction>
          </div>
        </div>

        <nav aria-label="Practice modes" className="order-5 col-span-2 flex min-w-0 justify-center lg:col-span-1 lg:col-start-2 lg:row-start-1">
          <div className="flex max-w-full flex-wrap items-center justify-center gap-1 rounded-lg bg-muted p-1">
            {NAV_TABS.map(({ label, path, icon: Icon, enabled }) => enabled ? (
              <Link
                key={path}
                to={path}
                aria-current={location.pathname === path ? "page" : undefined}
                className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-foreground hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring aria-[current=page]:bg-background"
              >
                <Icon className="size-4" aria-hidden="true" />{label}
              </Link>
            ) : (
              <span key={path} aria-disabled="true" className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground" title="Coming soon">
                <Icon className="size-4" aria-hidden="true" />{label}<span className="sr-only"> — coming soon</span>
              </span>
            ))}
          </div>
        </nav>

        <div className="contents lg:col-start-3 lg:row-start-1 lg:flex lg:min-w-0 lg:flex-wrap lg:items-center lg:justify-end lg:gap-x-4 lg:gap-y-2">
          <div className="order-4 flex flex-wrap items-center justify-end gap-1">
            <HeaderAction asChild label="Leaderboard"><Link to="/leaderboard">
              <Trophy className="size-5" aria-hidden="true" />
            </Link></HeaderAction>
            {accountFeaturesEnabled && statsUrl ? (
              <HeaderAction asChild label="Your stats"><Link to={statsUrl}>
                <ChartNoAxesColumn className="size-5" aria-hidden="true" />
              </Link></HeaderAction>
            ) : (
              <HeaderAction type="button" disabled label={accountFeaturesEnabled ? "Loading your stats" : "Sign in to view your stats"}>
                <ChartNoAxesColumn className="size-5" aria-hidden="true" />
              </HeaderAction>
            )}
            <NotificationCenter disabled={!accountFeaturesEnabled || hidden} />
          </div>
          <div className="order-2 min-w-0 justify-self-end lg:order-5"><UserButton inactive={hidden} /></div>
        </div>
      </header>
    </TooltipProvider>
  );
}
