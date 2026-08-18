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
The temporary mode entered by scrubbing a clock or the time-status section, in which every clock displays one shared frozen comparison instant.
_Avoid_: Calendar mode, edit mode

**Comparison instant**:
The frozen absolute instant projected through every clock while virtual time is active.
_Avoid_: Selected time, scrubbed time

**Virtual offset**:
The signed duration from the live reference instant captured on entering virtual time to the comparison instant.
_Avoid_: Timezone difference, timezone offset

**Day difference**:
The signed marker showing how many calendar dates a selected clock is ahead of or behind the local clock at the same instant. It is omitted when both clocks have the same calendar date.
_Avoid_: Timezone difference, date selector
