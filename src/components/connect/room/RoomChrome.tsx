import { useState, type CSSProperties, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { CircleNotchIcon, SignOutIcon, WifiSlashIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PortalContainerContext } from "@/components/ui/portal-container";
import type { ThemeMode } from "@/types/theme";

/**
 * Full-height themed page without the site header. A room theme is scoped here: its variables and
 * light/dark mode apply to everything inside, including overlays, which portal into this element.
 */
export function RoomPage({ children, style, themeMode }: { children: ReactNode; style?: CSSProperties; themeMode?: ThemeMode }) {
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  return (
    <div
      ref={setContainer}
      className={cn("flex h-dvh flex-col overflow-hidden bg-background text-foreground transition-colors", themeMode)}
      style={style}
      data-theme-mode={themeMode}
      data-testid="connect-room"
    >
      <PortalContainerContext.Provider value={container}>{children}</PortalContainerContext.Provider>
    </div>
  );
}

interface RoomTopBarProps {
  roomName: string;
  participantName: string;
  dimmed: boolean;
  leaving: boolean;
  reconnecting: boolean;
  onLeave: () => void;
}

/** Slim top bar: room, participant, Leave. Fades while typing so it stays out of the way. */
export function RoomTopBar({ roomName, participantName, dimmed, leaving, reconnecting, onLeave }: RoomTopBarProps) {
  return (
    <header className={cn("flex shrink-0 items-center gap-3 border-b border-border px-4 py-2 transition-opacity duration-300 sm:px-6", dimmed && "opacity-30 hover:opacity-100 focus-within:opacity-100")}>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{roomName}</p>
        <p className="truncate text-xs text-muted-foreground">Typing as {participantName}</p>
      </div>
      {reconnecting && (
        <span role="status" className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <WifiSlashIcon className="size-4" aria-hidden="true" />
          Reconnecting…
        </span>
      )}
      <Button variant="ghost" size="sm" onClick={onLeave} disabled={leaving}>
        {leaving ? <CircleNotchIcon className="motion-safe:animate-spin" aria-hidden="true" /> : <SignOutIcon aria-hidden="true" />}
        {leaving ? "Leaving…" : "Leave"}
      </Button>
    </header>
  );
}

interface RoomMessageProps {
  title: string;
  description?: ReactNode;
  action?: { to: string; label: string; icon: ReactNode };
  children?: ReactNode;
}

/** Centered state screen (removed, ended, not a member, connecting). */
export function RoomMessage({ title, description, action, children }: RoomMessageProps) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-2xl font-semibold">{title}</h1>
      {description && <p className="max-w-md text-muted-foreground">{description}</p>}
      {children}
      {action && (
        <Button asChild>
          <Link to={action.to}>{action.icon}{action.label}</Link>
        </Button>
      )}
    </main>
  );
}
