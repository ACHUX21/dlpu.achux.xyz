# Timetable

Fall 2026 CST25 timetable, published at `/timetable/`.

Copied from [THE12X/timetable2026](https://github.com/THE12X/timetable2026) (not a git submodule):

- `index.html` — the whole page, including its styles and schedule data
- `icon.ico` — the favicon

Both asset references in the page are relative (`icon.ico`), so the section works under `/timetable/`. The assembler adds the shared class-hub header and footer. That footer credits THE12X and links back to the hub. The color theme on the shell also toggles the timetable’s dark mode.

The page loads Tailwind and the Inter font from public CDNs. Those requests are part of the upstream page.

## Credit

[THE12X/timetable2026](https://github.com/THE12X/timetable2026)
