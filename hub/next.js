(() => {
  "use strict";
  const root = document.getElementById("next-class"),
    data = window.DLPU_WEEK;
  if (!root || !data) return;
  function active(rule, week) {
    return rule.split(",").some((part) => {
      const [a, b] = part.split("-").map(Number);
      return week >= a && week <= (b || a);
    });
  }
  const term = window.DLPU_TERM;
  const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  function update() {
    // Classes run on Shanghai wall-clock time; the term week is the shared
    // device-date week (identical for visitors on China time).
    const now = new Date(),
      parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Shanghai",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).formatToParts(now);
    const part = (t) => Number(parts.find((p) => p.type === t).value);
    const y = part("year"), m = part("month"), d = part("day");
    const midnight = Date.parse(
      `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}T00:00:00+08:00`,
    );
    const info = term ? term.current() : { raw: data.previewWeek, week: data.previewWeek, status: "in", weekday: 0 };
    const week = info.week;
    const todayWeek = term ? term.weekForYMD(y, m, d) : info.raw;
    const todayIndex = term ? term.weekdayForYMD(y, m, d) : info.weekday;
    let next = null;
    // Walk real calendar days (up to the end of the timetable) for the next meeting.
    for (let offset = 0; offset <= 200 && !next; offset++) {
      const dayWeek = todayWeek + Math.floor((todayIndex + offset) / 7);
      if (dayWeek > 19) break;
      if (dayWeek < 11) continue;
      const weekday = (todayIndex + offset) % 7;
      const stamp = new Date(midnight + offset * 86400000 + 8 * 3600000);
      const ymd = `${stamp.getUTCFullYear()}-${String(stamp.getUTCMonth() + 1).padStart(2, "0")}-${String(stamp.getUTCDate()).padStart(2, "0")}`;
      const dateLabel = `${stamp.getUTCDate()} ${MONTHS[stamp.getUTCMonth()]}`;
      const atOnDay = (start) =>
        midnight +
        offset * 86400000 +
        (Number(start.slice(0, 2)) * 60 + Number(start.slice(3))) * 60000;
      const classes = data.meetings
        .filter((m) => m.day === weekday && active(m.weeks, dayWeek))
        .map((m) => ({
          ...m,
          kind: "class",
          week: dayWeek,
          dateLabel,
          at: atOnDay(m.start),
        }));
      const exams = (data.exams || [])
        .filter((exam) => exam.date === ymd)
        .map((exam) => ({
          ...exam,
          kind: "exam",
          day: weekday,
          week: dayWeek,
          time: `${exam.start} – ${exam.end}`,
          dateLabel,
          at: atOnDay(exam.start),
        }));
      const candidates = classes
        .concat(exams)
        .filter((m) => m.at > now.getTime())
        .sort((a, b) => a.at - b.at);
      if (candidates.length) next = candidates[0];
    }
    root.replaceChildren();
    const label = document.createElement("div");
    label.className = "console-label";
    label.innerHTML =
      '<p class="eyebrow"><i class="signal-dot"></i> ' +
      (next && next.kind === "exam" ? "NEXT EXAM / FINAL" : "NEXT CLASS / UPLINK") +
      "</p><small>" +
      (info.status === "before" ? (info.raw >= 1 ? "WEEK " + info.raw + " · TIMETABLE STARTS WEEK 11" : "TERM NOT IN SESSION") : info.status === "after" ? "TERM ENDED" : "WEEK " + week + " · CURRENT WEEK") +
      " · SHANGHAI</small>";
    root.append(label);
    const detail = document.createElement("div"),
      title = document.createElement("p"),
      note = document.createElement("p");
    title.className = "next-title";
    note.className = "next-note";
    const exam = next && next.kind === "exam";
    title.textContent = next ? (exam ? `Final exam · ${next.name}` : next.name) : "The signal is quiet.";
    note.textContent = next
      ? exam
        ? `${data.days[next.day] || "Exam"} ${next.dateLabel} (week ${next.week}) · ${next.time} · Testroom ${next.room} · ${next.book}`
        : `${data.days[next.day]} ${next.dateLabel}${next.week !== todayWeek ? ` (week ${next.week})` : ""} · ${next.time} · Room ${next.room || "TBA"}`
      : info.status === "after"
        ? "Term ended. The timetable covers weeks 11–19."
        : "No more classes on the timetable.";
    detail.append(title, note);
    root.append(detail);
    if (next) {
      const sec = Math.max(0, Math.floor((next.at - now) / 1000)),
        clock = document.createElement("div");
      clock.className = "countdown";
      const days = Math.floor(sec / 86400);
      clock.textContent = (days ? days + "D " : "") + [
        Math.floor(sec / 3600) % 24,
        Math.floor(sec / 60) % 60,
        sec % 60,
      ]
        .map((n) => String(n).padStart(2, "0"))
        .join(":");
      const small = document.createElement("small");
      small.textContent = next.kind === "exam" ? "TO FINAL EXAM" : "TO NEXT CLASS";
      clock.append(small);
      root.append(clock);
    }
    const link = document.createElement("a");
    link.className = "next-link";
    link.href = "timetable/";
    link.textContent = "Full schedule ↗";
    root.append(link);
  }
  update();
  setInterval(update, 1000);
})();
