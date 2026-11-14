(function () {
  var root = document.getElementById("next-class");
  var data = window.DLPU_WEEK;
  if (!root || !data || !Array.isArray(data.meetings)) return;

  var glyphs = { dm: "∴", ds: "{}", la: "λ", cc: "文", ec: "Ab", cet: "⌁", oc: "中", hub: "▤" };

  function weekActive(rule, week) {
    if (!rule) return false;
    return String(rule).split(",").some(function (part) {
      if (part.indexOf("-") !== -1) {
        var bits = part.split("-");
        var start = Number(bits[0]);
        var end = Number(bits[1]);
        return week >= start && week <= end;
      }
      return week === Number(part);
    });
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, function (ch) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch];
    });
  }

  var now = new Date();
  var jsDay = now.getDay();
  var weekend = jsDay === 0 || jsDay === 6;
  var dayIndex = weekend ? 0 : jsDay - 1;
  var dayName = data.days[dayIndex] || "Monday";
  var week = data.previewWeek;
  var bySlot = {};
  data.meetings.forEach(function (meeting) {
    if (meeting.day !== dayIndex || !weekActive(meeting.weeks, week)) return;
    if (!bySlot[meeting.start]) bySlot[meeting.start] = meeting;
  });
  var meetings = Object.keys(bySlot).sort().map(function (key) { return bySlot[key]; });
  var heading = weekend ? "Next session" : "This weekday";
  var items = meetings.map(function (meeting) {
    var room = meeting.room ? " · Rm " + escapeHtml(meeting.room) : "";
    return '<li class="accent-' + escapeHtml(meeting.accent || "hub") + '">' +
      '<span class="glyph" aria-hidden="true">' + escapeHtml(glyphs[meeting.accent] || "·") + "</span>" +
      "<span><strong>" + escapeHtml(meeting.name) + "</strong>" +
      "<small>" + escapeHtml(meeting.time) + room + "</small></span></li>";
  }).join("");
  var body = items
    ? '<ul class="meetings">' + items + "</ul>"
    : '<p class="next-empty">Nothing is scheduled for this day in week ' + escapeHtml(week) + ".</p>";

  root.innerHTML =
    '<p class="eyebrow">On the timetable</p>' +
    '<p class="next-title">' + escapeHtml(heading) + "</p>" +
    '<p class="next-note">' + escapeHtml(dayName) + " · week " + escapeHtml(week) +
    ". The timetable stores term weeks, not dates, so this uses the week it opens on.</p>" +
    body +
    '<a class="next-link" href="timetable/">Open the full week</a>';
})();
