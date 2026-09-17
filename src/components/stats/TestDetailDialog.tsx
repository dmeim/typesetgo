import { CircleNotchIcon, TrashIcon } from "@phosphor-icons/react";
import { useRef, useState } from "react";
import { useMutation } from "convex/react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { api } from "../../../convex/_generated/api";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { formatRecordedMetric, getTestTypeLabels, type ProfileTestResult } from "./profile-presentation";

interface TestDetailDialogProps {
  result: ProfileTestResult;
  clerkId: string | null;
  isOwner: boolean;
  onClose: () => void;
  onDeleted: () => void;
  onCloseAutoFocus: (event: Event) => void;
}

const actionClass = "min-h-11 rounded-md border border-border px-4 py-2 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-50";

export default function TestDetailDialog({ result, clerkId, isOwner, onClose, onDeleted, onCloseAutoFocus }: TestDetailDialogProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const deletionPending = useRef(false);
  const deleteResult = useMutation(api.testResults.deleteResult);
  const canDelete = isOwner && !!clerkId;

  const handleDelete = async () => {
    if (!canDelete || !clerkId || deletionPending.current) return;
    deletionPending.current = true;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await deleteResult({ resultId: result._id, clerkId });
      onDeleted();
    } catch {
      setDeleteError("Could not delete this test. Please try again.");
    } finally {
      deletionPending.current = false;
      setIsDeleting(false);
    }
  };

  const metrics = [
    ["Correct words", result.wordsCorrect],
    ["Incorrect words", result.wordsIncorrect],
    ["Missed characters", result.charsMissed],
    ["Extra characters", result.charsExtra],
  ] as const;

  return (
    <Dialog open onOpenChange={(open) => { if (!open && !deletionPending.current) onClose(); }}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto bg-card text-card-foreground shadow-none" onCloseAutoFocus={onCloseAutoFocus}>
        <DialogHeader className="pr-6">
          <DialogTitle>Test details</DialogTitle>
          <DialogDescription>{new Date(result.createdAt).toLocaleString()}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-wrap gap-1.5">
          {getTestTypeLabels(result).map((label) => (
            <span key={label} className="rounded border border-border bg-muted px-2 py-1 text-xs text-muted-foreground">{label}</span>
          ))}
        </div>
        {result.isValid === false && (
          <p className="text-sm text-destructive">Invalid test. Excluded from lifetime statistics and charts.{result.invalidReason ? ` ${result.invalidReason}` : ""}</p>
        )}
        <dl className="grid grid-cols-2 gap-3">
          <div className="rounded-lg border border-border p-3">
            <dt className="text-sm text-muted-foreground">WPM</dt>
            <dd className="mt-1 text-3xl font-semibold tabular-nums">{result.wpm}</dd>
          </div>
          <div className="rounded-lg border border-border p-3">
            <dt className="text-sm text-muted-foreground">Accuracy</dt>
            <dd className="mt-1 text-3xl font-semibold tabular-nums">{Math.round(result.accuracy)}%</dd>
          </div>
          {metrics.map(([label, value]) => (
            <div key={label} className="rounded-lg border border-border p-3">
              <dt className="text-sm text-muted-foreground">{label}</dt>
              <dd className={`mt-1 tabular-nums ${value === undefined ? "text-sm text-muted-foreground" : "text-xl font-semibold"}`}>{formatRecordedMetric(value)}</dd>
            </div>
          ))}
        </dl>
        {canDelete && (
          <AlertDialog open={showDeleteConfirm} onOpenChange={(open) => {
            if (!deletionPending.current) {
              setShowDeleteConfirm(open);
              setDeleteError(null);
            }
          }}>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline" type="button" className={`${actionClass} text-destructive`}>
                <TrashIcon className="size-4 shrink-0" aria-hidden="true" />
                Delete test
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent
              className="max-h-[calc(100dvh-2rem)] overflow-y-auto bg-card text-card-foreground shadow-none sm:max-w-sm"
              onEscapeKeyDown={(event) => { if (deletionPending.current) event.preventDefault(); }}
            >
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this test?</AlertDialogTitle>
                <AlertDialogDescription>This removes the saved test and updates your statistics. This cannot be undone.</AlertDialogDescription>
              </AlertDialogHeader>
              {deleteError && <p role="alert" className="text-sm text-destructive">{deleteError}</p>}
              <AlertDialogFooter>
                <AlertDialogCancel disabled={isDeleting} className={actionClass}>Cancel</AlertDialogCancel>
                <AlertDialogAction variant="destructive" disabled={isDeleting} onClick={(event) => { event.preventDefault(); void handleDelete(); }} className={actionClass}>
                  {isDeleting ? <CircleNotchIcon className="size-4 shrink-0 motion-safe:animate-spin" aria-hidden="true" /> : <TrashIcon className="size-4 shrink-0" aria-hidden="true" />}
                  {isDeleting ? "Deleting…" : "Confirm delete"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </DialogContent>
    </Dialog>
  );
}
