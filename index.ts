import "react-native-gesture-handler";
import { registerRootComponent } from "expo";

import App from "./src/App";
import { runAndroidHermesConformance } from "./src/conformance/runtimeConformance";

runAndroidHermesConformance();
registerRootComponent(App);
