# Authorize and inventory the target Pixel

Type: task
Status: closed
Assignee: Codex
Blocked by:

## Question

Authorize the attached target Pixel for ADB and record the Android version, API level, display characteristics, locale, 12/24-hour setting, and active timezone facts needed to make later prototype and acceptance decisions on the real target device.

## Resolution

ADB is authorized for serial `34051JEHN12837`. The attached target identifies itself as a Google Pixel 7a (`lynx`).

- Android: version 17, API 37, security patch `2026-07-05`.
- Display: physical `1080x2400` at 420 dpi (density 2.625); current app configuration is portrait `411x914dp`. The internal panel was running at 60 Hz and also exposes a 90 Hz mode. It has a centered top cutout with a 118 px inset. System font scale is `1.35`.
- Locale: active system locale `sv-SE`; product fallback locale `en-US`.
- Clock format: system `time_12_24` is explicitly `24`.
- Timezone: `Europe/Stockholm`; at inventory time (`2026-08-18 17:04`) the device reported CEST, UTC+02:00.

Evidence was collected read-only with `adb devices -l`, `getprop`, `wm size`, `wm density`, `settings get`, `cmd activity get-config`, `dumpsys display`, and `date`. No device settings or software were changed.
