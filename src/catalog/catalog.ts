import { normalizeCatalogSearchText } from "./search";

export interface CatalogCountry {
  readonly code: string;
  readonly name: string;
}

export interface ClockCatalogEntry {
  readonly id: string;
  readonly ianaId: string;
  readonly city: string;
  readonly primaryCountryCode: string;
  readonly countries: readonly CatalogCountry[];
  readonly aliases: readonly string[];
}

export interface ClockCatalog {
  readonly schemaVersion: 1;
  readonly catalogVersion: number;
  readonly sourceVersion: string;
  readonly ianaRelease: string;
  readonly entries: readonly ClockCatalogEntry[];
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const fail = (detail: string): never => {
  throw new Error(`Invalid clock catalog: ${detail}`);
};

const requiredSingleLine = (value: unknown, field: string): string => {
  if (
    typeof value !== "string" ||
    value.trim().length === 0 ||
    /[\r\n\u2028\u2029]/u.test(value)
  ) {
    return fail(`${field} must be a nonempty single-line string`);
  }
  return value;
};

const countryCode = (value: unknown, field: string): string => {
  if (typeof value !== "string" || !/^[A-Z]{2}$/u.test(value)) {
    return fail(`${field} must be an uppercase ISO country code`);
  }
  return value;
};

const parseEntry = (value: unknown, index: number): ClockCatalogEntry => {
  if (!isRecord(value)) return fail(`entries[${index}] must be an object`);

  const id = requiredSingleLine(value.id, `entries[${index}].id`);
  const ianaId = requiredSingleLine(value.ianaId, `entries[${index}].ianaId`);
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: ianaId }).format(0);
  } catch {
    return fail(`entries[${index}].ianaId is not supported: ${ianaId}`);
  }

  const city = requiredSingleLine(value.city, `entries[${index}].city`);
  const primaryCountryCode = countryCode(
    value.primaryCountryCode,
    `entries[${index}].primaryCountryCode`,
  );
  if (!Array.isArray(value.countries) || value.countries.length === 0) {
    return fail(`entries[${index}].countries must be nonempty`);
  }
  const seenCountries = new Set<string>();
  const countries = value.countries.map((country, countryIndex) => {
    if (!isRecord(country)) {
      return fail(`entries[${index}].countries[${countryIndex}] must be an object`);
    }
    const code = countryCode(
      country.code,
      `entries[${index}].countries[${countryIndex}].code`,
    );
    if (seenCountries.has(code)) return fail(`duplicate country code ${code}`);
    seenCountries.add(code);
    return {
      code,
      name: requiredSingleLine(
        country.name,
        `entries[${index}].countries[${countryIndex}].name`,
      ),
    };
  });
  if (!seenCountries.has(primaryCountryCode)) {
    return fail(`entries[${index}] does not include its primary country`);
  }
  if (!Array.isArray(value.aliases)) {
    return fail(`entries[${index}].aliases must be an array`);
  }
  const normalizedAliases = new Set<string>();
  const aliases = value.aliases.map((alias, aliasIndex) => {
    const parsed = requiredSingleLine(
      alias,
      `entries[${index}].aliases[${aliasIndex}]`,
    );
    const normalized = normalizeCatalogSearchText(parsed);
    if (normalizedAliases.has(normalized)) {
      return fail(`entries[${index}] has duplicate normalized aliases`);
    }
    normalizedAliases.add(normalized);
    return parsed;
  });

  return { id, ianaId, city, primaryCountryCode, countries, aliases };
};

export function parseClockCatalog(value: unknown): ClockCatalog {
  if (!isRecord(value)) {
    return fail("expected an object");
  }
  if (value.schemaVersion !== 1) fail("schemaVersion must be 1");
  if (!Number.isInteger(value.catalogVersion) || Number(value.catalogVersion) < 1) {
    fail("catalogVersion must be a positive integer");
  }
  if (typeof value.sourceVersion !== "string" || value.sourceVersion.length === 0) {
    fail("sourceVersion is required");
  }
  if (typeof value.ianaRelease !== "string" || value.ianaRelease.length === 0) {
    fail("ianaRelease is required");
  }
  if (!Array.isArray(value.entries)) fail("entries must be an array");

  const seenIds = new Set<string>();
  const seenIanaIds = new Set<string>();
  const entries = (value.entries as unknown[]).map((entry, index) => {
    const parsed = parseEntry(entry, index);
    if (seenIds.has(parsed.id)) fail(`duplicate catalog ID: ${parsed.id}`);
    if (seenIanaIds.has(parsed.ianaId)) fail(`duplicate IANA ID: ${parsed.ianaId}`);
    seenIds.add(parsed.id);
    seenIanaIds.add(parsed.ianaId);
    return parsed;
  });

  return {
    schemaVersion: 1,
    catalogVersion: value.catalogVersion as number,
    sourceVersion: value.sourceVersion as string,
    ianaRelease: value.ianaRelease as string,
    entries,
  };
}
