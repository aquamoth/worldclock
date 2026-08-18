import {
  generateClockCatalog,
  serializeClockCatalog,
  type CatalogGenerationInput,
} from "./generator";

const input = (): CatalogGenerationInput => ({
  metadata: {
    schemaVersion: 1,
    catalogVersion: 1,
    sourceVersion: "iana-tzdata-2026c",
    ianaRelease: "2026c",
  },
  zone1970Text: [
    "# country-code\tcoordinates\tTZ\tcomments",
    "BR\t-2332-04637\tAmerica/Sao_Paulo\tBrazil (southeast: GO, DF, MG, ES, RJ, SP, PR, SC, RS)",
    "SE\t+5920+01803\tEurope/Stockholm",
  ].join("\n"),
  iso3166Text: ["BR\tBrazil", "SE\tSweden"].join("\n"),
  curated: {
    curationVersion: 1,
    ianaRelease: "2026c",
    entries: [
      {
        id: "city-0002",
        ianaId: "Europe/Stockholm",
        city: "Stockholm",
        primaryCountryCode: "SE",
        aliases: [],
      },
      {
        id: "city-0001",
        ianaId: "America/Sao_Paulo",
        city: "São Paulo",
        primaryCountryCode: "BR",
        aliases: ["Sao Paulo"],
      },
    ],
  },
});

describe("clock catalog generator", () => {
  it("generates one deterministic entry per canonical IANA region", () => {
    const catalog = generateClockCatalog(input());

    expect(catalog).toEqual({
      schemaVersion: 1,
      catalogVersion: 1,
      sourceVersion: "iana-tzdata-2026c",
      ianaRelease: "2026c",
      entries: [
        {
          id: "city-0001",
          ianaId: "America/Sao_Paulo",
          city: "São Paulo",
          primaryCountryCode: "BR",
          countries: [{ code: "BR", name: "Brazil" }],
          aliases: ["Sao Paulo"],
        },
        {
          id: "city-0002",
          ianaId: "Europe/Stockholm",
          city: "Stockholm",
          primaryCountryCode: "SE",
          countries: [{ code: "SE", name: "Sweden" }],
          aliases: [],
        },
      ],
    });
    expect(serializeClockCatalog(catalog)).toBe(
      `${JSON.stringify(catalog, null, 2)}\n`,
    );
  });

  it("preserves every country from a multi-country source row", () => {
    const multiCountry = input();
    multiCountry.zone1970Text += "\nBE,LU,NL\t+5050+00420\tEurope/Brussels";
    multiCountry.iso3166Text += "\nBE\tBelgium\nLU\tLuxembourg\nNL\tNetherlands";
    multiCountry.curated.entries.push({
      id: "city-0003",
      ianaId: "Europe/Brussels",
      city: "Brussels",
      primaryCountryCode: "BE",
      aliases: [],
    });

    expect(
      generateClockCatalog(multiCountry).entries.find(
        ({ ianaId }) => ianaId === "Europe/Brussels",
      )?.countries,
    ).toEqual([
        { code: "BE", name: "Belgium" },
        { code: "LU", name: "Luxembourg" },
        { code: "NL", name: "Netherlands" },
      ]);
  });

  it.each([
    ["incomplete canonical coverage", (value: CatalogGenerationInput) => value.curated.entries.pop()],
    ["extra curated region", (value: CatalogGenerationInput) => value.curated.entries.push({ id: "extra", ianaId: "Etc/UTC", city: "UTC", primaryCountryCode: "SE", aliases: [] })],
    ["unknown source country", (value: CatalogGenerationInput) => { value.iso3166Text = "BR\tBrazil"; }],
    ["missing source version", (value: CatalogGenerationInput) => { value.metadata.sourceVersion = ""; }],
    ["mismatched release", (value: CatalogGenerationInput) => { value.curated.ianaRelease = "2026b"; }],
  ])("fails for %s", (_case, mutate) => {
    const value = input();
    mutate(value);
    expect(() => generateClockCatalog(value)).toThrow(/catalog/i);
  });
});
