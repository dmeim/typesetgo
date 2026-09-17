import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { XIcon } from "lucide-react"

import { OverlayScope, useOverlayEscape, useOverlayState } from "./overlay-state";

import { cn } from "@/lib/utils"
import { overlayMotion, overlaySurface } from "./overlay-styles"

const DialogTriggerCount = React.createContext<React.RefObject<number> | null>(null);

function Dialog({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Root>) {
  const triggerCountRef = React.useRef(0);
  const overlay = useOverlayState(props);
  return (
    <DialogTriggerCount.Provider value={triggerCountRef}>
      <OverlayScope value={overlay}><DialogPrimitive.Root data-slot="dialog" {...props} open={overlay.open} onOpenChange={overlay.onOpenChange} /></OverlayScope>
    </DialogTriggerCount.Provider>
  );
}

function DialogTrigger({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
  const triggerCountRef = React.useContext(DialogTriggerCount);
  React.useLayoutEffect(() => {
    if (!triggerCountRef) return;
    triggerCountRef.current += 1;
    return () => { triggerCountRef.current -= 1; };
  }, [triggerCountRef]);
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />
}

function DialogPortal({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Portal>) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />
}

function DialogClose({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />
}

function DialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      data-slot="dialog-overlay"
      className={cn(
        overlayMotion,
        "fixed inset-0 z-50 bg-[var(--theme-bg-overlay)]",
        className
      )}
      {...props}
    />
  )
}

function DialogContent({
  className,
  onEscapeKeyDown,
  children,
  showCloseButton = true,
  onOpenAutoFocus,
  onCloseAutoFocus,
  onInteractOutside,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
  showCloseButton?: boolean
}) {
  useOverlayEscape(onEscapeKeyDown);
  const triggerCountRef = React.useContext(DialogTriggerCount);
  const returnFocusRef = React.useRef<HTMLElement | null>(null);
  return (
    <DialogPortal data-slot="dialog-portal">
      <DialogOverlay />
      <DialogPrimitive.Content
        data-slot="dialog-content"
        onInteractOutside={(event) => {
          onInteractOutside?.(event);
          // Toasts are portaled above modals; dismissing feedback must not dismiss the form.
          if (event.target instanceof Element && event.target.closest('[data-slot="toast-viewport"]')) {
            event.preventDefault();
          }
        }}
        onOpenAutoFocus={(event) => {
          returnFocusRef.current = document.activeElement instanceof HTMLElement
            ? document.activeElement : null;
          onOpenAutoFocus?.(event);
        }}
        onCloseAutoFocus={(event) => {
          onCloseAutoFocus?.(event);
          // Radix restores registered triggers. Controlled dialogs opened by
          // shell actions need an equivalent fallback to their surviving origin.
          if (!event.defaultPrevented && !triggerCountRef?.current && returnFocusRef.current?.isConnected) {
            event.preventDefault();
            returnFocusRef.current.focus({ preventScroll: true });
          }
        }}
        className={cn(
          overlaySurface, overlayMotion,
          "fixed top-1/2 left-1/2 z-50 grid w-full min-w-0 max-w-[calc(100%-2rem)] max-h-[calc(100dvh-2rem)] -translate-x-1/2 -translate-y-1/2 gap-4 overflow-y-auto overscroll-contain p-6 outline-none sm:max-w-lg",
          className
        )}
        {...props}
      >
        {children}
        {showCloseButton && (
          <DialogPrimitive.Close
            data-slot="dialog-close"
            className="ring-offset-background focus:ring-ring data-[state=open]:bg-accent data-[state=open]:text-muted-foreground absolute top-3 right-3 inline-flex size-8 items-center justify-center rounded-sm hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"
          >
            <XIcon />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPortal>
  )
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-header"
      className={cn("flex flex-col gap-2 text-center sm:text-left", className)}
      {...props}
    />
  )
}

function DialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
        className
      )}
      {...props}
    />
  )
}

function DialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn("pr-8 text-lg leading-snug font-semibold break-words", className)}
      {...props}
    />
  )
}

function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  )
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
}
