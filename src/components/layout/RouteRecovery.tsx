import { ArrowLeftIcon, ArrowsClockwiseIcon, TrophyIcon } from "@phosphor-icons/react";
import { useEffect, useRef, type ReactNode } from "react";
import { Link, Outlet, useLocation, useNavigation } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Keycaps } from "./Keycaps";

export function RouteFrame() {
  const navigation = useNavigation();
  return (
    <>
      {navigation.state !== "idle" && (
        <div role="status" className="fixed inset-x-0 top-0 z-50 h-1 overflow-hidden bg-primary/15">
          <span className="sr-only">Loading page…</span>
          <motion.span
            aria-hidden="true"
            initial={{ x: "-100%" }}
            animate={{ x: "300%" }}
            transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
            className="block h-full w-1/3 rounded-full bg-primary"
          />
        </div>
      )}
      <Outlet />
    </>
  );
}

export function RouteLoading() {
  return (
    <main className="flex min-h-[100dvh] flex-col items-center justify-center gap-6 bg-background p-6 font-mono text-foreground">
      <Keycaps keys={["T", "S", "G"]} motion="wave" />
      <p role="status" className="text-sm text-muted-foreground">Loading TypeSetGo…</p>
    </main>
  );
}

function Recovery({ art, title, children, actions }: { art: ReactNode; title: string; children: ReactNode; actions: ReactNode }) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const location = useLocation();
  useEffect(() => headingRef.current?.focus(), [location.key]);

  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-background p-6 font-mono text-foreground">
      <section className="flex w-full max-w-lg flex-col items-center gap-6 text-center">
        {art}
        <div className="flex flex-col items-center gap-3">
          <h1 ref={headingRef} tabIndex={-1} className="text-2xl font-bold outline-none sm:text-3xl">{title}</h1>
          <p className="max-w-md text-sm leading-relaxed text-muted-foreground">{children}</p>
        </div>
        <div className="flex flex-wrap justify-center gap-3">{actions}</div>
      </section>
    </main>
  );
}

function BackToPractice({ primary }: { primary: boolean }) {
  return (
    <Button variant={primary ? "default" : "outline"} asChild className="rounded-full">
      <Link to="/" className="inline-flex items-center justify-center gap-2">
        <ArrowLeftIcon className="size-4 shrink-0" aria-hidden="true" />
        Back to practice
      </Link>
    </Button>
  );
}

export function RouteError() {
  return (
    <Recovery
      art={<Keycaps keys={["O", "O", "P", "S"]} motion="drop" loose={3} />}
      title="This page couldn’t load"
      actions={(
        <>
          <Button onClick={() => window.location.reload()} className="rounded-full">
            <ArrowsClockwiseIcon className="size-4 shrink-0" aria-hidden="true" />
            Reload page
          </Button>
          <BackToPractice primary={false} />
        </>
      )}
    >
      A key came loose while opening this page. Reload to try again, or head back to typing practice.
    </Recovery>
  );
}

export function NotFound() {
  const { pathname } = useLocation();
  return (
    <Recovery
      art={<Keycaps keys={["4", "", "4"]} motion="drop" />}
      title="Page not found"
      actions={(
        <>
          <BackToPractice primary />
          <Button variant="outline" asChild className="rounded-full">
            <Link to="/leaderboard" className="inline-flex items-center justify-center gap-2">
              <TrophyIcon className="size-4 shrink-0" aria-hidden="true" />
              Leaderboard
            </Link>
          </Button>
        </>
      )}
    >
      We looked under every key, but there’s no page at <code className="rounded-md bg-muted px-1.5 py-0.5 text-foreground">{pathname}</code>. Let’s get you back to typing.
    </Recovery>
  );
}
