# 04 — Create and edit custom timezones

Parent: [Create tracer-bullet implementation tasks](../../issues/13-create-tracer-bullet-implementation-tasks.md)

Specification: [World Clock v1 implementation specification](../../spec.md)

Index: [World Clock v1 implementation tickets](../index.md)

**What to build:** A user can take a separate custom path, create a named fixed-offset selected clock, and later edit its name/offset in place. Valid changes persist once, keep stable identity/add sequence, reorder/focus the row, and remain correct offline; cancel or invalid/duplicate drafts change nothing.

**Blocked by:** 03 — [Add, project, and restore offline city clocks](03-add-project-and-restore-offline-city-clocks.md).

**Status:** complete

**Delivery workflow:** Work directly on `master`; do not create a branch or pull request. Finish green and demoable. Do not add city editing.

## Scoped seams

Custom definition, grapheme/name validation, identity normalization, fixed-offset arithmetic/formatting, and duplicate detection in the domain; custom create/edit application use cases and snapshot records; shared validated form/offset selector; inline accessible errors and focus effects.

## Acceptance criteria

- [x] The selector exposes a separate custom path with a required single-line 1–40-grapheme name and a selected—not typed—15-minute offset from UTC−12:00 through UTC+14:00.
- [x] Fixed offsets use integer arithmetic, zero displays as `UTC+00:00`, and custom clocks remain independent of DST.
- [x] Duplicate identity applies NFKC, locale-independent case folding, trim, and collapsed Unicode whitespace to name plus offset; punctuation and diacritics remain significant.
- [x] Invalid or duplicate create/edit stays in the form with an accessible inline explanation and mutates neither visible nor stored clocks.
- [x] Valid create/edit writes once; edit retains stable selection ID/add sequence, reorders the row, and restores focus.
- [x] Cancel or system Back discards the draft; city rows expose no edit action.
- [x] Custom and city identity never collide, and the result works without network access.

## Automated acceptance subset

Exercise every allowed offset and explicit −12:00/+00:00/+05:45/+14:00 cases; reject off-grid/out-of-range/negative zero. Cover empty/whitespace, 1/40/41 graphemes, multi-code-point graphemes, trim/internal spacing, newline/control characters, all duplicate-normalization rules, punctuation/diacritic distinctions, identity separation, atomic create/edit, stable ID/add sequence, reorder/focus, and cancel/Back/invalid/duplicate nonmutation.

## Later Pixel 7a checkpoint

Create a fractional custom timezone, provoke and hear duplicate/invalid inline errors, edit and cancel drafts, and confirm fixed offset/persistence and stable focus. Defer to tickets 11 and 13.

## Resolution

Implemented the custom-timezone tracer bullet end to end: grapheme/control/name validation, the complete fixed-offset grid, locale-independent normalized duplicate identity, integer fixed-offset projection, versioned custom snapshot records, atomic create/edit with stable identity and focus, selector/editor cancellation and held ordering, and one shared accessible create/edit form. Standards and specification reviews were run against fixed point `a099e3c`; all findings were fixed and the re-reviews passed. All 15 suites/116 tests, strict typecheck, deterministic catalog check (312/312), Expo Doctor (21/21), Android production JavaScript export, and Android debug build (277 tasks) pass. Pixel 7a acceptance remains deferred to tickets 11 and 13.
