import type { ReactNode } from "react";

export function FormError({ children }: { children: ReactNode }) {
  if (!children) return null;
  return <p role="alert" className="text-sm font-medium text-destructive">{children}</p>;
}
