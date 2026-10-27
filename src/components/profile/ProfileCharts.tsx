import { useId, type ReactNode } from "react";
import { motion } from "framer-motion";

/** Tiny trend line with a soft fill; draws itself in on mount. Needs at least two values. */
export function Sparkline({ values, className = "h-10 w-full", color = "var(--primary)" }: { values: number[]; className?: string; color?: string }) {
  const id = useId();
  const min = Math.min(...values);
  const max = Math.max(...values);
  const points = values.map((value, index) => [index / (values.length - 1) * 100, 28 - (value - min) / (max - min || 1) * 24] as const);
  const line = points.map(([x, y], index) => `${index ? "L" : "M"}${x.toFixed(2)} ${y.toFixed(2)}`).join(" ");
  return (
    <svg viewBox="0 0 100 30" preserveAspectRatio="none" aria-hidden="true" className={className}>
      <defs>
        <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.28" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <motion.path d={`${line} L100 30 L0 30 Z`} fill={`url(#${id})`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3, duration: 0.5 }} />
      <motion.path d={line} fill="none" stroke={color} strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round"
        initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.9, ease: "easeOut" }} />
    </svg>
  );
}

/** Circular progress ring, 0–100. */
export function Ring({ value, size = 44, stroke = 5, color = "var(--primary)", track = "var(--muted)", children }: {
  value: number;
  size?: number;
  stroke?: number;
  color?: string;
  track?: string;
  children?: ReactNode;
}) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  return (
    <span className="relative inline-flex shrink-0 items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} aria-hidden="true" className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={track} strokeWidth={stroke} />
        <motion.circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={circumference} initial={{ strokeDashoffset: circumference }} animate={{ strokeDashoffset: circumference * (1 - Math.min(100, value) / 100) }}
          transition={{ duration: 0.9, ease: "easeOut" }} />
      </svg>
      {children && <span className="absolute inset-0 flex items-center justify-center">{children}</span>}
    </span>
  );
}
