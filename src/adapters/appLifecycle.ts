import type { AppStateStatus } from "react-native";

export interface AppLifecycleEvents {
  addEventListener(
    event: "change",
    listener: (state: AppStateStatus) => void,
  ): { remove(): void };
}

export interface AppLifecycleTarget {
  enterBackground(): void;
  enterForeground(): void;
}

export function observeAppLifecycle(
  events: AppLifecycleEvents,
  target: AppLifecycleTarget,
): () => void {
  const subscription = events.addEventListener("change", (nextState) => {
    if (nextState === "active") target.enterForeground();
    else target.enterBackground();
  });
  return () => subscription.remove();
}
