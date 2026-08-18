import type {
  CityClockDefinition,
  CustomClockDefinition,
  SelectedClockDefinition,
} from "../domain/clockCollection";
import {
  cityDuplicateKey,
  customDuplicateKey,
  validateCustomTimezoneDraft,
} from "../domain/customTimezone";

export interface SelectedClockSnapshot {
  readonly version: 1;
  readonly nextAddSequence: number;
  readonly selectedClocks: readonly SelectedClockDefinition[];
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
  if (!isRecord(value)) return invalid(`selectedClocks[${index}] must be an object`);
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

const parseCustom = (value: Record<string, unknown>, index: number): CustomClockDefinition => {
  const name = typeof value.name === "string" ? value.name : "";
  const offsetMinutes = typeof value.offsetMinutes === "number" ? value.offsetMinutes : Number.NaN;
  const validated = validateCustomTimezoneDraft({ name, offsetMinutes });
  if (!validated.ok || validated.value.name !== name) {
    return invalid(`selectedClocks[${index}] must be a valid custom clock`);
  }
  return {
    kind: "custom",
    selectionId: requiredString(value.selectionId, `selectedClocks[${index}].selectionId`),
    addSequence: requiredNonnegativeInteger(value.addSequence, `selectedClocks[${index}].addSequence`),
    name: validated.value.name,
    offsetMinutes: validated.value.offsetMinutes,
  };
};

const parseSelected = (value: unknown, index: number): SelectedClockDefinition => {
  if (!isRecord(value)) return invalid(`selectedClocks[${index}] must be an object`);
  if (value.kind === "city") return parseCity(value, index);
  if (value.kind === "custom") return parseCustom(value, index);
  return invalid(`selectedClocks[${index}].kind must be city or custom`);
};

type SnapshotMigration = (
  value: Record<string, unknown>,
) => Record<string, unknown>;

const migrateVersionZero: SnapshotMigration = (value) => {
  if (!Array.isArray(value.selectedClocks)) {
    return invalid("legacy selectedClocks must be an array");
  }
  return {
    version: 1,
    nextAddSequence: value.selectedClocks.length,
    selectedClocks: value.selectedClocks.map((clock, addSequence) => {
      if (!isRecord(clock)) {
        return invalid(`legacy selectedClocks[${addSequence}] must be an object`);
      }
      return { ...clock, addSequence };
    }),
  };
};

const SNAPSHOT_MIGRATIONS: ReadonlyMap<number, SnapshotMigration> = new Map([
  [0, migrateVersionZero],
]);

const migrateToCurrent = (
  value: Record<string, unknown>,
): Record<string, unknown> => {
  let migrated = value;
  while (migrated.version !== 1) {
    if (!Number.isInteger(migrated.version)) {
      return invalid("version must be an integer");
    }
    const version = Number(migrated.version);
    if (version > 1) return invalid(`version ${version} is newer than supported version 1`);
    const migration = SNAPSHOT_MIGRATIONS.get(version);
    if (migration === undefined) return invalid(`version ${version} is unsupported`);
    migrated = migration(migrated);
  }
  return migrated;
};

export function decodeSelectedClockSnapshot(raw: string): SelectedClockSnapshot {
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return invalid("expected JSON");
  }
  if (!isRecord(value)) return invalid("snapshot must be an object");
  const current = migrateToCurrent(value);
  if (!Array.isArray(current.selectedClocks)) {
    return invalid("selectedClocks must be an array");
  }

  const nextAddSequence = requiredNonnegativeInteger(
    current.nextAddSequence,
    "nextAddSequence",
  );
  const selectedClocks = current.selectedClocks.map(parseSelected);
  const selectionIds = new Set<string>();
  const addSequences = new Set<number>();
  const duplicateIdentities = new Set<string>();
  for (const clock of selectedClocks) {
    if (selectionIds.has(clock.selectionId)) {
      return invalid(`selectionId ${clock.selectionId} must be unique`);
    }
    if (addSequences.has(clock.addSequence)) {
      return invalid(`addSequence ${clock.addSequence} must be unique`);
    }
    if (clock.addSequence >= nextAddSequence) {
      return invalid("nextAddSequence must exceed every selected addSequence");
    }
    const duplicateIdentity =
      clock.kind === "city"
        ? cityDuplicateKey(clock.catalogId)
        : customDuplicateKey(clock.name, clock.offsetMinutes);
    if (duplicateIdentities.has(duplicateIdentity)) {
      return invalid("selected clock duplicate identities must be unique");
    }
    selectionIds.add(clock.selectionId);
    addSequences.add(clock.addSequence);
    duplicateIdentities.add(duplicateIdentity);
  }

  return {
    version: 1,
    nextAddSequence,
    selectedClocks,
  };
}

export function encodeSelectedClockSnapshot(
  snapshot: SelectedClockSnapshot,
): string {
  return JSON.stringify({
    version: 1,
    nextAddSequence: snapshot.nextAddSequence,
    selectedClocks: snapshot.selectedClocks.map((clock) =>
      clock.kind === "city"
        ? {
            kind: "city",
            selectionId: clock.selectionId,
            addSequence: clock.addSequence,
            catalogId: clock.catalogId,
            city: clock.city,
            primaryCountryCode: clock.primaryCountryCode,
            countries: clock.countries.map(({ code, name }) => ({ code, name })),
            ianaId: clock.ianaId,
          }
        : {
            kind: "custom",
            selectionId: clock.selectionId,
            addSequence: clock.addSequence,
            name: clock.name,
            offsetMinutes: clock.offsetMinutes,
          },
    ),
  });
}

export const emptySelectedClockSnapshot = (): SelectedClockSnapshot => ({
  version: 1,
  nextAddSequence: 0,
  selectedClocks: [],
});
