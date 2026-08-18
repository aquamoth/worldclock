export type VirtualDirection = "earlier" | "later";

export interface StatusOffsetResult {
  readonly offsetMinutes: number;
  readonly wrapped: boolean;
}

const STEP_MINUTES = 15;
const WINDOW_EDGE_MINUTES = 24 * 60;
const WINDOW_SPAN_MINUTES = 48 * 60;

export const wrapVirtualOffset = (offsetMinutes: number): StatusOffsetResult => {
  let wrappedOffset = offsetMinutes;
  while (wrappedOffset > WINDOW_EDGE_MINUTES) {
    wrappedOffset -= WINDOW_SPAN_MINUTES;
  }
  while (wrappedOffset < -WINDOW_EDGE_MINUTES) {
    wrappedOffset += WINDOW_SPAN_MINUTES;
  }
  return {
    offsetMinutes: wrappedOffset,
    wrapped: wrappedOffset !== offsetMinutes,
  };
};

export function stepStatusOffset(
  offsetMinutes: number,
  direction: VirtualDirection,
): StatusOffsetResult {
  const delta = direction === "earlier" ? -STEP_MINUTES : STEP_MINUTES;
  return wrapVirtualOffset(offsetMinutes + delta);
}

export function moveStatusOffset(
  gestureStartOffsetMinutes: number,
  signedSteps: number,
): StatusOffsetResult {
  if (signedSteps === 0) {
    return { offsetMinutes: gestureStartOffsetMinutes, wrapped: false };
  }
  return wrapVirtualOffset(
    gestureStartOffsetMinutes + signedSteps * STEP_MINUTES,
  );
}
