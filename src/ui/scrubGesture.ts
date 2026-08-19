const STEP_TRAVEL_DP = 9;

/**
 * Which way a rightward swipe moves time. "rightEarlier" drags the timeline
 * itself (content follows the finger), "rightLater" pushes time forward.
 */
export type ScrubDirection = "rightEarlier" | "rightLater";

export function scrubStepsFromTravel(
  translationX: number,
  direction: ScrubDirection = "rightEarlier",
): number {
  if (translationX === 0) return 0;
  const steps = Math.max(1, Math.floor(Math.abs(translationX) / STEP_TRAVEL_DP));
  const rightwardSteps = direction === "rightEarlier" ? -steps : steps;
  return translationX > 0 ? rightwardSteps : -rightwardSteps;
}
