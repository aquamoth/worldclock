# 10 — Finish responsive light/dark and reduced-motion presentation

Parent: [Create tracer-bullet implementation tasks](../../issues/13-create-tracer-bullet-implementation-tasks.md)

Specification: [World Clock v1 implementation specification](../../spec.md)

Index: [World Clock v1 implementation tickets](../index.md)

**What to build:** The full clock, selector, custom form, confirmation, empty/cap/error, and Virtual-time surfaces remain readable and operable in compact/target viewports, large text, system light/dark appearance, and reduced motion. Required content wraps rather than overlapping or horizontally scrolling.

**Blocked by:** 04 — [Create and edit custom timezones](04-create-and-edit-custom-timezones.md); 05 — [Delete selected clocks safely](05-delete-selected-clocks-safely.md); 06 — [Make collection persistence and capacity failure-safe](06-make-collection-persistence-and-capacity-failure-safe.md); 08 — [Scrub any clock row without stealing vertical scroll](08-scrub-any-clock-row-without-stealing-vertical-scroll.md).

**Status:** complete

**Delivery workflow:** Work directly on `master`; do not create a branch or pull request. Finish green and demoable. This is cross-surface completion, not a redesign or WebView port.

## Scoped seams

Shared semantic theme/tokens; responsive row/action-column and overlay layouts; typography/wrapping; reduced-motion adapter; chevron animation; contrast verification.

## Acceptance criteria

- [x] Clock, selector, form, dialog, empty/cap/error, and Virtual surfaces work at compact and target viewports with normal and large text.
- [x] Required time/text/day/action content never overlaps, loses essential content, or creates horizontal page scrolling; rows grow/wrap vertically.
- [x] The far-right action column and every target remain at least 48dp and respect the target cutout.
- [x] Light/dark treatments meet 4.5:1 normal-text and 3:1 large-text/meaningful-boundary contrast.
- [x] Virtual time retains a non-color signal in both themes.
- [x] Reduced motion stops chevron pulsing without removing the scrub affordance.
- [x] No prototype-only control, explanation, relative label, timeline dot, or WebView ships.

## Automated acceptance subset

Render/component checks at 320×568dp and 411×914dp with font scales 1.0/1.35/2.0, light/dark, and Live/Virtual. Assert no clipping/collision/horizontal scroll, fixed 48dp action column/targets, required reading order, cutout-safe layout, Virtual non-color signal, contrast thresholds, reduced-motion animation behavior, and forbidden-prototype UI absence.

## Later Pixel 7a checkpoint

Inspect every named surface at font scales 1.35/2.0, light/dark, and reduced motion on the 411×914dp cutout display. Defer to ticket 13.

## Resolution

Added shared semantic light/dark themes with executable contrast checks and a viewport policy for compact width and large text. Clock/status rows now grow and stack without horizontal page scrolling; large-text times stay contained beside a fixed 48dp far-right action column, and external semantics follow time, name/offset/day, then actions. Selector, custom form, persistence/cap/empty states, and delete confirmation use constrained vertical scrolling and responsive wrapping while remaining inside native safe areas.

The automated matrix covers both required viewports, font scales 1.0/1.35/2.0, both themes, Live/Virtual rows, and every overlay/state surface. Reduced motion stops the pulse while preserving visible chevrons and adjustable actions; disabled controls retain compliant semantic colors rather than dimming the whole surface. All 224 tests, TypeScript, catalog validation (312/312), Expo Doctor (21/21), Android export, and the Android debug build pass. Independent standards and specification re-reviews found no remaining issue. Physical Pixel inspection remains deferred to ticket 13.
