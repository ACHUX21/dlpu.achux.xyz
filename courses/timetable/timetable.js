(() => {
  "use strict";
  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
  const palette = {
    DS: "#8baef1",
    DM: "#78dce0",
    LA: "#c4a5e9",
    CC: "#f59bba",
    EC: "#90d7b0",
    CET: "#e7c27b",
    OC: "#d9a5dc",
  };
  const $ = (id) => document.getElementById(id),
    modal = $("courseModal");
  function shanghai() {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Shanghai",
      weekday: "long",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    }).formatToParts(new Date());
    const get = (t) => parts.find((p) => p.type === t).value;
    return {
      day: days.indexOf(get("weekday")),
      minutes: Number(get("hour")) * 60 + Number(get("minute")),
      time: `${get("hour")}:${get("minute")}:${get("second")}`,
    };
  }
  // The current week comes from the device's local calendar date (shared helper).
  const term = window.DLPU_TERM
    ? window.DLPU_TERM.current()
    : { week: currentWeek, raw: currentWeek, status: "in", weekday: shanghai().day };
  const deviceDay = () => (window.DLPU_TERM ? window.DLPU_TERM.current().weekday : shanghai().day);
  const thisWeek = Math.min(MAX_WEEKS, Math.max(MIN_WEEK, term.week));
  currentWeek = thisWeek;
  let selectedDay = deviceDay() <= 4 ? deviceDay() : 0;
  // A manual pick lasts for this browser session only; a new visit opens on the current week.
  try {
    localStorage.removeItem("dlpu-schedule-week");
    const stored = Number(sessionStorage.getItem("dlpu-schedule-week"));
    if (stored >= MIN_WEEK && stored <= MAX_WEEKS) currentWeek = stored;
  } catch {}
  function weekStatus(week) {
    if (term.status === "before" && term.raw >= 1)
      return week === thisWeek ? `Now week ${term.raw} · timetable starts week ${MIN_WEEK}` : `Week ${week} · now week ${term.raw}`;
    if (term.status === "before")
      return week === thisWeek ? `Term not in session · showing week ${week}` : `Week ${week} · term not in session yet`;
    if (term.status === "after")
      return week === thisWeek ? `Term ended · showing week ${week}` : `Week ${week} · term ended`;
    return week === thisWeek ? `Week ${week} · current week` : `Week ${week} · current week is ${thisWeek}`;
  }
  for (let i = MIN_WEEK; i <= MAX_WEEKS; i++) {
    const opt = document.createElement("option");
    opt.value = i;
    opt.textContent = i === thisWeek && term.status === "in" ? `Week ${i} · now` : `Week ${i}`;
    $("weekSelector").append(opt);
  }
  days.forEach((day, i) => {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = day.slice(0, 3).toUpperCase();
    b.dataset.day = i;
    b.onclick = () => {
      selectedDay = i;
      paintDay();
    };
    document.querySelector(".day-tabs").append(b);
  });
  $("weekSelector").onchange = (e) => renderWeek(Number(e.target.value));
  $("prev-week").onclick = () => changeWeek(-1);
  $("next-week").onclick = () => changeWeek(1);
  $("this-week").onclick = () => {
    try { sessionStorage.removeItem("dlpu-schedule-week"); } catch {}
    selectedDay = deviceDay() <= 4 ? deviceDay() : 0;
    renderWeek(thisWeek, false);
  };
  const minutes = (s) => Number(s.slice(0, 2)) * 60 + Number(s.slice(3));
  function changeWeek(delta) {
    if (currentWeek + delta >= MIN_WEEK && currentWeek + delta <= MAX_WEEKS)
      renderWeek(currentWeek + delta);
  }
  // Only experiment, project and extra titles have a more specific source type.
  function meetingType(entry) {
    const title=entry.title || '';
    if(/project/i.test(title))return ['Project','project'];
    if(/\bexp\b|experiment/i.test(title))return ['Lab','lab'];
    if(/extra/i.test(title))return ['Extra','extra'];
    return ['Class',''];
  }
  const WEEKDAYS = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
  function examWhen(exam) {
    const [y, m, d] = exam.date.split("-").map(Number);
    const termApi = window.DLPU_TERM;
    const weekday = termApi
      ? termApi.weekdayForYMD(y, m, d)
      : (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7;
    const week = termApi
      ? termApi.weekForYMD(y, m, d)
      : Math.floor((Date.UTC(y, m - 1, d) - Date.UTC(2026, 7, 31)) / 86400000 / 7) + 1;
    return { y, m, d, weekday, week, label: `${WEEKDAYS[weekday] || ""} ${d} ${["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][m - 1]} ${y}` };
  }
  function examsOn(week, dayIndex) {
    if (typeof finalExams === "undefined") return [];
    return finalExams.filter((exam) => {
      const when = examWhen(exam);
      return when.week === 13 && when.week === week && when.weekday === dayIndex;
    });
  }
  // The period row that contains the largest share of the printed exam.
  // Times stay exact on the card; this only chooses the grid row.
  function primarySlot(exam) {
    let best = -1;
    let bestOverlap = 0;
    timeSlots.forEach((slot, index) => {
      const overlap =
        Math.min(minutes(exam.end), minutes(slot.end)) -
        Math.max(minutes(exam.start), minutes(slot.start));
      if (overlap > bestOverlap) {
        bestOverlap = overlap;
        best = index;
      }
    });
    return best;
  }
  function fitInSlot(exam, slot) {
    const span = minutes(slot.end) - minutes(slot.start);
    const from = Math.max(0, Math.min(100, ((minutes(exam.start) - minutes(slot.start)) / span) * 100));
    const to = Math.max(from, Math.min(100, ((minutes(exam.end) - minutes(slot.start)) / span) * 100));
    return { from, to };
  }
  function renderWeek(week, remember = true) {
    currentWeek = week;
    try {
      if (remember && week !== thisWeek) sessionStorage.setItem("dlpu-schedule-week", String(week));
      else sessionStorage.removeItem("dlpu-schedule-week");
    } catch {}
    $("week-status").textContent = weekStatus(week);
    $("this-week").disabled = week === thisWeek;
    $("this-week").setAttribute("aria-pressed", String(week === thisWeek));
    $("weekSelector").value = week;
    $("prev-week").disabled = week === MIN_WEEK;
    $("next-week").disabled = week === MAX_WEEKS;
    const head = $("day-headings");
    head.replaceChildren();
    const corner = document.createElement("div");
    corner.className = "tt-head";
    corner.setAttribute("role", "columnheader");
    corner.textContent = "TIME";
    head.append(corner);
    days.forEach((day, i) => {
      const h = document.createElement("div");
      h.className = "tt-head";
      h.dataset.day = i;
      h.setAttribute("role", "columnheader");
      h.textContent = day.toUpperCase();
      const small = document.createElement("small");
      small.textContent = ["月曜日", "火曜日", "水曜日", "木曜日", "金曜日"][i];
      h.append(small);
      head.append(h);
    });
    const body = $("timetableBody");
    body.replaceChildren();
    let meetings = 0;
    let finals = 0;
    const examsByDay = days.map((_, di) => examsOn(week, di));
    timeSlots.forEach((slot, si) => {
      const row = document.createElement("div");
      row.className = "tt-row";
      row.setAttribute("role", "row");
      const time = document.createElement("div");
      time.className = "tt-time";
      time.setAttribute("role", "rowheader");
      time.innerHTML = `<small>PERIOD 0${si + 1}</small><span>${slot.start}</span><small>—</small><span>${slot.end}</span>`;
      row.append(time);
      days.forEach((day, di) => {
        const cell = document.createElement("div");
        cell.className = "tt-cell";
        cell.setAttribute("role", "cell");
        cell.dataset.day = di;
        cell.dataset.slot = si;
        const entry = schedule[di][slot.id].find((c) =>
          isWeekActive(c.weeks, week),
        );
        const slotExams = examsByDay[di].filter((exam) => primarySlot(exam) === si);
        if (slotExams.length && entry) cell.classList.add("tt-shared");
        slotExams.forEach((exam) => {
          finals++;
          const when = examWhen(exam);
          const fit = fitInSlot(exam, slot);
          const b = document.createElement("button");
          b.type = "button";
          b.className = "course-card exam-card";
          b.style.setProperty("--course-color", palette[exam.courseId] || "#e7c27b");
          b.setAttribute("aria-label", `Final exam, ${exam.nameEn}, ${when.label}, ${exam.start} to ${exam.end}, room ${exam.room}, ${exam.book}. Placed in the ${slot.raw} row.`);
          const head = document.createElement("span");
          head.className = "course-card-head";
          const code = document.createElement("span");
          code.className = "course-code";
          code.textContent = "FINAL";
          const badge = document.createElement("span");
          badge.className = "meeting-type final";
          badge.textContent = "Final";
          head.append(code, badge);
          const name = document.createElement("strong");
          name.textContent = exam.nameEn;
          const zh = document.createElement("span");
          zh.className = "instructor";
          zh.textContent = exam.nameZh;
          const meta = document.createElement("span");
          meta.className = "exam-meta";
          meta.textContent = `${exam.start}–${exam.end} · ${exam.book} · Rm ${exam.room}`;
          const fitBar = document.createElement("span");
          fitBar.className = "exam-fit";
          fitBar.setAttribute("aria-hidden", "true");
          const mark = document.createElement("i");
          mark.style.marginLeft = `${fit.from}%`;
          mark.style.width = `${Math.max(8, fit.to - fit.from)}%`;
          fitBar.append(mark);
          const fitNote = document.createElement("span");
          fitNote.className = "exam-fit-note";
          const startsEarly = minutes(exam.start) < minutes(slot.start);
          const endsLate = minutes(exam.end) > minutes(slot.end);
          fitNote.textContent = `${when.label} · ${startsEarly ? "from" : "at"} ${exam.start}, ${endsLate ? "to" : "until"} ${exam.end}`;
          b.append(head, name, zh, meta, fitBar, fitNote);
          b.onclick = () => openExam(exam);
          cell.append(b);
        });
        if (entry) {
          meetings++;
          const info = courses[entry.id],
            room = entry.room || info.room || "TBA",
            title = entry.title || info.name;
          const b = document.createElement("button");
          b.type = "button";
          b.className = slotExams.length ? "course-card class-still" : "course-card";
          b.style.setProperty("--course-color", palette[entry.id]);
          b.setAttribute(
            "aria-label",
            slotExams.length
              ? `Still scheduled, overlaps the final. ${title}, ${meetingType(entry)[0]}, ${day}, ${slot.raw}, room ${room}.`
              : `${title}, ${meetingType(entry)[0]}, ${day}, ${slot.raw}, room ${room}. Open course briefing.`,
          );
          const [type,typeClass]=meetingType(entry);
          const typeBadge=document.createElement('span');
          typeBadge.className='meeting-type '+typeClass;
          typeBadge.textContent=type;
          const code = document.createElement("span");
          code.className = "course-code";
          code.textContent = slotExams.length ? "STILL SCHEDULED" : `${entry.id} / 0${si + 1}`;
          const name = document.createElement("strong");
          name.textContent = title;
          const teacher = document.createElement("span");
          teacher.className = "instructor";
          teacher.textContent = info.instructor;
          const foot = document.createElement("span");
          foot.className = "course-foot";
          foot.innerHTML = slotExams.length
            ? `<span>${slot.raw} · ROOM ${room}</span><span aria-hidden="true">↗</span>`
            : `<span>ROOM ${room}</span><span aria-hidden="true">↗</span>`;
          const cardHead=document.createElement('span');cardHead.className='course-card-head';cardHead.append(code,typeBadge);
          b.append(cardHead, name, teacher, foot);
          b.onclick = () => openModal(entry, info, room, slot, title);
          cell.append(b);
        } else if (!slotExams.length) {
          const free = document.createElement("div");
          free.className = "free-period";
          free.textContent = "NO TRANSMISSION";
          cell.append(free);
        }
        row.append(cell);
      });
      body.append(row);
    });
    $("meeting-count").textContent = finals
      ? `${String(meetings).padStart(2, "0")} CLASSES · ${String(finals).padStart(2, "0")} FINALS`
      : `${String(meetings).padStart(2, "0")} CLASSES THIS WEEK`;
    paintDay();
    updateClock();
  }
  function paintDay() {
    const today = term.status === "in" && currentWeek === thisWeek ? deviceDay() : -1;
    document
      .querySelectorAll(".tt-head[data-day],.tt-cell[data-day]")
      .forEach((el) => {
        el.classList.toggle(
          "day-visible",
          Number(el.dataset.day) === selectedDay,
        );
        el.classList.toggle("today", Number(el.dataset.day) === today);
      });
    document.querySelectorAll(".day-tabs button").forEach((b) => {
      b.classList.toggle("active", Number(b.dataset.day) === selectedDay);
      b.classList.toggle("today", Number(b.dataset.day) === today);
      b.setAttribute(
        "aria-pressed",
        String(Number(b.dataset.day) === selectedDay),
      );
    });
  }
  function updateClock() {
    const now = shanghai();
    $("shanghai-clock").textContent = `${now.time} / SHANGHAI`;
    document.querySelectorAll(".now-line").forEach((el) => el.remove());
    if (now.day < 0 || term.status !== "in" || currentWeek !== thisWeek) return;
    timeSlots.forEach((slot, si) => {
      const start = minutes(slot.start),
        end = minutes(slot.end);
      if (now.minutes >= start && now.minutes <= end) {
        const cell = document.querySelector(
          `.tt-cell[data-day="${now.day}"][data-slot="${si}"]`,
        );
        const line = document.createElement("div");
        line.className = "now-line";
        line.style.top = `${(100 * (now.minutes - start)) / (end - start)}%`;
        line.setAttribute("aria-label", "Current Shanghai time");
        cell.append(line);
      }
    });
  }
  function setExamFields(exam) {
    ["modal-book-row", "modal-target-row", "modal-date-row", "modal-source-row"].forEach((id) => {
      $(id).hidden = !exam;
    });
    if (!exam) return;
    const when = examWhen(exam);
    $("modalBook").textContent = `${exam.book} (notice: ${exam.noticeBook})`;
    $("modalTarget").textContent = exam.target;
    $("modalDate").textContent = when.label;
    $("modalSource").textContent = EXAM_SOURCE;
  }
  function openModal(entry, info, room, slot, title) {
    setExamFields(null);
    $("modalTitle").textContent = title;
    $("modalType").textContent = meetingType(entry)[0];
    $("modalInstructor").textContent = info.instructor;
    $("modalRoom").textContent = `Room ${room}`;
    $("modalTime").textContent = slot.raw;
    $("modalWeeks").textContent = entry.weeks;
    const studio=entry.id==='DM'?['../math/','Enter the math studio ↗']:entry.id==='CET'?['../circuits/','Enter the circuit studio ↗']:null;
    $("math-link").hidden = !studio;
    if(studio){$("math-link").href=studio[0];$("math-link").textContent=studio[1];}
    modal.style.borderTopColor = palette[entry.id];
    modal.showModal();
  }
  function openExam(exam) {
    const when = examWhen(exam);
    const info = courses[exam.courseId];
    setExamFields(exam);
    $("modalTitle").textContent = exam.nameEn;
    $("modalType").textContent = "Final exam";
    $("modalInstructor").textContent = info ? info.instructor : "—";
    $("modalRoom").textContent = `Testroom ${exam.room}`;
    $("modalTime").textContent = `${exam.start} – ${exam.end}`;
    $("modalWeeks").textContent = `Week ${when.week} only`;
    $("math-link").hidden = !exam.href;
    if (exam.href) {
      $("math-link").href = exam.href;
      $("math-link").textContent = exam.linkLabel;
    }
    modal.style.borderTopColor = palette[exam.courseId] || "#e7c27b";
    modal.showModal();
  }
  modal.querySelector(".modal-close").onclick = () => modal.close();
  modal.querySelector(".briefing-done").onclick = () => modal.close();
  modal.onclick = (e) => {
    if (e.target === modal) {
      const r = modal.getBoundingClientRect();
      if (
        e.clientX < r.left ||
        e.clientX > r.right ||
        e.clientY < r.top ||
        e.clientY > r.bottom
      )
        modal.close();
    }
  };
  Object.entries(courses).forEach(([id, course]) => {
    const item = document.createElement("span");
    item.className = "roster-item";
    item.style.setProperty("--course-color", palette[id]);
    item.innerHTML = '<i aria-hidden="true"></i>';
    item.append(document.createTextNode(course.name));
    $("course-roster").append(item);
  });
  document.addEventListener("keydown", (e) => {
    if (
      document.querySelector("dialog[open]") ||
      /INPUT|TEXTAREA|SELECT/.test(e.target.tagName) ||
      e.ctrlKey ||
      e.metaKey ||
      e.altKey
    )
      return;
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      changeWeek(-1);
    }
    if (e.key === "ArrowRight") {
      e.preventDefault();
      changeWeek(1);
    }
  });
  renderWeek(currentWeek, false);
  setInterval(updateClock, 1000);
  setInterval(paintDay, 60000);
})();
