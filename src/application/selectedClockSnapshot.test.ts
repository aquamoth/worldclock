import {
  decodeSelectedClockSnapshot,
  encodeSelectedClockSnapshot,
  type SelectedClockSnapshot,
} from "./selectedClockSnapshot";

const snapshot: SelectedClockSnapshot = {
  version: 1,
  nextAddSequence: 8,
  selectedClocks: [
    {
      kind: "city",
      selectionId: "selection-7-city-0276",
      addSequence: 7,
      catalogId: "city-0276",
      city: "New York",
      primaryCountryCode: "US",
      countries: [{ code: "US", name: "United States" }],
      ianaId: "America/New_York",
    },
    {
      kind: "custom",
      selectionId: "selection-8-custom",
      addSequence: 8,
      name: "Office",
      offsetMinutes: 345,
    },
  ],
};

describe("selected-clock snapshot codec", () => {
  it("round-trips captured city metadata through versioned plain JSON", () => {
    const encoded = encodeSelectedClockSnapshot(snapshot);

    expect(JSON.parse(encoded)).toEqual(snapshot);
    expect(decodeSelectedClockSnapshot(encoded)).toEqual(snapshot);
  });

  it("stores no projection, ordering, device, or transient fields", () => {
    const encoded = encodeSelectedClockSnapshot(snapshot);

    expect(encoded).not.toMatch(
      /displayOrder|calendarDate|effectiveOffset|dayDifference|timeZonePreference|sampledInstant|selector|focus|scroll/u,
    );
  });

  it.each([
    [{ kind: "custom", selectionId: "x", addSequence: 1, name: "", offsetMinutes: 0 }],
    [{ kind: "custom", selectionId: "x", addSequence: 1, name: "Office", offsetMinutes: 17 }],
  ])("rejects invalid persisted custom definitions", (custom) => {
    expect(() =>
      decodeSelectedClockSnapshot(
        JSON.stringify({ version: 1, nextAddSequence: 2, selectedClocks: [custom] }),
      ),
    ).toThrow("Invalid selected-clock snapshot");
  });
});
