# World Clock

Android world-clock application built with React Native, strict TypeScript, Expo CNG, and Hermes.

## Development

Requirements: Node.js 20 or newer, Java 21, and an Android SDK accepted by the pinned Expo SDK.

```sh
npm ci
npm run typecheck
npm test
npm run build:android
```

`npm run build:android` regenerates `android/` from [app.json](app.json) before compiling a debug APK. The generated native directory is intentionally ignored; app configuration and config plugins are the source of truth. Android 10/API 29 is the minimum supported release.

To run the development build without an internet connection after dependencies are installed:

```sh
npm start -- --offline
npm run android
```
