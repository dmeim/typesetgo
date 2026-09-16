import { act, cleanup, render, screen } from "@testing-library/react";
import { StrictMode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Carousel, CarouselNext, CarouselPrevious, useCarousel } from "@/components/ui/carousel";

type Listener = (api: { canScrollPrev: () => boolean; canScrollNext: () => boolean }) => void;

function createCarouselApi(previous = false, next = true) {
  const listeners = { select: new Set<Listener>(), reInit: new Set<Listener>() };
  const api = {
    canScrollPrev: () => previous,
    canScrollNext: () => next,
    scrollPrev: vi.fn(),
    scrollNext: vi.fn(),
    on: (event: keyof typeof listeners, listener: Listener) => listeners[event].add(listener),
    off: (event: keyof typeof listeners, listener: Listener) => listeners[event].delete(listener),
    update(event: keyof typeof listeners, canPrevious: boolean, canNext: boolean): void {
      previous = canPrevious;
      next = canNext;
      listeners[event].forEach((listener) => listener(api));
    },
    listeners,
  };
  return api;
}

const embla = vi.hoisted(() => ({
  api: undefined as ReturnType<typeof createCarouselApi> | undefined,
  ref: vi.fn(),
}));
vi.mock("embla-carousel-react", () => ({ default: () => [embla.ref, embla.api] }));

afterEach(() => { cleanup(); embla.api = undefined; });

function Controls() {
  const { canScrollPrev, canScrollNext } = useCarousel();
  return <><output aria-label="Navigation state">{`${canScrollPrev}/${canScrollNext}`}</output><CarouselPrevious /><CarouselNext /></>;
}

describe("carousel external navigation state", () => {
  it("tracks API availability and both selection and reinitialization events", () => {
    const { rerender } = render(<Carousel><Controls /></Carousel>);
    expect(screen.getByRole("button", { name: "Previous slide" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Next slide" })).toBeDisabled();

    const api = createCarouselApi(false, true);
    embla.api = api;
    rerender(<Carousel><Controls /></Carousel>);
    expect(screen.getByLabelText("Navigation state")).toHaveTextContent("false/true");
    expect(screen.getByRole("button", { name: "Next slide" })).toBeEnabled();

    act(() => api.update("select", true, false));
    expect(screen.getByRole("button", { name: "Previous slide" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Next slide" })).toBeDisabled();
    act(() => api.update("reInit", false, true));
    expect(screen.getByLabelText("Navigation state")).toHaveTextContent("false/true");
  });

  it("releases both event subscriptions on API replacement and unmount", () => {
    const first = createCarouselApi();
    const second = createCarouselApi(true, false);
    embla.api = first;
    const { rerender, unmount } = render(<Carousel><Controls /></Carousel>);
    expect(first.listeners.select.size).toBe(1);
    expect(first.listeners.reInit.size).toBe(1);

    embla.api = second;
    rerender(<Carousel><Controls /></Carousel>);
    expect(first.listeners.select.size).toBe(0);
    expect(first.listeners.reInit.size).toBe(0);
    expect(screen.getByLabelText("Navigation state")).toHaveTextContent("true/false");
    unmount();
    expect(second.listeners.select.size).toBe(0);
    expect(second.listeners.reInit.size).toBe(0);
  });

  it("keeps one subscription per event through Strict Mode effect replay", () => {
    const api = createCarouselApi();
    embla.api = api;
    const { unmount } = render(<StrictMode><Carousel><Controls /></Carousel></StrictMode>);
    expect(api.listeners.select.size).toBe(1);
    expect(api.listeners.reInit.size).toBe(1);
    unmount();
    expect(api.listeners.select.size).toBe(0);
    expect(api.listeners.reInit.size).toBe(0);
  });
});
