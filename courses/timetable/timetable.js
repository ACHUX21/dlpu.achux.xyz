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
  let selectedDay = Math.max(0, shanghai().day);
  try {
    const stored = Number(localStorage.getItem("dlpu-schedule-week"));
    if (stored >= MIN_WEEK && stored <= MAX_WEEKS) currentWeek = stored;
  } catch {}
  for (let i = MIN_WEEK; i <= MAX_WEEKS; i++) {
    const opt = document.createElement("option");
    opt.value = i;
    opt.textContent = `Week ${i}`;
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
  function renderWeek(week) {
    currentWeek = week;
    try {
      localStorage.setItem("dlpu-schedule-week", String(week));
    } catch {}
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
        if (entry) {
          meetings++;
          const info = courses[entry.id],
            room = entry.room || info.room || "TBA",
            title = entry.title || info.name;
          const b = document.createElement("button");
          b.type = "button";
          b.className = "course-card";
          b.style.setProperty("--course-color", palette[entry.id]);
          b.setAttribute(
            "aria-label",
            `${title}, ${meetingType(entry)[0]}, ${day}, ${slot.raw}, room ${room}. Open course briefing.`,
          );
          const [type,typeClass]=meetingType(entry);
          const typeBadge=document.createElement('span');
          typeBadge.className='meeting-type '+typeClass;
          typeBadge.textContent=type;
          const code = document.createElement("span");
          code.className = "course-code";
          code.textContent = `${entry.id} / 0${si + 1}`;
          const name = document.createElement("strong");
          name.textContent = title;
          const teacher = document.createElement("span");
          teacher.className = "instructor";
          teacher.textContent = info.instructor;
          const foot = document.createElement("span");
          foot.className = "course-foot";
          foot.innerHTML = `<span>ROOM ${room}</span><span aria-hidden="true">↗</span>`;
          const cardHead=document.createElement('span');cardHead.className='course-card-head';cardHead.append(code,typeBadge);
          b.append(cardHead, name, teacher, foot);
          b.onclick = () => openModal(entry, info, room, slot, title);
          cell.append(b);
        } else {
          const free = document.createElement("div");
          free.className = "free-period";
          free.textContent = "NO TRANSMISSION";
          cell.append(free);
        }
        row.append(cell);
      });
      body.append(row);
    });
    $("meeting-count").textContent =
      `${String(meetings).padStart(2, "0")} CLASSES THIS WEEK`;
    paintDay();
    updateClock();
  }
  function paintDay() {
    const today = shanghai().day;
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
    if (now.day < 0) return;
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
  function openModal(entry, info, room, slot, title) {
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
  renderWeek(currentWeek);
  setInterval(updateClock, 1000);
  setInterval(paintDay, 60000);
})();
