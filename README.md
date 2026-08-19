# World Clock

Offline Android world clock by [Trustfall AB](https://www.trustfall.se). It
projects one shared instant through the phone's local timezone and a collection
of selected city and custom clocks.

Product page: <https://aquamoth.github.io/worldclock/>

The local clock is always present. Selected clocks persist on the device: city
clocks follow IANA timezone rules including DST, and custom clocks use a name
plus a fixed UTC offset. Horizontal scrubbing on any clock moves every clock
through a shared virtual time, so you can compare what time it is there when it
is this time here. The app does not require a network connection.

## License

Copyright 2026 Trustfall AB.

Licensed under the [Apache License, Version 2.0](LICENSE).

The Apache License does not grant permission to use Trustfall AB's trade names,
trademarks, service marks, or product names, except as required for reasonable
and customary use in describing the origin of the work. Forks and derived apps
must not present themselves as World Clock by Trustfall AB.

The bundled city catalog includes IANA Time Zone Database data, which IANA
places in the public domain. See
[catalog/iana/2026c/LICENSE](catalog/iana/2026c/LICENSE).

The Pixel 8 device frame on the product site (`docs/assets/pixel8-frame.png`)
comes from [MockUPhone](https://github.com/oursky/mockuphone.com) by Oursky
(Apache License 2.0), frame artwork credited to
[Sajjad Mohammadi Nia](https://www.figma.com/@sajjadmohamamdi).

## Development

Requirements: Node.js `^20.19.4`, `^22.13.0`, `^24.3.0`, or `>=25.0.0`; pnpm 10;
Java 21; and an Android SDK accepted by the pinned Expo SDK.

```sh
pnpm install --frozen-lockfile
pnpm run typecheck
pnpm test
pnpm run build:android
```

`pnpm run build:android` regenerates `android/` from [app.json](app.json) before
compiling a debug APK. The generated native directory is intentionally ignored;
app configuration and config plugins are the source of truth. Android 10/API 29
is the minimum supported release.

To run the development build without an internet connection after dependencies
are installed:

```sh
pnpm start --offline
pnpm run android
```

## Contributing

External pull requests are welcome. Open a PR against `master` from a topic
branch. Maintainers merge with a merge commit (`git merge --no-ff`); do not
expect squash-on-merge. Keep the test suite green.

By submitting a pull request, you agree that your contribution is licensed under
the Apache License, Version 2.0.
