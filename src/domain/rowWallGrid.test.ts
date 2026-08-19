import { moveRowOffset, stepRowOffset } from "./rowWallGrid";

describe("row wall-clock quarter-hour grid", () => {
  it("directionally reanchors a between-quarter row and moves away from an exact quarter", () => {
    expect(stepRowOffset(0, 7 * 60 + 32, "earlier")).toEqual({
      offsetMinutes: -2,
      wrapped: false,
    });
    expect(stepRowOffset(0, 7 * 60 + 32, "later")).toEqual({
      offsetMinutes: 13,
      wrapped: false,
    });
    expect(stepRowOffset(0, 7 * 60 + 30, "earlier")).toEqual({
      offsetMinutes: -15,
      wrapped: false,
    });
    expect(stepRowOffset(0, 7 * 60 + 30, "later")).toEqual({
      offsetMinutes: 15,
      wrapped: false,
    });
  });

  it("derives every move from gesture-start state on the row's absolute lattice", () => {
    expect(moveRowOffset(0, 7 * 60 + 32, -1)).toEqual({
      offsetMinutes: -2,
      wrapped: false,
    });
    expect(moveRowOffset(0, 7 * 60 + 32, -2)).toEqual({
      offsetMinutes: -17,
      wrapped: false,
    });
    expect(moveRowOffset(0, 7 * 60 + 32, 2)).toEqual({
      offsetMinutes: 28,
      wrapped: false,
    });
    expect(moveRowOffset(0, 7 * 60 + 32, 0)).toEqual({
      offsetMinutes: 0,
      wrapped: false,
    });
  });

  it("holds a detent at live time when a row gesture crosses zero", () => {
    expect(moveRowOffset(28, 8 * 60, -2)).toEqual({
      offsetMinutes: 0,
      wrapped: false,
    });
    expect(moveRowOffset(28, 8 * 60, -3)).toEqual({
      offsetMinutes: 0,
      wrapped: false,
    });
    expect(moveRowOffset(28, 8 * 60, -4)).toEqual({
      offsetMinutes: -2,
      wrapped: false,
    });
  });

  it("preserves a nonzero row-derived remainder across both wrap directions", () => {
    expect(stepRowOffset(23 * 60 + 58, 7 * 60 + 30, "later")).toEqual({
      offsetMinutes: -(23 * 60 + 47),
      wrapped: true,
    });
    expect(
      stepRowOffset(-(23 * 60 + 47), 7 * 60 + 45, "earlier"),
    ).toEqual({
      offsetMinutes: 23 * 60 + 58,
      wrapped: true,
    });
  });
});
