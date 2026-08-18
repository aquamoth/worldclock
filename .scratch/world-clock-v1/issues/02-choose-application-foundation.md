# Choose the application foundation

Type: grilling
Status: closed
Assignee: Codex
Blocked by: 01

## Question

Given the owner's TypeScript/Expo preference and the researched delivery constraints, which application foundation, workflow, minimum Android version, and module boundaries should the v1 specification commit to?

## Resolution

Build the Android v1 in strict TypeScript with React Native, the current stable Expo SDK selected and pinned when implementation begins, and Hermes. Use Expo's Continuous Native Generation workflow: keep native changes reproducible in app configuration, config plugins, or local Expo modules rather than treating generated `android/` output as source. Develop and accept on a development or release build installed on the connected Pixel 7; Expo Go may be used only for early UI work. Repository changes land directly on `master`; this repository does not use a pull-request workflow.

Support Android 10 / API 29 and newer. The owner only requires the connected Pixel, and delegated the baseline choice; API 29 gives v1 Android's modular timezone-data baseline without adding validation work for older releases. Compile and target SDK levels follow the pinned Expo SDK's requirements rather than being independently frozen.

Use four inward-pointing module boundaries:

1. **Domain (`src/domain`)** — pure TypeScript clock definitions and calculations. It accepts an instant plus a city or custom timezone definition and returns local display fields, effective offset, and day difference. It imports neither React nor Expo and never reads the wall clock itself.
2. **Application (`src/application`)** — owns the selected-clock collection, ordering, live/virtual-time state, the single instant shared by every row, and use cases. It talks to time, device-preference, catalog, and persistence ports rather than platform APIs.
3. **Adapters (`src/adapters`)** — implements those ports with Hermes `Intl.DateTimeFormat`, `expo-localization`, bundled versioned catalog JSON, and `@react-native-async-storage/async-storage`. Persistence uses versioned discriminated records and exposes a plain serializable snapshot boundary that a future native widget adapter can mirror; v1 does not implement that widget or couple native code to Async Storage internals.
4. **UI (`src/ui`)** — React Native screens and components. `react-native-gesture-handler` translates scrubbing into application actions; components render projections and contain no timezone arithmetic or persistence access.

Keep state management inside the application boundary using ordinary React state/context plus a reducer unless measured complexity requires another library. Do not add Redux, a bundled timezone-rule library, SQLite, Reanimated, or a custom Kotlin timezone module pre-emptively. Escalate only when the catalog decision or on-device evidence demonstrates the need. Verify Hermes timezone/DST behavior, 12/24-hour changes, signed date differences, persistence, and scrub performance on the Pixel 7 before treating the foundation as accepted in implementation.
