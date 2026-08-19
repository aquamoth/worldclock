export interface AnalogHandAngles {
  readonly hourDegrees: number;
  readonly minuteDegrees: number;
}

const MINUTES_PER_HOUR = 60;
const HOURS_ON_DIAL = 12;
const DEGREES_PER_TURN = 360;
const DEGREES_PER_HOUR = DEGREES_PER_TURN / HOURS_ON_DIAL;
const DEGREES_PER_MINUTE = DEGREES_PER_TURN / MINUTES_PER_HOUR;

export function analogHandAngles(wallMinuteOfDay: number): AnalogHandAngles {
  const minute = wallMinuteOfDay % MINUTES_PER_HOUR;
  const hourOnDial = Math.floor(wallMinuteOfDay / MINUTES_PER_HOUR) % HOURS_ON_DIAL;
  return {
    hourDegrees: hourOnDial * DEGREES_PER_HOUR + minute * (DEGREES_PER_HOUR / MINUTES_PER_HOUR),
    minuteDegrees: minute * DEGREES_PER_MINUTE,
  };
}
