import {
  decodeSelectedClockSnapshot,
  encodeSelectedClockSnapshot,
  type SelectedClockSnapshot,
} from "./selectedClockSnapshot";

const snapshot: SelectedClockSnapshot = {
  version: 1,
  nextAddSequence: 9,
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
      /displayOrder|calendarDate|effectiveOffset|dayDifference|timeZonePreference|sampledInstant|comparisonInstant|virtualOffset|selector|focus|scroll|theme/u,
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

  it("migrates every declared legacy v0 record from array order to add sequence", () => {
    expect(
      decodeSelectedClockSnapshot(
        JSON.stringify({
          version: 0,
          selectedClocks: [
            {
              kind: "custom",
              selectionId: "legacy-custom",
              name: "Legacy office",
              offsetMinutes: -210,
            },
            {
              kind: "city",
              selectionId: "legacy-city",
              catalogId: "city-0276",
              city: "New York",
              primaryCountryCode: "US",
              countries: [{ code: "US", name: "United States" }],
              ianaId: "America/New_York",
            },
          ],
        }),
      ),
    ).toEqual({
      version: 1,
      nextAddSequence: 2,
      selectedClocks: [
        {
          kind: "custom",
          selectionId: "legacy-custom",
          addSequence: 0,
          name: "Legacy office",
          offsetMinutes: -210,
        },
        {
          kind: "city",
          selectionId: "legacy-city",
          addSequence: 1,
          catalogId: "city-0276",
          city: "New York",
          primaryCountryCode: "US",
          countries: [{ code: "US", name: "United States" }],
          ianaId: "America/New_York",
        },
      ],
    });
  });

  it.each([
    ["not JSON"],
    [JSON.stringify({ version: 2, nextAddSequence: 0, selectedClocks: [] })],
    [JSON.stringify({ version: 1, nextAddSequence: 1, selectedClocks: [
      { kind: "custom", selectionId: "a", addSequence: 1, name: "A", offsetMinutes: 0 },
    ] })],
    [JSON.stringify({ version: 1, nextAddSequence: 2, selectedClocks: [
      { kind: "custom", selectionId: "same", addSequence: 0, name: "A", offsetMinutes: 0 },
      { kind: "custom", selectionId: "same", addSequence: 1, name: "B", offsetMinutes: 15 },
    ] })],
    [JSON.stringify({ version: 1, nextAddSequence: 2, selectedClocks: [
      { kind: "custom", selectionId: "a", addSequence: 0, name: "Straße", offsetMinutes: 60 },
      { kind: "custom", selectionId: "b", addSequence: 1, name: "STRASSE", offsetMinutes: 60 },
    ] })],
    [JSON.stringify({ version: 1, nextAddSequence: 2, selectedClocks: [
      { kind: "city", selectionId: "a", addSequence: 0, catalogId: "same-city", city: "A", primaryCountryCode: "AA", countries: [{ code: "AA", name: "A" }], ianaId: "Etc/UTC" },
      { kind: "city", selectionId: "b", addSequence: 1, catalogId: "same-city", city: "B", primaryCountryCode: "BB", countries: [{ code: "BB", name: "B" }], ianaId: "Etc/UTC" },
    ] })],
  ])("rejects malformed, inconsistent, or unknown-newer snapshots", (raw) => {
    expect(() => decodeSelectedClockSnapshot(raw)).toThrow(
      "Invalid selected-clock snapshot",
    );
  });
});
