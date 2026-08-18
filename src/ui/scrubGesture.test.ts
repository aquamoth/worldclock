import { scrubStepsFromTravel } from "./scrubGesture";

it("converts accumulated horizontal travel into directional 9dp steps", () => {
  expect(scrubStepsFromTravel(9)).toBe(-1);
  expect(scrubStepsFromTravel(13)).toBe(-1);
  expect(scrubStepsFromTravel(18)).toBe(-2);
  expect(scrubStepsFromTravel(-9)).toBe(1);
  expect(scrubStepsFromTravel(-13)).toBe(1);
  expect(scrubStepsFromTravel(-18)).toBe(2);
});
