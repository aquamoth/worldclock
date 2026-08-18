import { statusStepsFromTravel } from "./statusScrubGesture";

it("converts accumulated horizontal travel into directional 9dp steps", () => {
  expect(statusStepsFromTravel(9)).toBe(-1);
  expect(statusStepsFromTravel(13)).toBe(-1);
  expect(statusStepsFromTravel(18)).toBe(-2);
  expect(statusStepsFromTravel(-9)).toBe(1);
  expect(statusStepsFromTravel(-13)).toBe(1);
  expect(statusStepsFromTravel(-18)).toBe(2);
});
