// State shared by everything inside the footer Lab's pretend browser.
import { createContext, useContext, useEffect, useState, type RefObject } from "react";
import { useReducedMotion } from "framer-motion";
import type { LinkId, StageRoute } from "./footer-mock";

export interface StageValue {
  route: StageRoute;
  go: (route: StageRoute) => void;
  /** Mid-test on Home: footers go quiet but keep their links. */
  typing: boolean;
  phone: boolean;
  /** The pretend browser's scrolling viewport; contents links scroll this, never the Lab page. */
  scroller: RefObject<HTMLDivElement | null>;
}

export const StageContext = createContext<StageValue | null>(null);

export function useStage() {
  const value = useContext(StageContext);
  if (!value) throw new Error("useStage must be used inside the footer Lab stage.");
  return value;
}

export const routeForLink = (id: LinkId): StageRoute => id === "changelog" ? { kind: "changelog" } : { kind: "info", id };

export const isCurrentLink = (route: StageRoute, id: LinkId) =>
  id === "changelog" ? route.kind === "changelog" : route.kind === "info" && route.id === id;

/**
 * Tracks which section is being read inside the stage and scrolls to one on request.
 * `offset` leaves room for anything sticky above the sections.
 */
export function useStageSections(ids: string[], offset = 16) {
  const { scroller } = useStage();
  const reduceMotion = useReducedMotion();
  const [picked, setPicked] = useState<string | undefined>(ids[0]);

  useEffect(() => {
    const node = scroller.current;
    if (!node) return;
    const pick = () => {
      const top = node.getBoundingClientRect().top;
      const found = ids.map((id) => node.querySelector<HTMLElement>(`#${CSS.escape(id)}`)).filter((item): item is HTMLElement => !!item);
      const atEnd = node.scrollTop + node.clientHeight >= node.scrollHeight - 2;
      const passed = found.filter((item) => item.getBoundingClientRect().top - top < node.clientHeight * 0.35);
      setPicked((atEnd ? found.at(-1) : passed.at(-1) ?? found[0])?.id);
    };
    node.addEventListener("scroll", pick, { passive: true });
    return () => node.removeEventListener("scroll", pick);
  }, [ids, scroller]);

  const jump = (id: string) => {
    const node = scroller.current;
    const target = node?.querySelector<HTMLElement>(`#${CSS.escape(id)}`);
    if (!node || !target) return;
    const top = target.getBoundingClientRect().top - node.getBoundingClientRect().top + node.scrollTop - offset;
    node.scrollTo({ top, behavior: reduceMotion ? "auto" : "smooth" });
  };

  const active = picked && ids.includes(picked) ? picked : ids[0];
  return { active, jump };
}
