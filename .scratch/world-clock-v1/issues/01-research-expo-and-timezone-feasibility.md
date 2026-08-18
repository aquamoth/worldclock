# Research Expo and offline timezone feasibility

Type: research
Status: closed
Assignee: Codex
Blocked by:

## Question

Using primary sources, what capabilities, limitations, and viable options do current React Native/Expo and native Android provide for offline IANA timezone conversion, DST correctness, bundled city/country data, gesture handling, local persistence, system 12/24-hour settings, and a later Android widget path?

## Resolution

React Native with Expo is feasible for v1 without a custom native timezone module: Hermes `Intl` can use Android's offline IANA/ICU rules for DST-aware conversion, Expo supplies native-thread gesture handling, small persistent local storage, bundled assets, and the live system 12/24-hour preference. The app must own and version its city/country catalog because IANA data describes representative timezone regions rather than a comprehensive city gazetteer. Correctness remains bounded by the device's installed tzdata and must be verified under Hermes on the Pixel 7.

A later Android widget is also feasible, but it is a native `AppWidgetProvider`/`RemoteViews` or Glance surface added through Expo native modules/config plugins, not a reusable React view. V1 should therefore keep clock calculation and persisted records independent of React and provide an intentional native-readable state seam. Android `TextClock` is available in `RemoteViews` and can display a named zone while honoring system 12/24-hour mode; periodic widget refreshes cannot be scheduled more often than 30 minutes, so minute-by-minute JavaScript wakeups are not an acceptable design.

Full findings and primary-source citations: [Expo and offline timezone feasibility](../research/expo-and-offline-timezone-feasibility.md).
