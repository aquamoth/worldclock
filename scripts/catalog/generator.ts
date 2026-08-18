import {
  parseClockCatalog,
  type ClockCatalog,
  type ClockCatalogEntry,
} from "../../src/catalog/catalog";

export interface CatalogReleaseMetadata {
  schemaVersion: number;
  catalogVersion: number;
  sourceVersion: string;
  ianaRelease: string;
}

export interface CuratedCatalogEntry {
  id: string;
  ianaId: string;
  city: string;
  primaryCountryCode: string;
  aliases: string[];
}

export interface CuratedCatalogSource {
  curationVersion: number;
  ianaRelease: string;
  entries: CuratedCatalogEntry[];
}

export interface CatalogGenerationInput {
  metadata: CatalogReleaseMetadata;
  zone1970Text: string;
  iso3166Text: string;
  curated: CuratedCatalogSource;
}

interface RepresentativeRegion {
  readonly countryCodes: readonly string[];
  readonly ianaId: string;
}

const fail = (detail: string): never => {
  throw new Error(`Invalid clock catalog generation input: ${detail}`);
};

const dataLines = (text: string): string[] =>
  text
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("#"));

const parseRegions = (text: string): RepresentativeRegion[] =>
  dataLines(text).map((line, index) => {
    const fields = line.split("\t");
    const countryField = fields[0];
    const ianaId = fields[2];
    if (!countryField || !ianaId) {
      return fail(`malformed zone1970.tab row ${index + 1}`);
    }
    return { countryCodes: countryField.split(","), ianaId };
  });

const parseCountries = (text: string): Map<string, string> => {
  const countries = new Map<string, string>();
  for (const [index, line] of dataLines(text).entries()) {
    const separator = line.indexOf("\t");
    if (separator < 0) fail(`malformed iso3166.tab row ${index + 1}`);
    const code = line.slice(0, separator);
    const name = line.slice(separator + 1);
    if (!/^[A-Z]{2}$/u.test(code) || name.length === 0 || countries.has(code)) {
      fail(`invalid or duplicate iso3166.tab country ${code || index + 1}`);
    }
    countries.set(code, name);
  }
  return countries;
};

export function generateClockCatalog(input: CatalogGenerationInput): ClockCatalog {
  const { metadata, curated } = input;
  if (
    metadata.schemaVersion !== 1 ||
    !Number.isInteger(metadata.catalogVersion) ||
    metadata.catalogVersion < 1 ||
    metadata.sourceVersion.length === 0 ||
    metadata.ianaRelease.length === 0 ||
    !Number.isInteger(curated.curationVersion) ||
    curated.curationVersion < 1
  ) {
    return fail("schema, catalog, source, release, and curation versions are required");
  }
  if (curated.ianaRelease !== metadata.ianaRelease) {
    return fail("curated source and release metadata disagree");
  }

  const regions = parseRegions(input.zone1970Text);
  const countryNames = parseCountries(input.iso3166Text);
  const regionsById = new Map(regions.map((region) => [region.ianaId, region]));
  if (regionsById.size !== regions.length) fail("duplicate canonical IANA region");

  const curatedById = new Map(curated.entries.map((entry) => [entry.ianaId, entry]));
  const missing = regions.filter(({ ianaId }) => !curatedById.has(ianaId));
  const extra = curated.entries.filter(({ ianaId }) => !regionsById.has(ianaId));
  if (
    curatedById.size !== curated.entries.length ||
    missing.length > 0 ||
    extra.length > 0
  ) {
    return fail(
      `canonical coverage mismatch: ${missing.length} missing, ${extra.length} extra`,
    );
  }

  const entries: ClockCatalogEntry[] = regions
    .map((region) => {
      const source = curatedById.get(region.ianaId);
      if (!source) return fail(`missing curation for ${region.ianaId}`);
      if (!region.countryCodes.includes(source.primaryCountryCode)) {
        return fail(`${region.ianaId} primary country is not present in zone1970.tab`);
      }
      const countries = region.countryCodes.map((code) => {
        const name = countryNames.get(code);
        if (!name) return fail(`unknown country code ${code} for ${region.ianaId}`);
        return { code, name };
      });
      return {
        id: source.id,
        ianaId: source.ianaId,
        city: source.city,
        primaryCountryCode: source.primaryCountryCode,
        countries,
        aliases: source.aliases,
      };
    })
    .sort((left, right) =>
      left.ianaId < right.ianaId ? -1 : left.ianaId > right.ianaId ? 1 : 0,
    );

  return parseClockCatalog({
    schemaVersion: metadata.schemaVersion,
    catalogVersion: metadata.catalogVersion,
    sourceVersion: metadata.sourceVersion,
    ianaRelease: metadata.ianaRelease,
    entries,
  });
}

export const serializeClockCatalog = (catalog: ClockCatalog): string =>
  `${JSON.stringify(catalog, null, 2)}\n`;

export interface CatalogGenerationReport {
  readonly schemaVersion: 1;
  readonly catalogVersion: number;
  readonly sourceVersion: string;
  readonly ianaRelease: string;
  readonly sourceRegionCount: number;
  readonly generatedEntryCount: number;
  readonly catalogSha256: string;
}

export function createCatalogGenerationReport(
  catalog: ClockCatalog,
  sourceRegionCount: number,
  catalogSha256: string,
): CatalogGenerationReport {
  if (!/^[a-f0-9]{64}$/u.test(catalogSha256)) {
    return fail("catalog report requires a SHA-256 checksum");
  }
  return {
    schemaVersion: 1,
    catalogVersion: catalog.catalogVersion,
    sourceVersion: catalog.sourceVersion,
    ianaRelease: catalog.ianaRelease,
    sourceRegionCount,
    generatedEntryCount: catalog.entries.length,
    catalogSha256,
  };
}
