import { useRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { tv } from "@/lib/theme-vars";

export const fieldClass =
  "w-full min-w-0 rounded-md border px-3 py-2 text-base focus-visible:outline-2 focus-visible:outline-offset-2";
export const fieldStyle = {
  backgroundColor: tv.ui.background,
  color: tv.ui.foreground,
  borderColor: tv.ui.border,
};
export const panelStyle = {
  backgroundColor: tv.ui.card,
  color: tv.ui.cardForeground,
  borderColor: tv.ui.border,
};

export function RoomButton({
  children,
  selected = false,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { selected?: boolean }) {
  return (
    <button
      type="button"
      {...props}
      className={`min-h-10 rounded-md border px-3 py-2 text-sm font-medium transition-colors motion-reduce:transition-none hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${props.className ?? ""}`}
      style={{
        backgroundColor: selected ? tv.ui.accent : tv.ui.secondary,
        borderColor: selected ? tv.ui.primary : tv.ui.border,
        color: selected ? tv.ui.accentForeground : tv.ui.secondaryForeground,
        ...props.style,
      }}
    >
      {children}
    </button>
  );
}

export function RoomPage({ children }: { children: ReactNode }) {
  return (
    <main
      className="min-h-dvh px-4 py-8 sm:px-6 font-mono"
      style={{ backgroundColor: tv.ui.background, color: tv.ui.foreground }}
    >
      {children}
    </main>
  );
}

/** Controlled dialogs remember their opening control, including when no Trigger is mounted. */
export function RoomDialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  wide = false,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description: string;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}) {
  const opener = useRef<HTMLElement | null>(null);
  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent
        className={`flex flex-col max-h-[calc(100dvh-2rem)] overflow-hidden ${wide ? "sm:max-w-5xl" : "sm:max-w-lg"}`}
        style={panelStyle}
        onOpenAutoFocus={() => {
          opener.current =
            document.activeElement instanceof HTMLElement
              ? document.activeElement
              : null;
        }}
        onCloseAutoFocus={(event) => {
          if (opener.current?.isConnected) {
            event.preventDefault();
            opener.current.focus();
          }
        }}
      >
        <DialogHeader className="shrink-0 pr-6">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription style={{ color: tv.ui.mutedForeground }}>
            {description}
          </DialogDescription>
        </DialogHeader>
        <div className="min-h-0 overflow-y-auto overscroll-contain p-1">
          {children}
        </div>
        {footer && (
          <div
            className="shrink-0 border-t pt-4"
            style={{ borderColor: tv.ui.border }}
          >
            {footer}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
