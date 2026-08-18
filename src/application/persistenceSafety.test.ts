import type { ClockCatalogEntry } from "../catalog";
import { createLiveClockApplication } from "./liveClock";
import type { SelectedClockSnapshot } from "./selectedClockSnapshot";

const city: ClockCatalogEntry = {
  id: "city-new-york",
  ianaId: "America/New_York",
  city: "New York",
  primaryCountryCode: "US",
  countries: [{ code: "US", name: "United States" }],
  aliases: [],
};

const snapshotWith = (count: number): SelectedClockSnapshot => ({
  version: 1,
  nextAddSequence: count,
  selectedClocks: Array.from({ length: count }, (_value, index) => ({
    kind: "custom" as const,
    selectionId: `custom-${index}`,
    addSequence: index,
    name: `Custom ${index}`,
    offsetMinutes: 0,
  })),
});

const createHarness = ({
  initial = snapshotWith(0),
  load,
  replace,
  project,
}: {
  initial?: SelectedClockSnapshot;
  load?: () => Promise<SelectedClockSnapshot | null>;
  replace?: (snapshot: SelectedClockSnapshot) => Promise<void>;
  project?: (timeZone: string) => {
    calendarDate: string;
    hour: number;
    minute: number;
    effectiveOffsetMinutes: number;
  };
} = {}) => {
  let stored = initial;
  const writes: SelectedClockSnapshot[] = [];
  const app = createLiveClockApplication({
    time: {
      now: () => Date.parse("2026-01-15T12:00:00Z"),
      schedule: () => () => undefined,
    },
    devicePreferences: {
      read: () => ({ timeZone: "UTC", locale: "en-US", uses24HourClock: true }),
    },
    timezoneRules: {
      project: (_instant, timeZone) =>
        project?.(timeZone) ?? {
          calendarDate: "2026-01-15",
          hour: 12,
          minute: 0,
          effectiveOffsetMinutes: 0,
        },
    },
    catalog: {
      search: () => [city],
      findById: (catalogId) => (catalogId === city.id ? city : undefined),
    },
    selectedClockStorage: {
      load: load ?? (async () => stored),
      replace: async (candidate) => {
        writes.push(candidate);
        if (replace !== undefined) await replace(candidate);
        stored = candidate;
      },
    },
  });
  return { app, writes, stored: () => stored };
};

describe("collection capacity", () => {
  it.each(Array.from({ length: 24 }, (_value, index) => index))(
    "keeps Add available with %s selected clocks",
    async (count) => {
    const { app } = createHarness({ initial: snapshotWith(count) });
    await app.initialize();
    expect(app.getScreen().addTimezoneUnavailableReason).toBeUndefined();
    app.openSelector();
    expect(app.getScreen().selector).toBeDefined();
    },
  );

  it.each([24, 25])("keeps Add visible but unavailable at or above 24 (%s)", async (count) => {
    const { app } = createHarness({ initial: snapshotWith(count) });
    await app.initialize();
    expect(app.getScreen().addTimezoneUnavailableReason).toBe(
      "Maximum of 24 timezones reached",
    );
    app.openSelector();
    expect(app.getScreen().selector).toBeUndefined();
    await expect(app.addCity(city.id)).resolves.toBe(false);
    expect(app.openCustomEditor("custom-0")).toBe(true);
    app.cancelCustomForm();
    expect(app.openDelete("custom-0")).toBe(true);
  });

  it("preserves over-cap data and blocks adds until deletion brings it below 24", async () => {
    const initial = snapshotWith(25);
    const { app, stored } = createHarness({ initial });
    await app.initialize();
    expect(app.getScreen().clocks).toHaveLength(26);

    app.openDelete("custom-0");
    await app.confirmDelete();
    expect(stored().selectedClocks).toHaveLength(24);
    expect(app.getScreen().addTimezoneUnavailableReason).toBe(
      "Maximum of 24 timezones reached",
    );

    app.openDelete("custom-1");
    await app.confirmDelete();
    expect(stored().selectedClocks).toHaveLength(23);
    expect(app.getScreen().addTimezoneUnavailableReason).toBeUndefined();
  });

  it("still commits edits and deletes at capacity", async () => {
    const { app, stored } = createHarness({ initial: snapshotWith(24) });
    await app.initialize();

    app.openCustomEditor("custom-0");
    app.updateCustomName("Edited at capacity");
    await expect(app.saveCustom()).resolves.toBe(true);
    expect(stored().selectedClocks).toHaveLength(24);
    expect(stored().selectedClocks[0]).toMatchObject({ name: "Edited at capacity" });
    expect(app.getScreen().addTimezoneUnavailableReason).toBe(
      "Maximum of 24 timezones reached",
    );

    app.openDelete("custom-1");
    await expect(app.confirmDelete()).resolves.toBe(true);
    expect(stored().selectedClocks).toHaveLength(23);
    expect(app.getScreen().addTimezoneUnavailableReason).toBeUndefined();
  });
});

describe("retryable persistence", () => {
  it("shows a load error without rewriting and retries hydration", async () => {
    const committed = snapshotWith(1);
    let loads = 0;
    const { app, writes } = createHarness({
      load: async () => {
        loads += 1;
        if (loads === 1) throw new Error("read failed");
        return committed;
      },
    });

    await expect(app.initialize()).resolves.toBeUndefined();
    expect(app.getScreen()).toMatchObject({
      isReady: false,
      persistenceError: {
        operation: "load",
        message: "Couldn’t load your timezones.",
        retryLabel: "Retry",
      },
    });
    expect(writes).toEqual([]);

    await expect(app.retryPersistence()).resolves.toBe(true);
    expect(app.getScreen().isReady).toBe(true);
    expect(app.getScreen().persistenceError).toBeUndefined();
    expect(app.getScreen().clocks.find(({ id }) => id === "custom-0")).toBeDefined();
  });

  it("contains an unsupported persisted IANA zone as a retryable load error", async () => {
    const unsupported: SelectedClockSnapshot = {
      version: 1,
      nextAddSequence: 1,
      selectedClocks: [{
        kind: "city",
        selectionId: "bad-zone",
        addSequence: 0,
        catalogId: "bad-zone",
        city: "Bad zone",
        primaryCountryCode: "XX",
        countries: [{ code: "XX", name: "Example" }],
        ianaId: "Not/AZone",
      }],
    };
    const { app, writes } = createHarness({
      initial: unsupported,
      project: (timeZone) => {
        if (timeZone === "Not/AZone") throw new RangeError("unsupported zone");
        return {
          calendarDate: "2026-01-15",
          hour: 12,
          minute: 0,
          effectiveOffsetMinutes: 0,
        };
      },
    });
    await expect(app.initialize()).resolves.toBeUndefined();
    expect(app.getScreen().isReady).toBe(false);
    expect(app.getScreen().persistenceError?.operation).toBe("load");
    expect(app.getScreen().announcement).toEqual({
      sequence: 1,
      message: "Couldn’t load your timezones.",
    });
    expect(writes).toEqual([]);
  });

  it.each(["add", "edit", "delete"] as const)(
    "retains prior state after failed %s and commits only a successful retry",
    async (operation) => {
      const initial = operation === "add" ? snapshotWith(0) : snapshotWith(1);
      let attempts = 0;
      const { app, writes, stored } = createHarness({
        initial,
        replace: async () => {
          attempts += 1;
          if (attempts === 1) throw new Error("write failed");
        },
      });
      await app.initialize();

      let outcome: boolean;
      if (operation === "add") {
        app.openSelector();
        outcome = await app.addCity(city.id);
      } else if (operation === "edit") {
        app.openCustomEditor("custom-0");
        app.updateCustomName("Edited");
        outcome = await app.saveCustom();
      } else {
        app.openDelete("custom-0");
        outcome = await app.confirmDelete();
      }

      expect(outcome).toBe(false);
      expect(stored()).toEqual(initial);
      expect(app.getScreen().clocks.some(({ id }) => id === "custom-0")).toBe(
        operation !== "add",
      );
      expect(app.getScreen().focusRequest).toMatchObject({
        overlay:
          operation === "add"
            ? "selector-search"
            : operation === "edit"
              ? "custom-name"
              : "delete-cancel",
        focus: true,
      });
      expect(app.getScreen().announcement).toEqual({
        sequence: 1,
        message: "Couldn’t save changes.",
      });
      expect(app.getScreen().persistenceError).toMatchObject({
        operation: "write",
        message: "Couldn’t save changes.",
        retryLabel: "Retry",
      });

      await expect(app.retryPersistence()).resolves.toBe(true);
      expect(writes).toHaveLength(2);
      expect(stored()).not.toEqual(initial);
      expect(app.getScreen().persistenceError).toBeUndefined();
    },
  );

  it.each(["add", "edit", "delete"] as const)(
    "ignores repeated %s activation while its one write is pending",
    async (operation) => {
      let release: (() => void) | undefined;
      const gate = new Promise<void>((resolve) => {
        release = resolve;
      });
      const { app, writes } = createHarness({
        initial: operation === "add" ? snapshotWith(0) : snapshotWith(1),
        replace: async () => gate,
      });
      await app.initialize();

      let first: Promise<boolean>;
      let repeated: Promise<boolean>;
      if (operation === "add") {
        app.openSelector();
        first = app.addCity(city.id);
        repeated = app.addCity(city.id);
      } else if (operation === "edit") {
        app.openCustomEditor("custom-0");
        app.updateCustomName("Edited");
        first = app.saveCustom();
        repeated = app.saveCustom();
      } else {
        app.openDelete("custom-0");
        first = app.confirmDelete();
        repeated = app.confirmDelete();
      }
      await Promise.resolve();
      expect(writes).toHaveLength(1);
      await expect(repeated).resolves.toBe(false);
      release?.();
      await expect(first).resolves.toBe(true);
      expect(writes).toHaveLength(1);
    },
  );

  it("cold launch restores only the last committed snapshot without transient state", async () => {
    const initial = snapshotWith(1);
    let shouldFail = true;
    const first = createHarness({
      initial,
      replace: async () => {
        if (shouldFail) throw new Error("write failed");
      },
    });
    await first.app.initialize();
    first.app.openCustomEditor("custom-0");
    first.app.updateCustomName("Committed later");
    await expect(first.app.saveCustom()).resolves.toBe(false);

    const beforeRetry = createHarness({ initial: first.stored() });
    await beforeRetry.app.initialize();
    expect(beforeRetry.app.getScreen().clocks.find(({ id }) => id === "custom-0")?.name).toBe("Custom 0");
    expect(beforeRetry.app.getScreen()).not.toHaveProperty("customForm");
    expect(beforeRetry.app.getScreen()).not.toHaveProperty("persistenceError");
    expect(beforeRetry.app.getScreen()).not.toHaveProperty("focusRequest");

    shouldFail = false;
    await expect(first.app.retryPersistence()).resolves.toBe(true);
    const afterRetry = createHarness({ initial: first.stored() });
    await afterRetry.app.initialize();
    expect(afterRetry.app.getScreen().clocks.find(({ id }) => id === "custom-0")?.name).toBe("Committed later");
    expect(afterRetry.app.getScreen()).not.toHaveProperty("customForm");
    expect(afterRetry.app.getScreen()).not.toHaveProperty("persistenceError");
  });

  it("discarding a failed mutation also discards its stale retry", async () => {
    const initial = snapshotWith(0);
    const { app, stored } = createHarness({
      initial,
      replace: async () => {
        throw new Error("write failed");
      },
    });
    await app.initialize();
    app.openSelector();
    await app.addCity(city.id);
    expect(app.getScreen().persistenceError).toBeDefined();

    app.cancelSelector();
    expect(app.getScreen().persistenceError).toBeUndefined();
    await expect(app.retryPersistence()).resolves.toBe(false);
    expect(stored()).toEqual(initial);
  });

  it("changing a failed edit draft invalidates its stale retry candidate", async () => {
    const initial = snapshotWith(1);
    const { app, stored } = createHarness({
      initial,
      replace: async () => {
        throw new Error("write failed");
      },
    });
    await app.initialize();
    app.openCustomEditor("custom-0");
    app.updateCustomName("Previously valid");
    await app.saveCustom();
    expect(app.getScreen().persistenceError?.operation).toBe("write");

    app.updateCustomName("");
    expect(app.getScreen().persistenceError).toBeUndefined();
    await expect(app.retryPersistence()).resolves.toBe(false);
    await expect(app.saveCustom()).resolves.toBe(false);
    expect(app.getScreen().customForm?.nameError).toBe("Enter a name.");
    expect(stored()).toEqual(initial);
  });
});
