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
  let week = data.previewWeek;
  try {
    const stored = Number(localStorage.getItem("dlpu-schedule-week"));
    if (stored >= 11 && stored <= 19) week = stored;
  } catch {}
  function update() {
    // Shanghai wall-clock time, independent of the visitor's device timezone.
    const now = new Date(),
      parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Shanghai",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).formatToParts(now);
    const part = (t) => parts.find((p) => p.type === t).value;
    const midnight = Date.parse(
      `${part("year")}-${part("month")}-${part("day")}T00:00:00+08:00`,
    );
    const day = new Date(midnight + 8 * 3600000).getUTCDay();
    let next = null;
    for (let offset = 0; offset <= 7 && !next; offset++) {
      const weekday = (day + offset + 6) % 7;
      const candidates = data.meetings
        .filter((m) => m.day === weekday && active(m.weeks, week))
        .map((m) => ({
          ...m,
          at:
            midnight +
            offset * 86400000 +
            (Number(m.start.slice(0, 2)) * 60 + Number(m.start.slice(3))) *
              60000,
        }))
        .filter((m) => m.at > now.getTime())
        .sort((a, b) => a.at - b.at);
      if (candidates.length) next = candidates[0];
    }
    root.replaceChildren();
    const label = document.createElement("div");
    label.className = "console-label";
    label.innerHTML =
      '<p class="eyebrow"><i class="signal-dot"></i> NEXT CLASS / UPLINK</p><small>WEEK ' +
      week +
      " PATTERN · SHANGHAI</small>";
    root.append(label);
    const detail = document.createElement("div"),
      title = document.createElement("p"),
      note = document.createElement("p");
    title.className = "next-title";
    note.className = "next-note";
    title.textContent = next ? next.name : "The signal is quiet.";
    note.textContent = next
      ? `${data.days[next.day]} · ${next.time} · Room ${next.room || "TBA"}`
      : "No classes in this week. Open the schedule to choose another.";
    detail.append(title, note);
    root.append(detail);
    if (next) {
      const sec = Math.max(0, Math.floor((next.at - now) / 1000)),
        clock = document.createElement("div");
      clock.className = "countdown";
      clock.textContent = [
        Math.floor(sec / 3600),
        Math.floor(sec / 60) % 60,
        sec % 60,
      ]
        .map((n) => String(n).padStart(2, "0"))
        .join(":");
      const small = document.createElement("small");
      small.textContent = "TO NEXT WEEKLY SESSION";
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
