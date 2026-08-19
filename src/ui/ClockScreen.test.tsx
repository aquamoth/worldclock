import { act, fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { useSyncExternalStore } from "react";
import {
  AccessibilityInfo,
  Animated,
  BackHandler,
  Dimensions,
  StyleSheet,
} from "react-native";
import * as ReactNative from "react-native";
import { State } from "react-native-gesture-handler";
import {
  fireGestureHandler,
  getByGestureTestId,
} from "react-native-gesture-handler/jest-utils";

import {
  createLiveClockApplication,
  type LiveClockApplication,
  type LiveClockScreenModel,
} from "../application/liveClock";
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
  wallMinuteOfDay: 13 * 60 + 5,
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
  onBeginRowScrub: jest.fn(),
  onUpdateRowScrub: jest.fn(),
  onEndRowScrub: jest.fn(),
  onCancelRowScrub: jest.fn(),
  onAdjustRow: jest.fn(),
  onFocusClock: jest.fn(),
  onBackToLive: jest.fn(),
});

function ConnectedClockScreen({ application }: { readonly application: LiveClockApplication }) {
  const model = useSyncExternalStore(
    application.subscribe,
    application.getScreen,
    application.getScreen,
  );
  return (
    <ClockScreen
      model={model}
      onOpenSelector={application.openSelector}
      onSearchSelector={application.searchSelector}
      onCancelSelector={application.cancelSelector}
      onAddCity={(catalogId) => { void application.addCity(catalogId); }}
      onOpenCustomCreator={application.openCustomCreator}
      onOpenCustomEditor={application.openCustomEditor}
      onUpdateCustomName={application.updateCustomName}
      onSelectCustomOffset={application.selectCustomOffset}
      onCancelCustomForm={application.cancelCustomForm}
      onSaveCustom={() => { void application.saveCustom(); }}
      onOpenDelete={application.openDelete}
      onCancelDelete={application.cancelDelete}
      onConfirmDelete={() => { void application.confirmDelete(); }}
      onRetryPersistence={() => { void application.retryPersistence(); }}
      onBeginStatusScrub={application.beginStatusScrub}
      onUpdateStatusScrub={application.updateStatusScrub}
      onEndStatusScrub={application.endStatusScrub}
      onCancelStatusScrub={application.cancelStatusScrub}
      onAdjustStatus={application.adjustStatus}
      onBeginRowScrub={application.beginRowScrub}
      onUpdateRowScrub={application.updateRowScrub}
      onEndRowScrub={application.endRowScrub}
      onCancelRowScrub={application.cancelRowScrub}
      onAdjustRow={application.adjustRow}
      onFocusClock={application.reportClockFocus}
      onBackToLive={application.backToLive}
    />
  );
}

const runAnimationFramesImmediately = () =>
  jest.spyOn(global, "requestAnimationFrame").mockImplementation((callback) => {
    callback(0);
    return 1;
  });

const accessibilityLabelsInOrder = (node: unknown): string[] => {
  if (node === null || typeof node !== "object") return [];
  const element = node as {
    readonly props?: { readonly accessibilityLabel?: unknown };
    readonly children?: readonly unknown[];
  };
  const ownLabel =
    typeof element.props?.accessibilityLabel === "string"
      ? [element.props.accessibilityLabel]
      : [];
  return [
    ...ownLabel,
    ...(element.children ?? []).flatMap(accessibilityLabelsInOrder),
  ];
};

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

    const localTime = screen.getByRole("adjustable", {
      name: "13:05",
    });
    expect(localTime).toHaveProp("accessibilityHint", "Adjust Local time");
    expect(localTime).toHaveAccessibilityValue({ text: "Live time" });
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
            offsetAccessibilityLabel: "15 minutes earlier",
            accessibilityValue: "15 minutes earlier, 12:50",
          },
        }}
        {...callbacks}
      />,
    );

    const status = screen.getByRole("adjustable", {
      name: "Adjust comparison time",
    });
    expect(screen.getAllByRole("adjustable")).toHaveLength(2);
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

  it("updates Virtual appearance without changing its frozen screen model", async () => {
    const colorScheme = jest
      .spyOn(ReactNative, "useColorScheme")
      .mockReturnValue("light");
    const virtualModel: LiveClockScreenModel = {
      ...emptyModel,
      mode: "virtual",
      sampledInstantMs: Date.parse("2026-01-15T11:50:00Z"),
      status: {
        label: "Virtual time",
        offset: "−0:15",
        offsetMinutes: -15,
        offsetAccessibilityLabel: "15 minutes earlier",
        accessibilityValue: "15 minutes earlier, 12:50",
      },
    };
    const view = await render(<ClockScreen model={virtualModel} {...actions()} />);
    expect(StyleSheet.flatten(screen.getByTestId("clock-screen").props.style)).toMatchObject({
      backgroundColor: "#DDEFE8",
    });

    colorScheme.mockReturnValue("dark");
    await view.rerender(<ClockScreen model={virtualModel} {...actions()} />);

    expect(StyleSheet.flatten(screen.getByTestId("clock-screen").props.style)).toMatchObject({
      backgroundColor: "#173A31",
    });
    expect(virtualModel.sampledInstantMs).toBe(
      Date.parse("2026-01-15T11:50:00Z"),
    );
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

  it("exposes every row time as a separate adjustable with directional keyboard and accessibility mappings", async () => {
    const callbacks = actions();
    await render(
      <ClockScreen
        model={{
          ...emptyModel,
          mode: "virtual",
          status: {
            label: "Virtual time",
            offset: "+0:13",
            offsetMinutes: 13,
            offsetAccessibilityLabel: "13 minutes later",
            accessibilityValue: "13 minutes later, 13:18",
          },
          clocks: [{ ...localClock, time: "13:18", wallMinuteOfDay: 13 * 60 + 18 }],
        }}
        {...callbacks}
      />,
    );

    const rowTime = screen.getByRole("adjustable", {
      name: "13:18",
    });
    expect(rowTime).toHaveAccessibilityValue({
      text: "13 minutes later, 13:18",
    });
    await fireEvent(rowTime, "accessibilityAction", {
      nativeEvent: { actionName: "decrement" },
    });
    await fireEvent(rowTime, "accessibilityAction", {
      nativeEvent: { actionName: "increment" },
    });
    await fireEvent(rowTime, "keyDown", { nativeEvent: { key: "ArrowRight" } });
    await fireEvent(rowTime, "keyDown", { nativeEvent: { key: "ArrowLeft" } });
    expect(callbacks.onAdjustRow.mock.calls).toEqual([
      ["local", "earlier"],
      ["local", "later"],
      ["local", "earlier"],
      ["local", "later"],
    ]);

    expect(screen.getAllByText("‹", { includeHiddenElements: true })).toHaveLength(2);
    expect(screen.getAllByText("›", { includeHiddenElements: true })).toHaveLength(2);
  });

  it("forwards accepted row travel from gesture start and leaves vertical/tap/cancel paths nonmutating", async () => {
    const callbacks = actions();
    await render(<ClockScreen model={emptyModel} {...callbacks} />);
    const gesture = getByGestureTestId("row-scrub-local");

    await act(async () => {
      fireGestureHandler(gesture, [
        { state: State.BEGAN, translationX: 0, translationY: 0 },
        { state: State.ACTIVE, translationX: 9, translationY: 1 },
        { state: State.ACTIVE, translationX: 18, translationY: 1 },
        { state: State.END, translationX: 18, translationY: 1 },
      ]);
    });
    expect(callbacks.onBeginRowScrub).toHaveBeenCalledWith("local");
    expect(callbacks.onUpdateRowScrub.mock.calls).toEqual([[-1], [-2]]);
    expect(callbacks.onEndRowScrub).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("clock-scroll")).toHaveProp("scrollEnabled", true);

    callbacks.onBeginRowScrub.mockClear();
    callbacks.onUpdateRowScrub.mockClear();
    callbacks.onEndRowScrub.mockClear();
    await act(async () => {
      fireGestureHandler(gesture, [
        { state: State.BEGAN, translationX: 0, translationY: 0 },
        { state: State.ACTIVE, translationX: 10, translationY: 12 },
        { state: State.END, translationX: 18, translationY: 12 },
      ]);
    });
    expect(callbacks.onBeginRowScrub).not.toHaveBeenCalled();
    expect(callbacks.onUpdateRowScrub).not.toHaveBeenCalled();
    expect(callbacks.onEndRowScrub).not.toHaveBeenCalled();
    expect(screen.getByTestId("clock-scroll")).toHaveProp("scrollEnabled", true);

    await act(async () => {
      gesture.handlers.onFinalize?.({ translationX: 2, translationY: 1 } as never, false);
    });
    expect(callbacks.onBeginRowScrub).not.toHaveBeenCalled();

    await act(async () => {
      fireGestureHandler(gesture, [
        { state: State.BEGAN, translationX: 0, translationY: 0 },
        { state: State.ACTIVE, translationX: -9, translationY: 1 },
        { state: State.CANCELLED, translationX: -9, translationY: 1 },
      ]);
    });
    expect(callbacks.onCancelRowScrub).toHaveBeenCalledTimes(1);
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
    expect(
      StyleSheet.flatten(
        screen.getByRole("button", {
          name: "Detroit, United States, already added",
          disabled: true,
        }).props.style,
      ),
    ).toMatchObject({ opacity: 1 });

    await fireEvent.press(
      screen.getByRole("button", { name: "Cancel timezone selection" }),
    );
    expect(callbacks.onCancelSelector).toHaveBeenCalledTimes(1);
  });

  it("makes selector cancellation unavailable while an add is committing", async () => {
    const selectorModel: LiveClockScreenModel = {
      ...emptyModel,
      selector: { query: "", isAdding: true, results: [] },
    };
    await render(<ClockScreen model={selectorModel} {...actions()} />);

    expect(
      screen.getByRole("button", { name: "Cancel timezone selection" }),
    ).toBeDisabled();
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
          wallMinuteOfDay: 7 * 60 + 5,
        },
      ],
      focusRequest: {
        clockId: "added",
        sequence: 1,
        scrollIntoView: true,
        focus: true,
      },
    };
    const { focusRequest: _focusRequest, ...modelWithoutRequest } = model;
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
              wallMinuteOfDay: 30,
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
        name: "Kiritimati, Selected clock, UTC+14:00, +1 day",
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
    expect(screen.getByText("×", { includeHiddenElements: true })).toHaveProp(
      "importantForAccessibility",
      "no-hide-descendants",
    );
    await fireEvent.press(remove);
    expect(callbacks.onOpenDelete).toHaveBeenCalledWith("kiritimati");
    expect(screen.queryByRole("button", { name: "Delete Local" })).not.toBeOnTheScreen();
    expect(screen.queryByText(/edit/i)).not.toBeOnTheScreen();
  });

  it("exposes the logical nonvisual row journey and reports stable row focus", async () => {
    const callbacks = actions();
    const view = await render(
      <ClockScreen
        model={{
          ...emptyModel,
          clocks: [
            localClock,
            {
              id: "office",
              kind: "custom",
              name: "Office",
              canDelete: true,
              canEdit: true,
              calendarDate: "2026-01-16",
              time: "17:50",
              effectiveOffset: "UTC+05:45",
              wallMinuteOfDay: 17 * 60 + 50,
              dayDifference: "+1",
            },
          ],
        }}
        {...callbacks}
      />,
    );

    expect(accessibilityLabelsInOrder(view.toJSON())).toEqual(
      expect.arrayContaining([
        "13:05",
        "Local, Local clock, UTC+01:00",
        "17:50",
        "Office, Selected clock, UTC+05:45, +1 day",
        "Edit Office",
        "Delete Office",
        "Add timezone",
      ]),
    );
    await fireEvent(screen.getByRole("adjustable", { name: "17:50" }), "focus");
    expect(callbacks.onFocusClock).toHaveBeenCalledWith("office");
    await fireEvent(
      screen.getByRole("adjustable", { name: "Adjust comparison time" }),
      "focus",
    );
    expect(callbacks.onFocusClock).toHaveBeenLastCalledWith(undefined);
    expect(screen.getByRole("adjustable", { name: "17:50" })).toHaveProp(
      "nativeID",
      "clock-time-office",
    );
    expect(screen.getByRole("summary", { name: /Office/u })).toHaveProp(
      "nativeID",
      "clock-details-office",
    );
  });

  it.each([
    ["selector-search", "Search timezones"],
    ["custom-name", "Custom timezone name"],
    ["delete-cancel", "Cancel deletion"],
  ] as const)("accessibility-focuses the %s overlay entry target", async (target, label) => {
    runAnimationFramesImmediately();
    const base = {
      ...emptyModel,
      focusRequest: {
        overlay: target,
        sequence: 8,
        scrollIntoView: false,
        focus: true as const,
      },
    };
    const model: LiveClockScreenModel =
      target === "selector-search"
        ? { ...base, selector: { query: "", isAdding: false, results: [] } }
        : target === "custom-name"
          ? {
              ...base,
              customForm: {
                mode: "create",
                name: "",
                offsetMinutes: 0,
                offsetOptions: [0],
                isSaving: false,
              },
            }
          : {
              ...base,
              deleteConfirmation: {
                selectionId: "office",
                name: "Office",
                isDeleting: false,
              },
            };

    await render(<ClockScreen model={model} {...actions()} />);
    expect(screen.getByLabelText(label)).toBeOnTheScreen();
    expect(revealClockMock).toHaveBeenCalledWith(
      expect.objectContaining({
        clockView: expect.anything(),
        scrollIntoView: false,
        focus: true,
      }),
    );
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
    expect(screen.getByLabelText("Enter a name.")).toBeOnTheScreen();
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
              wallMinuteOfDay: 17 * 60 + 50,
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
    expect(StyleSheet.flatten(screen.getByRole("button", { name: "Add timezone" }).props.style)).toMatchObject({ opacity: 1 });
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
    expect(screen.getByLabelText("Couldn’t load your timezones.")).toBeOnTheScreen();
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
    expect(screen.getByLabelText("Couldn’t save changes.")).toBeOnTheScreen();
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
              wallMinuteOfDay: 7 * 60 + 5,
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
    const focusRequest = {
      clockId: "local",
      sequence: 2,
      scrollIntoView: false,
      focus: true as const,
    };
    const announcement = { sequence: 1, message: "New York removed." };
    const model: LiveClockScreenModel = {
      ...emptyModel,
      focusRequest,
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
          focusRequest: {
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

  it("connects a complete nonpointer search, mutation, adjustment, Back, and delete journey", async () => {
    const announce = jest
      .spyOn(AccessibilityInfo, "announceForAccessibility")
      .mockImplementation(() => undefined);
    const city = {
      id: "city-new-york",
      ianaId: "America/New_York",
      city: "New York",
      primaryCountryCode: "US",
      countries: [{ code: "US", name: "United States" }],
      aliases: ["NYC"],
    };
    const application = createLiveClockApplication({
      time: {
        now: () => Date.parse("2026-01-15T12:00:00Z"),
        schedule: () => () => undefined,
      },
      devicePreferences: {
        read: () => ({
          timeZone: "Europe/Stockholm",
          locale: "en-US",
          uses24HourClock: true,
        }),
      },
      timezoneRules: {
        project: (_instantMs, timeZone) =>
          timeZone === "America/New_York"
            ? {
                calendarDate: "2026-01-15",
                hour: 7,
                minute: 0,
                effectiveOffsetMinutes: -300,
              }
            : {
                calendarDate: "2026-01-15",
                hour: 13,
                minute: 0,
                effectiveOffsetMinutes: 60,
              },
      },
      catalog: {
        search: () => [city],
        findById: (catalogId) => (catalogId === city.id ? city : undefined),
      },
      selectedClockStorage: {
        load: async () => null,
        replace: async () => undefined,
      },
    });
    await application.initialize();
    await render(<ConnectedClockScreen application={application} />);

    await fireEvent.press(screen.getByRole("button", { name: "Add timezone" }));
    await fireEvent.changeText(screen.getByLabelText("Search timezones"), "new york");
    await fireEvent.press(
      screen.getByRole("button", { name: "Add New York, United States" }),
    );
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Delete New York" })).toBeOnTheScreen(),
    );

    const status = screen.getByRole("adjustable", { name: "Adjust comparison time" });
    await fireEvent(status, "accessibilityAction", {
      nativeEvent: { actionName: "decrement" },
    });
    expect(screen.getByRole("button", { name: "Back" })).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Back" }));
    expect(screen.queryByRole("button", { name: "Back" })).not.toBeOnTheScreen();

    await fireEvent.press(screen.getByRole("button", { name: "Delete New York" }));
    await fireEvent.press(
      screen.getAllByRole("button", { name: "Delete New York" }).at(-1)!,
    );
    await waitFor(() =>
      expect(screen.queryByRole("button", { name: "Delete New York" })).not.toBeOnTheScreen(),
    );
    expect(announce.mock.calls.map(([message]) => message)).toEqual(
      expect.arrayContaining([
        "New York added.",
        expect.stringMatching(/^Virtual time,/u),
        "Live time.",
        "New York removed.",
      ]),
    );
  });

  it.each([
    [320, 568, 1],
    [320, 568, 1.35],
    [320, 568, 2],
    [411, 914, 1],
    [411, 914, 1.35],
    [411, 914, 2],
  ])(
    "keeps Live and Virtual rows responsive at %d×%d and font scale %s",
    async (width, height, fontScale) => {
      const colorScheme = jest.spyOn(ReactNative, "useColorScheme");
      jest.spyOn(AccessibilityInfo, "isReduceMotionEnabled").mockResolvedValue(true);
      const customClock = {
        id: "custom-responsive",
        kind: "custom" as const,
        name: "A very long custom timezone name",
        canDelete: true as const,
        canEdit: true as const,
        calendarDate: "2026-01-16",
        time: "23:45",
        effectiveOffset: "UTC+05:45",
        wallMinuteOfDay: 23 * 60 + 45,
        dayDifference: "+1",
      };
      const shouldStack = width <= 360 || fontScale >= 1.6;

      for (const scheme of ["light", "dark"] as const) {
        colorScheme.mockReturnValue(scheme);
        Dimensions.set({
          window: { width, height, scale: 2.625, fontScale },
          screen: { width, height, scale: 2.625, fontScale },
        });
        for (const mode of ["live", "virtual"] as const) {
          const model: LiveClockScreenModel =
            mode === "live"
              ? { ...emptyModel, clocks: [localClock, customClock] }
              : {
                  ...emptyModel,
                  mode: "virtual",
                  status: {
                    label: "Virtual time",
                    offset: "+5:45",
                    offsetMinutes: 345,
                    offsetAccessibilityLabel: "5 hours 45 minutes later",
                    accessibilityValue: "5 hours 45 minutes later, 18:50",
                  },
                  clocks: [localClock, customClock],
                };
          const view = await render(<ClockScreen model={model} {...actions()} />);

          expect(screen.getByTestId("clock-scroll")).toHaveProp("horizontal", false);
          expect(screen.getAllByRole("adjustable")[0]).toHaveAccessibilityValue({
            text: model.status.accessibilityValue,
          });
          expect(StyleSheet.flatten(screen.getByTestId("clock-actions-custom-responsive").props.style)).toMatchObject({
            width: 48,
            flexDirection: "column",
          });
          expect(StyleSheet.flatten(screen.getByRole("button", { name: "Edit A very long custom timezone name" }).props.style)).toMatchObject({
            width: 48,
            minHeight: 48,
          });
          expect(StyleSheet.flatten(screen.getByTestId("clock-summary-custom-responsive").props.style)).toMatchObject({
            flexDirection: shouldStack ? "column" : "row",
          });
          expect(StyleSheet.flatten(screen.getByTestId("clock-time-line-custom-responsive", { includeHiddenElements: true }).props.style)).toMatchObject(
            shouldStack
              ? { position: "relative", paddingHorizontal: 20, flexShrink: 0 }
              : { flexDirection: "row", flexShrink: 0 },
          );
          if (shouldStack) {
            expect(StyleSheet.flatten(screen.getByTestId("clock-time-custom-responsive", { includeHiddenElements: true }).props.style)).toMatchObject({
              fontSize: 30,
            });
          }
          const readingOrder = accessibilityLabelsInOrder(view.toJSON());
          const rowOrder = [
            "23:45",
            "A very long custom timezone name, Selected clock, UTC+05:45, +1 day",
            "Edit A very long custom timezone name",
            "Delete A very long custom timezone name",
          ];
          for (let index = 1; index < rowOrder.length; index += 1) {
            expect(readingOrder.indexOf(rowOrder[index - 1]!)).toBeLessThan(
              readingOrder.indexOf(rowOrder[index]!),
            );
          }
          expect(screen.getByTestId("clock-screen")).toHaveProp(
            "accessibilityLabel",
            mode === "virtual" ? "Virtual time screen" : "Live time screen",
          );
          if (mode === "virtual") {
            expect(screen.getByText("Virtual time", { includeHiddenElements: true })).toBeOnTheScreen();
          }
          expect(JSON.stringify(view.toJSON())).not.toMatch(
            /timeline dot|15-minute steps|prototype|relative label|webview/i,
          );
          await view.unmount();
        }
      }
    },
  );

  it.each([
    [320, 568, 1],
    [320, 568, 1.35],
    [320, 568, 2],
    [411, 914, 1],
    [411, 914, 1.35],
    [411, 914, 2],
  ])("keeps every overlay surface responsive at %d×%d and font scale %s", async (width, height, fontScale) => {
    const colorScheme = jest.spyOn(ReactNative, "useColorScheme");
    jest.spyOn(AccessibilityInfo, "isReduceMotionEnabled").mockResolvedValue(true);
    const shouldStack = width <= 360 || fontScale >= 1.6;

    for (const scheme of ["light", "dark"] as const) {
      colorScheme.mockReturnValue(scheme);
      Dimensions.set({
        window: { width, height, scale: 2.625, fontScale },
        screen: { width, height, scale: 2.625, fontScale },
      });
      const callbacks = actions();
      const view = await render(
      <ClockScreen
        model={{
          ...emptyModel,
          customForm: {
            mode: "create",
            name: "A long custom timezone name",
            offsetMinutes: 0,
            offsetOptions: [-15, 0, 15],
            isSaving: false,
            duplicateError: "That custom timezone is already selected.",
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
    expect(screen.getByTestId("custom-form-scroll")).toHaveProp("horizontal", false);
    expect(StyleSheet.flatten(screen.getByTestId("custom-form-scroll").props.style)).toMatchObject({ flex: 1 });
    expect(StyleSheet.flatten(screen.getByTestId("custom-form-header").props.style)).toMatchObject({
      flexDirection: shouldStack ? "column" : "row",
    });
    expect(StyleSheet.flatten(screen.getByTestId("offset-picker").props.style)).toMatchObject({
      flexDirection: shouldStack ? "column" : "row",
    });
    expect(StyleSheet.flatten(screen.getByTestId("persistence-error").props.style)).toMatchObject({
      flexDirection: shouldStack ? "column" : "row",
    });

    await view.rerender(
      <ClockScreen
        model={{
          ...emptyModel,
          selector: {
            query: "",
            isAdding: false,
            results: [
              {
                catalogId: "city-long",
                city: "A city with a long readable name",
                countryName: "A country with a long readable name",
                ianaId: "Etc/UTC",
                available: true,
              },
            ],
          },
        }}
        {...callbacks}
      />,
    );
    expect(screen.getByTestId("selector-results")).toHaveProp("horizontal", false);
    expect(StyleSheet.flatten(screen.getByTestId("selector-results").props.style)).toMatchObject({ flex: 1 });
    expect(StyleSheet.flatten(screen.getByTestId("selector-header").props.style)).toMatchObject({
      flexDirection: shouldStack ? "column" : "row",
    });
    expect(screen.getByRole("button", { name: "Add A city with a long readable name, A country with a long readable name" })).toHaveStyle({
      minHeight: 64,
    });

    await view.rerender(
      <ClockScreen
        model={{
          ...emptyModel,
          addTimezoneUnavailableReason: "Maximum of 24 timezones reached",
          persistenceError: {
            operation: "load",
            message: "Couldn’t load your timezones.",
            retryLabel: "Retry",
          },
        }}
        {...callbacks}
      />,
    );
    expect(screen.getByText("Add a timezone to compare times around the world.")).toBeOnTheScreen();
    expect(screen.getByText("Maximum of 24 timezones reached")).toBeOnTheScreen();
    expect(StyleSheet.flatten(screen.getByTestId("persistence-error").props.style)).toMatchObject({
      flexDirection: shouldStack ? "column" : "row",
    });

    await view.rerender(
      <ClockScreen
        model={{
          ...emptyModel,
          deleteConfirmation: {
            selectionId: "custom-responsive",
            name: "A very long custom timezone name",
            isDeleting: false,
          },
        }}
        {...callbacks}
      />,
    );
    expect(screen.getByTestId("delete-dialog-scroll")).toHaveProp("horizontal", false);
    expect(StyleSheet.flatten(screen.getByTestId("delete-dialog-scroll").props.style)).toMatchObject({
      maxHeight: height - 48,
    });
    expect(StyleSheet.flatten(screen.getByTestId("delete-dialog-actions").props.style)).toMatchObject({
      flexDirection: shouldStack ? "column" : "row",
    });
    for (const name of ["Cancel deletion", "Delete A very long custom timezone name"]) {
      expect(StyleSheet.flatten(screen.getByRole("button", { name }).props.style)).toMatchObject({
        minHeight: 48,
      });
    }
      await view.unmount();
    }
  });

  it("stops chevron pulsing for reduced motion while keeping the scrub affordance", async () => {
    const loop = jest.spyOn(Animated, "loop").mockReturnValue({
      start: jest.fn(),
      stop: jest.fn(),
      reset: jest.fn(),
    } as never);
    jest.spyOn(AccessibilityInfo, "isReduceMotionEnabled").mockResolvedValue(true);
    const reduced = await render(<ClockScreen model={emptyModel} {...actions()} />);
    await act(async () => Promise.resolve());

    expect(loop).not.toHaveBeenCalled();
    expect(screen.getAllByText("‹", { includeHiddenElements: true }).length).toBeGreaterThan(0);
    expect(screen.getAllByText("›", { includeHiddenElements: true }).length).toBeGreaterThan(0);
    expect(screen.getByRole("adjustable", { name: "13:05" })).toBeOnTheScreen();
    await reduced.unmount();

    jest.mocked(AccessibilityInfo.isReduceMotionEnabled).mockResolvedValue(false);
    await render(<ClockScreen model={emptyModel} {...actions()} />);
    await act(async () => Promise.resolve());
    expect(loop).toHaveBeenCalledTimes(1);
  });
});
