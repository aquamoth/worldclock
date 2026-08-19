# Design the GitHub Pages product site

Type: grilling
Status: open
Assignee: Mattias Åslund
Blocked by:

## Question

What information architecture, content, and visual direction should the
user-facing World Clock site at https://aquamoth.github.io/worldclock/ use so
normal users can understand and trust the app, reach its support and privacy
information, and only secondarily navigate to the development repository?

## Shape of the work

- Grill this as its own product surface. Decide the audience, promise, page
  hierarchy, screenshots or demonstrations, Play Store install path, support
  route, and visual relationship to the app and dress-watch mark.
- Optimize the primary experience for people who use or may install World
  Clock. Include a small, secondary link to the development repository at
  https://github.com/aquamoth/worldclock; do not make the repository README the
  product landing page.
- Host a stable privacy policy on the Pages site and choose its permanent URL.
  Google Play requires the URL to be active, publicly accessible,
  non-geofenced, and not a PDF. The policy must identify World Clock or
  Trustfall AB, provide developer or privacy contact information, and clearly
  describe what personal or sensitive data the app accesses, collects, uses,
  and shares, including the parties with whom any data is shared, secure-data
  handling, and retention/deletion practices. For World Clock, make the
  no-collection and offline behavior explicit and keep it consistent with the
  Play Data safety declaration.
- The privacy-policy URL must be supplied in Play Console and exposed through a
  direct, discoverable in-app Privacy policy entry. This requirement does not
  bring back an About dialog.
- Decide whether GitHub Pages' own hosting/privacy implications need separate
  website disclosure from the app's no-data policy.
- Replace the current https://www.trustfall.se/worldclock homepage references
  in `app.json`, `package.json`, `README.md`, release conformance checks, and
  public-release planning only after the site's URL structure is settled.
- Primary policy source:
  [Google Play User Data policy — Privacy Policy](https://support.google.com/googleplay/android-developer/answer/17190352?hl=en&rd=2).
- Background research:
  [Android and Google Play guidance on an About surface](../research/android-about-surface.md).

## Resolution

Open.
