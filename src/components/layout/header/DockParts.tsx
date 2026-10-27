import type { HTMLAttributes, ReactElement, Ref } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { MoonIcon, SunIcon, type Icon } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { DOCK_SPRING } from "./header-utils";

/** A hover and focus hint for an icon-only control. Needs a `TooltipProvider` above it. */
export function HeaderTip({ hint, children }: { hint: string; children: ReactElement }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent>{hint}</TooltipContent>
    </Tooltip>
  );
}

export function HeaderLogo({ className }: { className?: string }) {
  return (
    <Link to="/" aria-label="TypeSetGo home" className={cn("shrink-0 rounded-lg focus-visible:outline-2 focus-visible:outline-ring", className)}>
      <img src="/assets/Banner-Color.svg" alt="" className="h-auto w-full" />
    </Link>
  );
}

export function DockDivider({ className }: { className?: string }) {
  return <span aria-hidden="true" className={cn("h-6 w-px shrink-0 bg-border", className)} />;
}

/** Sun and moon trade places with a quarter turn. */
export function ModeIcon({ dark, className = "size-5" }: { dark: boolean; className?: string }) {
  return (
    <AnimatePresence mode="popLayout" initial={false}>
      <motion.span
        key={dark ? "sun" : "moon"}
        initial={{ rotate: -90, scale: 0.4, opacity: 0 }}
        animate={{ rotate: 0, scale: 1, opacity: 1 }}
        exit={{ rotate: 90, scale: 0.4, opacity: 0 }}
        transition={DOCK_SPRING}
        className="flex"
      >
        {dark ? <SunIcon className={className} aria-hidden="true" /> : <MoonIcon className={className} aria-hidden="true" />}
      </motion.span>
    </AnimatePresence>
  );
}

/** `responsive` is compact (icon only) below a 48rem container and grows its label above it. */
export type DockItemSize = "wide" | "compact" | "responsive";

const ITEM_SIZES: Record<DockItemSize, string> = {
  wide: "h-10 px-3",
  compact: "h-9 px-2",
  responsive: "h-9 px-1.5 @min-[22rem]:px-2 @min-[48rem]:h-10 @min-[48rem]:px-3",
};

const LABEL_VISIBILITY: Record<DockItemSize, string> = {
  wide: "",
  compact: "hidden",
  responsive: "hidden @min-[48rem]:block",
};

export interface DockItemProps extends Omit<HTMLAttributes<HTMLElement>, "children" | "onClick"> {
  label: string;
  Icon: Icon;
  /** The current page: filled icon, primary pill and its name. */
  active?: boolean;
  /** Visible but not open yet; stays focusable and does nothing. */
  soon?: boolean;
  /** Items sharing a group slide one active pill between them. */
  group: string;
  size?: DockItemSize;
  /** A link when given, otherwise a button. */
  to?: string;
  onClick?: () => void;
  ref?: Ref<HTMLElement>;
}

/** One dock entry. The active page grows its name; the icon lifts under the pointer like a dock. */
export function DockItem({ label, Icon, active = false, soon = false, group, size = "wide", to, onClick, className, ref, ...rest }: DockItemProps) {
  const classes = cn(
    "relative flex shrink-0 items-center gap-1.5 rounded-full text-sm font-medium focus-visible:outline-2 focus-visible:outline-ring",
    ITEM_SIZES[size],
    active ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground",
    soon && "cursor-not-allowed opacity-50 hover:text-muted-foreground",
    className,
  );
  const body = (
    <>
      {active && <motion.span layoutId={`dock-active-${group}`} transition={DOCK_SPRING} className="absolute inset-0 rounded-full bg-primary shadow-sm" />}
      <motion.span whileHover={soon ? undefined : { y: -3, scale: 1.18 }} transition={DOCK_SPRING} className="relative flex">
        <Icon className="size-5" weight={active ? "fill" : "bold"} aria-hidden="true" />
      </motion.span>
      <AnimatePresence initial={false}>
        {active && (
          <motion.span
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: "auto", opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={DOCK_SPRING}
            className={cn("relative overflow-hidden whitespace-nowrap", LABEL_VISIBILITY[size])}
          >
            {label}
          </motion.span>
        )}
      </AnimatePresence>
      {soon && <span aria-hidden="true" className="absolute right-1 top-1 size-1.5 rounded-full bg-muted-foreground" />}
    </>
  );
  const current = active ? ("page" as const) : undefined;

  if (to && !soon) {
    return <Link {...rest} ref={ref as Ref<HTMLAnchorElement>} to={to} onClick={onClick} aria-current={current} aria-label={label} className={classes}>{body}</Link>;
  }
  return (
    <button
      {...rest}
      ref={ref as Ref<HTMLButtonElement>}
      type="button"
      onClick={soon ? undefined : onClick}
      aria-current={current}
      aria-disabled={soon || undefined}
      aria-label={soon ? `${label} (coming soon)` : label}
      className={classes}
    >
      {body}
    </button>
  );
}
