import { useEffect, useRef } from "react";
import { Link, Outlet, useLocation, useNavigation } from "react-router-dom";
import { Button } from "@/components/ui/button";

export function RouteFrame() {
  const navigation = useNavigation();
  return (
    <>
      {navigation.state !== "idle" && (
        <div role="status" className="fixed inset-x-0 top-0 z-50 border-b border-border bg-background px-4 py-2 text-center text-sm text-foreground">
          Loading page…
        </div>
      )}
      <Outlet />
    </>
  );
}

export function RouteLoading() {
  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-background p-6 text-foreground">
      <p role="status">Loading TypeSetGo…</p>
    </main>
  );
}

function Recovery({ missing }: { missing: boolean }) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const location = useLocation();
  useEffect(() => headingRef.current?.focus(), [location.key]);

  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-background p-6 text-foreground">
      <section className="w-full max-w-md space-y-5 rounded-xl border border-border bg-card p-6 text-card-foreground">
        <p className="text-sm text-muted-foreground">TypeSetGo</p>
        <h1 ref={headingRef} tabIndex={-1} className="text-2xl font-semibold">
          {missing ? "Page not found" : "This page couldn’t load"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {missing
            ? "This address doesn’t match a page. You can return to typing practice."
            : "Something went wrong while opening this page. Reload to try again, or return to typing practice."}
        </p>
        <div className="flex flex-wrap gap-3">
          {!missing && <Button onClick={() => window.location.reload()}>Reload page</Button>}
          <Button variant={missing ? "default" : "outline"} asChild>
            <Link to="/">Back to practice</Link>
          </Button>
        </div>
      </section>
    </main>
  );
}

export function RouteError() {
  return <Recovery missing={false} />;
}

export function NotFound() {
  return <Recovery missing />;
}
