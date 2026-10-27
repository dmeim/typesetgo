import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { ThemeContext, type ThemeContextValue } from "@/context/ThemeContext";
import About from "@/pages/About";
import Privacy from "@/pages/Privacy";
import TermsOfService from "@/pages/TermsOfService";

vi.mock("@/components/layout/Header", () => ({ default: () => <header aria-label="Site header" /> }));

// jsdom has no IntersectionObserver; the cards' scroll-in fade only needs it to exist.
vi.stubGlobal("IntersectionObserver", class {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() { return []; }
});

// Existing deep links (/privacy#data-storage) depend on these ids staying put.
const SECTION_IDS: Record<string, string[]> = {
  "/about": [
    "what-is-test-validity", "leaderboard-eligibility", "universal-requirements", "mode-specific-requirements", "why-was-my-test-unverified",
    "note-on-false-positives",
  ],
  "/privacy": [
    "information-we-collect", "how-we-use-your-information", "data-storage", "data-sharing", "cookies-and-tracking", "your-rights",
    "changes-to-this-policy", "contact-us",
  ],
  "/tos": [
    "acceptance-of-terms", "description-of-service", "user-conduct", "intellectual-property", "user-data", "disclaimer-of-warranties",
    "limitation-of-liability", "modifications-to-service", "changes-to-terms", "contact-information",
  ],
};

const scrollIntoView = vi.fn();

beforeEach(() => {
  scrollIntoView.mockClear();
  Element.prototype.scrollIntoView = scrollIntoView;
});
afterEach(cleanup);

function Where() {
  const { pathname, hash } = useLocation();
  return <p data-testid="location">{pathname}{hash}</p>;
}

function view(path: string) {
  return render(
    <ThemeContext.Provider value={{ themeName: "TypeSetGo" } as ThemeContextValue}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/about" element={<About />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/tos" element={<TermsOfService />} />
        </Routes>
        <Where />
      </MemoryRouter>
    </ThemeContext.Provider>,
  );
}

const tabs = () => within(screen.getByRole("navigation", { name: "Info pages" }));

describe("info pages", () => {
  it.each([
    ["/about", "About TypeSetGo", "About", undefined],
    ["/privacy", "Privacy Policy", "Privacy", "Last updated: September 22, 2026"],
    ["/tos", "Terms of Service", "Terms", "Last updated: January 15, 2026"],
  ])("%s has the Dock, its tab marked current, every section and the footer", (path, title, tab, updated) => {
    view(path);
    expect(screen.getByRole("banner", { name: "Site header" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: title })).toBeInTheDocument();
    if (updated) expect(screen.getByText(updated)).toBeInTheDocument();
    else expect(screen.queryByText(/Last updated/)).not.toBeInTheDocument();

    expect(tabs().getAllByRole("link").map((link) => [link.textContent, link.getAttribute("href"), link.getAttribute("aria-current")])).toEqual(
      [["About", "/about"], ["Privacy", "/privacy"], ["Terms", "/tos"]].map(([label, href]) => [label, href, label === tab ? "page" : null]),
    );

    const ids = SECTION_IDS[path];
    const sections = ids.map((id) => document.getElementById(id));
    sections.forEach((section) => {
      expect(section?.tagName).toBe("SECTION");
      expect(within(section!).getByRole("heading", { level: 2 })).toBeInTheDocument();
      expect(within(section!).getByText("In short")).toBeInTheDocument();
    });

    const contents = within(screen.getByRole("navigation", { name: "Sections" })).getAllByRole("link");
    expect(contents.map((link) => link.getAttribute("href"))).toEqual(ids.map((id) => `#${id}`));
    expect(contents.filter((link) => link.getAttribute("aria-current") === "location")).toHaveLength(1);

    const jump = screen.getByRole("combobox", { name: "Jump to a section" });
    expect(within(jump).getAllByRole("option").map((option) => option.getAttribute("value"))).toEqual(ids);

    expect(within(screen.getByRole("contentinfo")).getByRole("link", { name: "What's new" })).toHaveAttribute("href", "/changelog");
  });

  it("switches pages through the tabs and changes the address", () => {
    view("/privacy");
    fireEvent.click(tabs().getByRole("link", { name: "Terms" }));
    expect(screen.getByTestId("location")).toHaveTextContent("/tos");
    expect(screen.getByRole("heading", { level: 1, name: "Terms of Service" })).toBeInTheDocument();
    expect(tabs().getByRole("link", { name: "Terms" })).toHaveAttribute("aria-current", "page");
    expect(tabs().getByRole("link", { name: "Privacy" })).not.toHaveAttribute("aria-current");
  });

  it("keeps the full legal text and the plain-words summaries", () => {
    view("/privacy");
    expect(screen.getByText(/Public profile responses exclude email and authentication identifiers\./)).toBeInTheDocument();
    expect(screen.getByText("Your name, picture, scores and achievements show on profiles and leaderboards. Your email does not.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "project issue tracker" })).toHaveAttribute("href", "https://github.com/dmeim/typesetgo/issues");
  });

  it("scrolls to a deep-linked section once the page renders", () => {
    view("/tos#user-data");
    expect(scrollIntoView).toHaveBeenCalled();
    expect(scrollIntoView.mock.contexts.at(-1)).toBe(document.getElementById("user-data"));
  });

  it("jumps to a section from the phone menu", () => {
    view("/about");
    fireEvent.change(screen.getByRole("combobox", { name: "Jump to a section" }), { target: { value: "universal-requirements" } });
    expect(scrollIntoView.mock.contexts.at(-1)).toBe(document.getElementById("universal-requirements"));
  });
});
