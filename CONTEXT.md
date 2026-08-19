# World Clock

World Clock presents the same instant in the phone's active timezone and in a user-maintained collection of named time references.

## Language

**Local clock**:
The mandatory, nondeletable clock whose timezone is the phone's currently active timezone. It belongs to the displayed clock collection but is not a selected clock.
_Avoid_: Primary time, home clock

**Selected clock**:
A persistent clock added through the clock selector. It may represent either a city timezone or a custom timezone.
_Avoid_: Secondary clock, world clock

**Clock collection**:
The displayed set comprising the local clock and every selected clock, chronologically ordered by their displayed calendar date and wall time at the shared instant.
_Avoid_: Selected-clock list, manually ordered list

**Clock catalog**:
The bundled offline collection of representative city and country references from which city timezones can be selected.
_Avoid_: Timezone database, city gazetteer

**City timezone**:
A selected clock identified by a city and country and governed by that place's timezone rules, including daylight-saving transitions.
_Avoid_: Offset

**Custom timezone**:
A selected clock with a user-supplied display name and UTC offset, such as “Grandma +06:30”.
_Avoid_: City

**Live mode**:
The normal mode in which every clock displays the current instant.
_Avoid_: Real-time mode

**Virtual time**:
The temporary mode entered by scrubbing a clock or the time-status section, in which every clock displays one shared comparison instant. A session is either offset-anchored or instant-anchored, depending on which surface entered it.
_Avoid_: Calendar mode, edit mode

**Offset-anchored virtual time**:
The virtual-time session created by scrubbing the time-status section. The virtual offset is held fixed while the comparison instant keeps tracking live time, so every clock advances with the real clock at the held offset.
_Avoid_: Frozen offset

**Instant-anchored virtual time**:
The virtual-time session created by scrubbing a clock row. The comparison instant is frozen at the scrubbed wall time while the displayed virtual offset counts down (and past zero) as live time approaches and passes it.
_Avoid_: Frozen clocks

**Comparison instant**:
The absolute instant projected through every clock while virtual time is active. It tracks live time in an offset-anchored session and is frozen in an instant-anchored session.
_Avoid_: Selected time, scrubbed time

**Virtual offset**:
The signed duration from the current live instant to the comparison instant. It is held in an offset-anchored session and derived (counting down) in an instant-anchored session.
_Avoid_: Timezone difference, timezone offset

**Scrub direction**:
The user preference for which horizontal swipe direction moves time later. "Swipe right goes earlier" drags the timeline itself (the default); "Swipe right goes later" pushes time forward. Hardware arrow keys follow the same preference; accessibility increment/decrement always mean later/earlier.
_Avoid_: Inverted controls

**Zero detent**:
The friction applied while a scrub gesture crosses live time: no single movement may jump across zero without landing on it first, and landing re-anchors the gesture at zero — a finger that stops moving stays caught on the current time indefinitely, and passing requires deliberate further travel beyond the catch point.
_Avoid_: Snap, magnet

**Day difference**:
The signed marker showing how many calendar dates a selected clock is ahead of or behind the local clock at the same instant. It is omitted when both clocks have the same calendar date.
_Avoid_: Timezone difference, date selector

**Clock face**:
The presentation of projected wall time on a collection row: digital numerals or analog hands. It is an app-wide choice, independent of layout design.
_Avoid_: Theme, watch face, design

**Digital clock face**:
The default clock face, showing hour and minute as numerals, with an AM/PM marker when the phone uses 12-hour time.

**Analog clock face**:
A clock face that shows the same projected hour and minute as hour and minute hands on a 12-hour dial. It does not show seconds. A compact digital caption remains so 12/24-hour preference stays visible.

**Clock widget**:
The home-screen and lock-screen surface showing selected clocks only — never the local clock, which those surfaces already display. Each clock appears as its name, its ticking wall time, and its localized day name; the day name stands in for the day difference. The widget is always in live mode and opens the app when tapped.
_Avoid_: Lock-screen app, mini app

**Snapshot mirror**:
The native-readable copy of the selected-clock snapshot that the app refreshes whenever the collection changes, so surfaces outside the app UI (such as the clock widget) can read the collection without the app running. It carries source data only, never derived projections.
_Avoid_: Widget API, cache

**Product site**:
The user-facing World Clock website at https://aquamoth.github.io/worldclock/, carrying product identity, support, and the privacy policy. The development repository is a secondary destination linked from it.
_Avoid_: Repository README, About page
