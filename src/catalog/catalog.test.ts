import { parseClockCatalog } from "./catalog";

const catalogWith = (entries: unknown[]) => ({
  schemaVersion: 1,
  catalogVersion: 1,
  sourceVersion: "iana-tzdata-2026c",
  ianaRelease: "2026c",
  entries,
});

const stockholm = {
  id: "city-0001",
  ianaId: "Europe/Stockholm",
  city: "Stockholm",
  primaryCountryCode: "SE",
  countries: [{ code: "SE", name: "Sweden" }],
  aliases: [],
};

describe("clock catalog parser", () => {
  it("accepts a versioned catalog through the public contract", () => {
    expect(
      parseClockCatalog(catalogWith([stockholm])).entries[0],
    ).toEqual({
      id: "city-0001",
      ianaId: "Europe/Stockholm",
      city: "Stockholm",
      primaryCountryCode: "SE",
      countries: [{ code: "SE", name: "Sweden" }],
      aliases: [],
    });
  });

  it.each([
    ["missing schemaVersion", { catalogVersion: 1, sourceVersion: "source", ianaRelease: "2026c", entries: [] }],
    ["unsupported schemaVersion", { schemaVersion: 2, catalogVersion: 1, sourceVersion: "source", ianaRelease: "2026c", entries: [] }],
    ["missing catalogVersion", { schemaVersion: 1, sourceVersion: "source", ianaRelease: "2026c", entries: [] }],
    ["missing sourceVersion", { schemaVersion: 1, catalogVersion: 1, ianaRelease: "2026c", entries: [] }],
    ["missing ianaRelease", { schemaVersion: 1, catalogVersion: 1, sourceVersion: "source", entries: [] }],
  ])("rejects %s", (_case, value) => {
    expect(() => parseClockCatalog(value)).toThrow(/catalog/i);
  });

  it.each([
    ["duplicate catalog IDs", [stockholm, { ...stockholm, ianaId: "Europe/Oslo" }]],
    ["duplicate IANA IDs", [stockholm, { ...stockholm, id: "city-0002" }]],
    ["unsupported IANA IDs", [{ ...stockholm, ianaId: "Nowhere/Imaginary" }]],
    ["empty city", [{ ...stockholm, city: "" }]],
    ["multiline city", [{ ...stockholm, city: "Stock\nholm" }]],
    ["lowercase country code", [{ ...stockholm, primaryCountryCode: "se", countries: [{ code: "se", name: "Sweden" }] }]],
    ["missing primary country", [{ ...stockholm, primaryCountryCode: "NO" }]],
    ["duplicate normalized aliases", [{ ...stockholm, aliases: ["S:t Eriksplan", "s t eriksplan"] }]],
    ["aliases colliding across entries", [stockholm, { ...stockholm, id: "city-0002", ianaId: "Europe/Oslo", aliases: ["Nordic capital"] }, { ...stockholm, id: "city-0003", ianaId: "Europe/Copenhagen", primaryCountryCode: "DK", countries: [{ code: "DK", name: "Denmark" }], aliases: ["nordic-capital"] }]],
    ["missing ASCII city alias", [{ ...stockholm, ianaId: "America/Sao_Paulo", city: "São Paulo" }]],
  ])("rejects entries with %s", (_case, entries) => {
    expect(() => parseClockCatalog(catalogWith(entries))).toThrow(/catalog/i);
  });
});
