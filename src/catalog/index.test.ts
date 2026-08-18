import { clockCatalog, searchClockCatalog } from "./index";

describe("bundled offline clock catalog", () => {
  it("loads all 312 canonical IANA representative regions", () => {
    expect(clockCatalog.entries).toHaveLength(312);
    expect(new Set(clockCatalog.entries.map(({ ianaId }) => ianaId)).size).toBe(312);
  });

  it("includes reviewed city metadata and ASCII aliases", () => {
    expect(
      clockCatalog.entries.find(({ ianaId }) => ianaId === "America/Sao_Paulo"),
    ).toMatchObject({
      city: "São Paulo",
      primaryCountryCode: "BR",
      aliases: ["Sao Paulo"],
    });
  });

  it("preserves all countries in canonical multi-country rows", () => {
    expect(
      clockCatalog.entries.find(({ ianaId }) => ianaId === "Europe/Brussels")
        ?.countries,
    ).toEqual([
      { code: "BE", name: "Belgium" },
      { code: "LU", name: "Luxembourg" },
      { code: "NL", name: "Netherlands" },
    ]);
  });

  it("finds São Paulo offline without exposing its raw IANA ID", () => {
    expect(searchClockCatalog(clockCatalog.entries, "sao paulo")[0]?.city).toBe(
      "São Paulo",
    );
    expect(searchClockCatalog(clockCatalog.entries, "America/Sao_Paulo")).toEqual(
      [],
    );
  });
});
