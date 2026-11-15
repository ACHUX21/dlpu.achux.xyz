#!/usr/bin/env python3
"""Copy the hub and course sections into _site/ for GitHub Pages."""

from __future__ import annotations

import html
import json
import re
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
HUB = ROOT / "hub"
SITE = ROOT / "_site"
SKIP_NAMES = {"README.md", ".DS_Store"}
SKIP_PARTS = {".git", "__pycache__"}
SLUG = set("abcdefghijklmnopqrstuvwxyz0123456789-")

BOOT = """<script>document.documentElement.dataset.theme="dark";document.documentElement.classList.add("dark");document.documentElement.style.colorScheme="dark";</script>\n"""

FONT = """<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600;700;800;900&family=DM+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap" rel="stylesheet">
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

    links = [link("01 / Hub", "../" if depth else "./", current == "hub")]
    for index, section in enumerate(live, start=2):
        links.append(
            link(
                f"{index:02d} / " + (section.get("nav") or section["title"]),
                f"{prefix}{section['slug']}/",
                current == section["slug"],
            )
        )
    home = "../" if depth else "./"
    return f"""<header class="hub-bar">
  <a class="hub-brand" href="{home}" aria-label="DLPU class hub home">
    <span class="hub-mark" aria-hidden="true">D<span>↗</span></span>
    <span class="hub-brand-text"><span class="hub-name">DLPU<span class="brand-slash"> / </span>CST25</span><span class="hub-sub">THE NIGHT BROADCAST · 夜間放送</span></span>
  </a>
  <nav class="hub-nav" aria-label="Sections">{"".join(links)}</nav>
  <button class="hub-command" type="button" aria-label="Open command palette"><span>⌕</span><span class="command-label">Jump to</span><kbd>⌘ K</kbd></button>
</header>
"""


def shell_footer(credits: list[str]) -> str:
    credit = " ".join(part for part in credits if part)
    return f"""<footer class="hub-foot">
  <div class="hub-foot-inner">
    <p>Achraf (ACHUX21) · CST25 · Dalian Polytechnic University</p>
    <p class="hub-credit">{credit}</p>
    <p class="hub-domain">END OF TRANSMISSION <span aria-hidden="true">◈</span> dlpu.achux.xyz</p>
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
    css = FONT.format(css="../shell.css")
    head_bits = BOOT + css
    if "</head>" not in page or "</body>" not in page:
        fail(f"{slug} index.html is missing head or body")
    page = page.replace("</head>", head_bits + "</head>", 1)
    page = add_body_class(page, ["hub-section", f"hub-{slug}"])
    header = shell_header(live, slug, depth=1)
    page = re.sub(r"<body\b[^>]*>", lambda match: match.group(0) + "\n" + header, page, count=1)
    script = '<script src="../shell.js"></script>\n'
    page = page.replace("</body>", "\n" + shell_footer([credit_html(section)]) + script + "</body>", 1)
    return page


def accent_class(section: dict) -> str:
    accent = section.get("accent") or "hub"
    if not re.fullmatch(r"[a-z0-9-]+", accent):
        fail(f"Unsafe accent: {accent}")
    return accent


def live_card(section: dict, course: dict | None, episode: int) -> str:
    slug = section["slug"]
    title = html.escape(section["title"])
    glyph = html.escape(section.get("glyph") or "·")
    number = f"{episode:02d}"
    if course:
        stats = f'<span>{len(course["chapters"]):02d} CHAPTERS</span><span>{len(course["topics"])} LESSONS</span><span>{course["questionCount"]} QUESTIONS</span>'
        learning = ('<div class="course-outcomes"><span class="outcomes-label">WHAT YOU WILL LEARN</span><ul>'
                    + ''.join(f'<li>{html.escape(c["title"])}</li>' for c in course["chapters"])
                    + '</ul></div><div class="hub-course-progress" data-course-progress><div><span>YOUR PROGRESS</span><span data-course-count>0 / '
                    + str(len(course["topics"])) + ' lessons</span></div><div class="hub-course-meter" role="progressbar" aria-label="'
                    + title + ' completion" aria-valuemin="0" aria-valuemax="' + str(len(course["topics"]))
                    + '" aria-valuenow="0"><span></span></div><small data-course-resume>Start with '
                    + html.escape(course["topics"][0]["title"]) + '</small></div>')
        visual_label = "論理と構造" if slug == "math" else "回路と電子"
        visual = f'<div class="card-visual" aria-hidden="true"><span class="card-symbol">{glyph}</span><span class="visual-label">{visual_label}</span><span class="visual-index">{number}</span></div>'
    else:
        stats = '<span>WEEKS 11—19</span><span>05 DAYS</span><span>CLASS / LAB / PROJECT</span>'
        learning = ""
        visual = ""
    kind = "" if course else " card-schedule"
    course_attr = f' data-course="{slug}"' if course else ""
    return f"""<a class="card card-live accent-{accent_class(section)}{kind}" href="{html.escape(slug, quote=True)}/"{course_attr}>
        <div class="card-top"><span class="kicker">EPISODE {number} / {html.escape(section["kicker"])}</span><span class="card-status">● ON AIR</span></div>
        {visual}
        <h3>{title}</h3>
        <p class="summary">{html.escape(section["summary"])}</p>
        <div class="card-stats">{stats}</div>
        {learning}
        <p class="card-meta"><span class="path">/{html.escape(slug)}/</span><span class="go">{"Continue course" if course else "Open timetable"} <span aria-hidden="true">↗</span></span></p>
      </a>"""


def soon_card(section: dict) -> str:
    glyph = section.get("glyph") or section.get("code") or "·"
    return f"""<article class="card card-soon accent-{accent_class(section)}">
        <span class="glyph" aria-hidden="true">{html.escape(glyph)}</span>
        <p class="kicker">{html.escape(section["code"])}</p>
        <h3>{html.escape(section["title"])}</h3>
        <p class="badge">NEXT EPISODE <span aria-hidden="true">↗</span></p>
      </article>"""


def build_course_data(section: dict) -> dict:
    """Extract counts and chapter titles from each studio's own published data."""
    program = r'''const fs=require("fs"),vm=require("vm"),context={window:{}};
const source=process.argv[1];
for(const file of ["content.js","data.js"])vm.runInNewContext(fs.readFileSync(source+"/"+file,"utf8"),context);
const data=context.window,topics=data.TOPICS||data.COURSE_TOPICS;
const names=data.CHAPTERS?null:vm.runInNewContext(fs.readFileSync(source+"/app.js","utf8").match(/const chapterNames=(\[[^;]+\]);/)[1]);
const chapters=data.CHAPTERS||[...new Set(topics.map(t=>t.chapter))].map(id=>({id,title:names[id]}));
process.stdout.write(JSON.stringify({
  topics:topics.map(({id,title,chapter})=>({id,title,chapter})),
  methods:data.METHODS.map(({id,title,topic})=>({id,title,topic})),
  chapters:chapters.map(({id,title})=>({id,title})),questionCount:data.QUESTIONS.length
}));'''
    result = subprocess.run(["node", "-e", program, str(ROOT / section["source"])], check=True, capture_output=True, text=True)
    data = json.loads(result.stdout)
    data["storageKey"] = "discrete-studio-v1" if section["slug"] == "math" else "circuitExamV1"
    data["lastTopicKey"] = "lastLesson" if section["slug"] == "math" else "lastTopic"
    return data


def build_schedule_js() -> str:
    """Read the timetable's own data and emit the week the page opens on."""
    text = (ROOT / "courses/timetable/index.html").read_text(encoding="utf-8")
    start = text.find("const MIN_WEEK")
    end = text.find("function isWeekActive")
    if start < 0 or end < 0:
        fail("Could not find the timetable schedule in courses/timetable/index.html")
    program = text[start:end] + r"""
const days = ["Monday","Tuesday","Wednesday","Thursday","Friday"];
const accent = {
  "bg-DataStructure":"ds","bg-DiscreteMath":"dm","bg-LinearAlgebra":"la",
  "bg-Chinese":"cc","bg-English":"ec","bg-Circuit":"cet","bg-China":"oc"
};
const meetings = [];
schedule.forEach((day, di) => {
  timeSlots.forEach(slot => {
    (day[slot.id] || []).forEach(item => {
      const course = courses[item.id];
      meetings.push({
        day: di,
        start: slot.start,
        end: slot.end,
        time: slot.raw,
        id: item.id,
        name: item.title || course.name,
        room: item.room || course.room || "",
        weeks: item.weeks,
        accent: accent[course.color] || "hub"
      });
    });
  });
});
process.stdout.write(JSON.stringify({previewWeek: currentWeek, days, meetings}));
"""
    result = subprocess.run(["node", "-e", program], check=False, capture_output=True, text=True)
    if result.returncode != 0:
        fail("Could not read the timetable schedule:\n" + result.stderr)
    payload = json.loads(result.stdout)
    if payload.get("previewWeek") != 11 or len(payload.get("meetings") or []) < 10:
        fail("Timetable schedule did not parse into the expected week")
    return "window.DLPU_WEEK = " + json.dumps(payload, ensure_ascii=False) + ";\n"


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

    courses = {section["slug"]: build_course_data(section) for section in live if section["slug"] in {"math", "circuits"}}
    (SITE / "course.js").write_text("window.DLPU_COURSES = " + json.dumps(courses, ensure_ascii=False) + ";\n", encoding="utf-8")

    for name in ("learning.js", "styles.css", "shell.css", "shell.js", "next.js", "favicon.svg"):
        shutil.copy2(HUB / name, SITE / name)
    (SITE / "schedule.js").write_text(build_schedule_js(), encoding="utf-8")

    for section in live:
        copy_site(ROOT / section["source"], SITE / section["slug"])
        index = SITE / section["slug"] / "index.html"
        index.write_text(inject_shell(index.read_text(encoding="utf-8"), live, section), encoding="utf-8")

    template = (HUB / "index.template.html").read_text(encoding="utf-8")
    replacements = {
        "<!-- LIVE_CARDS -->": "\n".join(live_card(section, courses.get(section["slug"]), episode) for episode, section in enumerate(live, 1)),
        "<!-- LIVE_COUNT -->": f"{len(live):02d}",
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
