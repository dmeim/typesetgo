import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Shared frame for the Host and Join cards. */
export function LandingCard({ title, description, icon, highlighted, children, labelledBy, className }: {
  title: string;
  description: string;
  icon: ReactNode;
  highlighted?: boolean;
  children: ReactNode;
  labelledBy: string;
  className?: string;
}) {
  return (
    <section
      aria-labelledby={labelledBy}
      className={cn(
        "flex min-w-0 flex-col gap-5 rounded-xl border border-border bg-card p-5 text-card-foreground shadow-xs sm:p-6",
        highlighted && "border-primary/60 ring-2 ring-primary/25",
        className,
      )}
    >
      <header className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary" aria-hidden="true">
          {icon}
        </span>
        <div className="min-w-0 space-y-1">
          <h2 id={labelledBy} className="text-lg font-semibold leading-tight">{title}</h2>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </header>
      {children}
    </section>
  );
}

export function FormError({ children }: { children: ReactNode }) {
  if (!children) return null;
  return <p role="alert" className="text-sm text-destructive">{children}</p>;
}
