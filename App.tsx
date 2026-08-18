import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo, useSyncExternalStore } from "react";
import { AppState } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { createDevicePreferences } from "./src/adapters/devicePreferences";
import { createIntlTimezoneRules } from "./src/adapters/intlTimezoneRules";
import { systemTime } from "./src/adapters/systemTime";
import { createLiveClockApplication } from "./src/application/liveClock";
import { ClockScreen } from "./src/ui/ClockScreen";

export default function App() {
  const application = useMemo(
    () =>
      createLiveClockApplication({
        time: systemTime,
        devicePreferences: createDevicePreferences(),
        timezoneRules: createIntlTimezoneRules(),
      }),
    [],
  );
  const model = useSyncExternalStore(
    application.subscribe,
    application.getScreen,
    application.getScreen,
  );

  useEffect(() => {
    application.start();
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") {
        application.refresh();
      }
    });

    return () => {
      subscription.remove();
      application.stop();
    };
  }, [application]);

  return (
    <SafeAreaProvider>
      <ClockScreen model={model} />
      <StatusBar style="auto" />
    </SafeAreaProvider>
  );
}
