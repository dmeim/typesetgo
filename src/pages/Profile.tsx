import { useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import Header from "@/components/layout/Header";
import { ProfilePage } from "@/components/profile/ProfilePage";

/** Tracks an element's height so the page can leave room for the floating header. */
function useHeight<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [height, setHeight] = useState(0);
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    setHeight(element.offsetHeight);
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => setHeight(element.offsetHeight));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return [ref, height] as const;
}

/** /profile, /profile/:tab and /profile/:userId; see components/profile/profile-routes.ts. */
export default function Profile() {
  const [headerRef, headerHeight] = useHeight<HTMLDivElement>();
  return (
    <div className="flex min-h-[100dvh] flex-col bg-background font-mono text-foreground" style={{ "--profile-header": `${headerHeight}px` } as CSSProperties}>
      {/* The Dock floats over the page like everywhere else; the sidebar runs the full height under it, and the page
          fades out as it scrolls up behind the Dock instead of stopping at a hard edge. */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-x-0 top-0 z-30 h-[calc(var(--profile-header,0px)+1rem)] bg-linear-to-b from-background from-60% to-transparent" />
      <div ref={headerRef} className="fixed inset-x-0 top-0 z-50">
        <Header />
      </div>
      <ProfilePage />
    </div>
  );
}
