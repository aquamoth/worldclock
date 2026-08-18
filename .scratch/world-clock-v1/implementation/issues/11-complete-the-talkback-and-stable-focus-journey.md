# 11 — Complete the TalkBack and stable-focus journey

Parent: [Create tracer-bullet implementation tasks](../../issues/13-create-tracer-bullet-implementation-tasks.md)

Specification: [World Clock v1 implementation specification](../../spec.md)

Index: [World Clock v1 implementation tickets](../index.md)

**What to build:** A TalkBack user can traverse, understand, add, validate, edit, delete, chronologically follow, scrub through both grids, wrap, and return to Live without sight or focus loss. Decorative glyphs remain silent and state announcements are concise rather than multiplying across rows.

**Blocked by:** 09 — [Preserve Virtual time through lifecycle and collection changes](09-preserve-virtual-time-through-lifecycle-and-collection-changes.md); 10 — [Finish responsive light/dark and reduced-motion presentation](10-finish-responsive-light-dark-and-reduced-motion-presentation.md).

**Status:** complete

**Assignee:** Codex

**Delivery workflow:** Work directly on `master`; do not create a branch or pull request. Finish green and fully operable without pointer-only steps.

## Scoped seams

Accessible roles/names/values/hints/actions for all existing surfaces; announcement coordinator; stable-ID focus restoration/deferred reorder behavior; overlay focus entry/return; semantic reading order. Feature behavior remains owned by earlier slices.

## Acceptance criteria

- [x] TalkBack traversal follows time, name, effective offset, day difference, then row action and distinguishes Local from selected clocks.
- [x] Add, Edit, Delete, and Back are named; row/status scrub surfaces expose useful adjustable values/actions and hardware parity.
- [x] Chevrons/revert glyph remain hidden from the accessibility tree.
- [x] Entry, change, wrap, Back, mutation, validation, and error announcements occur politely and once without per-row shared-update chatter.
- [x] Focus survives chronological/DST/timezone movement, add/edit, overlays, and deferred reorder by stable identity.
- [x] Confirmed deletion uses the next/previous/Add fallback.
- [x] The full app can be searched, mutated, scrubbed, wrapped, and returned to Live without sight or pointer-only interaction.

## Automated acceptance subset

Cover full semantic traversal order, Local/selected distinction, displayed value semantics, every named action, both adjustable surfaces and increment/decrement, hidden decoration, single announcement coordination, focus across reorder/add/edit/delete/overlay close, deletion fallbacks, keyboard parity, and end-to-end nonpointer operation.

## Later Pixel 7a checkpoint

Execute the complete TalkBack scenario from acceptance ticket 10, including search, validation, edit, confirmation, both scrub surfaces, wrap, focus retention, errors, and Back. Defer to ticket 13.

## Resolution

Completed the native nonvisual journey with explicit Local/selected row semantics, chronological time/name/offset/day/action traversal, named actions, adjustable row/status values and keyboard actions, and silent decorative chevrons/revert/delete glyphs. The application now coordinates one announcement for Virtual changes and wrap/Back plus successful add/edit/delete, validation, and retryable errors, without per-row update chatter.

Stable keyed row subtrees and stable native control IDs preserve passive TalkBack identity across projection reorders; keyboard focus is reported from every row control and explicitly restored if its row moves. Leaving a row clears that intent so focus is never stolen. Selector, custom-form, and delete overlays receive explicit native entry focus, while cancel/success paths return to the selector, stable rows, or the documented next/previous/Add deletion fallback. Automated coverage exercises semantics, a connected nonpointer journey, overlay entry/return, mutation/error announcements, and focus through timezone/order changes. TypeScript, 231 tests, catalog validation (312/312), Expo Doctor (21/21), Android Expo export, and Android debug assembly pass. Physical TalkBack validation remains deferred to ticket 13.
