import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import TypingArea from "@/components/typing/TypingArea";
import PracticeText from "@/components/typing/PracticeText";
import { getNextTypingKey, hasCompletedPrompt, getInputPosition } from "@/components/typing/practice-input";
import { createPracticeClock } from "@/components/typing/usePracticeClock";
import theme from "../../public/themes/typesetgo.json";
import { createRef } from "react";

vi.mock("@/hooks/useTheme", () => ({ useTheme: () => ({ colors: theme.variants.default.dark }) }));
beforeEach(() => {
  vi.stubGlobal("ResizeObserver", class { observe() {} disconnect() {} });
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.useRealTimers(); });

describe("word-aligned practice input", () => {
  it("finishes only after reaching the final word despite earlier extra or skipped characters", () => {
    expect(hasCompletedPrompt("cattt d", "cat dog")).toBe(false);
    expect(hasCompletedPrompt("c dog", "cat dog")).toBe(true);
    expect(hasCompletedPrompt("cattt dog", "cat dog")).toBe(true);
    expect(hasCompletedPrompt("cat d ", "cat dog")).toBe(true);
    expect(hasCompletedPrompt("cat ", "cat dog")).toBe(false);
    expect(hasCompletedPrompt("", "")).toBe(false);
  });
  it("guides the current word independently from mistakes in submitted words", () => {
    expect(getNextTypingKey("c dog", "cat dog!")).toBe("!");
    expect(getNextTypingKey("cattt", "cat dog")).toBe("Backspace");
    expect(getNextTypingKey("cat ", "cat dog")).toBe("d");
    expect(getNextTypingKey("c dog", "cat dog", true)).toBe("Backspace");
    expect(getInputPosition("c d", "cat dog").referencePosition).toBe(5);
  });
  it("uses accumulated active elapsed time across pauses", () => {
    let now = 100;
    const clock = createPracticeClock(500, () => now);
    clock.start(); now += 900;
    expect(clock.pause()).toBe(1400);
    now += 8000;
    expect(clock.read()).toBe(1400);
    clock.start(); now += 600;
    expect(clock.read()).toBe(2000);
    clock.reset();
    expect(clock.read()).toBe(0);
  });
  it("renders the caret after extras and renders ghost positions on spaces", () => {
    const ref = createRef<HTMLSpanElement>();
    const { container, rerender } = render(<PracticeText targetText="cat dog" typedText="cattt" caretRef={ref} ghostPosition={3} />);
    expect(container.querySelectorAll("[data-typing-caret]")).toHaveLength(1);
    expect(container.querySelectorAll("[data-ghost-caret]")).toHaveLength(1);
    expect(ref.current?.parentElement?.previousSibling?.textContent).toBe("t");
    rerender(<PracticeText targetText="cat dog" typedText="cat dog " caretRef={ref} />);
    expect(container.querySelectorAll("[data-typing-caret]")).toHaveLength(1);
  });
});

describe("TypingArea contracts", () => {
  it("restores input and elapsed time once without re-emitting for callback identity", () => {
    const initialCallback = vi.fn();
    const { rerender } = render(<TypingArea targetText="cat dog" initialInput="cat " initialElapsedMs={1400}
      onProgress={initialCallback} autoFocus={false} />);
    expect(initialCallback).toHaveBeenLastCalledWith(expect.objectContaining({ typedText: "cat ", elapsedMs: 1400 }));
    const replacementCallback = vi.fn();
    rerender(<TypingArea targetText="cat dog" initialInput="wrong" initialElapsedMs={50}
      onProgress={replacementCallback} autoFocus={false} />);
    expect(screen.getByRole("textbox")).toHaveValue("cat ");
    expect(replacementCallback).not.toHaveBeenCalled();
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "cat d" } });
    expect(replacementCallback).toHaveBeenLastCalledWith(expect.objectContaining({ typedText: "cat d" }));
  });
  it("preserves initialTypedText compatibility and does not finish an overtyped earlier word", () => {
    const onFinish = vi.fn();
    render(<TypingArea targetText="cat dog" initialTypedText="cattt" onFinish={onFinish} />);
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "cattt d" } });
    expect(onFinish).not.toHaveBeenCalled();
    fireEvent.change(input, { target: { value: "cattt dog" } });
    expect(onFinish).toHaveBeenCalledTimes(1);
  });
  it("permits normal Tab and ShiftTab but keeps native selection at the painted end", () => {
    render(<TypingArea targetText="cat dog" />);
    const input = screen.getByRole("textbox") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "ca" } });
    expect(fireEvent.keyDown(input, { key: "Tab" })).toBe(true);
    expect(fireEvent.keyDown(input, { key: "Tab", shiftKey: true })).toBe(true);
    input.setSelectionRange(0, 0);
    fireEvent.select(input);
    expect(input.selectionStart).toBe(2);
    expect(fireEvent.keyDown(input, { key: "Home" })).toBe(false);
    expect(input.selectionStart).toBe(2);
  });
  it("does not emit progress or accrue time while inactive", () => {
    vi.useFakeTimers();
    const onProgress = vi.fn();
    const { rerender } = render(<TypingArea targetText="cat dog" initialInput="c" initialElapsedMs={600}
      isActive={false} onProgress={onProgress} autoFocus={false} />);
    act(() => vi.advanceTimersByTime(3000));
    expect(onProgress).not.toHaveBeenCalled();
    rerender(<TypingArea targetText="cat dog" initialInput="c" initialElapsedMs={600}
      isActive onProgress={onProgress} autoFocus={false} />);
    expect(onProgress).toHaveBeenLastCalledWith(expect.objectContaining({ elapsedMs: 600 }));
  });
  it("preserves IME drafts until composition ends and completes only once", () => {
    const onFinish = vi.fn();
    render(<TypingArea targetText="猫" onFinish={onFinish} />);
    const input = screen.getByRole("textbox");
    fireEvent.compositionStart(input);
    fireEvent.change(input, { target: { value: "猫" } });
    expect(input).toHaveValue("猫");
    expect(onFinish).not.toHaveBeenCalled();
    fireEvent.compositionEnd(input);
    expect(input).toHaveValue("猫");
    expect(onFinish).toHaveBeenCalledTimes(1);
  });
  it("does not finish a restored completed run while inactive", () => {
    const onFinish = vi.fn();
    render(<TypingArea targetText="cat" initialInput="cat" isActive={false} onFinish={onFinish} />);
    expect(onFinish).not.toHaveBeenCalled();
  });
  it("does not report the previous input against a changed target", () => {
    const onProgress = vi.fn();
    const { rerender } = render(<TypingArea targetText="cat dog" initialInput="cat " onProgress={onProgress} />);
    onProgress.mockClear();
    rerender(<TypingArea targetText="bat" initialInput="cat " onProgress={onProgress} />);
    expect(onProgress.mock.calls.every(([stats]) => stats.typedText === "")).toBe(true);
  });
  it("requires race mistakes to be corrected before further input", () => {
    render(<TypingArea targetText="cat dog" mode="race" />);
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "cx" } });
    fireEvent.change(input, { target: { value: "cxt" } });
    expect(input).toHaveValue("cx");
    fireEvent.change(input, { target: { value: "c" } });
    fireEvent.change(input, { target: { value: "ca" } });
    expect(input).toHaveValue("ca");
  });
});
