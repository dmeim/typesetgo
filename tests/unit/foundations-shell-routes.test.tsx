import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { appRoutes } from "@/components/layout/app-routes";

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe("route recovery", () => {
  it("renders an accessible unknown-route recovery instead of an empty screen", async () => {
    const router = createMemoryRouter(appRoutes, { initialEntries: ["/this-page-does-not-exist"] });
    render(<RouterProvider router={router} />);
    const title = await screen.findByRole("heading", { name: "Page not found" });
    expect(title).toHaveFocus();
    expect(screen.getByRole("link", { name: "Back to practice" })).toHaveAttribute("href", "/");
  });

  it("recovers from feature render failures and navigates home", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const router = createMemoryRouter([{ ...appRoutes[0], children: [
      { path: "/", Component: () => <h1>Practice ready</h1> },
      { path: "/broken", Component: () => { throw new Error("Feature failed"); } },
    ] }], { initialEntries: ["/broken"] });
    render(<RouterProvider router={router} />);
    expect(await screen.findByRole("heading", { name: "This page couldn’t load" })).toHaveFocus();
    expect(screen.getByRole("button", { name: "Reload page" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("link", { name: "Back to practice" }));
    expect(await screen.findByRole("heading", { name: "Practice ready" })).toBeInTheDocument();
  });

  it("shows a loading state and catches a failed route chunk", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    let rejectChunk!: (error: Error) => void;
    const router = createMemoryRouter([{ ...appRoutes[0], children: [
      { path: "/lazy", lazy: () => new Promise((_, reject) => { rejectChunk = reject; }) },
    ] }], { initialEntries: ["/lazy"] });
    render(<RouterProvider router={router} />);
    expect(screen.getByRole("status")).toHaveTextContent("Loading TypeSetGo");
    rejectChunk(new Error("Chunk unavailable"));
    expect(await screen.findByRole("heading", { name: "This page couldn’t load" })).toBeInTheDocument();
  });
});
