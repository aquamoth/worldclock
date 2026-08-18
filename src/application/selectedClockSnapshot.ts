import type { CityClockDefinition } from "../domain/clockCollection";

export interface SelectedClockSnapshot {
  readonly version: 1;
  readonly nextAddSequence: number;
  readonly selectedClocks: readonly CityClockDefinition[];
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const invalid = (detail: string): never => {
  throw new Error(`Invalid selected-clock snapshot: ${detail}`);
};

const requiredString = (value: unknown, field: string): string => {
  if (typeof value !== "string" || value.length === 0) {
    return invalid(`${field} must be a nonempty string`);
  }
  return value;
};

const requiredNonnegativeInteger = (value: unknown, field: string): number => {
  if (!Number.isInteger(value) || Number(value) < 0) {
    return invalid(`${field} must be a nonnegative integer`);
  }
  return Number(value);
};

const parseCity = (value: unknown, index: number): CityClockDefinition => {
  if (!isRecord(value) || value.kind !== "city") {
    return invalid(`selectedClocks[${index}] must be a city clock`);
  }
  if (!Array.isArray(value.countries) || value.countries.length === 0) {
    return invalid(`selectedClocks[${index}].countries must be nonempty`);
  }
  const countries = value.countries.map((country, countryIndex) => {
    if (!isRecord(country)) {
      return invalid(
        `selectedClocks[${index}].countries[${countryIndex}] must be an object`,
      );
    }
    return {
      code: requiredString(
        country.code,
        `selectedClocks[${index}].countries[${countryIndex}].code`,
      ),
      name: requiredString(
        country.name,
        `selectedClocks[${index}].countries[${countryIndex}].name`,
      ),
    };
  });

  return {
    kind: "city",
    selectionId: requiredString(
      value.selectionId,
      `selectedClocks[${index}].selectionId`,
    ),
    addSequence: requiredNonnegativeInteger(
      value.addSequence,
      `selectedClocks[${index}].addSequence`,
    ),
    catalogId: requiredString(
      value.catalogId,
      `selectedClocks[${index}].catalogId`,
    ),
    city: requiredString(value.city, `selectedClocks[${index}].city`),
    primaryCountryCode: requiredString(
      value.primaryCountryCode,
      `selectedClocks[${index}].primaryCountryCode`,
    ),
    countries,
    ianaId: requiredString(value.ianaId, `selectedClocks[${index}].ianaId`),
  };
};

export function decodeSelectedClockSnapshot(raw: string): SelectedClockSnapshot {
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return invalid("expected JSON");
  }
  if (!isRecord(value) || value.version !== 1) {
    return invalid("version must be 1");
  }
  if (!Array.isArray(value.selectedClocks)) {
    return invalid("selectedClocks must be an array");
  }

  return {
    version: 1,
    nextAddSequence: requiredNonnegativeInteger(
      value.nextAddSequence,
      "nextAddSequence",
    ),
    selectedClocks: value.selectedClocks.map(parseCity),
  };
}

export function encodeSelectedClockSnapshot(
  snapshot: SelectedClockSnapshot,
): string {
  return JSON.stringify(snapshot);
}

export const emptySelectedClockSnapshot = (): SelectedClockSnapshot => ({
  version: 1,
  nextAddSequence: 0,
  selectedClocks: [],
});
