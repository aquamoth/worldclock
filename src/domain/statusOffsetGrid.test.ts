import {
  moveStatusOffset,
  stepStatusOffset,
} from "./statusOffsetGrid";

describe("status-surface offset grid", () => {
  it("moves from a gesture-start offset by exact signed quarter-hour steps", () => {
    expect(moveStatusOffset(0, -1)).toEqual({
      offsetMinutes: -15,
      wrapped: false,
    });
    expect(moveStatusOffset(0, 1)).toEqual({
      offsetMinutes: 15,
      wrapped: false,
    });
    expect(moveStatusOffset(15, 2)).toEqual({
      offsetMinutes: 45,
      wrapped: false,
    });
    expect(moveStatusOffset(15, 1)).toEqual({
      offsetMinutes: 30,
      wrapped: false,
    });
  });

  it("wraps both inclusive 24-hour edges across the cyclic window", () => {
    expect(stepStatusOffset(1440, "later")).toEqual({
      offsetMinutes: -1425,
      wrapped: true,
    });
    expect(stepStatusOffset(-1440, "earlier")).toEqual({
      offsetMinutes: 1425,
      wrapped: true,
    });
  });
});
