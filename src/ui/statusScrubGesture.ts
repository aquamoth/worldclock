const STEP_TRAVEL_DP = 9;

export function statusStepsFromTravel(translationX: number): number {
  if (translationX === 0) return 0;
  const steps = Math.max(1, Math.floor(Math.abs(translationX) / STEP_TRAVEL_DP));
  return translationX > 0 ? -steps : steps;
}
