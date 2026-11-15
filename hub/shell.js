(() => {
  "use strict";
  const root = document.documentElement;
  root.dataset.theme = "dark";
  root.classList.add("dark");
  root.style.colorScheme = "dark";
  const bar = document.querySelector(".hub-bar");
  const measure = () =>
    root.style.setProperty("--hub-bar", `${bar.offsetHeight}px`);
  measure();
  new ResizeObserver(measure).observe(bar);
  const script = document.currentScript;
  const base = new URL("./", script.src);
  const links = [
    ["Class hub", "", "HOME"],
    ["Discrete Mathematics", "math/", "EPISODE 01"],
    ["Fall 2026 timetable", "timetable/", "EPISODE 02"],
    ["Now playing", "#open", "HUB"],
    ["Upcoming classes", "#upcoming", "HUB"],
    ["Find a solving method", "math/#methods", "MATH"],
    ["Practice & mistakes", "math/#practice", "MATH"],
    ["Interactive tools", "math/#lab", "MATH"],
    ["Exam reference", "math/#exam", "MATH"],
    ...[
      "Propositional Logic",
      "Predicate Logic",
      "Set Theory",
      "Relations",
      "Graph Theory",
      "Algebraic Structures",
    ].map((name, i) => [name, `math/#topic/${i + 1}.1`, `CHAPTER 0${i + 1}`]),
  ];
  const dialog = document.createElement("dialog");
  dialog.className = "command-dialog";
  dialog.setAttribute("aria-labelledby", "command-heading");
  dialog.innerHTML =
    '<button class="command-close" aria-label="Close command palette">×</button><h2 id="command-heading">FIND YOUR FREQUENCY.</h2><input class="command-input" type="search" aria-label="Search pages and chapters" placeholder="Type a page, chapter, or tool…"><ul class="command-results"></ul><p class="command-help">↑ ↓ NAVIGATE · ENTER OPEN · ESC CLOSE</p>';
  document.body.append(dialog);
  const input = dialog.querySelector("input"),
    results = dialog.querySelector("ul");
  function render() {
    results.replaceChildren();
    links
      .filter(([name, , tag]) =>
        `${name} ${tag}`
          .toLowerCase()
          .includes(input.value.trim().toLowerCase()),
      )
      .forEach(([name, path, tag]) => {
        const li = document.createElement("li"),
          a = document.createElement("a"),
          small = document.createElement("small");
        a.href = new URL(path, base).href;
        a.append(document.createTextNode(name));
        small.textContent = tag;
        a.append(small);
        li.append(a);
        results.append(li);
        a.onclick = () => dialog.close();
      });
    if (!results.children.length) {
      const li = document.createElement("li");
      li.textContent = "No signal. Try another term.";
      results.append(li);
    }
  }
  function open() {
    if (document.querySelector("dialog[open]")) return;
    input.value = "";
    render();
    dialog.showModal();
    input.focus();
  }
  document.querySelector(".hub-command").onclick = open;
  dialog.querySelector(".command-close").onclick = () => dialog.close();
  input.oninput = render;
  dialog.addEventListener("click", (e) => {
    if (e.target === dialog) {
      const r = dialog.getBoundingClientRect();
      if (
        e.clientX < r.left ||
        e.clientX > r.right ||
        e.clientY < r.top ||
        e.clientY > r.bottom
      )
        dialog.close();
    }
  });
  dialog.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      dialog.close();
      return;
    }
    const list = [...results.querySelectorAll("a")],
      index = list.indexOf(document.activeElement);
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      list[
        (index + (e.key === "ArrowDown" ? 1 : -1) + list.length) % list.length
      ]?.focus();
    }
    if (e.key === "Enter" && document.activeElement === input) {
      e.preventDefault();
      list[0]?.click();
    }
  });
  let code = [];
  document.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      if (dialog.open) dialog.close();
      else open();
      return;
    }
    if (
      /INPUT|TEXTAREA|SELECT/.test(e.target.tagName) ||
      document.querySelector("dialog[open]")
    )
      return;
    code.push(e.key);
    code = code.slice(-10);
    if (
      code.join(",") ===
      "ArrowUp,ArrowUp,ArrowDown,ArrowDown,ArrowLeft,ArrowRight,ArrowLeft,ArrowRight,b,a"
    ) {
      document.body.classList.toggle("easter-signal");
      announce("SECRET CHANNEL UNLOCKED · HELLO, SPACE STUDENT.");
    }
  });
  function announce(message, boot = false) {
    const el = document.createElement("div");
    el.className = "boot-status";
    el.setAttribute("role", "status");
    const content = document.createElement("span");
    content.textContent = message;
    el.append(content);
    const close = document.createElement("button");
    close.textContent = boot ? "Skip intro ×" : "Close ×";
    close.onclick = () => el.remove();
    el.append(close);
    document.body.append(el);
    setTimeout(
      () => {
        el.classList.add("leave");
        setTimeout(() => el.remove(), 300);
      },
      boot ? 2800 : 4500,
    );
  }
  try {
    if (!sessionStorage.getItem("dlpu-broadcast-boot")) {
      sessionStorage.setItem("dlpu-broadcast-boot", "1");
      if (!matchMedia("(prefers-reduced-motion: reduce)").matches)
        announce(
          "▶ TAPE CST25 · CONNECTING… SIGNAL FOUND. WELCOME BACK.",
          true,
        );
    }
  } catch {}
})();
