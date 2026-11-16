(() => {
  "use strict";
  const KEY = "dlpu-focus-settings-v1";
  const LIMITS = {
    focus: [1, 180, "Focus"],
    short: [1, 60, "Short break"],
    long: [1, 120, "Long break"],
    sessions: [1, 12, "Sessions before a long break"],
  };
  const DEFAULTS = { focus: 25, short: 5, long: 15, sessions: 4 };
  const MODES = ["focus", "short", "long"];

  const whole = (value, min, max) => {
    if (typeof value === "number" && Number.isInteger(value) && value >= min && value <= max) return value;
    if (typeof value === "string" && /^\d+$/.test(value)) {
      const number = Number(value);
      if (number >= min && number <= max) return number;
    }
    return null;
  };

  const readStored = () => {
    try {
      const raw = JSON.parse(localStorage.getItem(KEY));
      if (!raw || typeof raw !== "object") return null;
      const next = {};
      for (const key of Object.keys(LIMITS)) {
        const parsed = whole(raw[key], LIMITS[key][0], LIMITS[key][1]);
        if (parsed == null) return null;
        next[key] = parsed;
      }
      return next;
    } catch {
      return null;
    }
  };

  let settings = readStored() || { ...DEFAULTS };
  let mode = "focus";
  let running = false;
  let deadline = 0;
  let focusDone = 0;
  let editing = false;
  let editError = "";
  let notice = "";
  let draft = null;
  const remainingByMode = {
    focus: settings.focus * 60,
    short: settings.short * 60,
    long: settings.long * 60,
  };
  let remaining = remainingByMode.focus;

  const now = () => Date.now();
  const label = (key) => (key === "focus" ? "Focus" : key === "short" ? "Short break" : "Long break");
  const shortLabel = { focus: "Focus", short: "Short", long: "Long" };
  const format = (seconds) =>
    `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
  const escapeHtml = (value) =>
    String(value).replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));

  function persist() {
    try {
      localStorage.setItem(KEY, JSON.stringify(settings));
      return true;
    } catch {
      return false;
    }
  }

  function captureRemaining() {
    if (!running) return;
    remaining = Math.max(0, Math.ceil((deadline - now()) / 1000));
    remainingByMode[mode] = remaining;
  }

  function statusText() {
    if (notice) return notice;
    const cycle = mode === "focus" ? ` ${Math.min(focusDone + 1, settings.sessions)} of ${settings.sessions} before a long break.` : "";
    if (running) return `${label(mode)} is running.${cycle}`;
    if (remaining < settings[mode] * 60) return `${label(mode)} is paused.${cycle}`;
    return `${label(mode)}. Press Start when you are ready.${cycle}`;
  }

  function snapshotDraft() {
    const form = document.getElementById("focus-settings");
    if (!editing || !form) return;
    draft = {
      focus: form.elements.focusMin.value,
      short: form.elements.shortMin.value,
      long: form.elements.longMin.value,
      sessions: form.elements.sessionCount.value,
    };
  }

  function mount() {
    snapshotDraft();
    const target = document.getElementById("focus-mount");
    if (!target) return;
    const values = draft || {
      focus: String(settings.focus),
      short: String(settings.short),
      long: String(settings.long),
      sessions: String(settings.sessions),
    };
    const minutes = Math.floor(remaining / 60);
    const seconds = remaining % 60;
    target.innerHTML =
      '<section class="focus-console" aria-label="Focus timer">' +
      '<div class="focus-head"><label id="focus-label">FOCUS / 集中</label>' +
      `<button type="button" class="focus-edit" id="focus-edit" aria-expanded="${editing}" aria-controls="focus-settings">Edit</button></div>` +
      '<div class="focus-modes" role="group" aria-label="Timer mode">' +
      MODES.map((key) => {
        const pressed = key === mode ? "true" : "false";
        return `<button type="button" data-mode="${key}" aria-pressed="${pressed}">${shortLabel[key]}<span>${settings[key]}m</span></button>`;
      }).join("") +
      "</div>" +
      `<div class="focus-clock" role="timer" aria-labelledby="focus-label" aria-label="${escapeHtml(label(mode))}, ${minutes} minutes ${seconds} seconds remaining">${format(remaining)}</div>` +
      '<div class="focus-controls"><button type="button" id="focus-toggle">' +
      (running ? "Pause" : remaining < settings[mode] * 60 ? "Resume" : "Start") +
      '</button><button type="button" id="focus-reset">Reset</button></div>' +
      `<p class="focus-status" role="status">${escapeHtml(statusText())}</p>` +
      `<form id="focus-settings" class="focus-settings"${editing ? "" : " hidden"}>` +
      field("Focus", "focusMin", values.focus, "1 to 180 minutes") +
      field("Short break", "shortMin", values.short, "1 to 60 minutes") +
      field("Long break", "longMin", values.long, "1 to 120 minutes") +
      field("Long break every", "sessionCount", values.sessions, "1 to 12 focus sessions") +
      `<p class="focus-error" role="alert">${escapeHtml(editError)}</p>` +
      '<p class="focus-hint">Saving pauses a running timer instead of dropping it.</p>' +
      '<div class="focus-controls"><button type="submit">Save</button><button type="button" id="focus-cancel">Cancel</button></div>' +
      "</form></section>";

    document.getElementById("focus-edit").onclick = () => {
      editing = !editing;
      editError = "";
      if (!editing) draft = null;
      mount();
      if (editing) document.querySelector("#focus-settings input")?.focus();
    };
    document.querySelectorAll("[data-mode]").forEach((button) => {
      button.onclick = () => selectMode(button.dataset.mode);
    });
    document.getElementById("focus-toggle").onclick = toggle;
    document.getElementById("focus-reset").onclick = resetMode;
    const form = document.getElementById("focus-settings");
    form.onsubmit = (event) => {
      event.preventDefault();
      saveForm(form);
    };
    document.getElementById("focus-cancel").onclick = () => {
      editing = false;
      editError = "";
      draft = null;
      mount();
      document.getElementById("focus-edit")?.focus();
    };
    form.onkeydown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        document.getElementById("focus-cancel").click();
      }
    };
  }

  function field(name, id, value, hint) {
    return `<label><span>${name}</span><input id="${id}" name="${id}" inputmode="numeric" autocomplete="off" aria-describedby="${id}-hint" value="${escapeHtml(value)}"></label><span id="${id}-hint" class="focus-hint">${hint}</span>`;
  }

  function selectMode(next) {
    if (!MODES.includes(next) || next === mode) return;
    captureRemaining();
    if (running) {
      running = false;
      notice = `${label(mode)} paused at ${format(remaining)}. ${label(next)} is ready and will not start on its own.`;
    } else notice = "";
    mode = next;
    remaining = remainingByMode[mode];
    mount();
  }

  function toggle() {
    notice = "";
    if (running) {
      captureRemaining();
      running = false;
    } else {
      if (!remaining) remaining = settings[mode] * 60;
      remainingByMode[mode] = remaining;
      deadline = now() + remaining * 1000;
      running = true;
    }
    mount();
  }

  function resetMode() {
    running = false;
    notice = `${label(mode)} reset to ${settings[mode]} min.`;
    remaining = settings[mode] * 60;
    remainingByMode[mode] = remaining;
    mount();
  }

  function saveForm(form) {
    const entered = {
      focus: form.elements.focusMin.value.trim(),
      short: form.elements.shortMin.value.trim(),
      long: form.elements.longMin.value.trim(),
      sessions: form.elements.sessionCount.value.trim(),
    };
    const next = {};
    const errors = [];
    for (const key of Object.keys(LIMITS)) {
      const [min, max, name] = LIMITS[key];
      const parsed = whole(entered[key], min, max);
      if (parsed == null) errors.push(`${name} must be a whole number from ${min} to ${max}.`);
      else next[key] = parsed;
    }
    if (errors.length) {
      editError = errors[0];
      draft = entered;
      mount();
      document.querySelector("#focus-settings input")?.focus();
      return;
    }
    const wasRunning = running;
    captureRemaining();
    if (running) running = false;
    const activeChanged = next[mode] !== settings[mode];
    for (const key of MODES) {
      const oldSeconds = settings[key] * 60;
      const newSeconds = next[key] * 60;
      if (key === mode && activeChanged) remainingByMode[key] = newSeconds;
      else if (remainingByMode[key] === oldSeconds || remainingByMode[key] > newSeconds) remainingByMode[key] = newSeconds;
    }
    const cycleRestarted = focusDone >= next.sessions;
    if (cycleRestarted) focusDone = 0;
    settings = next;
    remaining = remainingByMode[mode];
    const stored = persist();
    notice = activeChanged
      ? `${wasRunning ? "Paused and reset" : "Reset"} ${label(mode).toLowerCase()} to ${settings[mode]} min.`
      : wasRunning
        ? "Paused. Settings saved. Start continues this session."
        : "Settings saved.";
    if (!stored) notice += " This browser did not keep them for next time.";
    if (cycleRestarted) notice += " The focus cycle restarted.";
    editing = false;
    editError = "";
    draft = null;
    mount();
  }

  function complete() {
    running = false;
    remaining = 0;
    remainingByMode[mode] = 0;
    if (mode === "focus") {
      focusDone += 1;
      const useLong = focusDone >= settings.sessions;
      if (useLong) focusDone = 0;
      const next = useLong ? "long" : "short";
      mode = next;
      remaining = settings[next] * 60;
      remainingByMode[next] = remaining;
      notice = useLong
        ? "Focus complete. Long break is ready and will not start on its own."
        : "Focus complete. Short break is ready and will not start on its own.";
    } else {
      mode = "focus";
      remaining = settings.focus * 60;
      remainingByMode.focus = remaining;
      notice = "Break complete. Focus is ready and will not start on its own.";
    }
    mount();
  }

  setInterval(() => {
    if (!running) return;
    remaining = Math.max(0, Math.ceil((deadline - now()) / 1000));
    remainingByMode[mode] = remaining;
    if (!remaining) complete();
    else {
      const clock = document.querySelector(".focus-clock");
      if (clock) clock.textContent = format(remaining);
    }
  }, 250);

  addEventListener("studio-render", mount);
  mount();
})();
