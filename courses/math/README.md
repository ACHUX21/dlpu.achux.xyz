# Discrete Mathematics

Study site for the CST25 discrete mathematics course. The hub publishes `dist/` at `/math/`.

Adapted from [sprindi/discrete-math-studio](https://github.com/sprindi/discrete-math-studio). The files were copied into this repository (this is not a git submodule). Original third-party lesson material keeps its own ownership; this copy does not add a license for that material.

The published page is wrapped in the class-hub header and footer. The footer credits `sprindi/discrete-math-studio` and links back to the hub. The studio’s own sidebar is offset below that header. The dark-only broadcast design retains the original lesson, method, tool, and practice behavior. `theme.js` sets the initial dark scheme; `theme.css` supplies the studio design. `focus.js` adds a 25-minute timer that survives studio route navigation. Existing review marks, notes, and practice attempts retain their original localStorage format. The in-page studio footer repeats the credit.

## Layout

- `authoring/` — Markdown lessons (`content/chapter-1.md` … `chapter-6.md`) and the Python generator.
- `authoring/prepare.py` — rebuilds `dist/content.js` from those chapters. Diagrams live in `authoring/illustrations.py`.
- `dist/` — the prebuilt static site (HTML, CSS, JavaScript, PDF, and the generated lesson bundle). This is what visitors get at `/math/`.

## Rebuild

From the repository root:

```sh
python3 -m pip install -r courses/math/requirements.txt
python3 courses/math/authoring/prepare.py
python3 scripts/assemble.py
```

`prepare.py` rewrites `courses/math/dist/content.js` only. It leaves `index.html`, the stylesheets, `app.js`, `data.js`, `engine.js`, `reviewed-course.pdf`, and `source-manifest.json` in place.

Upstream wrote that bundle to a `public/` directory. Here the generator writes straight into `dist/`, which is the folder the hub copies to `/math/`.

Asset URLs inside `dist/` are relative (`theme.js`, `style.css`, `reviewed-course.pdf`, `source-manifest.json`). They resolve under `/math/` without a `<base>` tag. Keep new files the same way: `href="notes.pdf"`, not `href="/notes.pdf"`.

## Credit

[sprindi/discrete-math-studio](https://github.com/sprindi/discrete-math-studio)
