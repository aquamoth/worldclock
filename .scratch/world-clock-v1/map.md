# World Clock v1: From product brief to validated Android app

Label: wayfinder:map

## Destination

Reach an implementation-ready v1 product and technical specification, then hand it into tracer-bullet implementation tasks whose completion produces an offline Android world-clock app installed and validated on the attached Pixel 7.

## Notes

- Use the `grilling` and `domain-modeling` skills for product decisions, `prototype` for interaction questions, and `research` for external facts.
- Work in phase order: finish and approve the specification; create implementation tasks; implement them; install and validate on the Pixel 7.
- Prefer React Native with Expo because the owner knows TypeScript. Native Kotlin is acceptable when evidence shows it materially lowers delivery risk.
- The local clock is always first. New installs otherwise start empty.
- Selected clocks persist and support ordering/removal. Same-timezone cities may coexist; exact duplicate entries may not.
- Display follows the phone's 12/24-hour preference; 12-hour time includes an AM/PM marker. Seconds are never shown.
- Horizontal scrubbing on any clock moves all clocks through virtual time, within 24 hours before or after now. Virtual time uses a distinct background treatment and an action labelled `Back`; it has no calendar UI or banner.
- City clocks use timezone rules including DST. Custom timezones have a required name and a fixed UTC offset from UTC−12:00 through UTC+14:00 in 15-minute increments.
- Selection is offline and searchable by city or country, with a separate custom-offset path.
- Show the city/custom name and effective `UTC±HH:MM` offset to the right of each digital time.
- Support system light/dark appearance, portrait-first responsive layout, font scaling, and screen readers.
- Automated timezone/UI coverage and a manual Pixel 7 acceptance pass are required.
- ADB currently detects device `34051JEHN12837` as unauthorized; the owner must accept its USB-debugging prompt before device work.

## Decisions so far

## Not yet specified

- Detailed visual hierarchy, clock-row density, gesture sensitivity, scrubbing feedback, and virtual-time background treatment await a hands-on prototype.
- Exact implementation seams, state ownership, and dependency choices await the application-foundation decision.
- The implementation-ticket structure and estimates await the approved specification.

## Out of scope

- Widget and lock-screen presentation are a later effort. This version should avoid needless architectural obstacles to them, but will neither specify nor implement a widget.
