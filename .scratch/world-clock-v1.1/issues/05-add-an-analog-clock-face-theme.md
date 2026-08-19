# Add an analog clock-face theme

Type: grilling
Status: closed
Assignee:
Blocked by:

## Question

What analog clock-face theme should the app offer so each row can show hands
instead of a digital time, without changing the clock-collection model, the
shared comparison instant, or the existing grouped/airy/tiles layout designs?

## Shape of the work

- Analog versus digital is a presentation theme, not a new clock type and not
  a replacement for the current Design setting (grouped / airy / tiles). Those
  layout designs must keep working; analog faces are a second axis.
- Every analog face still represents the same projected wall time as today's
  digital row: local hour and minute at the shared instant, with the existing
  name, `UTC±HH:MM` offset, and day-difference marker available so the row
  remains comparable.
- Scrubbing, the zero detent, virtual time, 12/24-hour preference, and
  TalkBack all still apply. Hands must be readable as time, including in
  virtual time, and the accessibility label must continue to speak a digital
  time rather than "a clock face."
- Decide whether analog is optional per collection, a single app-wide theme,
  and how it composes with Material You / light-dark. The dress-watch mark in
  `assets/icon/` is a starting visual language, not a requirement to copy
  onto every row.
- Prototype if the interaction is unclear: analog faces at collection density
  (up to 24 selected clocks plus local) may fail at small sizes the way a
  launcher icon does. A reduced analog (hours/minutes only, no seconds — v1
  never shows seconds) is in scope; decorative complications are not.

## Resolution

Analog is an app-wide **clock face**, defaulting to digital, independent of
layout design (grouped / airy / tiles) and persisted like the other settings.

The analog face is a reduced 12-hour dial: rim, cardinal ticks with a longer
12, hour and minute hands, no seconds and no subdial. Hands are derived from
`wallMinuteOfDay`, so 13:05 and 1:05 PM share a dial position. Material You
colors ink the rim and hands.

TalkBack still speaks the digital time on the existing adjustable control;
the analog drawing is hidden from the accessibility tree. A compact digital
caption (with AM/PM when the phone is in 12-hour mode) stays under the dial
so 12/24-hour preference and small-size reading remain possible. Name,
offset, and day difference are unchanged. Scrubbing is unchanged.
