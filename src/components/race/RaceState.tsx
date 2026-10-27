import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowLeftIcon, CircleNotchIcon, FlagCheckeredIcon } from "@phosphor-icons/react";
import Header from "@/components/layout/Header";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { cn } from "@/lib/utils";

/** Site chrome shared by every Race page. */
/** The live race leaves the footer out so the typing screen stays clean. */
export function RaceShell({ children, className, footer = true }: { children: ReactNode; className?: string; footer?: boolean }) {
  return (
    <div className="flex min-h-dvh flex-col overflow-x-clip bg-background text-foreground">
      <Header />
      <main className={cn("mx-auto flex w-full min-w-0 flex-1 flex-col px-4 pb-12 pt-6", className)}>{children}</main>
      {footer && <SiteFooter />}
    </div>
  );
}

export function RaceError({ children, className }: { children: ReactNode; className?: string }) {
  return children ? (
    <p role="alert" className={cn("text-sm font-medium text-destructive", className)}>
      {children}
    </p>
  ) : null;
}

/** Loading, missing and "you can't be here" screens. */
export default function RaceState({
  title,
  description,
  loading = false,
  children,
}: {
  title: string;
  description?: string;
  loading?: boolean;
  children?: ReactNode;
}) {
  return (
    <RaceShell className="max-w-md items-center justify-center text-center">
      <div className="flex w-full flex-col items-center gap-4 rounded-3xl border border-border bg-card p-6 sm:p-8">
        <span aria-hidden="true" className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          {loading ? <CircleNotchIcon className="size-6 motion-safe:animate-spin" /> : <FlagCheckeredIcon weight="fill" className="size-6" />}
        </span>
        <h1 className="text-2xl font-black [overflow-wrap:anywhere]" role={loading ? "status" : undefined}>
          {title}
        </h1>
        {description && <p className="text-muted-foreground">{description}</p>}
        {children ||
          (!loading && (
            <Link className="inline-flex items-center gap-2 font-semibold underline underline-offset-4" to="/race">
              <ArrowLeftIcon className="size-4 shrink-0" aria-hidden="true" />
              Back to Race
            </Link>
          ))}
      </div>
    </RaceShell>
  );
}
