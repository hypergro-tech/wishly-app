# Wishly

Personal songs made from the memories that matter. A mobile-first web app
(React + Vite + Tailwind) that installs to the home screen.

## The app

- **Phone:** the app fills the screen, with a bottom tab bar (Home · New song · My gifts),
  full-screen steps with a pinned action bar, and bottom sheets.
- **Desktop:** the same app shows in a phone-sized frame beside a brand panel.
- **Install:** `public/manifest.webmanifest`, icons in `public/icons/`, and a small
  network-first service worker (`public/sw.js`, production builds only). On a phone, open the
  site and use *Add to Home Screen*.
- Screens use no `sm:`/`md:` breakpoints (those follow the browser width, not the 440px frame).

## Screens for Claude Design

Every screen and state is laid out on the Claude Design canvas **Wishly App Screens**
(https://claude.ai/artifact/Qd6NLARSQRfW5rV7jLyfuo, private until shared from its Share menu).
The artboards are screenshots, so refresh them after UI changes:

```bash
npm run screens
```

This starts its own Vite server (no need for `npm run dev`), drives headless Chrome with a fresh
profile, seeds demo gifts in every state, and writes 19 JPEGs plus `screens/manifest.json` to
`screens/` (git-ignored). Each manifest entry names its canvas artboard (`board`), row, title and
size. To update the canvas, ask Claude to "refresh the Wishly screens canvas from screens/": it
uploads the new images and repoints each artboard. Needs Google Chrome or Chromium installed; set
`CHROME_PATH` if it isn't found. Adding a screen means adding a `shot(...)` call in
`scripts/capture-screens.mjs` and an artboard on the canvas.

## Brand

Follows the Wishly Creative Brandbook (proposed identity, Oct 2026):
deep teal `#143438`, warm coral `#FF6B7A` (deep teal labels on coral; never small white type on coral),
ivory canvas, lilac / butter / mint soft colours, Arial Bold with Georgia Italic accents, and the
spark, rhythm and ribbon gestures (`src/components/brand.jsx`). Tokens live in `tailwind.config.js`.
Photography in `public/brand/` is illustrative, from the brand kit. Clear it before launch.

```bash
npm install
npm run dev
```

## What's built

| Route | What it does |
| --- | --- |
| `/` | Home: active gifts, examples in a sheet, occasions, how it works, price |
| `/create` | 5 full-screen steps: who (name + pronunciation playback), details, feeling, check, gift & checkout. `?occasion=` preselects |
| `/orders/:id` | Buyer's order: production status, song review, correction requests, approve + personal message, share link |
| `/my-gifts` | All of the buyer's orders |
| `/gift/:token` | Recipient's private listening page — no account, no site chrome |

Order lifecycle: `in_production → ready_for_review → (correction_requested → ready_for_review)* → approved`.

## Connecting Base44

Everything talks to the backend through `src/api/base44Client.js`, which mimics the
`@base44/sdk` surface with localStorage. To switch over:

1. `npm install @base44/sdk`, then replace that file's export with
   `createClient({ appId: import.meta.env.VITE_BASE44_APP_ID })`.
2. Create an **Order** entity with these fields:
   `status`, `recipient` (object: name, pronunciation, pronouns, relationship), `occasion`,
   `occasion_date`, `memories` (object), `music` (object), `package` (object: delivery, extras[]),
   `buyer` (object: name, email), `price_total`, `ready_by`, `song` (object: title, style,
   sections[], audio_url), `song_version`, `corrections` (array), `gift_token`, `gift` (object).
3. Make `/gift/:token` readable without login (public read on Order filtered by `gift_token`,
   or a backend function that returns only the song + message).
4. Replace the "Demo only" buttons on the order page (`finishProduction`, `applyCorrection` in
   `src/api/orders.js`) with your production pipeline — `InvokeLLM` already receives a real
   prompt + JSON schema from `buildSongPrompt` / `SONG_SCHEMA`; set `song.audio_url` once the
   recording exists and the player switches from the music-box preview to real audio.
5. Wire checkout (Stripe via Base44) in `Create.jsx` `submit()`, and an email when the song is ready.

Prices, extras, occasions, moods and examples live in `src/lib/catalog.js`.
