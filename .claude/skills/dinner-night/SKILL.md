---
name: dinner-night
description: Rebuild the dinnerwithcat.com dinner-night picker page (index.html, app.js, preview.png) for the next date night with Cat, with a new date, theme, main event, dinner options, takeout spots, dessert and link preview image. Use this whenever the user wants to set up, plan, refresh or "spin up" the next dinner night, swap the "coming soon" placeholder back to a real picker or put the placeholder back up, change the date or theme of the dinner page, or says anything like "new dinner page", "next Sunday dinner", "redo the site for Saturday", even if they don't say "skill" or name the files.
---

# Dinner night page

dinnerwithcat.com is a single-page picker for a planned night in with Cat. She opens the link on her iPhone, picks a start time and a dinner, optionally adds a note, and taps Save. The pick is emailed to the user through Formspree and remembered on her phone. The site is GitHub Pages, served from the repo root (`index.html`, `app.js`, `preview.png`, `favicon.svg`, `CNAME`).

`template/` holds the last finished night (Sunday, October 25, 2026: Halloween theme, Couples Therapy with Dr. Orna) as a working example. Copy from it rather than writing from scratch: the layout, spacing and save logic were tuned over many rounds of feedback, and the user likes them.

## 1. Gather the details

Ask for whatever the user hasn't already said, in one message. Offer last night's values as defaults so they can just say "same":

- **Date** (and weekday). Work out the weekday yourself and check it matches what they said.
- **Theme or season** (last time: Halloween / "Spooky season hang"). This drives the colours, the moon-and-bats art, the tag text and small jokes.
- **Main event**: title and a short on-theme second line.
- **Dinner options**: names, plus an optional link for each (a recipe, or the Instagram post she sent).
- **Takeout**: keep it? Which spots?
- **Chef's choice**: keep it?
- **Dessert**: still a surprise, or something specific?
- **Anything to drop or add**, such as the start-time picker or the note box.

Keep it to one round of questions. If an answer is fuzzy, pick a sensible default and say what you chose.

## 2. Build the page

Copy `template/index.html` and `template/app.js` over the repo root files, then edit them. These are the per-night edit points. Search for the quoted text to find each one.

**index.html, head**
- `<title>`, `meta description`, `og:title`, `og:description`: new date and wording. The tab title format the user chose was `Cat! Sunday, Oct 25 plans`.
- `og:image` → `preview.png?v=N`: increase N. Messaging apps cache previews by URL, so without a new number freshly sent links can show the old image.
- `theme-color` meta: match `--bg` if you change it.

**index.html, CSS `:root`**: for a new theme, retint the colour tokens (`--bg`, `--surface`, `--accent`, `--chili` for small accents, `--moon`). Leave the rest of the CSS alone unless asked. Keep text contrast readable on the dark background.

**index.html, header**
- `<svg class="night">`: the moon, its glow and two bats. Swap or restyle for the theme (snowflakes, stars, hearts and so on), but keep it small, top right and `aria-hidden`. Draw any glow with an SVG `radialGradient`, as the template does. iOS Safari ignores CSS `filter: drop-shadow` on SVG shapes.
- `<h1>`: "Cat!" in the Creepster font. Creepster is the Halloween part; for other themes, swap the `--spooky` font for a Google Font that fits and update the font `<link>`.
- `.date-line`: `<time datetime="YYYY-MM-DD">Weekday, Month D</time>` plus the green `.tag` pill (last time "Spooky season hang").
- `.hi-sub` and `.lede`: the one-line pitch and the playful aside.

**index.html, body sections** (headings are small-caps `h2`s with a rule line; keep that style)
- **Main event**: the `.event` card (icon, `<strong>` title, `<span>` line).
- **Start time**: a native `<select>` that app.js fills. Nothing to edit here.
- **Dinner**: one `.choice` block per dish. The radio `value` must match a key in `NAMES` in app.js. Put links in the `.sub` line as `<a class="recipe" href="…" target="_blank" rel="noopener">… &#8599;</a>`; the new tab keeps her picks from being lost.
- **Takeout**: the `.spot` radios inside `#spotBox`, the takeout `.sub` summary line (name 2 or 3 spots, then "and more"), and the CSS `content:"N options"` count (spots plus "Somewhere else").
- **Chef's choice** card, **Dessert** card, and the note `placeholder`.
- `<script src="app.js?v=N">`: increase N whenever app.js changes. Browsers otherwise keep running an old stored copy (this happened once: the time dropdown came up empty).

**app.js**
- `STORAGE_KEY`: **change it for every night**, e.g. `'dinner-2026-11-15'`. Her phone remembers the last saved pick under this key, and with the old key last night's pick would show up as already "Locked in".
- `NAMES`: radio value → display name for each dinner.
- `KNOWN_SPOTS`: must list every takeout spot value exactly. Otherwise a saved spot comes back as "Somewhere else".
- `setStatus('Noted, chef! 🎃', 'ok')`: retheme the emoji and line.
- Leave `FORMSPREE_ID` as it is unless the user gives a new one.
- The time list is every 30 minutes, with the "Pick a time" placeholder at noon so the iPhone wheel opens mid-day. Keep both unless asked.

## 3. Rebuild the preview image

Copy `template/preview.html` somewhere scratch, edit its text and colours to match the page, then render it to the repo's `preview.png`:

```powershell
& .\.claude\skills\dinner-night\scripts\render.ps1 -Page <scratch>\preview.html -Out "$PWD\preview.png" -Preview
```

Look at the result. It should show the big title, the date, the tag pill and one tagline line, centred vertically, with the art on the right. The user asked for no URL and no "Your pick." line on it.

## 4. Check it like a phone

```powershell
& .\.claude\skills\dinner-night\scripts\render.ps1 -Page index.html -Out <scratch>\phones.png
```

Read the screenshot and check, at 320, 375 and 414 px:
- No sideways scrolling, and nothing colliding with the header art.
- The date stays on one line. Spot pills and cards wrap neatly.
- Nothing has a hard cut-off line near the top. iOS Safari paints a solid strip behind the status bar, so anything brightening the very top of the page shows a seam there.

To check a state that needs a tap (Takeout open, a time picked), copy index.html to scratch, point its script at the real app.js with an absolute `file:///` URL, add `checked` to an input or a small script after app.js (e.g. `timeEl.value="6:30 PM";refresh();`), and render that copy.

## 5. Hand off

Tell the user what changed, what you assumed, and anything they still need to fill in (such as a link they haven't sent). Then give them the commands to publish:

```
git add index.html app.js preview.png
git commit -m "Dinner night: <date>"
git push
```

Don't commit or push unless they ask. Pushing publishes the page to her. Remind them that a test save sends a real Formspree email, and that her phone will only show a pick she saved herself.

## Coming-soon page

Between nights, the root `index.html` is a small standalone "New plans coming soon" page. It has:
- a steaming cloche whose lid tips up to show 👀 when tapped, with "no peeking" jokes;
- the line "Dinner *may* even be served earlier. We'll see." (the first night's dinner was served late).

The user tried and removed a "days without a late dinner" sign and a request box here; they want this page kept minimal.

It has no app.js and its own preview image. Running this skill replaces it with the full picker.

To put the placeholder back after a night, copy `template/coming-soon.html` to the repo's `index.html` and render `template/coming-soon-preview.html` to `preview.png` with `-Preview`. Increase the `?v=` number on its `og:image` so freshly sent links show the placeholder image. If that night's dinner was on time, ask the user whether the late-dinner jokes still fit.
