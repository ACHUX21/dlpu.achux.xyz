/* Shared term-week helper for the hub HUD and the timetable.
 * Week 1 starts Monday 2026-08-31; weeks run Monday to Sunday.
 * Uses calendar dates (Y-M-D) only, so time zones and DST never shift a week. */
(function (global) {
  "use strict";
  const ANCHOR = Date.UTC(2026, 7, 31); // Monday, week 1
  const FIRST = 11, LAST = 19; // weeks covered by the published timetable
  const DAY = 86400000;
  function weekForYMD(y, m, d) {
    return Math.floor((Date.UTC(y, m - 1, d) - ANCHOR) / DAY / 7) + 1;
  }
  function localYMD(date) {
    const t = date || new Date();
    return [t.getFullYear(), t.getMonth() + 1, t.getDate()];
  }
  // Monday-based weekday index (0 = Monday … 6 = Sunday)
  function weekdayForYMD(y, m, d) {
    return (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7;
  }
  function current(date) {
    const [y, m, d] = localYMD(date);
    const raw = weekForYMD(y, m, d);
    const week = Math.min(LAST, Math.max(FIRST, raw));
    const status = raw < FIRST ? "before" : raw > LAST ? "after" : "in";
    return { raw, week, status, weekday: weekdayForYMD(y, m, d) };
  }
  // Calendar date (UTC midnight ms) of a given week + Monday-based weekday.
  function dateOf(week, weekday) {
    return ANCHOR + ((week - 1) * 7 + weekday) * DAY;
  }
  global.DLPU_TERM = { FIRST, LAST, weekForYMD, weekdayForYMD, localYMD, current, dateOf };
})(window);
