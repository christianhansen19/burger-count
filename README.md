# Summer Burger Count 🍔

A real-time, multi-player burger tally for up to 15 friends. Everyone counts
their own burgers on their own phone; a shared leaderboard updates live for
everyone the instant anyone taps **+1**.

Same architecture as the NBA bracket app: **React (Vite)** frontend, **Firebase
Realtime Database** backend (free tier, no server), hosted free on **GitHub
Pages**.

## Features

- **Counter tab** — pick your name (or add yourself, up to 15 players), then a
  big animated count with **+1 / −1** buttons. Every +1 rains burgers down the
  screen like confetti.
- **Leaderboard tab** — gold/silver/bronze **podium** for the top 3 plus a full
  ranked list with proportional burger bars. Your own row is highlighted.
- **Real-time sync** — Firebase `onValue` listeners push every change to all
  devices instantly (no refresh, no polling).
- **Auto-login** — your name is saved in `localStorage`, so you stay logged in.
- **Light / dark mode** — toggle in the header, saved between visits.

## Project structure

```
├── index.html          # Entry point: fonts, CSS reset, keyframe animations
├── vite.config.js      # Vite config — set `base` to your repo name
├── package.json        # Dependencies + build/deploy scripts
└── src/
    ├── main.jsx        # React root render
    ├── firebase.js     # Firebase config (paste YOUR keys here)
    └── App.jsx         # The whole app: counter, leaderboard, confetti, theme
```

---

## Setup

### 1. Install
```bash
npm install
```

### 2. Create a Firebase project (free)
1. Go to <https://console.firebase.google.com> and create a project.
2. Click the **`</>` Web** icon to register a web app (no hosting needed).
3. **Build → Realtime Database → Create Database.** Pick a location and start
   in **test mode** (or use the rules below).
4. **Project settings (gear) → General → Your apps → SDK setup and
   configuration.** Copy the `firebaseConfig` values into `src/firebase.js`,
   replacing the `YOUR_...` placeholders. Make sure `databaseURL` is filled in —
   it's the one people most often miss.

### 3. Set the database rules
In **Realtime Database → Rules**, this casual, no-login app needs open
read/write:
```json
{
  "rules": {
    ".read": true,
    ".write": true
  }
}
```
⚠️ **Heads up:** this lets anyone who has your database URL read and write the
burger counts. That's fine for a friendly summer pool among friends, but it is
**not secure** — don't store anything sensitive, and don't reuse this Firebase
project for anything important. (You could tighten it later by validating the
shape of writes, but open rules keep setup simple.)

### 4. Run locally
```bash
npm run dev
```
Open the printed `localhost` URL. Open it in two browser windows and watch a +1
in one appear in the other instantly.

---

## Deploy to GitHub Pages

1. Create a GitHub repo (e.g. `burger-count`) and push this project to it.
2. In **`vite.config.js`**, set `base` to `"/<your-repo-name>/"` — e.g.
   `base: "/burger-count/"`. This must match the repo name exactly or the page
   will load blank.
3. Build and deploy:
   ```bash
   npm run deploy
   ```
   (`predeploy` runs `npm run build` automatically, then `gh-pages` pushes the
   `dist/` folder to a `gh-pages` branch.)
4. In the repo on GitHub: **Settings → Pages →** set **Source** to the
   **`gh-pages`** branch, root folder. Save.
5. After a minute the app is live at:
   `https://<your-username>.github.io/<your-repo-name>/`

Share that link with your friends — they just open it and add their name.

**Redeploy after any code change:** `npm run deploy`

---

## Tweaks you might want

All near the top of `src/App.jsx`:

- **Player cap:** change `MAX_P` (default 15).
- **Falling items:** edit `FALL_EMOJIS` (mix in 🌭 🥓 🍩 etc.).
- **Theme colors:** edit the `LT` (light) and `DT` (dark) token objects.
- **More confetti per tap:** the `rainBurgers(16)` call inside `change()`.

### Data model (Realtime Database)
```
root/
└── burgers/
    ├── "<safeKey>": { "name": "Alice", "count": 12 }
    ├── "<safeKey>": { "name": "Bob",   "count": 9  }
    └── ...
```
`<safeKey>` is the lowercased name, URL-encoded so it's safe as a Firebase key.
Counts are changed with a Firebase **transaction**, so simultaneous taps from
different devices never overwrite each other.

Have a great summer 🌞
