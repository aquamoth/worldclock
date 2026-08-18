import { fireEvent, render, screen } from "@testing-library/react-native";
import {
  BackHandler,
  Dimensions,
  StyleSheet,
} from "react-native";

import type { LiveClockScreenModel } from "../application/liveClock";
import { ClockScreen } from "./ClockScreen";
import { revealClock } from "./nativeClockReveal";

jest.mock("./nativeClockReveal", () => ({ revealClock: jest.fn() }));

const revealClockMock = jest.mocked(revealClock);

const localClock = {
  id: "local" as const,
  kind: "local" as const,
  name: "Local" as const,
  canDelete: false as const,
  calendarDate: "2026-01-15",
  time: "13:05",
  effectiveOffset: "UTC+01:00",
};

const emptyModel: LiveClockScreenModel = {
  mode: "live",
  isReady: true,
  sampledInstantMs: Date.parse("2026-01-15T12:05:00Z"),
  clocks: [localClock],
  emptyGuidance: "Add a timezone to compare times around the world.",
};

const actions = () => ({
  onOpenSelector: jest.fn(),
  onSearchSelector: jest.fn(),
  onCancelSelector: jest.fn(),
  onAddCity: jest.fn(),
  onOpenCustomCreator: jest.fn(),
  onOpenCustomEditor: jest.fn(),
  onUpdateCustomName: jest.fn(),
  onSelectCustomOffset: jest.fn(),
  onCancelCustomForm: jest.fn(),
  onSaveCustom: jest.fn(),
});

describe("clock collection screen", () => {
  beforeEach(() => {
    Dimensions.set({
      window: { width: 411, height: 914, scale: 2.625, fontScale: 1.35 },
      screen: { width: 411, height: 914, scale: 2.625, fontScale: 1.35 },
    });
  });

  it("renders Local, empty guidance, and a 48dp Add timezone action", async () => {
    const callbacks = actions();
    await render(<ClockScreen model={emptyModel} {...callbacks} />);

    expect(
      screen.getByRole("summary", { name: "Local, 13:05, UTC+01:00" }),
    ).toBeOnTheScreen();
    expect(
      screen.getByText("Add a timezone to compare times around the world."),
    ).toBeOnTheScreen();
    const add = screen.getByRole("button", { name: "Add timezone" });
    expect(StyleSheet.flatten(add.props.style)).toMatchObject({ minHeight: 48 });

    await fireEvent.press(add);
    expect(callbacks.onOpenSelector).toHaveBeenCalledTimes(1);
    expect(screen.queryByText(/seconds?|delete|edit/i)).not.toBeOnTheScreen();
  });

  it("searches, adds available cities, marks selected cities unavailable, and cancels", async () => {
    const callbacks = actions();
    const selectorModel: LiveClockScreenModel = {
      ...emptyModel,
      selector: {
        query: "new york",
        isAdding: false,
        results: [
          {
            catalogId: "city-new-york",
            city: "New York",
            countryName: "United States",
            ianaId: "America/New_York",
            available: true,
          },
          {
            catalogId: "city-detroit",
            city: "Detroit",
            countryName: "United States",
            ianaId: "America/New_York",
            available: false,
          },
        ],
      },
    };
    await render(<ClockScreen model={selectorModel} {...callbacks} />);

    const search = screen.getByLabelText("Search timezones");
    expect(search.props.value).toBe("new york");
    await fireEvent.changeText(search, "york new");
    expect(callbacks.onSearchSelector).toHaveBeenCalledWith("york new");

    await fireEvent.press(
      screen.getByRole("button", { name: "Add New York, United States" }),
    );
    expect(callbacks.onAddCity).toHaveBeenCalledWith("city-new-york");
    expect(
      screen.getByRole("button", {
        name: "Detroit, United States, already added",
        disabled: true,
      }),
    ).toBeDisabled();

    await fireEvent.press(screen.getByRole("button", { name: "Cancel" }));
    expect(callbacks.onCancelSelector).toHaveBeenCalledTimes(1);
  });

  it("makes selector cancellation unavailable while an add is committing", async () => {
    const selectorModel: LiveClockScreenModel = {
      ...emptyModel,
      selector: { query: "", isAdding: true, results: [] },
    };
    await render(<ClockScreen model={selectorModel} {...actions()} />);

    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
  });

  it("dismisses the selector when Android system Back is pressed", async () => {
    const callbacks = actions();
    let backHandler:
      | Parameters<typeof BackHandler.addEventListener>[1]
      | undefined;
    jest.spyOn(BackHandler, "addEventListener").mockImplementation(
      (_eventName, handler) => {
        backHandler = handler;
        return { remove: jest.fn() };
      },
    );
    await render(
      <ClockScreen
        model={{
          ...emptyModel,
          selector: { query: "", isAdding: false, results: [] },
        }}
        {...callbacks}
      />,
    );

    expect(
      backHandler?.({ type: "hardwareBackPress", timeStamp: 0 }),
    ).toBe(true);
    expect(callbacks.onCancelSelector).toHaveBeenCalledTimes(1);
  });

  it("scrolls to and accessibility-focuses the requested added clock", async () => {
    const animationFrame = jest
      .spyOn(global, "requestAnimationFrame")
      .mockImplementation((callback) => {
        callback(0);
        return 1;
      });
    const model: LiveClockScreenModel = {
      ...emptyModel,
      clocks: [
        localClock,
        {
          id: "added",
          kind: "city",
          name: "New York",
          countryName: "United States",
          canDelete: false,
          calendarDate: "2026-01-15",
          time: "07:05",
          effectiveOffset: "UTC−05:00",
        },
      ],
      clockRequest: {
        clockId: "added",
        sequence: 1,
        scrollIntoView: true,
        focus: true,
      },
    };
    const { clockRequest: _clockRequest, ...modelWithoutRequest } = model;
    const view = await render(
      <ClockScreen
        model={modelWithoutRequest}
        {...actions()}
      />,
    );
    await fireEvent(screen.getByTestId("clock-added"), "layout", {
      nativeEvent: { layout: { x: 0, y: 240, width: 371, height: 96 } },
    });
    await view.rerender(<ClockScreen model={model} {...actions()} />);

    expect(revealClockMock).toHaveBeenCalledWith(
      expect.objectContaining({
        position: 240,
        scrollIntoView: true,
        focus: true,
      }),
    );
    animationFrame.mockRestore();
  });

  it("renders selected city time, offset, and nonzero day difference without extra row labels or mutation actions", async () => {
    await render(
      <ClockScreen
        model={{
          mode: "live",
          isReady: true,
          sampledInstantMs: emptyModel.sampledInstantMs,
          clocks: [
            {
              id: "kiritimati",
              kind: "city",
              name: "Kiritimati",
              countryName: "Kiribati",
              canDelete: false,
              calendarDate: "2026-01-16",
              time: "00:30",
              effectiveOffset: "UTC+14:00",
              dayDifference: "+1",
            },
            localClock,
          ],
        }}
        {...actions()}
      />,
    );

    expect(
      screen.getByRole("summary", {
        name: "Kiritimati, 00:30, UTC+14:00, +1 day",
      }),
    ).toBeOnTheScreen();
    expect(screen.queryByText("Kiribati")).not.toBeOnTheScreen();
    expect(
      screen.getByText("+1", { includeHiddenElements: true }),
    ).toBeOnTheScreen();
    expect(screen.queryByText(/delete|edit/i)).not.toBeOnTheScreen();
  });

  it("opens the separate custom path and renders an accessible selected-offset form", async () => {
    const callbacks = actions();
    const view = await render(
      <ClockScreen
        model={{ ...emptyModel, selector: { query: "", isAdding: false, results: [] } }}
        {...callbacks}
      />,
    );
    await fireEvent.press(screen.getByRole("button", { name: "Create custom timezone" }));
    expect(callbacks.onOpenCustomCreator).toHaveBeenCalledTimes(1);

    await view.rerender(
      <ClockScreen
        model={{
          ...emptyModel,
          customForm: {
            mode: "create",
            name: "",
            offsetMinutes: 0,
            offsetOptions: Array.from({ length: 105 }, (_value, index) => -720 + index * 15),
            isSaving: false,
            nameError: "Enter a name.",
          },
        }}
        {...callbacks}
      />,
    );
    const name = screen.getByLabelText("Custom timezone name");
    expect(name.props.multiline).toBe(false);
    await fireEvent.changeText(name, "Nepal office");
    expect(callbacks.onUpdateCustomName).toHaveBeenCalledWith("Nepal office");
    expect(screen.getByText("UTC+00:00")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Increase offset" }));
    expect(callbacks.onSelectCustomOffset).toHaveBeenCalledWith(15);
    expect(screen.getByText("Enter a name.").props).toMatchObject({
      accessibilityRole: "alert",
      accessibilityLiveRegion: "polite",
    });
    await fireEvent.press(screen.getByRole("button", { name: "Save custom timezone" }));
    expect(callbacks.onSaveCustom).toHaveBeenCalledTimes(1);
  });

  it("offers Edit only for custom rows and cancels a custom form with system Back", async () => {
    const callbacks = actions();
    let backHandler: Parameters<typeof BackHandler.addEventListener>[1] | undefined;
    jest.spyOn(BackHandler, "addEventListener").mockImplementation((_event, handler) => {
      backHandler = handler;
      return { remove: jest.fn() };
    });
    const view = await render(
      <ClockScreen
        model={{
          ...emptyModel,
          clocks: [
            localClock,
            {
              id: "custom-1",
              kind: "custom",
              name: "Office",
              canDelete: false,
              canEdit: true,
              calendarDate: "2026-01-15",
              time: "17:50",
              effectiveOffset: "UTC+05:45",
            },
          ],
        }}
        {...callbacks}
      />,
    );
    await fireEvent.press(screen.getByRole("button", { name: "Edit Office" }));
    expect(callbacks.onOpenCustomEditor).toHaveBeenCalledWith("custom-1");
    expect(screen.queryByRole("button", { name: "Edit Local" })).not.toBeOnTheScreen();

    await view.rerender(
      <ClockScreen
        model={{
          ...emptyModel,
          customForm: {
            mode: "edit",
            name: "Office",
            offsetMinutes: 345,
            offsetOptions: [345],
            isSaving: false,
          },
        }}
        {...callbacks}
      />,
    );
    expect(backHandler?.({ type: "hardwareBackPress", timeStamp: 0 })).toBe(true);
    expect(callbacks.onCancelCustomForm).toHaveBeenCalledTimes(1);
  });
});
