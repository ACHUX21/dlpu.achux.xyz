# Circuit & Electronic Tech

Copied from [sprindi/circuit-exam-studio](https://github.com/sprindi/circuit-exam-studio), upstream commit `5fd0307be50f68e9c1f553b065b1a2dcd85e26b7`, without `.git`. The hub publishes `dist/` at `/circuits/`. Original third-party course material retains its ownership; this copy does not grant a new license.

The original 21 study topics, 36 questions, method bank, diagrams, images and reviewed PDF are preserved. Broadcast styling, learning objectives derived from headings, suggested preparation, numbered steps, callouts, inline quizzes, notes, progress rings, resume links and the focus timer match the math studio. The theme is always dark. `circuitExamV1` remains the independent circuit progress key; math uses `discrete-studio-v1`.

`authoring/prepare_content.py` now writes to `dist/content.js` instead of upstream's `public/`. To regenerate, install Python Markdown and run:

```sh
python3 -m pip install Markdown
python3 courses/circuits/authoring/prepare_content.py
python3 scripts/assemble.py
```

The circuit service worker registers with explicit `./` scope beneath `/circuits/`. Its relative precache URLs and cache names are course-specific; it does not intercept `/math/`, the hub, or the timetable, and never deletes another course's caches. All course assets remain relative to `/circuits/`.
