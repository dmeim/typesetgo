import { createContext, useContext } from "react";

/**
 * Where portalled overlays mount. A subtree with its own theme (a Connect room) points this at
 * itself so popovers, menus and dialogs inherit that theme instead of the page's.
 */
export const PortalContainerContext = createContext<HTMLElement | null>(null);

export const usePortalContainer = () => useContext(PortalContainerContext) ?? undefined;
