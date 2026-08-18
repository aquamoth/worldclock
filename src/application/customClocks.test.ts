import { createLiveClockApplication } from "./liveClock";
import type { SelectedClockSnapshot } from "./selectedClockSnapshot";

const createHarness = (initial: SelectedClockSnapshot | null = null) => {
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
      project: () => ({
        calendarDate: "2026-01-15",
        hour: 12,
        minute: 0,
        effectiveOffsetMinutes: 0,
      }),
    },
    catalog: { search: () => [], findById: () => undefined },
    selectedClockStorage: {
      load: async () => stored,
      replace: async (snapshot) => {
        writes.push(snapshot);
        stored = snapshot;
      },
    },
  });
  return { app, writes, stored: () => stored };
};

const savedCustom = (name = "Office", offsetMinutes = 345): SelectedClockSnapshot => ({
  version: 1,
  nextAddSequence: 8,
  selectedClocks: [
    {
      kind: "custom",
      selectionId: "stable-custom",
      addSequence: 7,
      name,
      offsetMinutes,
    },
  ],
});

describe("custom timezone create and edit", () => {
  it("takes a separate selector path and atomically creates, projects, closes, and focuses", async () => {
    const { app, writes } = createHarness();
    await app.initialize();
    app.openSelector();
    app.searchSelector("remember me");

    expect(app.openCustomCreator()).toBe(true);
    expect(app.getScreen().selector).toBeUndefined();
    expect(app.getScreen().customForm).toMatchObject({
      mode: "create",
      name: "",
      offsetMinutes: 0,
    });
    expect(app.getScreen().customForm?.offsetOptions).toHaveLength(105);

    app.updateCustomName("  Nepal office  ");
    app.selectCustomOffset(345);
    await expect(app.saveCustom()).resolves.toBe(true);

    expect(writes).toEqual([{
      version: 1,
      nextAddSequence: 1,
      selectedClocks: [{
        kind: "custom",
        selectionId: "selection-0-custom",
        addSequence: 0,
        name: "Nepal office",
        offsetMinutes: 345,
      }],
    }]);
    expect(app.getScreen().selector).toBeUndefined();
    expect(app.getScreen().customForm).toBeUndefined();
    expect(app.getScreen().clocks.find(({ id }) => id === "selection-0-custom")).toMatchObject({
      kind: "custom",
      name: "Nepal office",
      time: "17:45",
      effectiveOffset: "UTC+05:45",
      canEdit: true,
    });
    expect(app.getScreen().clockRequest).toEqual({
      clockId: "selection-0-custom",
      sequence: 1,
      scrollIntoView: true,
      focus: true,
    });
    expect(writes[0]?.selectedClocks[0]).toMatchObject({
      selectionId: "selection-0-custom",
      addSequence: 0,
    });
  });

  it("keeps invalid and normalized duplicate drafts inline without mutation", async () => {
    const { app, writes, stored } = createHarness(savedCustom("Straße", 60));
    await app.initialize();
    app.openSelector();
    app.openCustomCreator();

    await expect(app.saveCustom()).resolves.toBe(false);
    expect(app.getScreen().customForm?.nameError).toBe("Enter a name.");

    app.updateCustomName("  STRASSE\u2003 ");
    app.selectCustomOffset(60);
    await expect(app.saveCustom()).resolves.toBe(false);
    expect(app.getScreen().customForm?.duplicateError).toMatch(/already exists/u);
    expect(writes).toEqual([]);
    expect(stored()).toEqual(savedCustom("Straße", 60));
  });

  it("edits once in place, retaining identity and sequence while reordering and focusing", async () => {
    const initial = savedCustom();
    const { app, writes } = createHarness(initial);
    await app.initialize();

    expect(app.openCustomEditor("stable-custom")).toBe(true);
    app.updateCustomName("Early office");
    app.selectCustomOffset(-720);
    await expect(app.saveCustom()).resolves.toBe(true);

    expect(writes).toHaveLength(1);
    expect(writes[0]).toEqual({
      ...initial,
      selectedClocks: [{
        kind: "custom",
        selectionId: "stable-custom",
        addSequence: 7,
        name: "Early office",
        offsetMinutes: -720,
      }],
    });
    expect(app.getScreen().clocks.map(({ id }) => id)).toEqual(["stable-custom", "local"]);
    expect(app.getScreen().clockRequest?.clockId).toBe("stable-custom");
  });

  it("keeps invalid and duplicate edits in place without changing visible or stored clocks", async () => {
    const initial: SelectedClockSnapshot = {
      version: 1,
      nextAddSequence: 9,
      selectedClocks: [
        ...savedCustom("Office", 60).selectedClocks,
        {
          kind: "custom",
          selectionId: "second-custom",
          addSequence: 8,
          name: "Straße",
          offsetMinutes: 120,
        },
      ],
    };
    const { app, writes, stored } = createHarness(initial);
    await app.initialize();
    app.openCustomEditor("stable-custom");
    app.updateCustomName("Office\n");
    await expect(app.saveCustom()).resolves.toBe(false);
    expect(app.getScreen().customForm?.nameError).toMatch(/one line/u);

    app.updateCustomName("  STRASSE\u2003");
    app.selectCustomOffset(120);
    await expect(app.saveCustom()).resolves.toBe(false);
    expect(app.getScreen().customForm?.duplicateError).toMatch(/already exists/u);
    expect(app.getScreen().clocks.find(({ id }) => id === "stable-custom")?.name).toBe("Office");
    expect(writes).toEqual([]);
    expect(stored()).toEqual(initial);
  });

  it("discards create/edit drafts on cancel and never exposes city editing", async () => {
    const initial = savedCustom();
    const { app, writes } = createHarness(initial);
    await app.initialize();
    app.openSelector();
    app.searchSelector("kept query");
    app.openCustomCreator();
    app.updateCustomName("Discarded");
    app.cancelCustomForm();
    expect(app.getScreen().selector?.query).toBe("kept query");

    app.cancelSelector();
    app.openCustomEditor("stable-custom");
    app.updateCustomName("Also discarded");
    app.cancelCustomForm();
    expect(app.getScreen().customForm).toBeUndefined();
    expect(app.getScreen().clocks.find(({ id }) => id === "stable-custom")?.name).toBe("Office");
    expect(app.openCustomEditor("local")).toBe(false);
    expect(writes).toEqual([]);
  });
});
