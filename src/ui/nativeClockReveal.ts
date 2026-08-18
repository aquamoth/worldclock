import {
  AccessibilityInfo,
  findNodeHandle,
  type View,
} from "react-native";

interface ScrollTarget {
  scrollTo(options: { readonly y: number; readonly animated: boolean }): void;
}

export interface ClockRevealInput {
  readonly scrollView: ScrollTarget | null;
  readonly clockView: View | null;
  readonly position: number | undefined;
  readonly scrollIntoView: boolean;
  readonly focus: boolean;
}

interface NativeClockRevealDependencies {
  readonly findNodeHandle: (view: View) => number | null;
  readonly setAccessibilityFocus: (nativeTag: number) => void;
}

const nativeDependencies: NativeClockRevealDependencies = {
  findNodeHandle,
  setAccessibilityFocus: (nativeTag) =>
    AccessibilityInfo.setAccessibilityFocus(nativeTag),
};

export function revealClock(
  input: ClockRevealInput,
  native: NativeClockRevealDependencies = nativeDependencies,
): void {
  if (input.scrollIntoView && input.position !== undefined) {
    input.scrollView?.scrollTo({
      y: Math.max(input.position - 24, 0),
      animated: true,
    });
  }
  if (!input.focus || input.clockView === null) return;
  const nativeTag = native.findNodeHandle(input.clockView);
  if (nativeTag !== null) native.setAccessibilityFocus(nativeTag);
}
