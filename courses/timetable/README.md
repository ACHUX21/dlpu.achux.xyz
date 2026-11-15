# Timetable

Fall 2026 CST25 timetable, published at `/timetable/`.

Copied from [THE12X/timetable2026](https://github.com/THE12X/timetable2026) (not a git submodule):

- `index.html` — the mission-schedule markup and original course/meeting data
- `timetable.css` — dark-only grid, mobile weekday layout, and course briefings
- `timetable.js` — week navigation, course dialogs, Shanghai clock, and now-line
- `icon.ico` — the favicon

All asset references are relative, so the section works under `/timetable/`. The assembler adds the shared broadcast header, footer, fonts, and command palette. The footer credits THE12X and links back to the hub.

The page uses no framework or Tailwind CDN. Week selection (11–19) is saved under `dlpu-schedule-week` and reused by the hub HUD. The source has no calendar dates: today’s highlight and the now-line use Shanghai time against the selected term-week pattern. The desktop view shows all weekdays; mobile uses day buttons to keep course details readable. Click a course or use the keyboard to open a native briefing dialog. Original instructors, rooms, week rules, and extra/project sessions are retained.

The assembler reads the data block between `const MIN_WEEK` and `function isWeekActive` to generate the hub’s `schedule.js`. Keep that block free of DOM operations.

## Credit

[THE12X/timetable2026](https://github.com/THE12X/timetable2026)
