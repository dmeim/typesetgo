import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { getDefaultTheme } from "@/lib/themes";
import { themeCSSVariables } from "@/lib/theme-css";
import { connectThemeStyle } from "@/lib/connect-settings";
import { RoomPage } from "@/components/connect/room/RoomChrome";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

afterEach(cleanup);

const colors = getDefaultTheme().dark;

describe("scoped Connect room theme", () => {
  it("carries every theme variable the page theme sets, plus its color scheme", () => {
    const variables = themeCSSVariables(colors);
    expect(variables).toMatchObject({
      "--background": expect.any(String),
      "--success": expect.any(String),
      "--secondary-emphasis": expect.any(String),
      "--theme-border-subtle": colors.border.subtle,
      "--theme-bg-base": colors.bg.base,
      "--theme-typing-cursor": expect.any(String),
    });
    expect(connectThemeStyle({ colors, mode: "light" })).toEqual({ ...variables, colorScheme: "light" });
    expect(connectThemeStyle(null)).toEqual({});
  });

  it("scopes light/dark to the room and mounts overlays inside it", () => {
    render(
      <RoomPage themeMode="light">
        <Popover open>
          <PopoverTrigger>Words</PopoverTrigger>
          <PopoverContent>Correct words</PopoverContent>
        </Popover>
      </RoomPage>,
    );
    const room = screen.getByTestId("connect-room");
    expect(room).toHaveClass("light");
    expect(room).toHaveAttribute("data-theme-mode", "light");
    expect(room).toContainElement(screen.getByText("Correct words"));
  });

  it("follows the participant's theme when the host sets none", () => {
    render(<RoomPage><p>Hi</p></RoomPage>);
    const room = screen.getByTestId("connect-room");
    expect(room).not.toHaveClass("light");
    expect(room).not.toHaveClass("dark");
    expect(room).not.toHaveAttribute("data-theme-mode");
  });
});
