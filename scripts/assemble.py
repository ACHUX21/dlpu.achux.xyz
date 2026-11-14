#!/usr/bin/env python3
"""Copy the hub and course sections into _site/ for GitHub Pages."""

from __future__ import annotations

import html
import json
import re
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
HUB = ROOT / "hub"
SITE = ROOT / "_site"
SKIP_NAMES = {"README.md", ".DS_Store"}
SKIP_PARTS = {".git", "__pycache__"}
SLUG = set("abcdefghijklmnopqrstuvwxyz0123456789-")

BOOT = """<script>
(function () {
  var stored = null;
  try { stored = localStorage.getItem("dlpu-hub-theme") || localStorage.getItem("theme"); } catch (e) {}
  var dark = stored === "dark" || (stored !== "light" && matchMedia("(prefers-color-scheme: dark)").matches);
  var root = document.documentElement;
  root.dataset.theme = dark ? "dark" : "light";
  root.classList.toggle("dark", dark);
  root.style.colorScheme = dark ? "dark" : "light";
})();
</script>
"""

FONT = """<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="{css}">
"""


def fail(message: str) -> None:
    print(message, file=sys.stderr)
    raise SystemExit(1)


def copy_site(src: Path, dest: Path) -> None:
    if not src.is_dir():
        fail(f"Missing source directory: {src}")
    for path in src.rglob("*"):
        if not path.is_file():
            continue
        if path.name in SKIP_NAMES or any(part in SKIP_PARTS for part in path.relative_to(src).parts):
            continue
        rel = path.relative_to(src)
        target = dest / rel
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(path, target)
    if not (dest / "index.html").is_file():
        fail(f"{src} has no index.html to publish")


def credit_html(section: dict) -> str:
    credit = section.get("credit")
    if not credit:
        return ""
    for key in ("prefix", "href", "label"):
        if not isinstance(credit.get(key), str) or not credit[key].strip():
            fail(f"{section.get('slug', 'section')} credit is missing {key}")
    return (
        f"{html.escape(credit['prefix'])} "
        f'<a href="{html.escape(credit["href"], quote=True)}">{html.escape(credit["label"])}</a>.'
    )


def shell_header(live: list[dict], current: str, depth: int) -> str:
    prefix = "../" if depth else ""

    def link(label: str, href: str, active: bool) -> str:
        current_attr = ' aria-current="page" class="is-current"' if active else ""
        return f'<a href="{href}"{current_attr}>{html.escape(label)}</a>'

    links = [link("Hub", "../" if depth else "./", current == "hub")]
    for section in live:
        links.append(
            link(
                section.get("nav") or section["title"],
                f"{prefix}{section['slug']}/",
                current == section["slug"],
            )
        )
    home = "../" if depth else "./"
    return f"""<header class="hub-bar">
  <a class="hub-brand" href="{home}">
    <span class="hub-mark" aria-hidden="true">DL</span>
    <span class="hub-brand-text">
      <span class="hub-name">Class hub</span>
      <span class="hub-sub">DLPU · CST25</span>
    </span>
  </a>
  <nav class="hub-nav" aria-label="Sections">{"".join(links)}</nav>
  <button class="hub-theme" type="button" aria-label="Switch color theme">
    <svg class="icon-moon" viewBox="0 0 24 24" aria-hidden="true"><path d="M21 14.5A8.5 8.5 0 1 1 9.5 3 7 7 0 0 0 21 14.5z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>
    <svg class="icon-sun" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M12 2.5v2.2M12 19.3v2.2M4.7 4.7l1.6 1.6M17.7 17.7l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.7 19.3l1.6-1.6M17.7 6.3l1.6-1.6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
  </button>
</header>
"""


def shell_footer(credits: list[str]) -> str:
    credit = " ".join(part for part in credits if part)
    return f"""<footer class="hub-foot">
  <div class="hub-foot-inner">
    <p>Achraf (ACHUX21) · CST25 · Dalian Polytechnic University</p>
    <p class="hub-credit">{credit}</p>
    <p class="hub-domain">dlpu.achux.xyz</p>
  </div>
</footer>
"""


def add_body_class(page: str, classes: list[str]) -> str:
    match = re.search(r"<body\b([^>]*)>", page)
    if not match:
        fail("Section page is missing a <body> tag")
    tag = match.group(0)
    class_match = re.search(r'class="([^"]*)"', tag)
    if class_match:
        have = class_match.group(1).split()
        for name in classes:
            if name not in have:
                have.append(name)
        new_tag = tag[: class_match.start(1)] + " ".join(have) + tag[class_match.end(1) :]
    else:
        new_tag = tag[:-1] + f' class="{" ".join(classes)}">'
    return page[: match.start()] + new_tag + page[match.end() :]


def inject_shell(page: str, live: list[dict], section: dict) -> str:
    if 'class="hub-bar"' in page:
        return page
    slug = section["slug"]
    follow = section.get("theme") == "studio"
    css = FONT.format(css="../shell.css")
    head_bits = css if follow else BOOT + css
    if "</head>" not in page or "</body>" not in page:
        fail(f"{slug} index.html is missing head or body")
    page = page.replace("</head>", head_bits + "</head>", 1)
    page = add_body_class(page, ["hub-section", f"hub-{slug}"])
    header = shell_header(live, slug, depth=1)
    page = re.sub(r"<body\b[^>]*>", lambda match: match.group(0) + "\n" + header, page, count=1)
    mode = ' data-mode="follow"' if follow else ""
    script = f'<script src="../shell.js"{mode}></script>\n'
    page = page.replace("</body>", "\n" + shell_footer([credit_html(section)]) + script + "</body>", 1)
    return page


def live_card(section: dict) -> str:
    slug = section["slug"]
    return f"""<a class="card card-live" href="{html.escape(slug, quote=True)}/">
        <p class="kicker">{html.escape(section["kicker"])}</p>
        <h3>{html.escape(section["title"])}</h3>
        <p class="summary">{html.escape(section["summary"])}</p>
        <p class="card-meta"><span class="path">/{html.escape(slug)}/</span><span class="go">Open</span></p>
      </a>"""


def soon_card(section: dict) -> str:
    return f"""<article class="card card-soon">
        <p class="kicker">{html.escape(section["code"])}</p>
        <h3>{html.escape(section["title"])}</h3>
        <p class="badge"><span class="dot" aria-hidden="true"></span>Coming soon</p>
      </article>"""


def require(section: dict, key: str, where: str) -> str:
    value = section.get(key)
    if not isinstance(value, str) or not value.strip():
        fail(f"{where} is missing a {key}")
    return value


def main() -> None:
    catalog = json.loads((HUB / "sections.json").read_text(encoding="utf-8"))
    live = catalog.get("live")
    upcoming = catalog.get("upcoming")
    if not isinstance(live, list) or not live:
        fail("hub/sections.json needs a non-empty live list")
    if not isinstance(upcoming, list):
        fail("hub/sections.json needs an upcoming list")

    seen: set[str] = set()
    for section in live:
        slug = require(section, "slug", "A live section")
        if any(ch not in SLUG for ch in slug) or slug in {".", ".."}:
            fail(f"Unsafe slug: {slug}")
        if slug in seen:
            fail(f"Duplicate slug: {slug}")
        seen.add(slug)
        for key in ("kicker", "title", "summary", "source"):
            require(section, key, f"Live section {slug}")
        if "nav" in section:
            require(section, "nav", f"Live section {slug}")
    for section in upcoming:
        require(section, "code", "An upcoming class")
        require(section, "title", "An upcoming class")

    if SITE.exists():
        shutil.rmtree(SITE)
    SITE.mkdir()

    for name in ("styles.css", "shell.css", "shell.js", "favicon.svg"):
        shutil.copy2(HUB / name, SITE / name)

    for section in live:
        copy_site(ROOT / section["source"], SITE / section["slug"])
        index = SITE / section["slug"] / "index.html"
        index.write_text(inject_shell(index.read_text(encoding="utf-8"), live, section), encoding="utf-8")

    template = (HUB / "index.template.html").read_text(encoding="utf-8")
    replacements = {
        "<!-- LIVE_CARDS -->": "\n".join(live_card(section) for section in live),
        "<!-- SOON_CARDS -->": "\n".join(soon_card(section) for section in upcoming),
        "<!-- SHELL_HEADER -->": shell_header(live, "hub", depth=0),
        "<!-- SHELL_FOOTER -->": shell_footer([credit_html(section) for section in live]),
    }
    for marker, block in replacements.items():
        if marker not in template:
            fail(f"Template is missing {marker}")
        template = template.replace(marker, block, 1)
    (SITE / "index.html").write_text(template, encoding="utf-8")

    cname = (ROOT / "CNAME").read_text(encoding="utf-8")
    if cname.strip() != "dlpu.achux.xyz":
        fail("CNAME must contain exactly dlpu.achux.xyz")
    (SITE / "CNAME").write_text("dlpu.achux.xyz\n", encoding="utf-8")
    nojekyll = ROOT / ".nojekyll"
    (SITE / ".nojekyll").write_bytes(nojekyll.read_bytes() if nojekyll.is_file() else b"")

    print(f"Assembled {SITE}")
    for section in live:
        print(f"  /{section['slug']}/  <=  {section['source']}")
    print(f"  upcoming placeholders: {len(upcoming)}")


if __name__ == "__main__":
    main()
