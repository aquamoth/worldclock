import type { ClockCatalogEntry } from "./catalog";
import { normalizeCatalogSearchText, searchClockCatalog } from "./search";

const entry = (
  id: string,
  city: string,
  countryName: string,
  countryCode: string,
  aliases: string[] = [],
): ClockCatalogEntry => ({
  id,
  ianaId: `America/${city.replaceAll(" ", "_")}`,
  city,
  primaryCountryCode: countryCode,
  countries: [{ code: countryCode, name: countryName }],
  aliases,
});

const entries = [
  entry("city-0003", "São Paulo", "Brazil", "BR", ["Sao Paulo"]),
  entry("city-0001", "Paris", "France", "FR"),
  entry("city-0002", "Paris", "United States", "US", ["Paris Texas"]),
];

describe("offline clock catalog search", () => {
  it("normalizes case, diacritics, punctuation, and whitespace", () => {
    expect(normalizeCatalogSearchText("  SÃO---Paulo\t")).toBe("sao paulo");
  });

  it("returns the complete catalog in stable city/country/ID order for an empty query", () => {
    expect(searchClockCatalog(entries, "").map(({ id }) => id)).toEqual([
      "city-0001",
      "city-0002",
      "city-0003",
    ]);
  });

  it("requires every query term but does not require term order", () => {
    expect(searchClockCatalog(entries, "brazil paulo").map(({ id }) => id)).toEqual([
      "city-0003",
    ]);
    expect(searchClockCatalog(entries, "brazil france")).toEqual([]);
    expect(searchClockCatalog(entries, "  PAULO---são ").map(({ id }) => id)).toEqual([
      "city-0003",
    ]);
  });

  it("breaks equal city and country ranks by immutable catalog ID", () => {
    const tied = [
      entry("city-b", "Paris", "France", "FR"),
      entry("city-a", "Paris", "France", "FR"),
    ];

    expect(searchClockCatalog(tied, "paris").map(({ id }) => id)).toEqual([
      "city-a",
      "city-b",
    ]);
  });

  it("ranks exact, field-prefix, token-prefix, then substring matches", () => {
    const ranked = [
      entry("substring", "Caparis", "Example", "AA"),
      entry("token-prefix", "New Parisian", "Example", "AB"),
      entry("field-prefix", "Parisville", "Example", "AC"),
      entry("exact", "Paris", "Example", "AD"),
    ];

    expect(searchClockCatalog(ranked, "paris").map(({ id }) => id)).toEqual([
      "exact",
      "field-prefix",
      "token-prefix",
      "substring",
    ]);
  });

  it("searches country codes and aliases without implicitly searching raw IANA IDs", () => {
    expect(searchClockCatalog(entries, "BR").map(({ id }) => id)).toEqual([
      "city-0003",
    ]);
    expect(searchClockCatalog(entries, "texas").map(({ id }) => id)).toEqual([
      "city-0002",
    ]);
    expect(searchClockCatalog(entries, "America")).toEqual([]);
  });
});
