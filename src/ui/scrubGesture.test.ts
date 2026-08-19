import { scrubStepsFromTravel } from "./scrubGesture";

it("converts accumulated horizontal travel into directional 9dp steps", () => {
  expect(scrubStepsFromTravel(9)).toBe(-1);
  expect(scrubStepsFromTravel(13)).toBe(-1);
  expect(scrubStepsFromTravel(18)).toBe(-2);
  expect(scrubStepsFromTravel(-9)).toBe(1);
  expect(scrubStepsFromTravel(-13)).toBe(1);
  expect(scrubStepsFromTravel(-18)).toBe(2);
});

it("mirrors every step when a rightward swipe is configured to move time later", () => {
  expect(scrubStepsFromTravel(9, "rightLater")).toBe(1);
  expect(scrubStepsFromTravel(18, "rightLater")).toBe(2);
  expect(scrubStepsFromTravel(-9, "rightLater")).toBe(-1);
  expect(scrubStepsFromTravel(-18, "rightLater")).toBe(-2);
  expect(scrubStepsFromTravel(0, "rightLater")).toBe(0);
  expect(scrubStepsFromTravel(9, "rightEarlier")).toBe(-1);
});
