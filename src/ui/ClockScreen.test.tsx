import { render, screen } from "@testing-library/react-native";
import { Dimensions, StyleSheet } from "react-native";

import type { LiveClockScreenModel } from "../application/liveClock";
import { ClockScreen } from "./ClockScreen";

const model: LiveClockScreenModel = {
  mode: "live",
  sampledInstantMs: Date.parse("2026-01-15T12:05:00Z"),
  clocks: [
    {
      id: "local",
      name: "Local",
      canDelete: false,
      calendarDate: "2026-01-15",
      time: "13:05",
      effectiveOffset: "UTC+01:00",
    },
  ],
  emptyGuidance: "Add a timezone to compare times around the world.",
};

describe("Local clock screen", () => {
  beforeEach(() => {
    Dimensions.set({
      window: {
        width: 411,
        height: 914,
        scale: 2.625,
        fontScale: 1.35,
      },
      screen: {
        width: 411,
        height: 914,
        scale: 2.625,
        fontScale: 1.35,
      },
    });
  });

  it("renders the native Local semantics and empty collection guidance", async () => {
    await render(<ClockScreen model={model} />);

    expect(
      screen.getByRole("summary", {
        name: "Local, 13:05, UTC+01:00",
      }),
    ).toBeOnTheScreen();
    expect(
      screen.getByText("Add a timezone to compare times around the world."),
    ).toBeOnTheScreen();
    expect(screen.queryByText(/seconds?/i)).not.toBeOnTheScreen();
    expect(screen.queryByText(/delete|edit/i)).not.toBeOnTheScreen();
    expect(screen.queryByRole("button")).not.toBeOnTheScreen();
  });

  it("fits the 411×914dp target viewport with a surface larger than 48dp", async () => {
    await render(<ClockScreen model={model} />);

    const content = screen.getByTestId("clock-content");
    const localSurface = screen.getByTestId("local-clock");
    expect(StyleSheet.flatten(content.props.style)).toMatchObject({
      maxWidth: 371,
      minHeight: 866,
    });
    expect(StyleSheet.flatten(localSurface.props.style)).toMatchObject({
      minHeight: 96,
    });
  });
});
