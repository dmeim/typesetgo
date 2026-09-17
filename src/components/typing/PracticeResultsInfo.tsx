import { useEffect, useRef, useState, type ReactNode } from "react";
import { InfoIcon } from "@phosphor-icons/react";
import { Popover, PopoverAnchor, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export default function PracticeResultsInfo({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<"closed" | "preview" | "pinned">("closed");
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelClose = () => {
    if (closeTimer.current !== null) clearTimeout(closeTimer.current);
    closeTimer.current = null;
  };
  const scheduleClose = () => {
    cancelClose();
    // Allow the pointer to cross the gap between the icon and its popup.
    closeTimer.current = setTimeout(() => {
      setMode((current) => current === "preview" ? "closed" : current);
    }, 150);
  };

  useEffect(() => () => {
    if (closeTimer.current !== null) clearTimeout(closeTimer.current);
  }, []);

  return (
    <Popover open={mode !== "closed"} onOpenChange={(open) => {
      cancelClose();
      setMode(open ? "pinned" : "closed");
    }}>
      <PopoverAnchor asChild>
        <div className="mb-6 flex items-center justify-center gap-2">
          <h2 className="text-xl font-semibold text-foreground">Results</h2>
          <PopoverTrigger asChild>
            <button
              type="button"
              aria-label="About these results"
              className="inline-flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring data-[state=open]:text-foreground"
              onPointerEnter={(event) => {
                if (event.pointerType === "touch") return;
                cancelClose();
                setMode((current) => current === "closed" ? "preview" : current);
              }}
              onPointerLeave={scheduleClose}
              onClick={(event) => {
                // Clicking a hover preview pins it instead of toggling it closed.
                event.preventDefault();
                cancelClose();
                setMode((current) => current === "pinned" ? "closed" : "pinned");
              }}
            >
              <InfoIcon className="size-4" aria-hidden="true" />
            </button>
          </PopoverTrigger>
        </div>
      </PopoverAnchor>
      <PopoverContent
        aria-label="About these results"
        side="top"
        sideOffset={8}
        className="w-80 text-sm leading-relaxed text-muted-foreground"
        onOpenAutoFocus={(event) => event.preventDefault()}
        onCloseAutoFocus={(event) => event.preventDefault()}
        onPointerEnter={cancelClose}
        onPointerLeave={scheduleClose}
      >
        {children}
      </PopoverContent>
    </Popover>
  );
}
