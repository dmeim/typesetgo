import { ArrowLeftIcon, CircleNotchIcon, SignInIcon, SignOutIcon } from "@phosphor-icons/react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useConvex } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { tv } from "@/lib/theme-vars";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAppAuth } from "@/components/layout/useAppAuth";

const ADMIN_TOKEN_KEY = "typesetgo.adminToken";

type AdminReviewItem = FunctionReturnType<typeof api.admin.listReview>[number];
const adminApi = api.admin;
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

export default function Admin() {
  const convex = useConvex();
  const auth = useAppAuth();
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
  const isLoadingList = Boolean(token && !currentReview);
  const listError = actionError ?? currentReview?.error ?? null;

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    // Loading/empty state belongs to this request key; only its response writes state.
    void convex.query(adminApi.listReview, { token }).then((payload) => {
      if (!cancelled) setReview({ token, revision: refreshKey, rows: payload, error: null });
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
    if (!token) return;
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
        backgroundColor: tv.ui.background,
        color: tv.ui.foreground,
      }}
    >
      <div className="w-full max-w-5xl mx-auto animate-fade-in">
        <div className="mb-6 flex items-center justify-between gap-4">
          <Link
            to="/"
            className="inline-flex items-center gap-2 transition text-sm hover:opacity-100"
            style={{ color: tv.ui.mutedForeground }}
          >
            <ArrowLeftIcon className="size-4 shrink-0" aria-hidden="true" />
            Back to Homepage
          </Link>
          {isLoggedIn && (
            <button
              type="button"
              onClick={handleSignOut}
              className="inline-flex items-center justify-center gap-2 text-sm transition hover:opacity-100"
              style={{ color: tv.ui.mutedForeground, opacity: 0.8 }}
            >
              <SignOutIcon className="size-4 shrink-0" aria-hidden="true" />
              Sign out
            </button>
          )}
        </div>

        <div className="text-center mb-10">
          <h1
            className="text-4xl font-bold mb-2"
            style={{ color: tv.ui.primary }}
          >
            Admin Review
          </h1>
          <p style={{ color: tv.ui.mutedForeground }}>
            Invalid results and high WPM scores for manual review
          </p>
        </div>

        {!isLoggedIn && auth.status !== "signed-in" ? (
          <div className="max-w-sm mx-auto space-y-4 rounded-lg p-6 text-center" style={{ backgroundColor: tv.ui.secondary }}>
            <p>Sign in to your account before opening admin review.</p>
            {auth.status === "unavailable" ? (
              <p className="text-sm" style={{ color: tv.ui.mutedForeground }}>Account sign-in is unavailable in this environment.</p>
            ) : auth.status === "signed-out" ? (
              <Button type="button" onClick={() => void auth.openSignIn()}><SignInIcon aria-hidden="true" /> Sign in</Button>
            ) : (
              <p className="text-sm" role="status">Checking sign-in…</p>
            )}
          </div>
        ) : !isLoggedIn ? (
          <form
            onSubmit={handleLogin}
            className="max-w-sm mx-auto space-y-4 p-6 rounded-lg"
            style={{ backgroundColor: tv.ui.secondary }}
          >
            <div className="space-y-2">
              <Label htmlFor="admin-password" style={{ color: tv.ui.foreground }}>
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
                  backgroundColor: tv.ui.card,
                  color: tv.ui.foreground,
                  borderColor: tv.border.subtle,
                }}
              />
            </div>
            {loginError && (
              <p className="text-sm" style={{ color: tv.ui.destructive }}>
                {loginError}
              </p>
            )}
            <Button
              type="submit"
              disabled={isLoggingIn || !password}
              className="w-full"
              style={{
                backgroundColor: tv.ui.primary,
                color: tv.ui.primaryForeground,
              }}
            >
              {isLoggingIn ? <CircleNotchIcon className="size-4 shrink-0 motion-safe:animate-spin" aria-hidden="true" /> : <SignInIcon className="size-4 shrink-0" aria-hidden="true" />}
              {isLoggingIn ? "Signing in..." : "Sign in"}
            </Button>
          </form>
        ) : (
          <div className="space-y-4">
            {listError && (
              <p className="text-sm" style={{ color: tv.ui.destructive }}>
                {listError}
              </p>
            )}
            {isLoadingList && (
              <p className="text-sm" style={{ color: tv.ui.mutedForeground }}>
                Loading review queue...
              </p>
            )}
            {!isLoadingList && sortedRows.length === 0 && !listError && (
              <p className="text-sm text-center" style={{ color: tv.ui.mutedForeground }}>
                No results in the review queue.
              </p>
            )}
            {sortedRows.length > 0 && (
              <div
                className="overflow-x-auto rounded-lg border"
                style={{ borderColor: tv.border.subtle, backgroundColor: tv.ui.card }}
              >
                <Table className="w-full text-sm">
                  <TableHeader>
                    <TableRow style={{ color: tv.ui.mutedForeground, borderBottom: `1px solid ${tv.border.subtle}` }}>
                      <TableHead className="text-left font-medium px-3 py-2">User</TableHead>
                      <TableHead className="text-right font-medium px-3 py-2">WPM</TableHead>
                      <TableHead className="text-right font-medium px-3 py-2">Acc</TableHead>
                      <TableHead className="text-right font-medium px-3 py-2">Time</TableHead>
                      <TableHead className="text-left font-medium px-3 py-2">Mode</TableHead>
                      <TableHead className="text-left font-medium px-3 py-2">Status</TableHead>
                      <TableHead className="text-left font-medium px-3 py-2">Reason</TableHead>
                      <TableHead className="text-left font-medium px-3 py-2">When</TableHead>
                      <TableHead className="text-right font-medium px-3 py-2">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedRows.map((row) => (
                      <TableRow
                        key={row.resultId}
                        style={{ borderBottom: `1px solid ${tv.border.subtle}` }}
                      >
                        <TableCell className="px-3 py-2" style={{ color: tv.ui.foreground }}>
                          {row.username || "Unknown"}
                        </TableCell>
                        <TableCell className="px-3 py-2 text-right tabular-nums" style={{ color: tv.ui.foreground }}>
                          {Math.round(row.wpm)}
                        </TableCell>
                        <TableCell className="px-3 py-2 text-right tabular-nums" style={{ color: tv.ui.foreground }}>
                          {Math.round(row.accuracy)}%
                        </TableCell>
                        <TableCell className="px-3 py-2 text-right tabular-nums" style={{ color: tv.ui.mutedForeground }}>
                          {formatDuration(row.duration)}
                        </TableCell>
                        <TableCell className="px-3 py-2" style={{ color: tv.ui.mutedForeground }}>
                          {row.mode ?? "—"}
                        </TableCell>
                        <TableCell
                          className="px-3 py-2"
                          style={{
                            color: row.isValid === false ? tv.ui.destructive : tv.ui.success,
                          }}
                        >
                          {row.isValid === false ? "Invalid" : "Valid"}
                        </TableCell>
                        <TableCell className="px-3 py-2 max-w-[16rem] truncate" style={{ color: tv.ui.mutedForeground }} title={row.invalidReason ?? undefined}>
                          {row.invalidReason || "—"}
                        </TableCell>
                        <TableCell className="px-3 py-2 whitespace-nowrap" style={{ color: tv.ui.mutedForeground }}>
                          {formatDateTime(row.createdAt)}
                        </TableCell>
                        <TableCell className="px-3 py-2">
                          <div className="flex justify-end gap-2">
                            <Button
                              type="button"
                              size="sm"
                              disabled={pendingId === row.resultId}
                              onClick={() => void handleSetValidity(row.resultId, true)}
                              style={{
                                backgroundColor: tv.ui.successSurface,
                                color: tv.ui.success,
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
                                backgroundColor: tv.ui.destructiveSurface,
                                color: tv.ui.destructive,
                              }}
                            >
                              Invalid
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
