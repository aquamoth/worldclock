# World Clock

World Clock presents the same instant in the phone's active timezone and in a user-maintained collection of named time references.

## Language

**Local clock**:
The mandatory top clock whose timezone is the phone's currently active timezone. It is not part of the user's selected-clock collection.
_Avoid_: Primary time, home clock

**Selected clock**:
A persistent, user-ordered clock added through the clock selector. It may represent either a city timezone or a custom timezone.
_Avoid_: Secondary clock, world clock

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
The temporary mode entered by scrubbing any clock, in which every clock displays one shared comparison instant within 24 hours before or after now.
_Avoid_: Calendar mode, edit mode

**Day difference**:
The `+1` or `−1` marker shown when a selected clock's local calendar date is respectively one day ahead of or behind the local clock at the same instant.
_Avoid_: Timezone difference, date selector
