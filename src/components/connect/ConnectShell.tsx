import type { ReactNode } from "react";
import Header from "@/components/layout/Header";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { cn } from "@/lib/utils";

/** Site chrome for Connect pages that are not the participant typing surface. Only the landing adds the site footer. */
export function ConnectShell({ children, className, footer = false }: { children: ReactNode; className?: string; footer?: boolean }) {
  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <Header />
      <main className={cn("mx-auto w-full max-w-7xl flex-1 px-4 pb-12 pt-6 sm:px-6", className)}>
        {children}
      </main>
      {footer && <SiteFooter />}
    </div>
  );
}
