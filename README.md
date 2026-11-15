# DLPU class hub

Static coursework hub for **Achraf (ACHUX21)**, class **CST25** at Dalian Polytechnic University. It is published with GitHub Pages at [dlpu.achux.xyz](https://dlpu.achux.xyz/).

**The Night Broadcast / 夜間放送** — a dark-only, late-80s/90s anime-inspired study space. Plain HTML, CSS, JavaScript, and the course files already in this repo. No framework or runtime build dependencies.

## Structure

```
CNAME                         custom domain (dlpu.achux.xyz)
.nojekyll                     keep Pages from running Jekyll
hub/
  index.template.html         landing page
  shell.css                   dark broadcast design system and shared shell
  shell.js                    command palette, session intro, secret channel
  styles.css                  landing page layout
  next.js                     Shanghai-time schedule HUD and countdown
  favicon.svg                 original broadcast mark
  sections.json               catalog of live sections and upcoming classes
scripts/assemble.py           builds the publishable site into _site/
courses/
  math/                       discrete mathematics
    authoring/                Markdown lessons and the Python generator
    dist/                     prebuilt site, published at /math/
    README.md                 how to rebuild, and the upstream credit
  timetable/                  Fall 2026 timetable, published at /timetable/
    index.html
    timetable.css / .js       mission grid, mobile weekday view, briefings
    icon.ico
    README.md
.github/workflows/pages.yml   deploy _site/ to GitHub Pages
```

`scripts/assemble.py` reads `hub/sections.json`, renders the episode cards, and copies each live section into `_site/<slug>/`. It injects the shared header, footer, dark-only boot settings, fonts, command palette, and stylesheet. It also extracts the timetable’s original course and meeting data into `schedule.js` for the hub HUD. `CNAME` and `.nojekyll` are copied into `_site/`. `_site/` is gitignored; the existing GitHub Actions workflow assembles and deploys it on pushes to `main`.

## Design system

Original SVG city art, bold condensed title cards, katakana/kanji accents, halftone patterns, cel-like panels, and a very subtle scanline overlay set the broadcast mood. No copyrighted character images or paid assets are used.

| Token | Value / use |
| --- | --- |
| Deep ink | `#090d16`, page backgrounds |
| Navy cel | `#111925`, panels |
| Vermilion | `#ff654f`, titles and primary actions |
| Signal cyan | `#78dce0`, navigation, progress, and live displays |
| Paper-white text | `#eef0e9` |
| Muted text | `#a0adbe` on dark surfaces |
| Display / body / telemetry | Barlow Condensed / DM Sans / IBM Plex Mono, via Google Fonts |

The site always uses a dark color scheme, including when the browser prefers light or an old light preference is saved. There is no theme switch. Layouts adapt from 320px to large desktops. Visible focus states, native dialogs, descriptive control labels, keyboard navigation, and reduced-motion support are shared throughout. The scanline layer never intercepts clicks.

## Features and shortcuts

- **Hub:** original Dalian night skyline, episode cards for live sections, VHS-inspired previews for upcoming classes, and a next-class HUD with a second-by-second countdown.
- **Schedule data:** the HUD uses Shanghai time and the selected term-week pattern, defaulting to week 11. The timetable selection is remembered locally and reused on the hub. The source does **not** provide calendar dates or a semester-start date, so the HUD reports the next weekly occurrence of that pattern, not an asserted calendar-specific term week. Its label makes the pattern explicit; a week with no classes has an empty state.
- **Command palette:** press **Ctrl+K / Cmd+K**, or use the header search button, from any page. Search pages, tools, sections, and all six math chapters. Use **↑ / ↓**, **Enter**, and **Esc**.
- **Session intro:** a brief, non-blocking terminal status appears once per session. Skip it immediately; it is omitted for reduced-motion users.
- **Math studio:** all 25 lessons, solving methods, course search (**/**), practice, saved mistakes, five interactive tools, PDF download, sources, and corrections remain available. Lesson review marks, notes, and attempts retain the original `discrete-studio-v1` localStorage format. Chapter cards show review progress. Progress measures reading, not mastery.
- **Focus timer:** a 25-minute timer in the studio sidebar supports start, pause, and reset, and keeps running while switching studio routes. On mobile, open the navigation menu to access it. It uses wall-clock elapsed time and resets on a full page reload; no sound or notification permission is needed.
- **Timetable:** a five-day mission grid on desktop and a weekday selector on mobile. Choose weeks 11–19 with the selector, previous/next controls, or **← / →**. Course buttons open keyboard-accessible briefing dialogs with the original room, instructor, meeting time, and active weeks. Today is highlighted and a now-line appears during a class period, both using Shanghai time; these indicate the clock against the selected pattern. The timetable no longer loads Tailwind or any framework CDN.
- **Secret channel:** the classic **↑ ↑ ↓ ↓ ← → ← → B A** sequence changes the broadcast hue. Repeat it to return.

Preferences and study progress stay in this browser; there is no account, analytics, or sync. The site remains usable when storage is unavailable. Fonts fall back to local system fonts if Google Fonts is unavailable.

Course files are copies, not git submodules.

| Path | What it is | Credit |
| --- | --- | --- |
| `/` | Class hub | Achraf / ACHUX21, CST25 |
| `/math/` | Discrete Math Studio | [sprindi/discrete-math-studio](https://github.com/sprindi/discrete-math-studio) |
| `/timetable/` | Fall 2026 timetable | [THE12X/timetable2026](https://github.com/THE12X/timetable2026) |

The math and timetable pages use relative asset links (`style.css`, `icon.ico`, `reviewed-course.pdf`), so they keep working under `/math/` and `/timetable/`. The math generator writes `content.js` into `courses/math/dist/` (the published folder). See `courses/math/README.md` to rebuild lessons, and `courses/timetable/README.md` for the timetable files.

## Local preview

From the repository root, with Python 3:

```sh
python3 scripts/assemble.py
python3 -m http.server 8080 --directory _site
```

Then open:

- http://127.0.0.1:8080/
- http://127.0.0.1:8080/math/
- http://127.0.0.1:8080/timetable/

## Verification

Build and serve the site with the local preview commands above. Browser verification for this redesign covered all three entry points at 1440×900 and 390×844, plus overflow checks at 320, 768, and 1024px. Screenshots and the browser QA report are saved outside the repository at `/workspace/codex/shots/`. For example:

```sh
google-chrome --headless=new --no-sandbox --hide-scrollbars \
  --window-size=1440,900 --virtual-time-budget=6000 \
  --screenshot=/workspace/codex/shots/hub-desktop.png \
  http://127.0.0.1:8080/
```

Repeat for `/math/`, `/timetable/`, and `--window-size=390,844`. Check the math lesson, practice, tools, search, progress persistence, and the timetable’s week controls and course briefings in addition to the landing screens.

## Add a section

Upcoming classes on the landing page come from the `upcoming` array in `hub/sections.json`. A real section comes from the `live` array plus a folder of static files.

1. Create `courses/<slug>/` with the pages for that section. The published directory must contain `index.html`. Put authoring files beside it (as `courses/math/` does) and point `source` at the directory that should actually go online.
2. In `hub/sections.json`, add an object to `live`:

   ```json
   {
     "slug": "linear-algebra",
     "nav": "Algebra",
     "kicker": "Course",
     "title": "Linear Algebra",
     "summary": "One sentence about what the section contains.",
     "source": "courses/linear-algebra",
     "credit": {
       "prefix": "Adapted from",
       "href": "https://example.com/source",
       "label": "the original project"
     }
   }
   ```

   `slug` is the URL path (`/linear-algebra/`). Use lowercase letters, digits, and hyphens. `source` is a path from the repository root. `nav` is the short label in the header. `credit` is the line in that section’s footer. The assembler adds the shared header and footer around `index.html`. The shared shell enforces the dark theme for every section; new course styles should use the shared dark tokens.
3. Remove the matching object from `upcoming` if it was only a placeholder. To add another placeholder, append `{ "code": "LA", "title": "Linear Algebra" }` to `upcoming`. No folder is required for a placeholder.
4. Reference CSS, JavaScript, images, and downloads with relative URLs (`href="notes.pdf"`), not root URLs (`href="/notes.pdf"`). Root URLs break once the section lives under its own path.
5. Credit the source in `courses/<slug>/README.md` and in the section footer.
6. Rebuild and preview:

   ```sh
   python3 scripts/assemble.py
   python3 -m http.server 8080 --directory _site
   ```

`README.md` inside a section source folder is not copied into `_site/`. It stays in the repository. Everything else in that folder is published.

## DNS and GitHub Pages

1. DNS for `achux.xyz` already has a **CNAME** record for host `dlpu` pointing at `achux21.github.io`. That is the record GitHub Pages expects for this domain. If it is ever recreated, use that same host and target.
2. In this repository, open **Settings → Pages → Build and deployment** and set **Source** to **GitHub Actions**.
3. Push to `main`. The **Deploy GitHub Pages** workflow assembles `_site/` and deploys it with `actions/upload-pages-artifact` and `actions/deploy-pages`. The published `CNAME` file contains `dlpu.achux.xyz`, which is what Pages reads as the custom domain.
4. After a deploy succeeds, turn on **Enforce HTTPS** under Settings → Pages.

The first certificate can take a few minutes after DNS is pointing at `achux21.github.io`.
