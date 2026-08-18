import "react-native-gesture-handler";
import { registerRootComponent } from "expo";

import App from "./App";
import { runAndroidHermesConformance } from "./src/conformance/runtimeConformance";

runAndroidHermesConformance();
registerRootComponent(App);
