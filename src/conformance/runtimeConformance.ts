import { createIntlTimezoneRules } from "../adapters/intlTimezoneRules";
import {
  runTimezoneConformance,
  type TimezoneConformanceReport,
} from "./timezoneConformance";

export interface HermesConformanceEnvironment {
  readonly hermesInternal: unknown;
  readonly record: (message: string) => void;
}

const runtimeEnvironment = (): HermesConformanceEnvironment => ({
  hermesInternal: (globalThis as { HermesInternal?: unknown }).HermesInternal,
  record: (message) => console.info(message),
});

export function runAndroidHermesConformance(
  environment: HermesConformanceEnvironment = runtimeEnvironment(),
): TimezoneConformanceReport {
  if (environment.hermesInternal === undefined) {
    throw new Error("Hermes runtime is required for Android timezone conformance");
  }
  const report = runTimezoneConformance(createIntlTimezoneRules());
  environment.record(
    `WORLD_CLOCK_HERMES_CONFORMANCE_PASS ${JSON.stringify(report)}`,
  );
  return report;
}
