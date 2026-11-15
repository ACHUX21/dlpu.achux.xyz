(() => {
  "use strict";
  let running = false,
    deadline = 0,
    remaining = 25 * 60,
    finished = false;
  const format = () =>
    `${String(Math.floor(remaining / 60)).padStart(2, "0")}:${String(remaining % 60).padStart(2, "0")}`;
  function mount() {
    const target = document.getElementById("focus-mount");
    if (!target) return;
    target.innerHTML =
      '<section class="focus-console" aria-label="Focus timer"><label>FOCUS / 集中</label><div class="focus-clock" role="timer">' +
      format() +
      '</div><div class="focus-controls"><button type="button" id="focus-toggle">' +
      (running ? "Pause" : "Start 25 min") +
      '</button><button type="button" id="focus-reset">Reset</button></div><p class="focus-status" role="status">' +
      (finished
        ? "Session complete. Take a five-minute break."
        : "One session. One small step.") +
      "</p></section>";
    document.getElementById("focus-toggle").onclick = () => {
      if (running) {
        remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
        running = false;
      } else {
        if (!remaining) remaining = 1500;
        deadline = Date.now() + remaining * 1000;
        running = true;
        finished = false;
      }
      mount();
    };
    document.getElementById("focus-reset").onclick = () => {
      running = false;
      remaining = 1500;
      finished = false;
      mount();
    };
  }
  setInterval(() => {
    if (!running) return;
    remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
    if (!remaining) {
      running = false;
      finished = true;
      mount();
    } else {
      const clock = document.querySelector(".focus-clock");
      if (clock) clock.textContent = format();
    }
  }, 250);
  addEventListener("studio-render", mount);
  mount();
})();
