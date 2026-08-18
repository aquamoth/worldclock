import type { ClockCatalogEntry } from "../catalog";
import { createLiveClockApplication } from "./liveClock";
import type { SelectedClockSnapshot } from "./selectedClockSnapshot";

const earlyCity: ClockCatalogEntry = {
  id: "early-city",
  ianaId: "Test/Early",
  city: "Early City",
  primaryCountryCode: "XX",
  countries: [{ code: "XX", name: "Example" }],
  aliases: [],
};

const initialSnapshot: SelectedClockSnapshot = {
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

const createStorage = (initial: SelectedClockSnapshot = initialSnapshot) => {
  let stored = initial;
  let rejectWrites = false;
  const writes: SelectedClockSnapshot[] = [];
  return {
    port: {
      load: async () => stored,
      replace: async (snapshot: SelectedClockSnapshot) => {
        writes.push(snapshot);
        if (rejectWrites) throw new Error("storage unavailable");
        stored = snapshot;
      },
    },
    writes,
    stored: () => stored,
    rejectWrites: (reject: boolean) => {
      rejectWrites = reject;
    },
  };
};

const createApp = (
  storage: ReturnType<typeof createStorage>,
  now = () => Date.parse("2026-01-15T07:32:00Z"),
) =>
  createLiveClockApplication({
    time: { now, schedule: () => () => undefined },
    devicePreferences: {
      read: () => ({ timeZone: "UTC", locale: "en-GB", uses24HourClock: true }),
    },
    timezoneRules: {
      project: (instantMs, timeZone) => {
        const offsetMinutes = timeZone === "Test/Early" ? -120 : 0;
        const projected = new Date(instantMs + offsetMinutes * 60_000);
        return {
          calendarDate: projected.toISOString().slice(0, 10),
          hour: projected.getUTCHours(),
          minute: projected.getUTCMinutes(),
          effectiveOffsetMinutes: offsetMinutes,
        };
      },
    },
    catalog: {
      search: () => [earlyCity],
      findById: (catalogId) => (catalogId === earlyCity.id ? earlyCity : undefined),
    },
    selectedClockStorage: storage.port,
  });

const expectVirtualInstant = (
  app: ReturnType<typeof createApp>,
  comparisonInstantMs: number,
) => {
  expect(app.getScreen()).toMatchObject({
    mode: "virtual",
    sampledInstantMs: comparisonInstantMs,
    status: { offset: "+0:15" },
  });
};

describe("collection changes during Virtual time", () => {
  it("adds, edits, and confirms deletion at one frozen comparison and sorts each result", async () => {
    const storage = createStorage();
    const app = createApp(storage);
    await app.initialize();
    app.adjustStatus("later");
    const comparisonInstantMs = app.getScreen().sampledInstantMs;

    app.openSelector();
    await expect(app.addCity(earlyCity.id)).resolves.toBe(true);
    expectVirtualInstant(app, comparisonInstantMs);
    expect(app.getScreen().clocks.map(({ id }) => id)).toEqual([
      "selection-1-early-city",
      "local",
      "office",
    ]);

    app.openSelector();
    expect(app.openCustomCreator()).toBe(true);
    app.updateCustomName("Late office");
    app.selectCustomOffset(180);
    await expect(app.saveCustom()).resolves.toBe(true);
    expectVirtualInstant(app, comparisonInstantMs);
    expect(app.getScreen().clocks.map(({ id }) => id)).toEqual([
      "selection-1-early-city",
      "local",
      "office",
      "selection-2-custom",
    ]);

    expect(app.openCustomEditor("office")).toBe(true);
    app.selectCustomOffset(-240);
    await expect(app.saveCustom()).resolves.toBe(true);
    expectVirtualInstant(app, comparisonInstantMs);
    expect(app.getScreen().clocks.map(({ id }) => id)).toEqual([
      "office",
      "selection-1-early-city",
      "local",
      "selection-2-custom",
    ]);

    expect(app.openDelete("selection-1-early-city")).toBe(true);
    await expect(app.confirmDelete()).resolves.toBe(true);
    expectVirtualInstant(app, comparisonInstantMs);
    expect(app.getScreen().clocks.map(({ id }) => id)).toEqual([
      "office",
      "local",
      "selection-2-custom",
    ]);

    expect(storage.writes).toHaveLength(4);
    for (const snapshot of storage.writes) {
      expect(JSON.stringify(snapshot)).not.toMatch(
        /virtual|comparison|liveReference|theme|locale|timeZone|uses24|effectiveOffset|calendarDate|displayedOrder/i,
      );
    }
  });

  it("keeps the collection and both Virtual instants through cancelled and failed mutations", async () => {
    const storage = createStorage();
    storage.rejectWrites(true);
    const app = createApp(storage);
    await app.initialize();
    app.adjustStatus("later");
    const comparisonInstantMs = app.getScreen().sampledInstantMs;
    const expectedIds = ["local", "office"];

    app.openSelector();
    app.cancelSelector();
    expectVirtualInstant(app, comparisonInstantMs);

    app.openSelector();
    await expect(app.addCity(earlyCity.id)).resolves.toBe(false);
    expectVirtualInstant(app, comparisonInstantMs);
    expect(app.getScreen().clocks.map(({ id }) => id)).toEqual(expectedIds);
    app.cancelSelector();

    app.openSelector();
    app.openCustomCreator();
    app.updateCustomName("Discarded");
    app.cancelCustomForm();
    app.cancelSelector();
    expectVirtualInstant(app, comparisonInstantMs);

    app.openSelector();
    app.openCustomCreator();
    app.updateCustomName("Failed add");
    app.selectCustomOffset(180);
    await expect(app.saveCustom()).resolves.toBe(false);
    expectVirtualInstant(app, comparisonInstantMs);
    expect(app.getScreen().clocks.map(({ id }) => id)).toEqual(expectedIds);
    app.cancelCustomForm();
    app.cancelSelector();

    app.openCustomEditor("office");
    app.selectCustomOffset(-240);
    app.cancelCustomForm();
    expect(app.getScreen().clocks.map(({ id }) => id)).toEqual(expectedIds);

    app.openCustomEditor("office");
    app.selectCustomOffset(-240);
    await expect(app.saveCustom()).resolves.toBe(false);
    expectVirtualInstant(app, comparisonInstantMs);
    expect(app.getScreen().clocks.map(({ id }) => id)).toEqual(expectedIds);
    app.cancelCustomForm();

    app.openDelete("office");
    app.cancelDelete();
    expectVirtualInstant(app, comparisonInstantMs);
    app.openDelete("office");
    await expect(app.confirmDelete()).resolves.toBe(false);
    expectVirtualInstant(app, comparisonInstantMs);
    expect(app.getScreen().clocks.map(({ id }) => id)).toEqual(expectedIds);
    expect(storage.stored()).toEqual(initialSnapshot);
  });

  it("restores only committed clocks and starts Live after process recreation", async () => {
    const storage = createStorage();
    const firstProcess = createApp(storage);
    await firstProcess.initialize();
    firstProcess.adjustStatus("later");
    firstProcess.openSelector();
    await expect(firstProcess.addCity(earlyCity.id)).resolves.toBe(true);
    expect(firstProcess.getScreen().mode).toBe("virtual");

    const recreatedNow = Date.parse("2026-01-15T14:26:00Z");
    const secondProcess = createApp(storage, () => recreatedNow);
    await secondProcess.initialize();

    expect(secondProcess.getScreen()).toMatchObject({
      mode: "live",
      sampledInstantMs: recreatedNow,
      status: { label: "Live", offset: "Now" },
    });
    expect(secondProcess.getScreen().clocks.map(({ id }) => id)).toEqual([
      "selection-1-early-city",
      "local",
      "office",
    ]);
    expect(JSON.stringify(storage.stored())).not.toMatch(
      /virtual|comparison|liveReference|theme|locale|timeZone|uses24|effectiveOffset|calendarDate|displayedOrder/i,
    );
  });
});
