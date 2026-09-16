import { useState, useEffect, useRef, useId, type PointerEvent, type KeyboardEvent } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { hexToHsv, hsvToHex, isValidHex } from "@/lib/color-utils";

interface ColorPickerProps {
  value: string;
  onChange: (hex: string) => void;
  className?: string;
}

export default function ColorPicker({ value, onChange, className = "" }: ColorPickerProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={`inline-block h-8 w-10 rounded border border-input focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${className}`}
          style={{ backgroundColor: value }}
          aria-label="Pick color"
        />
      </PopoverTrigger>
      <PopoverContent
        aria-label="Color picker"
        align="start"
        sideOffset={8}
        collisionPadding={8}
        className="w-64 max-w-[calc(100vw-1rem)] max-h-[var(--radix-popover-content-available-height)] overflow-y-auto rounded-lg p-4 shadow-none"
      >
        <ColorPickerPanel hex={value} onChange={onChange} />
      </PopoverContent>
    </Popover>
  );
}

// Pointer capture owns the drag for mouse, touch, and pen. No document listeners
// or delayed positioning work survive closing/unmounting the popover.
function useCanvasPointer(onPosition: (x: number, y: number) => void) {
  const activePointer = useRef<number | null>(null);
  const update = (event: PointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    onPosition((event.clientX - rect.left) / rect.width, (event.clientY - rect.top) / rect.height);
  };
  const stop = (event: PointerEvent<HTMLCanvasElement>) => {
    if (activePointer.current !== event.pointerId) return;
    activePointer.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };
  return {
    onPointerDown: (event: PointerEvent<HTMLCanvasElement>) => {
      if (event.button !== 0 || event.isPrimary === false) return;
      event.preventDefault();
      event.currentTarget.focus();
      activePointer.current = event.pointerId;
      event.currentTarget.setPointerCapture(event.pointerId);
      update(event);
    },
    onPointerMove: (event: PointerEvent<HTMLCanvasElement>) => {
      if (activePointer.current === event.pointerId) update(event);
    },
    onPointerUp: stop,
    onPointerCancel: stop,
    onLostPointerCapture: () => { activePointer.current = null; },
  };
}

function ColorPickerPanel({
  hex,
  onChange,
}: {
  hex: string;
  onChange: (hex: string) => void;
}) {
  const inputId = useId();
  const [selection, setSelection] = useState(() => ({ source: hex, hsv: hexToHsv(hex), draft: hex }));
  if (selection.source.toLowerCase() !== hex.toLowerCase()) {
    setSelection({ source: hex, hsv: hexToHsv(hex), draft: hex });
  }
  const { hsv, draft: inputHex } = selection;

  const updateColor = (newHsv: { h: number; s: number; v: number }) => {
    const newHex = hsvToHex(newHsv.h, newHsv.s, newHsv.v);
    setSelection({ source: newHex, hsv: newHsv, draft: newHex });
    onChange(newHex);
  };

  const handleHexChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const draft = event.target.value;
    if (isValidHex(draft)) {
      const nextHex = draft.startsWith("#") ? draft : `#${draft}`;
      setSelection({ source: nextHex, hsv: hexToHsv(nextHex), draft });
      onChange(nextHex);
    } else {
      setSelection((current) => ({ ...current, draft }));
    }
  };

  return (
    <div className="flex flex-col gap-4 select-none items-center w-full">
      <div className="relative flex items-center justify-center">
        {/* Hue Wheel Ring */}
        <HueWheel hsv={hsv} onChange={(h) => updateColor({ ...hsv, h })} />

        {/* Saturation Box inside the ring */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
          <SatValBox
            hsv={hsv}
            onChange={(s, v) => updateColor({ ...hsv, s, v })}
          />
        </div>
      </div>

      <div className="grid w-full gap-2 text-sm text-popover-foreground">
        <label className="grid gap-1">
          Saturation
          <input type="range" min={0} max={100} step={1} value={Math.round(hsv.s * 100)}
            onChange={(event) => updateColor({ ...hsv, s: Number(event.target.value) / 100 })} />
        </label>
        <label className="grid gap-1">
          Brightness
          <input type="range" min={0} max={100} step={1} value={Math.round(hsv.v * 100)}
            onChange={(event) => updateColor({ ...hsv, v: Number(event.target.value) / 100 })} />
        </label>
      </div>
      <div className="flex items-center gap-2 w-full">
        <label htmlFor={inputId} className="text-sm text-muted-foreground">Hex color</label>
        <input
          id={inputId}
          type="text"
          value={inputHex.replace(/^#/, "")}
          aria-invalid={!isValidHex(inputHex)}
          autoComplete="off"
          spellCheck={false}
          onChange={handleHexChange}
          className="min-w-0 flex-1 bg-input text-popover-foreground text-sm px-2 py-1 rounded border border-border focus-visible:outline-2 focus-visible:outline-ring font-mono h-8 select-text"
        />
        <div
          className="w-8 h-8 rounded border border-border shrink-0"
          style={{ backgroundColor: hsvToHex(hsv.h, hsv.s, hsv.v) }}
        />
      </div>
    </div>
  );
}

function HueWheel({
  hsv,
  onChange,
}: {
  hsv: { h: number };
  onChange: (h: number) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Config
  const size = 180;
  const center = size / 2;
  const thickness = 20; // Thickness of the ring

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, size, size);

    // Draw color wheel
    for (let i = 0; i < 360; i++) {
      const startAngle = ((i - 90) * Math.PI) / 180;
      const endAngle = ((i + 1.5 - 90) * Math.PI) / 180;
      ctx.beginPath();
      ctx.arc(center, center, center - thickness / 2, startAngle, endAngle);
      ctx.lineWidth = thickness;
      ctx.strokeStyle = `hsl(${i}, 100%, 50%)`;
      ctx.stroke();
    }

    // Draw selector handle
    const angle = ((hsv.h - 90) * Math.PI) / 180;
    const handleRadius = center - thickness / 2;
    const x = center + Math.cos(angle) * handleRadius;
    const y = center + Math.sin(angle) * handleRadius;

    // Draw white circle with shadow
    ctx.beginPath();
    ctx.arc(x, y, 6, 0, 2 * Math.PI);
    ctx.fillStyle = "white";
    ctx.shadowColor = "rgba(0,0,0,0.5)";
    ctx.shadowBlur = 4;
    ctx.fill();
    ctx.shadowBlur = 0; // reset

    // Draw inner stroke
    ctx.strokeStyle = "rgba(0,0,0,0.2)";
    ctx.lineWidth = 1;
    ctx.stroke();
  }, [hsv.h, size, center, thickness]);

  const pointer = useCanvasPointer((x, y) => {
    const angle = (Math.atan2(y - 0.5, x - 0.5) * 180) / Math.PI;
    onChange(Math.round(angle + 90 + 360) % 360);
  });
  const handleKeyDown = (event: KeyboardEvent<HTMLCanvasElement>) => {
    const changes: Record<string, number> = {
      ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1,
      PageUp: 10, PageDown: -10,
    };
    if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      onChange(event.key === "Home" ? 0 : 359);
    } else if (event.key in changes) {
      event.preventDefault();
      onChange(Math.max(0, Math.min(359, hsv.h + changes[event.key])));
    }
  };

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      className="cursor-pointer rounded-full block touch-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      role="slider"
      tabIndex={0}
      aria-label="Hue"
      aria-valuemin={0}
      aria-valuemax={359}
      aria-valuenow={Math.round(hsv.h)}
      aria-valuetext={`${Math.round(hsv.h)} degrees`}
      onKeyDown={handleKeyDown}
      {...pointer}
    />
  );
}

function SatValBox({
  hsv,
  onChange,
}: {
  hsv: { h: number; s: number; v: number };
  onChange: (s: number, v: number) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const size = 90; // Fits inside the 180px ring (180 - 40 - padding) = ~140 space, so 90 is safe

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, size, size);

    // 1. Fill with Hue
    ctx.fillStyle = `hsl(${hsv.h}, 100%, 50%)`;
    ctx.fillRect(0, 0, size, size);

    // 2. Gradient White (Horizontal) -> Saturation
    const gradWhite = ctx.createLinearGradient(0, 0, size, 0);
    gradWhite.addColorStop(0, "rgba(255,255,255,1)");
    gradWhite.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = gradWhite;
    ctx.fillRect(0, 0, size, size);

    // 3. Gradient Black (Vertical) -> Value
    const gradBlack = ctx.createLinearGradient(0, 0, 0, size);
    gradBlack.addColorStop(0, "rgba(0,0,0,0)");
    gradBlack.addColorStop(1, "rgba(0,0,0,1)");
    ctx.fillStyle = gradBlack;
    ctx.fillRect(0, 0, size, size);

    // Draw Handle
    const x = hsv.s * size;
    const y = (1 - hsv.v) * size;

    ctx.beginPath();
    ctx.arc(x, y, 6, 0, 2 * Math.PI);
    ctx.strokeStyle = "white";
    ctx.lineWidth = 2;
    ctx.shadowColor = "rgba(0,0,0,0.5)";
    ctx.shadowBlur = 2;
    ctx.stroke();
    ctx.shadowBlur = 0;

    ctx.beginPath();
    ctx.arc(x, y, 4, 0, 2 * Math.PI);
    ctx.fillStyle = hsv.v > 0.5 ? "black" : "white"; // Contrast
    ctx.fill();
  }, [hsv.h, hsv.s, hsv.v, size]);

  const pointer = useCanvasPointer((x, y) => {
    onChange(Math.max(0, Math.min(1, x)), 1 - Math.max(0, Math.min(1, y)));
  });

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      className="cursor-crosshair rounded border border-border block touch-none"
      aria-hidden="true"
      {...pointer}
    />
  );
}
