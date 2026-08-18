# 10 — Finish responsive light/dark and reduced-motion presentation

Parent: [Create tracer-bullet implementation tasks](../../issues/13-create-tracer-bullet-implementation-tasks.md)

Specification: [World Clock v1 implementation specification](../../spec.md)

Index: [World Clock v1 implementation tickets](../index.md)

**What to build:** The full clock, selector, custom form, confirmation, empty/cap/error, and Virtual-time surfaces remain readable and operable in compact/target viewports, large text, system light/dark appearance, and reduced motion. Required content wraps rather than overlapping or horizontally scrolling.

**Blocked by:** 04 — [Create and edit custom timezones](04-create-and-edit-custom-timezones.md); 05 — [Delete selected clocks safely](05-delete-selected-clocks-safely.md); 06 — [Make collection persistence and capacity failure-safe](06-make-collection-persistence-and-capacity-failure-safe.md); 08 — [Scrub any clock row without stealing vertical scroll](08-scrub-any-clock-row-without-stealing-vertical-scroll.md).

**Status:** ready-for-agent

**Delivery workflow:** Work directly on `master`; do not create a branch or pull request. Finish green and demoable. This is cross-surface completion, not a redesign or WebView port.

## Scoped seams

Shared semantic theme/tokens; responsive row/action-column and overlay layouts; typography/wrapping; reduced-motion adapter; chevron animation; contrast verification.

## Acceptance criteria

- [ ] Clock, selector, form, dialog, empty/cap/error, and Virtual surfaces work at compact and target viewports with normal and large text.
- [ ] Required time/text/day/action content never overlaps, loses essential content, or creates horizontal page scrolling; rows grow/wrap vertically.
- [ ] The far-right action column and every target remain at least 48dp and respect the target cutout.
- [ ] Light/dark treatments meet 4.5:1 normal-text and 3:1 large-text/meaningful-boundary contrast.
- [ ] Virtual time retains a non-color signal in both themes.
- [ ] Reduced motion stops chevron pulsing without removing the scrub affordance.
- [ ] No prototype-only control, explanation, relative label, timeline dot, or WebView ships.

## Automated acceptance subset

Render/component checks at 320×568dp and 411×914dp with font scales 1.0/1.35/2.0, light/dark, and Live/Virtual. Assert no clipping/collision/horizontal scroll, fixed 48dp action column/targets, required reading order, cutout-safe layout, Virtual non-color signal, contrast thresholds, reduced-motion animation behavior, and forbidden-prototype UI absence.

## Later Pixel 7a checkpoint

Inspect every named surface at font scales 1.35/2.0, light/dark, and reduced motion on the 411×914dp cutout display. Defer to ticket 13.
