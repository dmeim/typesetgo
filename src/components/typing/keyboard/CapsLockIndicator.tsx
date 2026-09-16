interface CapsLockIndicatorProps {
  isActive: boolean;
  rowHeight: number;
}

export default function CapsLockIndicator({ isActive }: CapsLockIndicatorProps) {
  return (
    <div className="min-h-5 text-xs font-medium text-foreground" role="status">
      {isActive ? "Caps Lock is on" : ""}
    </div>
  );
}
