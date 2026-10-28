# 🦉 Animal Logic Land

A gentle match-3 logic game for kids aged 5–8. Every level has a **secret rule**
("only animals that live in water count"). Matches that follow the rule sparkle
and fill the progress bar; matches that don't just wobble and stay. No timers,
no lives, no ads, no purchases.

Plain HTML + CSS + JavaScript. No build step, no libraries, no backend.
Optional cloud saves use Firebase, loaded only when you configure it.

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

## Cloud saves (optional parent sign-in)

By default, progress is saved on each device only. If you connect a free
Firebase project, a **grown-up** can sign in with Google (👤 button on the map,
behind a quick sum so children don't tap it by accident). The stars then follow
that account to every device and update live.

Merging is safe: each level keeps its best stars and any bonus star from any
device, so nothing is ever lost. Language and sound stay per device. Signing out
keeps the progress on that device.

### Setup (about 5 minutes, free "Spark" plan)

1. Go to <https://console.firebase.google.com> → **Create a project**.
   Google Analytics isn't needed.
2. **Build → Authentication → Get started → Sign-in method → Google →
   Enable**, choose a support email, **Save**.
3. **Authentication → Settings → Authorized domains → Add domain**: add
   `apanteli.github.io` (your GitHub Pages domain). `localhost` is already there.
4. **Build → Firestore Database → Create database**, pick a location near
   you (e.g. `eur3`), start in **production mode**. Then open the **Rules** tab,
   replace the contents with [`firestore.rules`](firestore.rules), and **Publish**.
5. **Project settings** (⚙️) → **General → Your apps → Web (`</>`)**, register
   the app (no Firebase Hosting needed), and copy the `firebaseConfig` values
   into `js/firebase-config.js`:
   ```js
   AL.FIREBASE_CONFIG = {
     apiKey: '…',
     authDomain: 'your-project.firebaseapp.com',
     projectId: 'your-project',
     appId: '…'
   };
   ```
6. Commit and push. The 👤 button appears on the map.

Sign-in needs a real web address. It works on GitHub Pages, Netlify and
`http://localhost:8000` (see "Run it locally"), but not when you double-click
`index.html`. There, the game just works offline as before.

The config values aren't secrets. Access is enforced by `firestore.rules`:
each account can only read and write its own `players/{uid}` document, which
holds only stars and unlocks. Firebase Authentication stores the Google
account's name and email. If you deploy on Netlify, add that domain in step 3 too.

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
js/storage.js     progress + settings in localStorage, merging progress
js/firebase-config.js  your Firebase settings (null = cloud saves off)
js/cloud.js       optional Google sign-in + Firestore sync
firestore.rules   database security rules to paste into Firebase
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

There are 50 levels in 10 groups of 5: single animals, size, fur/feathers/scales,
legs and homes, colours, "everyone except…", two clues at once, "this or that",
and two groups of three-clue detective levels.

Add an object to `AL.LEVELS` in `js/levels.js`. The map grows on its own:

```js
{
  id: 51,                                 // unique, never reuse (it's the save key)
  icon: '🦁',                             // shown on the map
  animals: ['lion', 'elephant', 'eagle', 'dog', 'cat', 'fish'],
  rule: { size: 'big' },                  // the secret rule (see below)
  fitShare: 0.55,                         // optional: share of new tiles that fit the rule
  goal: 24,                               // rule-fitting tiles to clear
  stars: [11, 17],                        // moves for 3 stars / 2 stars
  ruleText: { en: 'Only big animals!', el: 'Μόνο μεγάλα ζώα!' },
  choices: [right(C.big), C.small, C.land] // the 3 guess pictures
}
```

**Rules** test the animal attributes in `js/animals.js`: `habitat`
(land/water/air), `legs` (0/2/4/6), `size` (small/big), `colour`, `covering`
(fur/feathers/scales/skin/shell), `farm` (true/false) and `id`.

| Rule | Means |
|---|---|
| `{ habitat: 'land', size: 'small' }` | every listed attribute must match (AND) |
| `{ legs: [2, 4] }` | an array means "any of these" |
| `{ not: { id: 'cat' } }` | everyone except… |
| `{ any: [{ id: 'dog' }, { legs: 0 }] }` | either rule (OR) |

**Guess pictures:** `C` at the top of `levels.js` has ready-made choices
(`C.water`, `C.fur`, `C.legs4`, `C.green`, …). `only('dog', 'Only dogs', 'Μόνο σκυλάκια')`
and `pick(pic, en, el, rule)` make new ones, and `right(choice)` marks the
correct answer. Give wrong choices a `rule` so the checker can test them.

New animals go in `js/animals.js`. Open the browser console after editing.
`levels.js` warns about duplicate ids, unknown animals, rules that nothing (or
everything) fits, choice lists without exactly one correct answer, and wrong
choices that would pick exactly the same animals as the real rule. A child
couldn't tell those apart.

## Notes

- Every new board, and every board after a turn, is checked to contain at least
  one valid rule-fitting move. Animals that are about to drop in are picked so
  that one exists. If there still isn't one, the board shuffles (with a little spin).
- Finishing a level always unlocks the next, including in saves made before
  new levels were added.
- Progress is saved in the browser under the key `animal-logic-land:v1`. To
  reset, clear the site data, or run `localStorage.clear()` in the console.
- Emoji look slightly different on each device (Apple, Google, Microsoft
  designs). Very old devices may be missing a few newer ones (🦵, 🦇).
