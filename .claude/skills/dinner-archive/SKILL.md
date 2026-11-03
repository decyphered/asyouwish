---
name: dinner-archive
description: Save a finished dinnerwithcat.com dinner night as a read-only keepsake page under archive/<date>/ and refresh the "Dinner nights" index, so the user can link each date from a calendar and look back on it. Use whenever a dinner night's date has passed and the user is starting the next page (the dinner-night skill calls this first), or when they say "archive", "save last night's page", "keep a copy", "memories", "past dinners", or ask to add her pick or a note to an old night.
---

# Dinner archive

Every dinner night gets a permanent page at `dinnerwithcat.com/archive/YYYY-MM-DD/`, plus an index of all nights at `dinnerwithcat.com/archive/`. The user wants these links for a calendar and for memories, so a night is never overwritten or lost when the next one is built.

An archived page looks exactly like the night did, with three changes made by `freeze.js` (appended to that night's app.js):
- A "From the archive" banner under the header, with the full date, an optional memory line, and a link to the index.
- The form is read-only, the Save bar is hidden, and nothing can be sent to Formspree.
- If her pick is supplied, the page shows it filled in, with the saved box reading "She picked: …".

## When to run it

Run it **before** building a new night, whenever the date of the page being replaced has passed. The readable source of a locked night only lives on this machine (`next/src/`, gitignored), and the next build overwrites it.

If the date hasn't passed yet, don't archive. Ask first.

## 1. Gather

Ask in one message, offering what you can work out:
- **Date** of the night (from the page's `<time datetime>`).
- **Title** for the index: the tag pill text is a good default ("Spooky season hang", "Cozy chat hang").
- **Her pick**, if the user wants it recorded. They have it in the Formspree email. Turn it into the JSON shape that night's app.js saves, e.g. `{"dinner":"takeout","spot":"Yak and Yeti","time":"6:30 PM","dessert":"surprise","note":"...","savedAt":"2026-11-06T20:15:00Z"}`. Radio values come from that night's `NAMES`, `DESSERTS` and `KNOWN_SPOTS`. Optional.
- **A memory line**, e.g. "Dinner was on time!". Optional.
- **Locked or public?** Pages that were behind the password gate should stay locked, so ask for the gate answer (it's never stored in any file). An unlocked page with her pick in it is public, since the repo is public. Mention that.

## 2. Find the source

The script needs a folder with that night's readable `index.html` and `app.js` (plus `preview.png` and `favicon.svg` if it had them):
- Locked nights: the readable source folder, usually `next/src/`, plus `next/preview.png`.
- Unlocked nights that were live: pull them from git, from the last commit before the page was replaced: `git show <commit>:index.html > <scratch>/index.html` (same for app.js, preview.png, favicon.svg).

Copy `preview.png` into the source folder if it lives elsewhere.

## 3. Archive

```powershell
& .\.claude\skills\dinner-archive\scripts\archive.ps1 -Date 2026-11-07 -Source <folder> -Title "Cozy chat hang" `
    [-Pick '<json>'] [-Note "<memory line>"] [-Answer "<gate answer>"]
```

- It writes `archive/<date>/`, rewrites `og:image` and `og:url` to the archive address, adds `noindex`, and rebuilds `archive/index.html` (newest first, 🔒 on locked nights).
- With `-Answer`, it re-locks the page with `dinner-night/scripts/lock.ps1`. It also keeps the frozen readable copy in `archive-src/<date>/` (gitignored), so you can re-archive later, e.g. to add a pick. Back that folder up; it isn't in git.
- It refuses to overwrite an existing night. Pass `-Force` to redo one, such as adding her pick afterwards. For a locked night, re-run from `archive-src/<date>/`, which already has the freeze appended, so take the source from the original folder if you still have it. Otherwise copy `archive-src/<date>/` somewhere, drop everything after the `// ---- Archive mode` line in its app.js, and use that.
- `-IndexOnly` just rebuilds the index.

## 4. Check

Render the archived page and the index with `dinner-night/scripts/render.ps1`. For a locked night, the render script's simulated clock can't wait for decryption. Copy the page to a `t.html` next to it, add a script before `</body>` that fills `gateInput` with the answer and calls `gateForm.requestSubmit()`, and screenshot it with Edge directly using `--headless=new --timeout=10000`. Look for the banner, the pick filled in, and no Save bar, then delete `t.html`.

## 5. Hand off

Give the user the links (`https://dinnerwithcat.com/archive/<date>/` and `/archive/`) and the files to commit: `archive/`. Never commit `archive-src/` or `next/src/`. Don't commit or push unless they ask.
