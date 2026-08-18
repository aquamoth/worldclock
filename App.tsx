import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo, useSyncExternalStore } from "react";
import { AppState } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { createBundledClockCatalog } from "./src/adapters/bundledClockCatalog";
import { createDevicePreferences } from "./src/adapters/devicePreferences";
import { createIntlTimezoneRules } from "./src/adapters/intlTimezoneRules";
import { createAsyncSelectedClockStorage } from "./src/adapters/selectedClockStorage";
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
        catalog: createBundledClockCatalog(),
        selectedClockStorage: createAsyncSelectedClockStorage(),
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
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ClockScreen
          model={model}
          onOpenSelector={application.openSelector}
          onSearchSelector={application.searchSelector}
          onCancelSelector={application.cancelSelector}
          onAddCity={(catalogId) => {
            void application.addCity(catalogId);
          }}
          onOpenCustomCreator={application.openCustomCreator}
          onOpenCustomEditor={application.openCustomEditor}
          onUpdateCustomName={application.updateCustomName}
          onSelectCustomOffset={application.selectCustomOffset}
          onCancelCustomForm={application.cancelCustomForm}
          onSaveCustom={() => {
            void application.saveCustom();
          }}
          onOpenDelete={application.openDelete}
          onCancelDelete={application.cancelDelete}
          onConfirmDelete={() => {
            void application.confirmDelete();
          }}
          onRetryPersistence={() => {
            void application.retryPersistence();
          }}
          onBeginStatusScrub={application.beginStatusScrub}
          onUpdateStatusScrub={application.updateStatusScrub}
          onEndStatusScrub={application.endStatusScrub}
          onCancelStatusScrub={application.cancelStatusScrub}
          onAdjustStatus={application.adjustStatus}
          onBeginRowScrub={application.beginRowScrub}
          onUpdateRowScrub={application.updateRowScrub}
          onEndRowScrub={application.endRowScrub}
          onCancelRowScrub={application.cancelRowScrub}
          onAdjustRow={application.adjustRow}
          onBackToLive={application.backToLive}
        />
        <StatusBar style="auto" />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
