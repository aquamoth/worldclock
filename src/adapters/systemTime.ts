import type { TimePort } from "../application/liveClock";

export const systemTime: TimePort = {
  now: Date.now,
  schedule: (callback, delayMs) => {
    const timeout = setTimeout(callback, delayMs);
    return () => clearTimeout(timeout);
  },
};
