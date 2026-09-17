import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Loader2, ArrowLeft } from "lucide-react";
import { tv } from "@/lib/theme-vars";

export function RaceError({ children }: { children: ReactNode }) {
  return children ? (
    <p
      role="alert"
      className="text-sm py-3"
      style={{ color: tv.ui.destructive }}
    >
      {children}
    </p>
  ) : null;
}

export default function RaceState({
  title,
  description,
  loading = false,
  children,
}: {
  title: string;
  description?: string;
  loading?: boolean;
  children?: ReactNode;
}) {
  return (
    <main
      className="min-h-screen flex items-center justify-center p-6"
      style={{ backgroundColor: tv.ui.background, color: tv.ui.foreground }}
    >
      <div className="w-full max-w-md text-center space-y-4">
        {loading && (
          <Loader2
            aria-hidden="true"
            className="mx-auto motion-safe:animate-spin"
          />
        )}
        <h1
          className="text-2xl font-bold"
          role={loading ? "status" : undefined}
        >
          {title}
        </h1>
        {description && (
          <p style={{ color: tv.ui.mutedForeground }}>{description}</p>
        )}
        {children ||
          (!loading && (
            <Link
              className="inline-flex items-center gap-2 underline underline-offset-4"
              to="/race"
            >
              <ArrowLeft className="size-4 shrink-0" aria-hidden="true" />
              Back to Race
            </Link>
          ))}
      </div>
    </main>
  );
}
