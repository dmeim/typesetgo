import { useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import Header from "@/components/layout/Header";
import { ProfilePage } from "@/components/profile/ProfilePage";

/** Tracks an element's height so the sidebar can fill the space under the pinned header. */
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
      {/* Pinned, so the sidebar (and its Changelog button) always fits on screen below it. */}
      <div ref={headerRef} className="sticky top-0 z-40 bg-background/85 backdrop-blur">
        <Header />
      </div>
      <ProfilePage />
    </div>
  );
}
