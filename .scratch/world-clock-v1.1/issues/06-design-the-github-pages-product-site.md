# Design the GitHub Pages product site

Type: grilling
Status: closed
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

Designed and implemented in the same session at the owner's direction.

**Design.**

- Canonical product URL: `https://aquamoth.github.io/worldclock/`. Privacy
  policy permanently at `https://aquamoth.github.io/worldclock/privacy/`. No
  custom domain; trustfall.se may link here whenever desired.
- Two hand-written static pages (HTML/CSS, no JS, no webfonts, no analytics)
  served from `docs/` on `master` via Pages deploy-from-branch. Visual
  direction: classic dress-watch luxury extending the Small-Seconds Classic
  mark — dark dial background, ivory type, brass hands/accents, serif faces —
  deliberately not Material You mimicry. English only.
- Landing page order: hero (recolored mark, wordmark, headline **"Ad-free
  world clock with virtual time comparisons"**, no subline, a "Coming soon to
  Google Play" pill that becomes the official Play badge when v1 issue 14
  publishes) → preview section (placeholder frame; to be filled with a looping
  scrub screen-recording plus stills once captured) → three feature points:
  city and custom clocks (plain language, no DST jargon), virtual time
  ("slide any clock and every clock follows"), multiple designs with analog
  and digital clock faces → support (support@trustfall.se, GitHub issue
  tracker secondary) → footer (© 2026 Trustfall AB · Privacy policy · Source
  on GitHub).
- Privacy policy: three plain sections, no boilerplate and no website/hosting
  disclosure. (1) Who we are — Trustfall AB, contact support@trustfall.se.
  (2) What the app collects — nothing; no accounts, ads, or trackers; data
  stays on the device; nothing to secure, retain, or delete. (3) What
  "no tracking" means — never collect or sell personal data or user behavior;
  anonymous aggregate counters (installs/starts) may come later and the policy
  will say so before they ship. This calibration is deliberate: the claim must
  never overstate, because tracker-free counters are a real future intent.
- In-app entry: a "Privacy policy" link row at the bottom of the Settings
  overlay opening the policy URL in the system browser (user-initiated
  navigation; no runtime fetching; no About dialog, per
  [Add an About dialog](01-add-an-about-dialog.md)).
- Repo layout: `package.json` and the Expo app stay at the repo root
  (restructuring into an `app/` folder rejected as non-standard for a
  single-app Expo repo). The half-migrated template leftovers were cleaned up
  instead: `App.tsx` moved to `src/App.tsx` and the root `conformance/`
  fixture folded into `src/conformance/`. `LICENSE` and `NOTICE` stay in root.

**Implementation (this branch).**

- `docs/index.html`, `docs/privacy/index.html`, `docs/assets/site.css`,
  `docs/assets/mark.svg`, `docs/.nojekyll`.
- `src/application/productLinks.ts` exports `HOMEPAGE_URL` and
  `PRIVACY_POLICY_URL`; the release-configuration conformance test pins them
  to `app.json`/`package.json`.
- Settings overlay gained the optional `onOpenPrivacyPolicy` link row (with
  UI test); `src/App.tsx` wires it to `Linking.openURL`.
- Homepage references retargeted from `https://www.trustfall.se/worldclock`
  in `app.json`, `package.json`, `README.md`, and
  `src/conformance/releaseConfiguration.test.ts`.
- Full suite green: 30 suites, 258 tests.

**Remaining manual steps (owner).**

1. Merge this branch to `master` (`git merge --no-ff`).
2. Enable Pages: repo Settings → Pages → Deploy from a branch → `master`,
   folder `/docs`.
3. Capture the scrub screen-recording and stills and replace the preview
   placeholder; swap the Play pill for the official badge when the Play
   listing exists (v1 issue 14).
