# 🦉 Animal Logic Land

A gentle match-3 logic game for kids aged 5–8. Every level has a **secret rule**
("only animals that live in water count"). Matches that follow the rule sparkle
and fill the progress bar; matches that don't just wobble and stay. No timers,
no lives, no ads, no purchases.

Plain HTML + CSS + JavaScript. No build step, no libraries, no backend.

## Run it locally

**Quickest:** double-click `index.html`. It opens in your browser and works as-is.

**With a local web server** (closer to how it runs once deployed), from this folder:

```bash
# Python 3
python3 -m http.server 8000
# or Node
npx serve .
```

Then open <http://localhost:8000>. To try it on a phone or tablet on the same
Wi-Fi, open `http://<your-computer-ip>:8000` (for Python, start it with
`--bind 0.0.0.0`).

## Deploy for free

### GitHub Pages

1. Create a new repository on GitHub, e.g. `animal-logic-land`.
2. Push this folder:
   ```bash
   git init
   git add .
   git commit -m "Animal Logic Land"
   git branch -M main
   git remote add origin https://github.com/<you>/animal-logic-land.git
   git push -u origin main
   ```
3. On GitHub, go to **Settings → Pages**, set **Source** to *Deploy from a branch*,
   pick **main** and **/ (root)**, and click **Save**.
4. After a minute the game is live at `https://<you>.github.io/animal-logic-land/`.

### Netlify

- **Drag and drop:** sign in at <https://app.netlify.com>, open **Sites**, and drop
  this whole folder onto the "drag and drop your site folder" area. You get a URL right away.
- **From GitHub:** **Add new site → Import an existing project**, pick the repo,
  leave the build command empty and set the publish directory to `.`
  (the repo root). Every push redeploys.

All paths are relative, so it also works from a sub-folder.

## How to play

- Swap two neighbouring animals (**swipe**, or **tap one then tap its neighbour**)
  to make a line of 3 or more.
- If the animals follow the secret rule, they sparkle and fill the bar ⭐.
  If not, they wobble and nothing is lost.
- After 3 correct matches a 💡 appears: guess the rule from 3 pictures for a
  bonus 🌟. Guessing is optional. After a wrong guess the 💡 comes back after 2 more
  correct matches.
- If no correct match happens for 20 seconds, the owl 🦉 highlights one.
- Stars: 1–3 per level depending on moves used, plus the bonus star. A "move"
  is any swap that makes a line, so wrong-rule lines count toward the star
  score, but nothing is ever taken away. Swaps that make no line at all are free.

## Project structure

```
index.html        page skeleton: map screen, game screen, popups
css/style.css     all styling and animations
js/animals.js     animal data (habitat, legs, size, colour) + AL.fitsRule()
js/levels.js      the level list (rules, goals, star limits, guess pictures)
js/i18n.js        English / Greek labels
js/storage.js     progress + settings in localStorage
js/sound.js       synthesized sound effects (Web Audio, no files)
js/board.js       pure match-3 grid logic (no DOM): lines, swaps, gravity, reshuffle
js/game.js        one level's turn flow: rule checks, progress, hints, guessing
js/boardView.js   draws and animates tiles, handles tap/swipe input
js/ui.js          map, game screen chrome, popups, saving results
js/main.js        start-up
```

The scripts share one global namespace object, `AL`, instead of ES modules,
which is why double-clicking `index.html` works without a server.

## Adding a level

Add an object to `AL.LEVELS` in `js/levels.js`. The map grows on its own:

```js
{
  id: 6,                                  // unique, never reuse (it's the save key)
  icon: '🦁',                             // shown on the map
  animals: ['lion', 'elephant', 'eagle', 'dog', 'cat', 'fish'],
  rule: { size: 'big' },                  // all keys must match; arrays mean "any of"
  fitShare: 0.55,                         // optional: share of new tiles that fit the rule
  goal: 18,                               // rule-fitting tiles to clear
  stars: [9, 14],                         // moves for 3 stars / 2 stars
  ruleText: { en: 'Only big animals!', el: 'Μόνο μεγάλα ζώα!' },
  choices: [
    { pic: '🐘', correct: true, label: { en: 'Big animals', el: 'Μεγάλα ζώα' } },
    { pic: '🐭', label: { en: 'Small animals', el: 'Μικρά ζώα' } },
    { pic: '🌳', label: { en: 'Live on land', el: 'Ζουν στη στεριά' } }
  ]
}
```

New animals go in `js/animals.js`. Open the browser console after editing:
`levels.js` warns about unknown animals, rules nothing fits (or everything
fits), and choice lists without exactly one correct answer.

## Notes

- Every new board, and every board after a turn, is checked to contain at least
  one valid rule-fitting move. If there isn't one, the animals shuffle (with a little spin).
- Progress is saved in the browser under the key `animal-logic-land:v1`. To
  reset, clear the site data, or run `localStorage.clear()` in the console.
- Emoji look slightly different on each device (Apple, Google, Microsoft
  designs). Very old devices may be missing a few newer ones (🦵, 🦇).
