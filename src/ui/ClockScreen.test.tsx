import { act, fireEvent, render, screen } from "@testing-library/react-native";
import {
  AccessibilityInfo,
  BackHandler,
  Dimensions,
  StyleSheet,
} from "react-native";
import { State } from "react-native-gesture-handler";
import {
  fireGestureHandler,
  getByGestureTestId,
} from "react-native-gesture-handler/jest-utils";

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
  status: { label: "Live", offset: "Now", accessibilityValue: "Live time" },
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
  onOpenDelete: jest.fn(),
  onCancelDelete: jest.fn(),
  onConfirmDelete: jest.fn(),
  onRetryPersistence: jest.fn(),
  onBeginStatusScrub: jest.fn(),
  onUpdateStatusScrub: jest.fn(),
  onEndStatusScrub: jest.fn(),
  onCancelStatusScrub: jest.fn(),
  onAdjustStatus: jest.fn(),
  onBackToLive: jest.fn(),
});

const runAnimationFramesImmediately = () =>
  jest.spyOn(global, "requestAnimationFrame").mockImplementation((callback) => {
    callback(0);
    return 1;
  });

describe("clock collection screen", () => {
  beforeEach(() => {
    revealClockMock.mockClear();
    Dimensions.set({
      window: { width: 411, height: 914, scale: 2.625, fontScale: 1.35 },
      screen: { width: 411, height: 914, scale: 2.625, fontScale: 1.35 },
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
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

  it("renders an adjustable Virtual status with earlier/later mappings and icon Back", async () => {
    const callbacks = actions();
    let backHandler:
      | Parameters<typeof BackHandler.addEventListener>[1]
      | undefined;
    jest.spyOn(BackHandler, "addEventListener").mockImplementation(
      (_event, handler) => {
        backHandler = handler;
        return { remove: jest.fn() };
      },
    );
    await render(
      <ClockScreen
        model={{
          ...emptyModel,
          mode: "virtual",
          sampledInstantMs: Date.parse("2026-01-15T11:50:00Z"),
          status: {
            label: "Virtual time",
            offset: "−0:15",
            offsetMinutes: -15,
            accessibilityValue: "15 minutes earlier, 12:50",
          },
        }}
        {...callbacks}
      />,
    );

    const status = screen.getByRole("adjustable", {
      name: "Adjust comparison time",
    });
    expect(screen.getAllByRole("adjustable")).toHaveLength(1);
    expect(status).toHaveAccessibilityValue({
      text: "15 minutes earlier, 12:50",
    });
    expect(screen.getByTestId("clock-screen")).toHaveProp(
      "accessibilityLabel",
      "Virtual time screen",
    );
    expect(
      screen.getByText("Virtual time", { includeHiddenElements: true }),
    ).toBeOnTheScreen();
    expect(
      screen.getByText("−0:15", { includeHiddenElements: true }),
    ).toBeOnTheScreen();
    expect(screen.queryByText("Back")).not.toBeOnTheScreen();
    expect(screen.queryByText(/15-minute|24h|calendar|range|precision/i)).not.toBeOnTheScreen();

    await fireEvent(status, "accessibilityAction", {
      nativeEvent: { actionName: "decrement" },
    });
    await fireEvent(status, "accessibilityAction", {
      nativeEvent: { actionName: "increment" },
    });
    await fireEvent(status, "keyDown", { nativeEvent: { key: "ArrowRight" } });
    await fireEvent(status, "keyDown", { nativeEvent: { key: "ArrowLeft" } });
    expect(callbacks.onAdjustStatus.mock.calls).toEqual([
      ["earlier"],
      ["later"],
      ["earlier"],
      ["later"],
    ]);

    const back = screen.getByRole("button", { name: "Back" });
    expect(back).toHaveProp("accessibilityHint", "Return to current time");
    expect(StyleSheet.flatten(back.props.style)).toMatchObject({
      minWidth: 48,
      minHeight: 48,
    });
    await fireEvent.press(back);
    expect(callbacks.onBackToLive).toHaveBeenCalledTimes(1);
    expect(
      backHandler?.({ type: "hardwareBackPress", timeStamp: 0 }),
    ).toBe(true);
    expect(callbacks.onBackToLive).toHaveBeenCalledTimes(2);
  });

  it("forwards accepted native status-pan travel from gesture start through completion", async () => {
    const callbacks = actions();
    await render(<ClockScreen model={emptyModel} {...callbacks} />);

    await act(async () => {
      fireGestureHandler(getByGestureTestId("status-scrub-gesture"), [
        { state: State.BEGAN, translationX: 0, translationY: 0 },
        { state: State.ACTIVE, translationX: 9, translationY: 1 },
        { state: State.ACTIVE, translationX: 18, translationY: 1 },
        { state: State.END, translationX: 18, translationY: 1 },
      ]);
    });

    expect(callbacks.onBeginStatusScrub).toHaveBeenCalledTimes(1);
    expect(callbacks.onUpdateStatusScrub.mock.calls).toEqual([[-1], [-2]]);
    expect(callbacks.onEndStatusScrub).toHaveBeenCalledTimes(1);
    expect(callbacks.onCancelStatusScrub).not.toHaveBeenCalled();

    await act(async () => {
      fireGestureHandler(getByGestureTestId("status-scrub-gesture"), [
        { state: State.BEGAN, translationX: 0, translationY: 0 },
        { state: State.ACTIVE, translationX: -9, translationY: 1 },
        { state: State.CANCELLED, translationX: -9, translationY: 1 },
      ]);
    });
    expect(callbacks.onCancelStatusScrub).toHaveBeenCalledTimes(1);
  });

  it("locks the dominant axis after platform-slop activation", async () => {
    const callbacks = actions();
    await render(<ClockScreen model={emptyModel} {...callbacks} />);
    const gesture = getByGestureTestId("status-scrub-gesture");

    await act(async () => {
      gesture.handlers.onStart?.({ translationX: 12, translationY: 10 } as never);
    });
    expect(screen.getByTestId("clock-scroll")).toHaveProp("scrollEnabled", false);
    await act(async () => {
      gesture.handlers.onFinalize?.({} as never, true);
    });
    expect(screen.getByTestId("clock-scroll")).toHaveProp("scrollEnabled", true);

    callbacks.onBeginStatusScrub.mockClear();
    callbacks.onUpdateStatusScrub.mockClear();
    await act(async () => {
      fireGestureHandler(gesture, [
        { state: State.BEGAN, translationX: 0, translationY: 0 },
        { state: State.ACTIVE, translationX: 12, translationY: 10 },
        { state: State.END, translationX: 12, translationY: 16 },
      ]);
    });
    expect(callbacks.onBeginStatusScrub).toHaveBeenCalledTimes(1);
    expect(callbacks.onUpdateStatusScrub).toHaveBeenCalledWith(-1);
    expect(callbacks.onEndStatusScrub).toHaveBeenCalledTimes(1);

    callbacks.onBeginStatusScrub.mockClear();
    callbacks.onUpdateStatusScrub.mockClear();
    callbacks.onEndStatusScrub.mockClear();
    await act(async () => {
      fireGestureHandler(gesture, [
        { state: State.BEGAN, translationX: 0, translationY: 0 },
        { state: State.ACTIVE, translationX: 10, translationY: 12 },
        { state: State.END, translationX: 18, translationY: 12 },
      ]);
    });
    expect(screen.getByTestId("clock-scroll")).toHaveProp("scrollEnabled", true);
    expect(callbacks.onBeginStatusScrub).not.toHaveBeenCalled();
    expect(callbacks.onUpdateStatusScrub).not.toHaveBeenCalled();
    expect(callbacks.onEndStatusScrub).not.toHaveBeenCalled();
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
    runAnimationFramesImmediately();
    const model: LiveClockScreenModel = {
      ...emptyModel,
      clocks: [
        localClock,
        {
          id: "added",
          kind: "city",
          name: "New York",
          countryName: "United States",
          canDelete: true,
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
  });

  it("renders selected city time, offset, day difference, and an accessible delete action", async () => {
    const callbacks = actions();
    await render(
      <ClockScreen
        model={{
          mode: "live",
          status: {
            label: "Live",
            offset: "Now",
            accessibilityValue: "Live time",
          },
          isReady: true,
          sampledInstantMs: emptyModel.sampledInstantMs,
          clocks: [
            {
              id: "kiritimati",
              kind: "city",
              name: "Kiritimati",
              countryName: "Kiribati",
              canDelete: true,
              calendarDate: "2026-01-16",
              time: "00:30",
              effectiveOffset: "UTC+14:00",
              dayDifference: "+1",
            },
            localClock,
          ],
        }}
        {...callbacks}
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
    const remove = screen.getByRole("button", { name: "Delete Kiritimati" });
    expect(StyleSheet.flatten(remove.props.style)).toMatchObject({
      minWidth: 48,
      minHeight: 48,
    });
    expect(screen.getByText("×")).toBeOnTheScreen();
    await fireEvent.press(remove);
    expect(callbacks.onOpenDelete).toHaveBeenCalledWith("kiritimati");
    expect(screen.queryByRole("button", { name: "Delete Local" })).not.toBeOnTheScreen();
    expect(screen.queryByText(/edit/i)).not.toBeOnTheScreen();
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
              canDelete: true,
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

  it("keeps Add visible and disabled with the exact capacity explanation", async () => {
    await render(
      <ClockScreen
        model={{
          ...emptyModel,
          addTimezoneUnavailableReason: "Maximum of 24 timezones reached",
        }}
        {...actions()}
      />,
    );

    expect(screen.getByRole("button", { name: "Add timezone" })).toBeDisabled();
    expect(screen.getByText("Maximum of 24 timezones reached")).toBeOnTheScreen();
  });

  it("renders load and write failures as accessible retry actions", async () => {
    const callbacks = actions();
    const view = await render(
      <ClockScreen
        model={{
          ...emptyModel,
          isReady: false,
          persistenceError: {
            operation: "load",
            message: "Couldn’t load your timezones.",
            retryLabel: "Retry",
          },
        }}
        {...callbacks}
      />,
    );
    expect(
      screen.getByRole("alert", { name: "Couldn’t load your timezones." }),
    ).toHaveProp("accessibilityLiveRegion", "polite");
    await fireEvent.press(screen.getByRole("button", { name: "Retry" }));
    expect(callbacks.onRetryPersistence).toHaveBeenCalledTimes(1);

    await view.rerender(
      <ClockScreen
        model={{
          ...emptyModel,
          customForm: {
            mode: "edit",
            name: "Office",
            offsetMinutes: 0,
            offsetOptions: [0],
            isSaving: false,
          },
          persistenceError: {
            operation: "write",
            message: "Couldn’t save changes.",
            retryLabel: "Retry",
          },
        }}
        {...callbacks}
      />,
    );
    expect(
      screen.getByRole("alert", { name: "Couldn’t save changes." }),
    ).toBeOnTheScreen();
  });

  it("shows a named irreversible modal whose Cancel and Android Back dismiss without deleting", async () => {
    const callbacks = actions();
    const view = await render(
      <ClockScreen
        model={{
          ...emptyModel,
          clocks: [
            localClock,
            {
              id: "new-york",
              kind: "city",
              name: "New York",
              countryName: "United States",
              canDelete: true,
              calendarDate: "2026-01-15",
              time: "07:05",
              effectiveOffset: "UTC−05:00",
            },
          ],
        }}
        {...callbacks}
      />,
    );

    await view.rerender(
      <ClockScreen
        model={{
          ...emptyModel,
          deleteConfirmation: {
            selectionId: "new-york",
            name: "New York",
            isDeleting: false,
          },
        }}
        {...callbacks}
      />,
    );

    expect(screen.getByText("Delete New York?")).toBeOnTheScreen();
    expect(
      screen.getByText("New York will be removed. This cannot be undone."),
    ).toBeOnTheScreen();
    expect(screen.queryByText(/undo/i)).toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: "Undo" })).not.toBeOnTheScreen();

    await fireEvent.press(screen.getByRole("button", { name: "Cancel deletion" }));
    expect(callbacks.onCancelDelete).toHaveBeenCalledTimes(1);

    await fireEvent(screen.getByTestId("delete-confirmation"), "requestClose");
    expect(callbacks.onCancelDelete).toHaveBeenCalledTimes(2);

    await fireEvent.press(screen.getByRole("button", { name: "Delete New York" }));
    expect(callbacks.onConfirmDelete).toHaveBeenCalledTimes(1);

    await view.rerender(
      <ClockScreen
        model={{
          ...emptyModel,
          deleteConfirmation: {
            selectionId: "new-york",
            name: "New York",
            isDeleting: true,
          },
        }}
        {...callbacks}
      />,
    );
    expect(screen.getByRole("button", { name: "Cancel deletion" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Delete New York" })).toBeDisabled();
  });

  it("announces one completed removal and focuses a requested clock without scrolling", async () => {
    const announce = jest
      .spyOn(AccessibilityInfo, "announceForAccessibility")
      .mockImplementation(() => undefined);
    runAnimationFramesImmediately();
    const clockRequest = {
      clockId: "local",
      sequence: 2,
      scrollIntoView: false,
      focus: true as const,
    };
    const announcement = { sequence: 1, message: "New York removed." };
    const model: LiveClockScreenModel = {
      ...emptyModel,
      clockRequest,
      announcement,
    };
    const view = await render(<ClockScreen model={model} {...actions()} />);

    expect(announce).toHaveBeenCalledTimes(1);
    expect(announce).toHaveBeenCalledWith("New York removed.");
    expect(revealClockMock).toHaveBeenCalledWith(
      expect.objectContaining({ scrollIntoView: false, focus: true }),
    );

    await view.rerender(
      <ClockScreen
        model={{ ...model, sampledInstantMs: model.sampledInstantMs + 60_000 }}
        {...actions()}
      />,
    );
    expect(announce).toHaveBeenCalledTimes(1);
  });

  it("can focus Add timezone as the final deletion fallback", async () => {
    runAnimationFramesImmediately();
    await render(
      <ClockScreen
        model={{
          ...emptyModel,
          clocks: [],
          clockRequest: {
            addTimezone: true,
            sequence: 3,
            scrollIntoView: false,
            focus: true,
          },
        }}
        {...actions()}
      />,
    );

    expect(revealClockMock).toHaveBeenCalledWith(
      expect.objectContaining({
        clockView: expect.anything(),
        scrollIntoView: false,
        focus: true,
      }),
    );
  });
});
