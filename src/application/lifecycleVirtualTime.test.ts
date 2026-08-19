import { createLiveClockApplication } from "./liveClock";
import type { SelectedClockSnapshot } from "./selectedClockSnapshot";

const committedSnapshot: SelectedClockSnapshot = {
  version: 1,
  nextAddSequence: 1,
  selectedClocks: [
    {
      kind: "custom",
      selectionId: "office",
      addSequence: 0,
      name: "Office",
      offsetMinutes: 60,
    },
  ],
};

const createLifecycleHarness = () => {
  let now = Date.parse("2026-01-15T07:32:00Z");
  let preferences = {
    timeZone: "UTC",
    locale: "en-GB",
    uses24HourClock: true,
  };
  const scheduled: Array<{ callback: () => void; delayMs: number }> = [];
  let cancellations = 0;
  const app = createLiveClockApplication({
    time: {
      now: () => now,
      schedule: (callback, delayMs) => {
        scheduled.push({ callback, delayMs });
        return () => {
          cancellations += 1;
        };
      },
    },
    devicePreferences: { read: () => preferences },
    timezoneRules: {
      project: (instantMs, timeZone) => {
        const instant = new Date(instantMs);
        const offsetMinutes =
          timeZone === "America/New_York"
            ? -300
            : timeZone === "Test/East"
              ? 180
              : 0;
        const localMs = instantMs + offsetMinutes * 60_000;
        const local = new Date(localMs);
        return {
          calendarDate: local.toISOString().slice(0, 10),
          hour: local.getUTCHours(),
          minute: local.getUTCMinutes(),
          effectiveOffsetMinutes: offsetMinutes,
        };
      },
    },
    catalog: { search: () => [], findById: () => undefined },
    selectedClockStorage: {
      load: async () => committedSnapshot,
      replace: async () => undefined,
    },
  });

  return {
    app,
    scheduled,
    cancellations: () => cancellations,
    setNow: (instant: string) => {
      now = Date.parse(instant);
    },
    setPreferences: (next: typeof preferences) => {
      preferences = next;
    },
  };
};

describe("lifecycle-aware Live and Virtual time", () => {
  it("pauses minute ticks in the background and catches Live mode up on foreground", async () => {
    const { app, scheduled, cancellations, setNow } = createLifecycleHarness();
    await app.initialize();
    app.start();

    expect(scheduled.at(-1)?.delayMs).toBe(60_000);
    app.enterBackground();
    expect(cancellations()).toBe(1);

    setNow("2026-01-15T09:10:45Z");
    scheduled[0]?.callback();
    expect(scheduled).toHaveLength(1);
    expect(app.getScreen().sampledInstantMs).toBe(
      Date.parse("2026-01-15T07:32:00Z"),
    );

    app.enterForeground();

    expect(app.getScreen()).toMatchObject({
      mode: "live",
      sampledInstantMs: Date.parse("2026-01-15T09:10:45Z"),
    });
    expect(app.getScreen().clocks.find(({ kind }) => kind === "local")).toMatchObject({
      name: "Local",
      time: "09:10",
    });
    expect(scheduled.at(-1)?.delayMs).toBe(15_000);
  });

  it("reprojects changed device preferences while the held offset keeps tracking live time", async () => {
    const { app, scheduled, setNow, setPreferences } = createLifecycleHarness();
    await app.initialize();
    app.start();
    app.adjustStatus("later");
    expect(app.getScreen().sampledInstantMs).toBe(
      Date.parse("2026-01-15T07:47:00Z"),
    );

    app.enterBackground();
    setNow("2026-01-15T12:00:00Z");
    setPreferences({
      timeZone: "America/New_York",
      locale: "en-US",
      uses24HourClock: false,
    });
    app.enterForeground();

    expect(app.getScreen()).toMatchObject({
      mode: "virtual",
      sampledInstantMs: Date.parse("2026-01-15T12:15:00Z"),
      status: { offset: "+0:15", accessibilityValue: "15 minutes later, 7:15 AM" },
      clocks: [
        { name: "Local", time: "7:15", period: "AM", effectiveOffset: "UTC−05:00" },
        { name: "Office", time: "1:15", period: "PM", effectiveOffset: "UTC+01:00" },
      ],
    });

    setNow("2026-01-15T12:01:00Z");
    scheduled.at(-1)?.callback();
    const tickedScreen = app.getScreen();
    if (tickedScreen.mode !== "virtual") throw new Error("expected Virtual time");
    expect(tickedScreen.sampledInstantMs).toBe(
      Date.parse("2026-01-15T12:16:00Z"),
    );
    expect(tickedScreen.status.offsetMinutes).toBe(15);

    app.backToLive();
    expect(app.getScreen()).toMatchObject({
      mode: "live",
      sampledInstantMs: Date.parse("2026-01-15T12:01:00Z"),
    });
  });

  it("holds order behind an editor, then reconciles and restores stable focus on cancel", async () => {
    const { app, setPreferences } = createLifecycleHarness();
    await app.initialize();
    app.adjustStatus("later");
    const frozenComparison = app.getScreen().sampledInstantMs;

    expect(app.getScreen().clocks.map(({ id }) => id)).toEqual(["local", "office"]);
    expect(app.openCustomEditor("office")).toBe(true);
    setPreferences({
      timeZone: "Test/East",
      locale: "en-GB",
      uses24HourClock: true,
    });
    app.refresh();
    expect(app.getScreen().clocks.map(({ id }) => id)).toEqual(["local", "office"]);

    app.cancelCustomForm();
    expect(app.getScreen()).toMatchObject({
      mode: "virtual",
      sampledInstantMs: frozenComparison,
      clocks: [{ id: "office" }, { id: "local" }],
      focusRequest: {
        clockId: "office",
        scrollIntoView: false,
        focus: true,
      },
    });
  });

  it("restores a focused stable clock identity when automatic projection reorders it", async () => {
    const { app, setPreferences } = createLifecycleHarness();
    await app.initialize();
    app.reportClockFocus("office");

    setPreferences({
      timeZone: "Test/East",
      locale: "en-GB",
      uses24HourClock: true,
    });
    app.refresh();

    expect(app.getScreen()).toMatchObject({
      clocks: [{ id: "office" }, { id: "local" }],
      focusRequest: {
        clockId: "office",
        scrollIntoView: false,
        focus: true,
      },
    });
  });

  it("does not steal focus after the user leaves a clock row", async () => {
    const { app, setPreferences } = createLifecycleHarness();
    await app.initialize();
    app.reportClockFocus("office");
    app.reportClockFocus(undefined);

    setPreferences({
      timeZone: "Test/East",
      locale: "en-GB",
      uses24HourClock: true,
    });
    app.refresh();

    expect(app.getScreen().clocks.map(({ id }) => id)).toEqual(["office", "local"]);
    expect(app.getScreen().focusRequest).toBeUndefined();
  });

  it("reconciles selector and delete overlays onto their stable return targets", async () => {
    const selectorHarness = createLifecycleHarness();
    await selectorHarness.app.initialize();
    selectorHarness.app.adjustStatus("later");
    selectorHarness.app.openSelector();
    expect(selectorHarness.app.getScreen().focusRequest).toMatchObject({
      overlay: "selector-search",
      focus: true,
    });
    selectorHarness.setPreferences({
      timeZone: "Test/East",
      locale: "en-GB",
      uses24HourClock: true,
    });
    selectorHarness.app.refresh();
    expect(selectorHarness.app.getScreen().clocks.map(({ id }) => id)).toEqual([
      "local",
      "office",
    ]);
    selectorHarness.app.cancelSelector();
    expect(selectorHarness.app.getScreen()).toMatchObject({
      clocks: [{ id: "office" }, { id: "local" }],
      focusRequest: {
        addTimezone: true,
        scrollIntoView: false,
        focus: true,
      },
    });

    const deleteHarness = createLifecycleHarness();
    await deleteHarness.app.initialize();
    deleteHarness.app.adjustStatus("later");
    deleteHarness.app.openDelete("office");
    expect(deleteHarness.app.getScreen().focusRequest).toMatchObject({
      overlay: "delete-cancel",
      focus: true,
    });
    deleteHarness.setPreferences({
      timeZone: "Test/East",
      locale: "en-GB",
      uses24HourClock: true,
    });
    deleteHarness.app.refresh();
    expect(deleteHarness.app.getScreen().clocks.map(({ id }) => id)).toEqual([
      "local",
      "office",
    ]);
    deleteHarness.app.cancelDelete();
    expect(deleteHarness.app.getScreen()).toMatchObject({
      clocks: [{ id: "office" }, { id: "local" }],
      focusRequest: {
        clockId: "office",
        scrollIntoView: false,
        focus: true,
      },
    });
  });
});
