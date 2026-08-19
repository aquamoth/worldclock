import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { StatusBar } from "expo-status-bar";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import { AppState } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { createBundledClockCatalog } from "./src/adapters/bundledClockCatalog";
import { observeAppLifecycle } from "./src/adapters/appLifecycle";
import { createDevicePreferences } from "./src/adapters/devicePreferences";
import { createIntlTimezoneRules } from "./src/adapters/intlTimezoneRules";
import { createAsyncSelectedClockStorage } from "./src/adapters/selectedClockStorage";
import { systemTime } from "./src/adapters/systemTime";
import { createLiveClockApplication } from "./src/application/liveClock";
import {
  ClockScreen,
  clockFaces,
  designVariants,
  scrubDirections,
  type ClockFace,
  type DesignVariant,
} from "./src/ui/ClockScreen";
import type { ScrubDirection } from "./src/ui/scrubGesture";

const DESIGN_SETTING_KEY = "worldclock.design.v1";
const CLOCK_FACE_SETTING_KEY = "worldclock.clockFace.v1";
const SCRUB_DIRECTION_SETTING_KEY = "worldclock.scrubDirection.v1";

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

  const [design, setDesign] = useState<DesignVariant>("grouped");
  useEffect(() => {
    void AsyncStorage.getItem(DESIGN_SETTING_KEY).then((stored) => {
      if (designVariants.some(({ key }) => key === stored)) {
        setDesign(stored as DesignVariant);
      }
    });
  }, []);
  const selectDesign = useCallback((next: DesignVariant) => {
    setDesign(next);
    void AsyncStorage.setItem(DESIGN_SETTING_KEY, next);
  }, []);

  const [clockFace, setClockFace] = useState<ClockFace>("digital");
  useEffect(() => {
    void AsyncStorage.getItem(CLOCK_FACE_SETTING_KEY).then((stored) => {
      if (clockFaces.some(({ key }) => key === stored)) {
        setClockFace(stored as ClockFace);
      }
    });
  }, []);
  const selectClockFace = useCallback((next: ClockFace) => {
    setClockFace(next);
    void AsyncStorage.setItem(CLOCK_FACE_SETTING_KEY, next);
  }, []);

  const [scrubDirection, setScrubDirection] =
    useState<ScrubDirection>("rightEarlier");
  useEffect(() => {
    void AsyncStorage.getItem(SCRUB_DIRECTION_SETTING_KEY).then((stored) => {
      if (scrubDirections.some(({ key }) => key === stored)) {
        setScrubDirection(stored as ScrubDirection);
      }
    });
  }, []);
  const selectScrubDirection = useCallback((next: ScrubDirection) => {
    setScrubDirection(next);
    void AsyncStorage.setItem(SCRUB_DIRECTION_SETTING_KEY, next);
  }, []);

  // A light tick only when a scrub gesture lands back on live time; the Back
  // action and adjust buttons stay silent. Touch-classified on purpose: the
  // system Touch feedback setting decides whether and how strongly it plays.
  const withReturnToNowHaptic = useCallback(
    (update: (steps: number) => void) => (steps: number) => {
      const wasVirtual = application.getScreen().mode === "virtual";
      update(steps);
      if (wasVirtual && application.getScreen().mode === "live") {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    },
    [application],
  );
  const updateStatusScrub = useMemo(
    () => withReturnToNowHaptic(application.updateStatusScrub),
    [application, withReturnToNowHaptic],
  );
  const updateRowScrub = useMemo(
    () => withReturnToNowHaptic(application.updateRowScrub),
    [application, withReturnToNowHaptic],
  );

  useEffect(() => {
    application.start();
    const stopObservingLifecycle = observeAppLifecycle(AppState, application);

    return () => {
      stopObservingLifecycle();
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
          onUpdateStatusScrub={updateStatusScrub}
          onEndStatusScrub={application.endStatusScrub}
          onCancelStatusScrub={application.cancelStatusScrub}
          onAdjustStatus={application.adjustStatus}
          onBeginRowScrub={application.beginRowScrub}
          onUpdateRowScrub={updateRowScrub}
          onEndRowScrub={application.endRowScrub}
          onCancelRowScrub={application.cancelRowScrub}
          onAdjustRow={application.adjustRow}
          onFocusClock={application.reportClockFocus}
          onBackToLive={application.backToLive}
          design={design}
          onSelectDesign={selectDesign}
          clockFace={clockFace}
          onSelectClockFace={selectClockFace}
          scrubDirection={scrubDirection}
          onSelectScrubDirection={selectScrubDirection}
        />
        <StatusBar style="auto" />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
