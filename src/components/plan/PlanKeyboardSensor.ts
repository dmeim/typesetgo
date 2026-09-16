import { KeyboardSensor, type KeyboardSensorProps } from "@dnd-kit/core";

/** Preserve cancellation while dnd-kit defers its document listener registration. */
export class PlanKeyboardSensor {
  static activators = KeyboardSensor.activators;
  autoScrollEnabled = false;

  constructor(props: KeyboardSensorProps) {
    const document = props.activeNode.node.current?.ownerDocument;
    if (!document) throw new Error("A plan drag requires a mounted step");
    const cancellationCodes = props.options.keyboardCodes?.cancel ?? ["Escape"];
    let active = true;
    let pending: KeyboardEvent | undefined;
    let drain: ReturnType<typeof setTimeout> | undefined;
    const captureCancellation = (event: KeyboardEvent) => {
      if (!cancellationCodes.includes(event.code) || event === props.event) return;
      // The sensor may attach between its task and ours. Prevent double handling.
      event.preventDefault();
      event.stopImmediatePropagation();
      pending = event;
    };
    const release = () => {
      document.removeEventListener("keydown", captureCancellation, true);
      clearTimeout(drain);
      drain = undefined;
      pending = undefined;
    };
    const finish = (callback: () => void) => {
      if (!active) return;
      active = false;
      release();
      callback();
    };
    document.addEventListener("keydown", captureCancellation, true);
    try {
      new KeyboardSensor({
        ...props,
        onMove: (coordinates) => { if (active) props.onMove(coordinates); },
        onCancel: () => finish(props.onCancel),
        onEnd: () => finish(props.onEnd),
      });
    } catch (error) {
      release();
      throw error;
    }
    // KeyboardSensor queued its registration during construction. This task is
    // ordered after that registration; it is a readiness boundary, not a delay.
    drain = setTimeout(() => {
      const cancellation = pending;
      release();
      if (!active || !cancellation) return;
      document.dispatchEvent(new KeyboardEvent("keydown", {
        key: cancellation.key,
        code: cancellation.code,
        bubbles: true,
        cancelable: true,
      }));
    });
  }
}
