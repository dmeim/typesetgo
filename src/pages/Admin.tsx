import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useConvex } from "convex/react";
import type { FunctionReference } from "convex/server";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { useTheme } from "@/hooks/useTheme";
import { tv } from "@/lib/theme-vars";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const ADMIN_TOKEN_KEY = "typesetgo.adminToken";

type AdminReviewItem = {
  resultId: Id<"testResults">;
  userId?: Id<"users">;
  username?: string | null;
  wpm: number;
  accuracy: number;
  duration: number;
  mode?: string;
  isValid?: boolean;
  invalidReason?: string | null;
  createdAt: number;
  wordsCorrect?: number;
};

type AdminApi = {
  login: FunctionReference<"action", "public", { password: string }, { token: string }>;
  listReview: FunctionReference<"query", "public", { token: string }, AdminReviewItem[] | { results: AdminReviewItem[] }>;
  setValidity: FunctionReference<
    "mutation",
    "public",
    { token: string; resultId: Id<"testResults">; isValid: boolean },
    { success: boolean }
  >;
};

const adminApi = (api as typeof api & { admin?: AdminApi }).admin;
const EMPTY_REVIEW: AdminReviewItem[] = [];
type ReviewSnapshot = { token: string; revision: number; rows: AdminReviewItem[]; error: string | null };

function readStoredToken(): string {
  try {
    return sessionStorage.getItem(ADMIN_TOKEN_KEY) ?? "";
  } catch {
    return "";
  }
}

function storeToken(token: string) {
  try {
    sessionStorage.setItem(ADMIN_TOKEN_KEY, token);
  } catch {
    // Ignore storage failures; in-memory state still works for this tab.
  }
}

function clearStoredToken() {
  try {
    sessionStorage.removeItem(ADMIN_TOKEN_KEY);
  } catch {
    // Ignore
  }
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.round(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

function formatDateTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleString();
}

function normalizeReviewList(payload: AdminReviewItem[] | { results: AdminReviewItem[] } | undefined): AdminReviewItem[] {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  return payload.results ?? [];
}

export default function Admin() {
  const { colors } = useTheme();
  const convex = useConvex();
  const [token, setToken] = useState(readStoredToken);
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [review, setReview] = useState<ReviewSnapshot | null>(null);
  const [pendingId, setPendingId] = useState<Id<"testResults"> | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const isLoggedIn = Boolean(token);
  const currentReview = review?.token === token && review.revision === refreshKey ? review : null;
  const rows = token ? currentReview?.rows ?? EMPTY_REVIEW : EMPTY_REVIEW;
  const isLoadingList = Boolean(token && adminApi?.listReview && !currentReview);
  const listError = actionError ?? (token && !adminApi?.listReview
    ? "Admin API is not available yet." : currentReview?.error ?? null);

  useEffect(() => {
    if (!token || !adminApi?.listReview) return;
    let cancelled = false;
    // Loading/empty state belongs to this request key; only its response writes state.
    void convex.query(adminApi.listReview, { token }).then((payload) => {
      if (!cancelled) setReview({ token, revision: refreshKey, rows: normalizeReviewList(payload), error: null });
    }).catch((error: unknown) => {
      if (cancelled) return;
      const message = error instanceof Error ? error.message : "Failed to load review queue.";
      setReview({ token, revision: refreshKey, rows: [], error: message });
      if (/unauthorized|invalid token|password/i.test(message)) {
        clearStoredToken();
        setToken("");
      }
    });
    return () => { cancelled = true; };
  }, [token, refreshKey, convex]);

  const handleLogin = async (event: FormEvent) => {
    event.preventDefault();
    setLoginError(null);
    if (!adminApi?.login) {
      setLoginError("Admin API is not available yet.");
      return;
    }
    setIsLoggingIn(true);
    try {
      const result = await convex.action(adminApi.login, { password });
      if (!result?.token) {
        setLoginError("Invalid password.");
        return;
      }
      storeToken(result.token);
      setToken(result.token);
      setActionError(null);
      setRefreshKey((value) => value + 1);
      setPassword("");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid password.";
      setLoginError(/unauthorized|invalid|password/i.test(message) ? "Invalid password." : message);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleSignOut = () => {
    clearStoredToken();
    setToken("");
    setReview(null);
    setActionError(null);
  };

  const handleSetValidity = async (resultId: Id<"testResults">, isValid: boolean) => {
    if (!token || !adminApi?.setValidity) return;
    setPendingId(resultId);
    setActionError(null);
    try {
      await convex.mutation(adminApi.setValidity, { token, resultId, isValid });
      setRefreshKey((value) => value + 1);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update validity.";
      setActionError(message);
    } finally {
      setPendingId(null);
    }
  };

  const sortedRows = useMemo(
    () => [...rows].sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0)),
    [rows]
  );

  return (
    <div
      className="min-h-[100dvh] font-mono px-4 py-12 transition-colors duration-300"
      style={{
        backgroundColor: tv.bg.base,
        color: tv.typing.correct,
      }}
    >
      <div className="w-full max-w-5xl mx-auto animate-fade-in">
        <div className="mb-6 flex items-center justify-between gap-4">
          <Link
            to="/"
            className="transition text-sm hover:opacity-100"
            style={{ color: tv.typing.default, opacity: 0.7 }}
          >
            ← Back to Homepage
          </Link>
          {isLoggedIn && (
            <button
              type="button"
              onClick={handleSignOut}
              className="text-sm transition hover:opacity-100"
              style={{ color: tv.text.secondary, opacity: 0.8 }}
            >
              Sign out
            </button>
          )}
        </div>

        <div className="text-center mb-10">
          <h1
            className="text-4xl font-bold mb-2"
            style={{ color: tv.typing.cursor }}
          >
            Admin Review
          </h1>
          <p style={{ color: tv.text.secondary }}>
            Invalid results and high WPM scores for manual review
          </p>
        </div>

        {!isLoggedIn ? (
          <form
            onSubmit={handleLogin}
            className="max-w-sm mx-auto space-y-4 p-6 rounded-lg"
            style={{ backgroundColor: `${colors.typing.default}08` }}
          >
            <div className="space-y-2">
              <Label htmlFor="admin-password" style={{ color: tv.text.primary }}>
                Password
              </Label>
              <Input
                id="admin-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                className="font-mono"
                style={{
                  backgroundColor: tv.bg.surface,
                  color: tv.text.primary,
                  borderColor: tv.border.subtle,
                }}
              />
            </div>
            {loginError && (
              <p className="text-sm" style={{ color: tv.status.error.DEFAULT }}>
                {loginError}
              </p>
            )}
            <Button
              type="submit"
              disabled={isLoggingIn || !password}
              className="w-full"
              style={{
                backgroundColor: tv.interactive.secondary.DEFAULT,
                color: tv.text.inverse,
              }}
            >
              {isLoggingIn ? "Signing in..." : "Sign in"}
            </Button>
          </form>
        ) : (
          <div className="space-y-4">
            {listError && (
              <p className="text-sm" style={{ color: tv.status.error.DEFAULT }}>
                {listError}
              </p>
            )}
            {isLoadingList && (
              <p className="text-sm" style={{ color: tv.text.secondary }}>
                Loading review queue...
              </p>
            )}
            {!isLoadingList && sortedRows.length === 0 && !listError && (
              <p className="text-sm text-center" style={{ color: tv.text.secondary }}>
                No results in the review queue.
              </p>
            )}
            {sortedRows.length > 0 && (
              <div
                className="overflow-x-auto rounded-lg border"
                style={{ borderColor: tv.border.subtle, backgroundColor: tv.bg.surface }}
              >
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ color: tv.text.secondary, borderBottom: `1px solid ${tv.border.subtle}` }}>
                      <th className="text-left font-medium px-3 py-2">User</th>
                      <th className="text-right font-medium px-3 py-2">WPM</th>
                      <th className="text-right font-medium px-3 py-2">Acc</th>
                      <th className="text-right font-medium px-3 py-2">Time</th>
                      <th className="text-left font-medium px-3 py-2">Mode</th>
                      <th className="text-left font-medium px-3 py-2">Status</th>
                      <th className="text-left font-medium px-3 py-2">Reason</th>
                      <th className="text-left font-medium px-3 py-2">When</th>
                      <th className="text-right font-medium px-3 py-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedRows.map((row) => (
                      <tr
                        key={row.resultId}
                        style={{ borderBottom: `1px solid ${tv.border.subtle}` }}
                      >
                        <td className="px-3 py-2" style={{ color: tv.text.primary }}>
                          {row.username || "Unknown"}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums" style={{ color: tv.text.primary }}>
                          {Math.round(row.wpm)}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums" style={{ color: tv.text.primary }}>
                          {Math.round(row.accuracy)}%
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums" style={{ color: tv.text.secondary }}>
                          {formatDuration(row.duration)}
                        </td>
                        <td className="px-3 py-2" style={{ color: tv.text.secondary }}>
                          {row.mode ?? "—"}
                        </td>
                        <td
                          className="px-3 py-2"
                          style={{
                            color: row.isValid === false ? tv.status.error.DEFAULT : tv.status.success.DEFAULT,
                          }}
                        >
                          {row.isValid === false ? "Invalid" : "Valid"}
                        </td>
                        <td className="px-3 py-2 max-w-[16rem] truncate" style={{ color: tv.text.secondary }} title={row.invalidReason ?? undefined}>
                          {row.invalidReason || "—"}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap" style={{ color: tv.text.secondary }}>
                          {formatDateTime(row.createdAt)}
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex justify-end gap-2">
                            <Button
                              type="button"
                              size="sm"
                              disabled={pendingId === row.resultId}
                              onClick={() => void handleSetValidity(row.resultId, true)}
                              style={{
                                backgroundColor: colors.status.success.muted,
                                color: tv.status.success.DEFAULT,
                              }}
                            >
                              Valid
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              disabled={pendingId === row.resultId}
                              onClick={() => void handleSetValidity(row.resultId, false)}
                              style={{
                                backgroundColor: colors.status.error.muted,
                                color: tv.status.error.DEFAULT,
                              }}
                            >
                              Invalid
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
