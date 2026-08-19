import { analogHandAngles } from "./analogHandAngles";

describe("analog hand angles", () => {
  it("places both hands at 12 for midnight and noon", () => {
    expect(analogHandAngles(0)).toEqual({ hourDegrees: 0, minuteDegrees: 0 });
    expect(analogHandAngles(12 * 60)).toEqual({
      hourDegrees: 0,
      minuteDegrees: 0,
    });
  });

  it("puts the hour hand at 3 and 6 on the hour", () => {
    expect(analogHandAngles(3 * 60)).toEqual({
      hourDegrees: 90,
      minuteDegrees: 0,
    });
    expect(analogHandAngles(6 * 60)).toEqual({
      hourDegrees: 180,
      minuteDegrees: 0,
    });
  });

  it("advances the hour hand with the minutes at 6:30", () => {
    expect(analogHandAngles(6 * 60 + 30)).toEqual({
      hourDegrees: 195,
      minuteDegrees: 180,
    });
  });

  it("maps 13:05 onto the same 1:05 dial position", () => {
    expect(analogHandAngles(13 * 60 + 5)).toEqual({
      hourDegrees: 32.5,
      minuteDegrees: 30,
    });
  });
});
