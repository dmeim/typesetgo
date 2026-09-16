import { useEffect, useRef, useState } from "react";

type Attempt<T> =
  | { status: "idle" | "pending"; value?: undefined; error?: undefined }
  | { status: "success"; value: T; error?: undefined }
  | { status: "error"; value?: undefined; error: string };

/** One request per explicit attempt, including StrictMode's repeated effects. */
export function useRoomAttempt<T>(enabled: boolean, request: () => Promise<T>) {
  const [state, setState] = useState<Attempt<T>>({ status: "idle" });
  const [attempt, setAttempt] = useState(0);
  const started = useRef(-1);

  useEffect(() => {
    if (!enabled || started.current === attempt) return;
    started.current = attempt;
    setState({ status: "pending" });
    void request().then(
      (value) => setState({ status: "success", value }),
      (error: unknown) =>
        setState({
          status: "error",
          error:
            error instanceof Error
              ? error.message
              : "Unable to connect. Please try again.",
        }),
    );
  }, [enabled, request, attempt]);

  return { ...state, retry: () => setAttempt((value) => value + 1) };
}
