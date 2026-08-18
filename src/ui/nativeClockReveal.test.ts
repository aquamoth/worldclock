import type { View } from "react-native";

import { revealClock } from "./nativeClockReveal";

it("scrolls to and accessibility-focuses an added clock through native APIs", () => {
  const scrollTo = jest.fn();
  const findNodeHandle = jest.fn(() => 42);
  const setAccessibilityFocus = jest.fn();
  const clockView = {} as View;

  revealClock(
    {
      scrollView: { scrollTo },
      clockView,
      position: 240,
      scrollIntoView: true,
      focus: true,
    },
    { findNodeHandle, setAccessibilityFocus },
  );

  expect(scrollTo).toHaveBeenCalledWith({ y: 216, animated: true });
  expect(findNodeHandle).toHaveBeenCalledWith(clockView);
  expect(setAccessibilityFocus).toHaveBeenCalledWith(42);
});
