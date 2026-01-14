import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { hexToHsv, hsvToHex, isValidHex } from "@/lib/color-utils";

interface ColorPickerProps {
  value: string;
  onChange: (hex: string) => void;
  className?: string;
}

export default function ColorPicker({
  value,
  onChange,
  className = "",
}: ColorPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  // Update position when opening
  useEffect(() => {
    if (isOpen && containerRef.current) {
      // Use requestAnimationFrame to avoid synchronous state update warning
      // and ensure DOM is ready
      requestAnimationFrame(() => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const scrollY = window.scrollY;
        const scrollX = window.scrollX;

        // Calculate available space
        const screenHeight = window.innerHeight;
        const screenWidth = window.innerWidth;

        const popoverHeight = 300; // Approx height
        const popoverWidth = 240; // Exact width

        const spaceBelow = screenHeight - rect.bottom;

        let top = rect.bottom + scrollY + 8;
        let left = rect.left + scrollX;

        // Vertical positioning
        // If not enough space below, show above
        if (spaceBelow < popoverHeight && rect.top > popoverHeight) {
          top = rect.top + scrollY - popoverHeight - 8;
        }

        // Horizontal positioning
        // If going off right edge, shift left
        if (left + popoverWidth > screenWidth) {
          left = Math.max(8, screenWidth - popoverWidth - 8 + scrollX);
        }
        // If going off left edge (rare), shift right
        left = Math.max(8, left);

        setPosition({ top, left });
      });
    }
  }, [isOpen]);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Check if click is inside the portal (we'll attach an ID or ref to the portal content)
      const portalEl = document.getElementById("color-picker-portal-content");

      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node) &&
        portalEl &&
        !portalEl.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      // Also close on scroll to prevent detached UI
      window.addEventListener("scroll", () => setIsOpen(false), true);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("scroll", () => setIsOpen(false), true);
    };
  }, [isOpen]);

  return (
    <div className={`relative inline-block ${className}`} ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-10 h-8 rounded border border-gray-600 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        style={{ backgroundColor: value }}
        aria-label="Pick color"
      />
      {isOpen && (
        <Portal>
          <div
            id="color-picker-portal-content"
            className="fixed z-[9999] bg-gray-800 rounded-lg shadow-xl border border-gray-700 p-4 animate-fade-in"
            style={{
              top: position.top,
              left: position.left,
              width: "240px",
            }}
          >
            <ColorPickerPanel hex={value} onChange={onChange} />
          </div>
        </Portal>
      )}
    </div>
  );
}

function Portal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 0);
    return () => {
      clearTimeout(timer);
      setMounted(false);
    };
  }, []);

  if (!mounted) return null;

  return createPortal(children, document.body);
}

function ColorPickerPanel({
  hex,
  onChange,
}: {
  hex: string;
  onChange: (hex: string) => void;
}) {
  const [hsv, setHsv] = useState(() => hexToHsv(hex));
  const [inputHex, setInputHex] = useState(hex);

  // Sync internal state if prop changes externally
  useEffect(() => {
    if (hex.toLowerCase() !== inputHex.toLowerCase()) {
      setHsv(hexToHsv(hex));
      setInputHex(hex);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hex]);

  const updateColor = (newHsv: { h: number; s: number; v: number }) => {
    setHsv(newHsv);
    const newHex = hsvToHex(newHsv.h, newHsv.s, newHsv.v);
    setInputHex(newHex);
    onChange(newHex);
  };

  const handleHexChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputHex(val);
    if (isValidHex(val)) {
      const newHsv = hexToHsv(val);
      setHsv(newHsv);
      onChange(val.startsWith("#") ? val : `#${val}`);
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

      <div className="flex items-center gap-2 w-full max-w-[180px]">
        <span className="text-gray-400 text-sm">#</span>
        <input
          type="text"
          value={inputHex.replace(/^#/, "")}
          onChange={handleHexChange}
          className="flex-1 bg-gray-700 text-white text-sm px-2 py-1 rounded border border-gray-600 focus:outline-none focus:border-blue-500 font-mono h-8 select-text w-0"
        />
        <div
          className="w-8 h-8 rounded border border-gray-600 shrink-0"
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
  const [isDragging, setIsDragging] = useState(false);

  // Config
  const size = 180;
  const center = size / 2;
  const thickness = 20; // Thickness of the ring
  const innerRadius = center - thickness;
  const outerRadius = center;

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

  const handleInteraction = useCallback(
    (e: React.MouseEvent | MouseEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left - center;
      const y = e.clientY - rect.top - center;

      // Calculate angle
      let angle = (Math.atan2(y, x) * 180) / Math.PI;
      angle = (angle + 90 + 360) % 360; // Normalize to 0-360 starting from top

      onChange(angle);
    },
    [center, onChange]
  );

  const handleMouseDown = (e: React.MouseEvent) => {
    // Only trigger if clicking roughly on the ring
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left - center;
    const y = e.clientY - rect.top - center;
    const dist = Math.sqrt(x * x + y * y);

    if (dist >= innerRadius - 10 && dist <= outerRadius + 10) {
      setIsDragging(true);
      handleInteraction(e);
    }
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        e.preventDefault(); // Prevent text selection
        handleInteraction(e);
      }
    };
    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, handleInteraction]);

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      className="cursor-pointer rounded-full block"
      onMouseDown={handleMouseDown}
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
  const [isDragging, setIsDragging] = useState(false);
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

  const handleInteraction = useCallback(
    (e: React.MouseEvent | MouseEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();

      const x = Math.max(0, Math.min(e.clientX - rect.left, size));
      const y = Math.max(0, Math.min(e.clientY - rect.top, size));

      const s = x / size;
      const v = 1 - y / size;

      onChange(s, v);
    },
    [size, onChange]
  );

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    handleInteraction(e);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        e.preventDefault();
        handleInteraction(e);
      }
    };
    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, handleInteraction]);

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      className="cursor-crosshair rounded shadow-lg border border-gray-600 block"
      onMouseDown={handleMouseDown}
    />
  );
}
