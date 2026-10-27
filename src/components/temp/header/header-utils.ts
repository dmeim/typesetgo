// Helpers shared by the header mockups.
import { useCallback, useEffect, useId, useState } from "react";
import type { MockNotification } from "./header-mock";

export { iconButton } from "@/components/layout/header/header-utils";

export const unreadOf = (notifications: MockNotification[]) => notifications.filter((notification) => notification.unread).length;

/**
 * One open menu at a time per header. Spread `root` on every element that holds a menu button or panel;
 * a press outside all of them, or Escape, closes the menu.
 */
export function useMenus<T extends string>() {
  const [open, setOpen] = useState<T | null>(null);
  const id = useId();
  const close = useCallback(() => setOpen(null), []);
  useEffect(() => {
    if (open === null) return;
    const press = (event: PointerEvent) => {
      if (!(event.target as Element).closest?.(`[data-menu-root="${CSS.escape(id)}"]`)) close();
    };
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    document.addEventListener("pointerdown", press);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("pointerdown", press);
      document.removeEventListener("keydown", key);
    };
  }, [open, id, close]);
  const toggle = useCallback((name: T) => setOpen((current) => current === name ? null : name), []);
  return { open, toggle, close, root: { "data-menu-root": id } };
}
