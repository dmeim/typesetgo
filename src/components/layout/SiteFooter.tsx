import { NavLink } from "react-router-dom";
import { FOOTER_LINKS, CHANGELOG_LINK } from "@/components/legal/info-pages";
import { useTheme } from "@/hooks/useTheme";
import { APP_VERSION } from "@/lib/app-version";
import { cn } from "@/lib/utils";

interface SiteFooterProps {
  /** Mid-test on Home: fades out and leaves the tab order, but keeps its space so the text never jumps. */
  hidden?: boolean;
  className?: string;
}

/** A thin status bar along the bottom edge: version and theme on the left, About, Privacy, Terms and What's new on the right. */
export function SiteFooter({ hidden = false, className }: SiteFooterProps) {
  const { themeName } = useTheme();

  return (
    <footer
      inert={hidden}
      aria-hidden={hidden || undefined}
      className={cn(
        "flex shrink-0 flex-wrap items-center justify-center gap-x-4 gap-y-0.5 border-t border-border bg-muted/40 px-3 py-1.5 text-[11px] text-muted-foreground transition-[opacity,visibility] duration-300 motion-reduce:transition-none sm:justify-between sm:px-4",
        hidden && "invisible opacity-0",
        className,
      )}
    >
      <p className="flex min-w-0 flex-wrap items-center justify-center gap-x-3 gap-y-0.5">
        <span className="whitespace-nowrap">TypeSetGo v{APP_VERSION}</span>
        <span className="flex min-w-0 items-center gap-1.5">
          <span aria-hidden="true" className="flex shrink-0 -space-x-1">
            <span className="size-2.5 rounded-full bg-primary ring-1 ring-background" />
            <span className="size-2.5 rounded-full bg-(--accent-emphasis) ring-1 ring-background" />
            <span className="size-2.5 rounded-full bg-success ring-1 ring-background" />
          </span>
          <span className="sr-only">Theme: </span>
          <span className="truncate">{themeName}</span>
        </span>
      </p>
      <nav aria-label="Footer">
        <ul className="flex flex-wrap justify-center gap-x-4 gap-y-0.5">
          {FOOTER_LINKS.map((link) => (
            <li key={link.path}>
              <NavLink
                to={link.path}
                className="inline-flex items-center gap-1 whitespace-nowrap rounded-sm py-0.5 transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring aria-[current=page]:text-foreground"
              >
                {link === CHANGELOG_LINK && <span aria-hidden="true" className="size-1.5 rounded-full bg-(--accent-emphasis)" />}
                {link.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </footer>
  );
}
