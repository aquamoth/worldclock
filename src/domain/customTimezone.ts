import Graphemer from "graphemer";
import { caseFold } from "unicode-case-folding";

export const MIN_CUSTOM_OFFSET_MINUTES = -12 * 60;
export const MAX_CUSTOM_OFFSET_MINUTES = 14 * 60;
export const CUSTOM_OFFSET_STEP_MINUTES = 15;

export const CUSTOM_OFFSET_OPTIONS: readonly number[] = Array.from(
  {
    length:
      (MAX_CUSTOM_OFFSET_MINUTES - MIN_CUSTOM_OFFSET_MINUTES) /
        CUSTOM_OFFSET_STEP_MINUTES +
      1,
  },
  (_value, index) =>
    MIN_CUSTOM_OFFSET_MINUTES + index * CUSTOM_OFFSET_STEP_MINUTES,
);

export interface CustomTimezoneDraft {
  readonly name: string;
  readonly offsetMinutes: number;
}

export type CustomTimezoneValidation =
  | { readonly ok: true; readonly value: CustomTimezoneDraft }
  | {
      readonly ok: false;
      readonly nameError?: string;
      readonly offsetError?: string;
    };

const graphemer = new Graphemer();

export function isCustomOffsetMinutes(value: number): boolean {
  return (
    Number.isInteger(value) &&
    !Object.is(value, -0) &&
    value >= MIN_CUSTOM_OFFSET_MINUTES &&
    value <= MAX_CUSTOM_OFFSET_MINUTES &&
    value % CUSTOM_OFFSET_STEP_MINUTES === 0
  );
}

export function validateCustomTimezoneDraft(
  draft: CustomTimezoneDraft,
): CustomTimezoneValidation {
  const name = draft.name.trim();
  let nameError: string | undefined;
  if (name.length === 0) {
    nameError = "Enter a name.";
  } else if (/[\p{Cc}\p{Zl}\p{Zp}]/u.test(draft.name)) {
    nameError = "Name must be one line without control characters.";
  } else if (graphemer.countGraphemes(name) > 40) {
    nameError = "Name must contain at most 40 characters.";
  }

  const offsetError = isCustomOffsetMinutes(draft.offsetMinutes)
    ? undefined
    : "Choose an offset from UTC−12:00 through UTC+14:00 in 15-minute steps.";
  if (nameError !== undefined || offsetError !== undefined) {
    return {
      ok: false,
      ...(nameError === undefined ? {} : { nameError }),
      ...(offsetError === undefined ? {} : { offsetError }),
    };
  }

  return { ok: true, value: { name, offsetMinutes: draft.offsetMinutes } };
}

const normalizeCustomName = (name: string): string =>
  caseFold(name.normalize("NFKC")).trim().replace(/\s+/gu, " ");

export const customDuplicateKey = (
  name: string,
  offsetMinutes: number,
): string => `custom:${normalizeCustomName(name)}\u0000${offsetMinutes}`;

export const cityDuplicateKey = (catalogId: string): string =>
  `city:${catalogId}`;
