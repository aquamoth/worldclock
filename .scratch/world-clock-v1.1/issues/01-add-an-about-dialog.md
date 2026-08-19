# Add an About dialog

Type: story
Status: open
Assignee:
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

Open.
