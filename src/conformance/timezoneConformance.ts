import fixtureCorpus from "../../conformance/timezone-projection-fixtures.json";
import { formatEffectiveOffset, type HourPreference } from "../domain/clock";
import {
  projectClockCollection,
  type ClockCollectionProjection,
  type SelectedClockDefinition,
  type TimezoneRules,
} from "../domain/clockCollection";

interface ExpectedProjection {
  readonly calendarDate?: string;
  readonly time?: string;
  readonly period?: string | null;
  readonly effectiveOffset?: string;
  readonly dayDifference?: string | null;
}

type FixtureSelection =
  | {
      readonly kind: "city";
      readonly timeZone: string;
      readonly name: string;
    }
  | {
      readonly kind: "custom";
      readonly offsetMinutes: number;
      readonly name: string;
    };

interface ProjectionFixture {
  readonly id: string;
  readonly instant: string;
  readonly localTimeZone: string;
  readonly hourPreference: HourPreference;
  readonly selected?: FixtureSelection;
  readonly expected: {
    readonly local?: ExpectedProjection;
    readonly selected?: ExpectedProjection;
  };
}

interface ConformanceCorpus {
  readonly schemaVersion: number;
  readonly projectionCases: readonly ProjectionFixture[];
  readonly fixedOffsetRange: {
    readonly instant: string;
    readonly minimumMinutes: number;
    readonly maximumMinutes: number;
    readonly stepMinutes: number;
  };
}

export interface TimezoneConformanceReport {
  readonly schemaVersion: number;
  readonly projectionCases: number;
  readonly fixedOffsetCases: number;
  readonly totalCases: number;
}

const corpus = fixtureCorpus as ConformanceCorpus;

const fail = (fixtureId: string, detail: string): never => {
  throw new Error(`Timezone conformance failed for ${fixtureId}: ${detail}`);
};

const assertExpectedProjection = (
  fixtureId: string,
  actual: ClockCollectionProjection | undefined,
  expected: ExpectedProjection | undefined,
): void => {
  if (expected === undefined) return;
  if (actual === undefined) fail(fixtureId, "projection is missing");
  const actualFields = actual as unknown as Record<string, unknown>;
  for (const [field, expectedValue] of Object.entries(expected)) {
    const actualValue = actualFields[field];
    if (expectedValue === null) {
      if (actualValue !== undefined) {
        fail(fixtureId, `${field} expected to be absent but was ${String(actualValue)}`);
      }
    } else if (actualValue !== expectedValue) {
      fail(
        fixtureId,
        `${field} expected ${String(expectedValue)} but was ${String(actualValue)}`,
      );
    }
  }
  if ("second" in actualFields || "seconds" in actualFields) {
    fail(fixtureId, "projection exposed seconds");
  }
};

const selectedDefinition = (
  selection: FixtureSelection | undefined,
): readonly SelectedClockDefinition[] => {
  if (selection === undefined) return [];
  if (selection.kind === "custom") {
    return [
      {
        kind: "custom",
        selectionId: "selected",
        addSequence: 0,
        name: selection.name,
        offsetMinutes: selection.offsetMinutes,
      },
    ];
  }
  return [
    {
      kind: "city",
      selectionId: "selected",
      addSequence: 0,
      catalogId: `conformance-${selection.timeZone}`,
      city: selection.name,
      primaryCountryCode: "XX",
      countries: [{ code: "XX", name: "Conformance" }],
      ianaId: selection.timeZone,
    },
  ];
};

const runProjectionFixture = (
  fixture: ProjectionFixture,
  timezoneRules: TimezoneRules,
): void => {
  const instantMs = Date.parse(fixture.instant);
  if (!Number.isFinite(instantMs)) fail(fixture.id, "instant is invalid");
  const clocks = projectClockCollection(
    {
      instantMs,
      localTimeZone: fixture.localTimeZone,
      locale: "en-US",
      hourPreference: fixture.hourPreference,
      selected: selectedDefinition(fixture.selected),
    },
    timezoneRules,
  );
  assertExpectedProjection(
    fixture.id,
    clocks.find(({ id }) => id === "local"),
    fixture.expected.local,
  );
  assertExpectedProjection(
    fixture.id,
    clocks.find(({ id }) => id === "selected"),
    fixture.expected.selected,
  );
};

const runFixedOffsetRange = (timezoneRules: TimezoneRules): number => {
  const range = corpus.fixedOffsetRange;
  const instantMs = Date.parse(range.instant);
  let count = 0;
  for (
    let offsetMinutes = range.minimumMinutes;
    offsetMinutes <= range.maximumMinutes;
    offsetMinutes += range.stepMinutes
  ) {
    const fixtureId = `fixed-offset-range-${offsetMinutes}`;
    const projectedDate = new Date(instantMs + offsetMinutes * 60_000);
    const selected = projectClockCollection(
      {
        instantMs,
        localTimeZone: "UTC",
        locale: "en-US",
        hourPreference: "24-hour",
        selected: selectedDefinition({
          kind: "custom",
          offsetMinutes,
          name: "Reference",
        }),
      },
      timezoneRules,
    ).find(({ id }) => id === "selected");
    assertExpectedProjection(fixtureId, selected, {
      calendarDate: projectedDate.toISOString().slice(0, 10),
      time: `${projectedDate.getUTCHours().toString().padStart(2, "0")}:${projectedDate
        .getUTCMinutes()
        .toString()
        .padStart(2, "0")}`,
      effectiveOffset: formatEffectiveOffset(offsetMinutes),
    });
    count += 1;
  }
  return count;
};

export function runTimezoneConformance(
  timezoneRules: TimezoneRules,
): TimezoneConformanceReport {
  if (corpus.schemaVersion !== 1) {
    fail("corpus", `unsupported schema version ${corpus.schemaVersion}`);
  }
  for (const fixture of corpus.projectionCases) {
    runProjectionFixture(fixture, timezoneRules);
  }
  const fixedOffsetCases = runFixedOffsetRange(timezoneRules);
  return {
    schemaVersion: corpus.schemaVersion,
    projectionCases: corpus.projectionCases.length,
    fixedOffsetCases,
    totalCases: corpus.projectionCases.length + fixedOffsetCases,
  };
}
