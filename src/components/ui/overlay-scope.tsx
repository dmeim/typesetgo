import type { ReactNode } from "react";
import { OverlayContext, type OverlayState } from "./overlay-context";

export function OverlayScope({ value, children }: { value: OverlayState; children: ReactNode }) {
  return <OverlayContext.Provider value={value}>{children}</OverlayContext.Provider>;
}
