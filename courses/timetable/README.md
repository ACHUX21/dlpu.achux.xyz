# Timetable

Fall 2026 CST25 timetable, published at `/timetable/`.

Copied from [THE12X/timetable2026](https://github.com/THE12X/timetable2026) (not a git submodule):

- `index.html` — the mission-schedule markup and original course/meeting data
- `timetable.css` — dark-only grid, mobile weekday layout, and course briefings
- `timetable.js` — week navigation, course dialogs, Shanghai clock, and now-line
- `icon.ico` — the favicon

All asset references are relative, so the section works under `/timetable/`. The assembler adds the shared broadcast header, footer, fonts, and command palette. The footer credits THE12X and links back to the hub.

The page uses no framework or Tailwind CDN. The current term week is detected from the device’s local calendar date by the shared `hub/term-week.js` helper (week 1 = Monday 31 Aug 2026, weeks run Monday–Sunday), which the hub’s next-class HUD also uses. A manually picked week (11–19) lasts for the browser session only (`sessionStorage`); a new visit opens on the current week, and “This week” jumps back. Before or after the covered weeks the view clamps to week 11 or 19 and says so. The clock and now-line follow Shanghai time. Linear Algebra does not meet in week 11. The desktop view shows all weekdays; mobile uses day buttons to keep course details readable. Click a course or use the keyboard to open a native briefing dialog. Original instructors, rooms, week rules, and extra/project sessions are retained.

The assembler reads the data block between `const MIN_WEEK` and `function isWeekActive` to generate the hub’s `schedule.js`. Keep that block free of DOM operations.

## Credit

[THE12X/timetable2026](https://github.com/THE12X/timetable2026)
