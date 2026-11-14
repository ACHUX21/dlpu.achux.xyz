(function () {
  var key = "dlpu-hub-theme";
  var root = document.documentElement;
  var script = document.currentScript;
  var follow = script && script.dataset.mode === "follow";

  function stored() {
    try {
      var value = localStorage.getItem(key) || localStorage.getItem("theme");
      if (value === "dark" || value === "light") return value;
    } catch (e) {}
    return matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }

  function paintButton(dark) {
    var btn = document.querySelector(".hub-theme");
    if (!btn) return;
    btn.setAttribute("aria-pressed", dark ? "true" : "false");
    btn.setAttribute("aria-label", dark ? "Switch to light mode" : "Switch to dark mode");
  }

  function apply(mode) {
    var dark = mode === "dark";
    root.dataset.theme = dark ? "dark" : "light";
    root.classList.toggle("dark", dark);
    root.style.colorScheme = dark ? "dark" : "light";
    try {
      localStorage.setItem(key, dark ? "dark" : "light");
      localStorage.setItem("theme", dark ? "dark" : "light");
      localStorage.setItem("study-site-theme", dark ? "dark" : "light");
    } catch (e) {}
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", dark ? "#10161d" : "#f4f6f8");
    paintButton(dark);
  }

  function measure() {
    var bar = document.querySelector(".hub-bar");
    if (bar) root.style.setProperty("--hub-bar", bar.offsetHeight + "px");
  }

  function currentDark() {
    return root.dataset.theme === "dark";
  }

  function bind() {
    var btn = document.querySelector(".hub-theme");
    if (!btn || btn.dataset.bound) return;
    btn.dataset.bound = "1";
    btn.addEventListener("click", function () {
      if (follow) {
        var night = document.querySelector(".night-toggle");
        if (night) {
          night.click();
          paintButton(currentDark());
          root.classList.toggle("dark", currentDark());
          return;
        }
      }
      apply(currentDark() ? "light" : "dark");
    });
  }

  function start() {
    if (!follow && root.dataset.theme !== "dark" && root.dataset.theme !== "light") apply(stored());
    else paintButton(currentDark());
    bind();
    measure();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
  addEventListener("resize", measure);
  new MutationObserver(function () {
    paintButton(currentDark());
  }).observe(root, { attributes: true, attributeFilter: ["data-theme"] });
})();
