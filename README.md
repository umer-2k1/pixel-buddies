# Buddies 🐼💧

A cute, animated desktop companion that reminds you to drink water. Pick your buddy — starting with Bao, a chubby
little panda who lives on your desktop, holds a water bottle, and asks
**"Have you had some water?"** — then reacts to your answer with real personality.

## Run

```bash
npm install
npm start
```

A 💧 icon appears in the menu bar / system tray; click it for the menu.
`npm run dist` builds an installer with electron-builder.

## Choose your buddy

Five characters, each fully animated with every expression, gesture and the bottle sip: **Bao** the panda, **Mochi** the cat, **Pip** the bunny, **Pebble** the penguin and **Ollie** the axolotl. Pick one in the panel under **Buddy** — it switches live. Characters are defined as "skins" in `src/shared/mascot.js` (see `SKINS`) on one shared rig, so adding another is a single entry plus a roster line in `src/shared/characters.js`.

## What the buddy does

- **Visits, doesn't squat**: on launch (and at every reminder) your buddy walks in from the left, asks *“Have you had some water?”* with **Yes / Not yet** buttons, reacts, then strolls off to the left. Prefer a permanent buddy? Settings → Bao & Sound → “Hangs out all day”.
- **Floats on your desktop** in a small transparent window that moves with him (never full-screen) — only your buddy and the speech bubble catch the mouse. Eyes follow your cursor.
- **Asks on your schedule** — every N minutes within active hours, or at specific times of day.
- **Reacts**
  - **Yes** → joy, confetti, hops, sips along with you, counts toward your daily goal (big celebration at goal).
  - **Not yet** → concerned/pouty, offers you the bottle, then asks again after a delay (limited retries — never nagging forever).
  - **Later** → snoozes. Ignored → falls asleep and tries again later.
- **Lives a little**: blinks, breathes, wanders, dances, stretches, sips, yawns.
- **Play with it**: click to poke (poke it 4× and it gets dizzy), drag to pick it up and drop it, double-click for the panel, right-click for a menu.
- **Mini-games** (in the panel): Drop Catch, Memory Match, Perfect Pour — your buddy cheers for your scores.
- **Sound**: all synthesized with Web Audio (no asset files); mute + volume in settings.
- **Stats**: daily glasses, streak, 7-day chart.
- **Persistent**: everything is saved to `sprig.json` in the app's user-data folder.

## Reliability notes

- Reminder timing is wall-clock based (checked every 10s), so sleep/wake and clock changes can't skip or double-fire a reminder; reminders are held while the screen is locked.
- Idle CPU is low: the animation loop drops to ~30 fps when nothing is moving.

See [docs/CHARACTER_SPEC.md](docs/CHARACTER_SPEC.md) for the character and animation specification.

## Layout

```
electron/   main process: windows, tray, scheduler, persistence
src/shared/ mascot.js (SVG character + tween engine), sound.js, lines.js
src/mascot/ the floating-companion overlay (stage.js drives behaviour)
src/panel/  settings, stats and mini-games window
```
