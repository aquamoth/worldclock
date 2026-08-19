# Add an About dialog

Type: story
Status: closed
Assignee: Mattias Åslund
Blocked by:

## Question

Where should the app present an About dialog, and what exactly should that
dialog show, so a user can reach the product landing page at
https://www.trustfall.se/worldclock without the app starting to depend on a
network?

## Shape of the work

- Surface an About dialog from a discoverable in-app control. Settings is the
  existing owner-facing overlay; that is the default candidate unless grilling
  finds a better place.
- Identify the app as World Clock by Trustfall AB, and include a control that
  opens https://www.trustfall.se/worldclock in the system browser. Opening the
  URL is a user-initiated navigation, not an app network feature: do not fetch
  remote content at runtime, and do not add Expo Updates or analytics.
- Include enough identity to be useful in a support or Play Store context
  (publisher, landing-page link). Decide during implementation whether version
  and license belong in the same dialog.
- Keep the dialog accessible: named actions, focus that returns to the opener,
  and a system-back/cancel path that dismisses without side effects.
- The landing page itself is populated in
  [Prepare for public release](../../world-clock-v1/issues/14-prepare-for-public-release.md).
  The in-app link may ship before that page exists, but the URL must stay in
  sync with `app.json` `extra.homepage`.

## Resolution

Do not add an About dialog. Android does not prescribe one, and its Settings
guidance says app information such as version and licensing information should
not normally appear among behavioral preferences. Google Play does not require
an About surface.

Move product identity, explanation, support, and discovery to the Play listing
and a user-facing GitHub Pages product site. Keep the development repository a
secondary destination from that site.

Google Play does require every app, including an app that collects no data, to
provide a privacy-policy link or text inside the app as well as a policy URL in
Play Console. World Clock will therefore expose a direct, discoverable Privacy
policy entry without wrapping it in an About dialog. The policy and site are to
be designed in
[Design the GitHub Pages product site](06-design-the-github-pages-product-site.md).

Research: [Android and Google Play guidance on an About surface](../research/android-about-surface.md).
