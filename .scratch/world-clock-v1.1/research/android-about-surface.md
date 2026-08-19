# Android and Google Play guidance on an About surface

Researched 2026-08-19 against official Android, Google Play, Google, and Apache sources.

## Conclusion

An in-app About dialog or screen is neither an Android platform requirement nor a general Google Play requirement. Current Android design guidance does not present About as a standard destination; it explicitly says to avoid putting app information such as the version and licensing information in Settings. It permits a separate app-info destination only **if necessary**.

For World Clock, an About dialog should therefore exist only if it solves a product need. It is not needed merely to follow Android convention. The Play listing and a user-facing website can carry product identity and support information. The one generally required in-app information surface is a discoverable privacy-policy link or text; this does not require an About dialog.

## Findings

### Android does not prescribe an About dialog

Android describes app settings as preferences controlling how the app behaves. Its current settings guidance says to “avoid information about the app, such as a version number or licensing information in settings.” Later it says that, **if necessary**, destinations such as app info, help, and feedback can receive a separate screen. This makes app-info optional and distinguishes it from behavioral settings; it does not establish an About dialog as a platform or Material standard. ([Android Developers: Settings](https://developer.android.com/design/ui/mobile/guides/patterns/settings))

Android also provides a system-owned details screen for every installed application through `Settings.ACTION_APPLICATION_DETAILS_SETTINGS`. Users therefore already have an OS-level app-details surface, although its exact presentation is device-dependent. ([Android API reference: `Settings`](https://developer.android.com/reference/android/provider/Settings#ACTION_APPLICATION_DETAILS_SETTINGS))

### Google Play puts identity, discovery, and support information in the store listing

The Play listing contains the app name, short description, and full description. A support email is required; a website is highly recommended for the support experience. These are Play Console/store-listing fields, not required in-app About content. ([Play Console Help: Create and set up your app](https://support.google.com/googleplay/android-developer/answer/9859152?hl=en))

Google Play developer-account verification separately supplies public developer identity and contact information. Organization accounts must provide an organization website, organization identity/address, developer email, and developer phone; Google states that the organization identity and contact details are displayed on Google Play. ([Play Console Help: Required developer-account information](https://support.google.com/googleplay/android-developer/answer/13628312?hl=en))

Consequently, a normal-user GitHub Pages landing page is compatible with Play's model: it can be the website attached to the developer/store presence and can link secondarily to the GitHub development repository. Its content and information architecture remain a product decision, not an About-dialog requirement.

### Version metadata is required; an in-app version label is not

Android requires release version metadata: `versionCode` is the internal monotonically increasing value, while `versionName` is the user-visible release identifier. Android notes that publishing services can display version information to users, but does not require the app to add its own About surface. ([Android Developers: Version your app](https://developer.android.com/studio/publish/versioning))

Displaying the installed `versionName` in-app can still be useful for support and diagnostics, but that is a convenience decision rather than Android or Play compliance.

### Privacy policy is the important in-app exception

Current Google Play policy requires **all apps** to provide a privacy-policy link in Play Console and a privacy-policy link or text within the app, including apps that access no personal or sensitive user data. The policy must identify the app or listed developer, include developer/privacy contact information, describe data practices, and be hosted at an active, public, non-geofenced, non-PDF URL. ([Google Play Developer Program Policy: Privacy Policy](https://support.google.com/googleplay/android-developer/answer/17190352?hl=en&rd=2))

Every published app must also complete the Play Data safety form; those declarations appear in the store listing, including a declaration that no data is collected or shared. ([Play Console Help: Data safety](https://support.google.com/googleplay/android-developer/answer/10787469?hl=en))

World Clock therefore needs a discoverable in-app **Privacy policy** entry. That can link directly to a policy hosted on the proposed GitHub Pages site; it does not need to be wrapped in an About dialog.

### Licenses do not create a blanket About-dialog requirement

Google Play does not impose a general requirement to display the app's own license in an About dialog. Third-party dependencies can create notice obligations under their individual licenses. Google's Android guidance for Google Play services tells developers to display required open-source notices appropriately and offers a dedicated OSS Licenses activity; this supports treating notices as their own compliance surface rather than assuming an About dialog. ([Google for Developers: Include open source notices](https://developers.google.com/android/guides/opensource))

The Apache License 2.0 itself imposes redistribution conditions, including providing recipients a copy of the license and preserving applicable notices. Exactly how World Clock packages or links its own and third-party notices should be checked against what is distributed; this is a licensing-compliance question, not an Android UI convention. ([Apache Software Foundation: Apache License 2.0](https://www.apache.org/licenses/LICENSE-2.0))

## Decision implication for World Clock

- Do not add an About dialog solely because it seems conventional on Android.
- Keep Settings focused on behavioral preferences, consistent with Android guidance.
- Provide a direct, discoverable in-app **Privacy policy** entry to satisfy Play policy.
- Use the Play listing and proposed user-facing GitHub Pages site for app identity, explanation, developer identity, and support/contact routes.
- Add a separate open-source-notices surface only if the shipped dependency licenses require it.
- Grill the landing page separately: audience, promise, content, support path, privacy-policy placement, store-install path, and the deliberately secondary link to the development repository are distinct product decisions.
