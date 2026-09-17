import { IconContext, type IconProps } from "@phosphor-icons/react";
import type { ReactNode } from "react";

const defaults: IconProps = { size: 24, weight: "bold" };

export function IconProvider({ children }: { children: ReactNode }) {
  return <IconContext.Provider value={defaults}>{children}</IconContext.Provider>;
}
