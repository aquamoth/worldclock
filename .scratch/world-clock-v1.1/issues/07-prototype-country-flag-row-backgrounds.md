# Prototype country-flag row backgrounds

Type: prototype
Status: open
Assignee:
Blocked by:

## Question

Can CIA World Factbook public-domain country flags work as very transparent
backgrounds (the owner imagines roughly 2% opacity) on each clock row, giving
the app more life without interfering with readability?

## Shape of the work

- Prototype on real rows in every layout design (grouped / airy / tiles) and
  both clock faces, in light and dark themes, before deciding. Tune the
  opacity by eye — 2% is the felt starting point, not a spec.
- Readability is the hard constraint: time, name, offset, and day difference
  must stay as legible as today, including for low-vision users. If a flag
  wash and Material You tonal surfaces fight each other, the feature loses.
- Map catalog city clocks to a country flag via the clock catalog's country
  identity. Decide what the local clock and custom timezones (which have no
  country) show — likely nothing.
- CIA World Factbook flag images are public domain, matching the offline,
  no-attribution-burden catalog approach; verify at asset-sourcing time and
  record provenance alongside the catalog data. Watch APK size: ~200+ flag
  assets must not bloat the bundle disproportionately.

## Resolution

Open.
