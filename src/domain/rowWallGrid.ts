import {
  wrapVirtualOffset,
  type StatusOffsetResult,
  type VirtualDirection,
} from "./statusOffsetGrid";

const QUARTER_MINUTES = 15;

const directionalReanchor = (
  rowWallMinuteOfDay: number,
  direction: VirtualDirection,
): number => {
  const remainder = rowWallMinuteOfDay % QUARTER_MINUTES;
  if (direction === "earlier") {
    return remainder === 0 ? -QUARTER_MINUTES : -remainder;
  }
  return remainder === 0 ? QUARTER_MINUTES : QUARTER_MINUTES - remainder;
};

export function stepRowOffset(
  offsetMinutes: number,
  rowWallMinuteOfDay: number,
  direction: VirtualDirection,
): StatusOffsetResult {
  return wrapVirtualOffset(
    offsetMinutes + directionalReanchor(rowWallMinuteOfDay, direction),
  );
}

export function moveRowOffset(
  gestureStartOffsetMinutes: number,
  rowWallMinuteOfDayAtStart: number,
  signedSteps: number,
): StatusOffsetResult {
  if (signedSteps === 0) {
    return { offsetMinutes: gestureStartOffsetMinutes, wrapped: false };
  }
  const direction = signedSteps < 0 ? "earlier" : "later";
  const first = directionalReanchor(rowWallMinuteOfDayAtStart, direction);
  const laterSteps = Math.max(0, Math.abs(signedSteps) - 1) * QUARTER_MINUTES;
  const signedLaterSteps = direction === "earlier" ? -laterSteps : laterSteps;
  return wrapVirtualOffset(
    gestureStartOffsetMinutes + first + signedLaterSteps,
  );
}
