import { useCallback, useMemo, useState } from "react";
import { useMutation } from "convex/react";
import { HourglassMediumIcon, PauseCircleIcon } from "@phosphor-icons/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { isBreakTest, isWaitingForNextTest, stepAfterResults, type ConnectOverrides, type ConnectTest } from "@/lib/connect-types";
import { connectTestLabels } from "@/lib/connect-settings";
import { connectAttemptKey, connectThemeMode, connectThemeStyle, effectiveStep, resolveConnectSettings } from "@/lib/connect-settings";
import { useConnectThemeColors } from "@/hooks/useConnectThemeColors";
import { useMultiplayerCredential } from "@/hooks/useMultiplayerCredential";
import TypingPractice from "@/components/typing/TypingPractice";
import type { ParticipantRoom, ParticipantSelf } from "@/components/connect/types";
import { RoomPage, RoomTopBar } from "./RoomChrome";
import { TestIndicator } from "./TestIndicator";
import { TestList } from "./TestList";
import { UpNextSplash } from "./UpNextSplash";
import { RoomSummary } from "./RoomSummary";
import { RoomResultsActions } from "./RoomResultsActions";
import { BreakScreen } from "./BreakScreen";
import { LateJoinScreen } from "./LateJoinScreen";
import { useConnectProgress } from "./use-connect-progress";
import { readableError } from "@/components/connect/connect-errors";

interface RoomLiveProps {
  roomId: string;
  participantId: string;
  room: ParticipantRoom;
  participant: ParticipantSelf;
  reconnecting: boolean;
  leaving: boolean;
  leaveError?: string;
  onLeave: () => void;
}

// Query results are new objects on every update; settle identity on content.
function useLockedSettings(test: ConnectTest | undefined, overrides: ConnectOverrides) {
  const testJson = test ? JSON.stringify(test) : "";
  const overridesJson = JSON.stringify(overrides);
  return useMemo(() => testJson ? resolveConnectSettings(JSON.parse(testJson) as ConnectTest, JSON.parse(overridesJson) as ConnectOverrides) : undefined,
    [testJson, overridesJson]);
}

/** The participant's room once membership is confirmed: lobby, typing, results, summary. */
export function RoomLive({ roomId, participantId, room, participant, reconnecting, leaving, leaveError, onLeave }: RoomLiveProps) {
  const credential = useMultiplayerCredential();
  const advanceMutation = useMutation(api.connect.advance);
  const roomTheme = useConnectThemeColors(room.overrides.theme);
  const themeStyle = useMemo(() => connectThemeStyle(roomTheme), [roomTheme]);
  const [isTyping, setIsTyping] = useState(false);
  const [splashStep, setSplashStep] = useState<number | null>(null);
  const [advancing, setAdvancing] = useState(false);
  const [advanceError, setAdvanceError] = useState<string>();

  const step = effectiveStep(room.pacing, room.currentIndex, participant.stepIndex);
  const test = room.tests[step];
  const onBreak = isBreakTest(test);
  const waiting = isWaitingForNextTest(room, participant);
  const lockedSettings = useLockedSettings(onBreak || waiting ? undefined : test, room.overrides);
  const attemptKey = connectAttemptKey(roomId, room.runVersion, step, participant.attempt);
  const isRunning = room.status === "running";
  const allDone = room.status === "complete" || participant.completedAt !== undefined || (room.status !== "lobby" && !test);
  const progress = useConnectProgress(participantId, attemptKey,
    { runVersion: room.runVersion, stepIndex: step, attempt: participant.attempt }, isRunning && !leaving && !onBreak && !waiting);

  // `manual`: the participant chose to move on. Countdowns ending retry quietly until the server agrees.
  const advance = useCallback(async (manual: boolean) => {
    if (advancing) return;
    setAdvancing(true);
    setAdvanceError(undefined);
    try {
      const result = await advanceMutation({
        participantId: participantId as Id<"connectParticipants">, credential, runVersion: room.runVersion, stepIndex: step,
      });
      if (!result.accepted) {
        if (manual) setAdvanceError("Couldn't move on yet. Try again in a moment.");
      } else if (manual && !result.completed && !isBreakTest(room.tests[result.stepIndex])) {
        // Countdowns already name the next test, so the splash only introduces one chosen early.
        setSplashStep(result.stepIndex);
      }
    } catch (error) {
      console.warn("Connect advance failed", { participantId, step, error });
      if (manual) setAdvanceError(readableError(error));
    } finally {
      setAdvancing(false);
    }
  }, [advancing, advanceMutation, participantId, credential, room.runVersion, room.tests, step]);

  const continueFromSplash = useCallback(() => setSplashStep(null), []);
  const labels = connectTestLabels(room.tests);
  const breakAfter = isBreakTest(room.tests[step + 1]);
  // Host pacing: the room ended the test (its clock ran out). Self-paced: this participant finished it.
  const resultsFrom = room.pacing === "host"
    ? room.stepEndedAt
    : participant.stats.isFinished && progress.finalDelivered ? participant.finishedAt : undefined;
  const testEnded = room.pacing === "host" && !onBreak && room.stepEndedAt !== undefined;
  const resultsActions = (
    <RoomResultsActions
      pacing={room.pacing}
      tests={room.tests}
      index={step}
      endedAt={resultsFrom}
      pausedAt={room.status === "paused" ? room.pausedAt : undefined}
      paused={room.status === "paused"}
      nextTitle={labels[stepAfterResults(room.tests, step)]?.title}
      breakTitle={breakAfter ? labels[step + 1].title : undefined}
      resultDelivered={progress.finalDelivered}
      syncFailed={progress.failed}
      advancing={advancing}
      advanceError={advanceError}
      onAdvance={(manual) => void advance(manual)}
      onRetrySync={() => void progress.retry()}
    />
  );

  let body;
  if (room.status === "lobby") {
    body = (
      <main className="flex flex-1 flex-col items-center overflow-y-auto px-4 py-10">
        <div className="flex w-full max-w-md flex-col items-center gap-6 text-center">
          <HourglassMediumIcon className="size-10 text-primary" weight="regular" aria-hidden="true" />
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold">Waiting for the host to start</h1>
            <p className="text-muted-foreground">You're in as <span className="font-medium text-foreground">{participant.name}</span>.</p>
          </div>
          <TestList tests={room.tests} currentIndex={-1} />
        </div>
      </main>
    );
  } else if (allDone) {
    body = <main className="flex-1 overflow-y-auto"><RoomSummary tests={room.tests} results={participant.results} name={participant.name} /></main>;
  } else if (waiting) {
    body = (
      <main className="flex flex-1 flex-col items-center overflow-y-auto px-4 py-10">
        <LateJoinScreen tests={room.tests} index={step} name={participant.name} />
      </main>
    );
  } else if (onBreak) {
    body = (
      <main className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        <TestIndicator tests={room.tests} currentIndex={step} className="mx-auto shrink-0 px-4 pt-3" />
        <BreakScreen
          key={attemptKey}
          tests={room.tests}
          index={step}
          startedAt={room.pacing === "host" ? room.stepStartedAt : participant.stepStartedAt}
          pausedAt={room.status === "paused" ? room.pausedAt : undefined}
          paused={room.status === "paused"}
          onExpire={room.pacing === "participant" && !leaving ? () => void advance(false) : undefined}
        />
      </main>
    );
  } else if (splashStep !== null) {
    body = <main className="flex flex-1 items-start justify-center overflow-y-auto"><UpNextSplash tests={room.tests} nextIndex={splashStep} onContinue={continueFromSplash} /></main>;
  } else {
    body = (
      <main className="flex min-h-0 flex-1 flex-col">
        <TestIndicator tests={room.tests} currentIndex={step}
          className={`mx-auto shrink-0 px-4 pt-3 transition-opacity duration-300 ${isTyping ? "opacity-40" : ""}`} />
        <div className="relative min-h-0 flex-1">
          <TypingPractice
            key={attemptKey}
            connectMode
            fitToParentHeight
            lockedSettings={lockedSettings}
            isTestActive={isRunning && !leaving}
            forceFinish={testEnded}
            roomThemeStyle={themeStyle}
            initialAttempt={participant.targetText ? {
              typedText: participant.typedText ?? "",
              targetText: participant.targetText,
              elapsedMs: participant.stats.timeElapsed,
              isFinished: participant.stats.isFinished,
            } : undefined}
            onStatsUpdate={progress.report}
            onTypingStateChange={setIsTyping}
            connectResultsActions={resultsActions}
          />
          {room.status === "paused" && (
            <div role="status" className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 bg-background/80 px-4 text-center backdrop-blur-sm">
              <PauseCircleIcon className="size-10 text-primary" weight="regular" aria-hidden="true" />
              <p className="text-xl font-semibold">Paused by the host</p>
              <p className="text-sm text-muted-foreground">Your progress is kept. Typing resumes when the host continues.</p>
            </div>
          )}
        </div>
      </main>
    );
  }

  return (
    <RoomPage style={themeStyle} themeMode={connectThemeMode(roomTheme)}>
      <RoomTopBar roomName={room.name} participantName={participant.name} avatarUrl={participant.avatarUrl} dimmed={isTyping && !onBreak && !waiting && room.status !== "lobby" && splashStep === null && !allDone}
        leaving={leaving} reconnecting={reconnecting} onLeave={onLeave} />
      {leaveError && <p role="alert" className="shrink-0 px-4 py-2 text-center text-sm text-destructive">{leaveError}</p>}
      {body}
    </RoomPage>
  );
}
