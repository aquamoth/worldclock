import { observeAppLifecycle } from "./appLifecycle";
import type { AppStateStatus } from "react-native";

describe("application lifecycle adapter", () => {
  it("pauses for every non-active state, resumes active, and removes its listener", () => {
    let listener: ((state: AppStateStatus) => void) | undefined;
    const remove = jest.fn();
    const target = {
      enterBackground: jest.fn(),
      enterForeground: jest.fn(),
    };
    const dispose = observeAppLifecycle(
      {
        addEventListener: (_event, nextListener) => {
          listener = nextListener;
          return { remove };
        },
      },
      target,
    );

    listener?.("inactive");
    listener?.("background");
    listener?.("active");

    expect(target.enterBackground).toHaveBeenCalledTimes(2);
    expect(target.enterForeground).toHaveBeenCalledTimes(1);
    dispose();
    expect(remove).toHaveBeenCalledTimes(1);
  });
});
