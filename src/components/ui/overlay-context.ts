import { createContext } from "react";

export type OverlayState = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  closeOnEscape: () => void;
  depth: number;
};

export const OverlayContext = createContext<OverlayState | null>(null);
