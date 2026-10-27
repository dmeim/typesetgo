import { useState, type CSSProperties, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { CircleNotchIcon, SignOutIcon, SpeakerHighIcon, SpeakerSlashIcon, WifiSlashIcon, type Icon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PortalContainerContext } from "@/components/ui/portal-container";
import type { ThemeMode } from "@/types/theme";
import { ConnectAvatar } from "@/components/connect/ConnectAvatar";

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
  avatarUrl?: string;
  /** Guests see "(guest)" after their name; account seats don't. */
  signedIn?: boolean;
  /** The room's sound setting, shown when the host sets sounds for everyone. */
  sound?: { enabled: boolean; soundEnabled: boolean; typingSound: string };
  dimmed: boolean;
  leaving: boolean;
  reconnecting: boolean;
  onLeave: () => void;
}

const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

/** Slim top bar: room, participant, room sound, Leave. Fades while typing so it stays out of the way. */
export function RoomTopBar({ roomName, participantName, avatarUrl, signedIn = true, sound, dimmed, leaving, reconnecting, onLeave }: RoomTopBarProps) {
  return (
    <header className={cn("flex shrink-0 items-center gap-3 border-b border-border px-4 py-2.5 transition-opacity duration-300 sm:px-6", dimmed && "opacity-30 hover:opacity-100 focus-within:opacity-100")}>
      <ConnectAvatar name={participantName} avatarUrl={avatarUrl} className="text-sm" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold">{roomName}</p>
        <p className="truncate text-xs text-muted-foreground">Typing as {participantName}{signedIn ? "" : " (guest)"}</p>
      </div>
      {reconnecting && (
        <span role="status" className="flex items-center gap-1.5 rounded-full bg-warning/15 px-2.5 py-1 text-xs font-semibold text-warning">
          <WifiSlashIcon className="size-4" aria-hidden="true" />
          Reconnecting…
        </span>
      )}
      {sound?.enabled && (
        <span className="hidden items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground sm:flex" title="Sounds are set by the room">
          {sound.soundEnabled ? <SpeakerHighIcon className="size-3.5" aria-hidden="true" /> : <SpeakerSlashIcon className="size-3.5" aria-hidden="true" />}
          <span className="sr-only">Room sound: </span>{sound.soundEnabled ? capitalize(sound.typingSound) : "Muted"}
        </span>
      )}
      <button type="button" onClick={onLeave} disabled={leaving}
        className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-50">
        {leaving ? <CircleNotchIcon className="size-4 motion-safe:animate-spin" aria-hidden="true" /> : <SignOutIcon className="size-4" aria-hidden="true" />}
        {leaving ? "Leaving…" : "Leave"}
      </button>
    </header>
  );
}

interface RoomMessageProps {
  title: string;
  description?: ReactNode;
  Icon?: Icon;
  action?: { to: string; label: string; icon: ReactNode };
  children?: ReactNode;
}

/** Centered state screen (removed, ended, not a member, connecting). */
export function RoomMessage({ title, description, Icon, action, children }: RoomMessageProps) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-4 text-center">
      {Icon && (
        <span aria-hidden="true" className="flex size-20 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <Icon weight="fill" className="size-10" />
        </span>
      )}
      <h1 className="text-2xl font-black">{title}</h1>
      {description && <p className="max-w-md text-muted-foreground">{description}</p>}
      {children}
      {action && (
        <Button asChild className="h-11 rounded-full px-5 font-bold">
          <Link to={action.to}>{action.icon}{action.label}</Link>
        </Button>
      )}
    </main>
  );
}
