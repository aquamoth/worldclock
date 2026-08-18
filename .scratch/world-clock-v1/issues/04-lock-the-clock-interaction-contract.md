# Lock the clock interaction contract

Type: grilling
Status: closed
Assignee: Codex (scrubbing_prototype)
Blocked by: 03

## Question

Based on the prototype, what exact interaction and display contract should the specification define for entering, manipulating, indicating, and leaving virtual time, including accessibility alternatives to dragging?

## Resolution

### State and lifecycle

Live mode continuously projects the current instant. Virtual time holds one **frozen comparison instant** shared by the local clock and every selected clock; it does not advance after a gesture ends. On the first accepted scrub, capture a **live reference instant** once for that virtual-time session. The signed virtual offset is always `comparison instant − live reference instant`, formatted with a Unicode sign and hours/minutes (for example `−0:02`, `+5:15`, or `+18:00`). A row-grid snap can therefore produce an offset that is not itself a multiple of 15 minutes.

Keep the frozen comparison instant and live reference instant across ordinary background/foreground transitions, rerendering the same instant through any changed timezone, locale, appearance, or clock-format preferences. Do not persist virtual time across process death or a cold launch; those start in live mode. `Back` clears the virtual session and immediately resumes the then-current live instant. If scrubbing lands exactly on zero offset, leave virtual time and resume live mode rather than displaying a frozen `+0:00` state.

### Gesture recognition and sensitivity

The compact time-status section and the time area of every clock row are horizontal scrub surfaces. Use platform touch slop: do not change state until displacement clears the platform threshold. Horizontal intent wins only when absolute horizontal displacement exceeds absolute vertical displacement. Once horizontal intent wins, hold that axis for the gesture; if vertical intent wins first, never change time during that gesture and leave it to list scrolling. Taps, sub-threshold movement, cancellation, and vertical scrolling do not enter or alter virtual time.

After horizontal intent is accepted, rightward travel moves the comparison instant earlier and leftward travel moves it later. Use the approved nominal sensitivity of 15 minutes per approximately 9dp of accumulated horizontal travel (the prototype used 1.75 minutes per dp), deriving the result from the gesture-start value rather than accumulating move-event rounding error. Quantize travel after the surface-specific entry/reanchor to whole 15-minute steps; a row's initial directional snap may differ from its starting instant by fewer than 15 minutes. Further scrubs begin from the current frozen comparison instant and current virtual offset.

Apply a 48-hour cyclic window around the captured live reference: valid comparison instants are within 24 hours before through 24 hours after it. When the next step would pass one edge, wrap by 48 hours to the opposite side; never clamp, stop, or bounce. This also applies after a row reanchor. From an exactly reachable `+24:00`, a later 15-minute step wraps to `−23:45`; from `−24:00`, an earlier step wraps to `+23:45`. When a row-derived offset has a nonzero minute remainder, preserve its 15-minute lattice and wrap to the corresponding first valid value at the opposite side.

### Two intentional snap grids

Scrubbing the time-status section uses the **offset grid**. Entering there from live captures now and the first accepted rightward/leftward step selects exactly `−0:15`/`+0:15`. Every later section scrub changes the current virtual offset by exact 15-minute steps, so a live reference captured at `07:32` can deliberately produce comparison wall times such as `07:17` or `07:47`.

Scrubbing a clock row uses that row's **wall-clock grid**. On the first accepted movement, reanchor the shared comparison instant to a `:00`, `:15`, `:30`, or `:45` wall time in the scrubbed row's timezone, in the promised direction. At `07:32`, right first selects `07:30` and left first selects `07:45`; at an exact quarter boundary, an accepted right/left movement selects the previous/next quarter rather than remaining still. Further travel advances through that absolute quarter-hour grid. Scrubbing any other row later repeats the directional reanchor using that row's displayed wall time; the resulting absolute instant immediately updates every row. Switching back to the time-status section preserves that new virtual offset and resumes exact relative 15-minute steps from it.

### Display and responsive layout

Every clock row shows its digital time at left and its city/custom name plus effective `UTC±HH:MM` offset to the right. Times follow the device's 12/24-hour preference, include AM/PM in 12-hour mode, and never show seconds. Selected-clock day-difference markers are recalculated against the local clock at the shared live or comparison instant. Keep the local clock first. Collection mutations and ordering remain the contract of [Define clock collection management](07-define-clock-collection-management.md), not this ticket.

Small decorative chevrons flank every row time and pulse subtly to communicate horizontal scrubbability. Disable the pulse when reduced motion is requested. Do not add fixed-step buttons or visible precision/range subtitles.

Virtual time changes the full screen to a distinct accent-tinted semantic background with separate light/dark treatments; color is not the sole signal. The sticky time-status section shows `Virtual time`, places the signed offset toward the left, and places a revert-arrow control in the far-right 48dp action column. Its visible icon is not accompanied by visible `Back` text, but its accessible name and action are `Back`, with a hint that it returns to current time. Do not add a calendar UI or a virtual-time banner.

Layouts are portrait-first and responsive, with no Pixel-specific coordinates or horizontal page scrolling. Rows may grow vertically under font scaling; names and offsets may wrap without colliding with the time or fixed 48dp action column. Preserve logical reading order—time, name, effective offset, day difference, then row action—and maintain at least 48×48dp interactive targets.

### Accessibility and acceptance

Expose each row scrub target and the time-status scrub target as adjustable controls separate from any sibling `Back` or collection action. Their accessible value is `Live time` in live mode or a human-readable earlier/later virtual offset plus the resulting displayed time in virtual mode. Accessibility `increment` moves 15 minutes later and `decrement` moves 15 minutes earlier, including the same grid, reanchor, and wrap rules. Hardware left arrow moves later and right arrow moves earlier, matching the approved physical drag mapping. Announce virtual-mode entry, changed offset/comparison time, wrap, and return to live mode politely without announcing every clock row separately. Chevrons and the revert glyph are hidden from the accessibility tree; their controls carry the semantics.

Automated interaction coverage must prove both directional entry cases on and between quarter boundaries, status-section offset steps, switching between both surfaces, both wrap edges (including a nonzero row-derived remainder), zero-offset exit, axis arbitration, cancellation, frozen time, lifecycle behavior, `Back`, reduced motion, screen-reader actions, hardware arrows, font scaling, and light/dark contrast. The manual Pixel 7a pass must confirm sensitivity, vertical scrolling from a row, wrap feel, sticky action alignment, readable large text, and TalkBack operation.
