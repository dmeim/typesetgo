import { useCallback, useEffect, useMemo, useState } from "react";
import { INITIAL_NOTICES, type MockNotice } from "./notifications-mock";

export interface MockInbox {
  notices: MockNotice[];
  unread: number;
  read: (id: string) => void;
  toggleRead: (id: string) => void;
  remove: (id: string) => void;
  readAll: () => void;
  clear: () => void;
  reset: () => void;
}

/** In-memory notifications for one stage; every change is lost on reload. */
export function useMockInbox(): MockInbox {
  const [notices, setNotices] = useState<MockNotice[]>(INITIAL_NOTICES);
  const update = useCallback((id: string, change: (notice: MockNotice) => MockNotice) => {
    setNotices((items) => items.map((notice) => notice.id === id ? change(notice) : notice));
  }, []);
  return useMemo(() => ({
    notices,
    unread: notices.filter((notice) => notice.unread).length,
    read: (id: string) => update(id, (notice) => ({ ...notice, unread: false })),
    toggleRead: (id: string) => update(id, (notice) => ({ ...notice, unread: !notice.unread })),
    remove: (id: string) => setNotices((items) => items.filter((notice) => notice.id !== id)),
    readAll: () => setNotices((items) => items.map((notice) => ({ ...notice, unread: false }))),
    clear: () => setNotices([]),
    reset: () => setNotices(INITIAL_NOTICES),
  }), [notices, update]);
}

/** Escape closes the topmost open layer inside the stage. */
export function useEscape(active: boolean, onEscape: () => void) {
  useEffect(() => {
    if (!active) return;
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") onEscape();
    };
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, [active, onEscape]);
}

/** What every concept is given by the showcase stage. */
export interface ConceptProps {
  inbox: MockInbox;
  open: boolean;
  onClose: () => void;
}
