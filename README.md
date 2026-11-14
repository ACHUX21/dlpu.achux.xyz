# DLPU class hub

Static coursework hub for **Achraf (ACHUX21)**, class **CST25** at Dalian Polytechnic University. It is published with GitHub Pages at [dlpu.achux.xyz](https://dlpu.achux.xyz/).

Plain HTML, CSS, and the course files already in this repo. No framework.

## Structure

```
CNAME                         custom domain (dlpu.achux.xyz)
.nojekyll                     keep Pages from running Jekyll
hub/
  index.template.html         landing page
  shell.css                   shared header, footer, and color theme
  shell.js                    theme toggle for the shared bar
  styles.css                  landing page layout
  favicon.svg
  sections.json               catalog of live sections and upcoming classes
scripts/assemble.py           builds the publishable site into _site/
courses/
  math/                       discrete mathematics
    authoring/                Markdown lessons and the Python generator
    dist/                     prebuilt site, published at /math/
    README.md                 how to rebuild, and the upstream credit
  timetable/                  Fall 2026 timetable, published at /timetable/
    index.html
    icon.ico
    README.md
.github/workflows/pages.yml   deploy _site/ to GitHub Pages
```

`scripts/assemble.py` reads `hub/sections.json`, writes the landing page, and copies each live section into `_site/<slug>/`. It wraps every section in the same header and footer (`hub/shell.css`). It also copies `CNAME` and `.nojekyll` into that folder. `_site/` is gitignored; GitHub Actions builds it on every push to `main`.

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

   `slug` is the URL path (`/linear-algebra/`). Use lowercase letters, digits, and hyphens. `source` is a path from the repository root. `nav` is the short label in the header. `credit` is the line in that section’s footer. The assembler adds the shared header and footer around `index.html`. Set `"theme": "studio"` only when the page already controls `data-theme` itself, as the math section does.
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
