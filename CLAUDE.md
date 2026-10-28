# Wishly: handover notes

Wishly makes personal songs from the memories that matter. Someone shares a person's name and a
few memories, Wishly writes and sings a song about them, and the buyer listens and checks every
name before giving it.

These notes are for whoever picks the project up next. Read them first, then the README of the
app you're working on.

## What's here

| Folder | What it is |
| --- | --- |
| `wishly-ios/` | **The product.** The iPhone app: Expo SDK 58, React Native 0.88, Expo Router, Reanimated 4, TypeScript. Start with `wishly-ios/README.md`. |
| `wishly/` | The web app (React, Vite, Tailwind). Recipients open their gift here (`/gift/:token`), so they never need the app. It also holds the earlier web version of the buying flow. See `wishly/README.md`. |

Both apps are built to share one Base44 backend through an `Order` entity
(`wishly-ios/base44/entities/order.jsonc`). It isn't connected yet.

## Where things stand

- **It's a demo for now.** With no Base44 app ID set, the iPhone app runs on its own:
  - orders are saved on the phone
  - sign-in is simulated
  - "Demo only" buttons stand in for writing the song and making corrections
- **Never run on a real iPhone.** What has been checked:
  - type-check, lint, the iOS bundle export and `expo-doctor` (20/20)
  - every screen in the web preview (`npm run web` in `wishly-ios/`)

  Not yet seen on a device: Liquid Glass, haptics, how the native springs feel, Reduce Motion,
  the notification ask, Apple and Google sign-in, and sending a real gift link.
- **No builds yet.** There's no `eas.json`, and `app.json` has no bundle identifier. The
  original machine had no Xcode; builds are meant to go through EAS in the cloud.
- **No secrets in the repo.** Settings go in `wishly-ios/.env.local`, which is git-ignored.
  `.env.example` lists them.

## Decisions to keep

- **US only, for now.** `MARKETS` is `['us']` in `wishly-ios/src/lib/catalog.ts` and
  `wishly/src/lib/catalog.js`. Choices and examples for India and other markets are still in
  those files, tagged with their market; leave them there. Prices are in US dollars and the
  copy uses US English.
- **Design.** A dark music app (Suno was the reference) on a warm near-black. The colours are
  in `wishly-ios/src/theme.ts`:
  - background `#121110`, surface `#1E1C1B`, text `#FFFAF5`
  - coral `#FF6B7A` for actions
  - teal `#143438` for brand moments and for text on coral
- **Where the designs live.** The Claude Design canvas **Wishly App Screens**, iOS page
  (https://claude.ai/artifact/Qd6NLARSQRfW5rV7jLyfuo). It's private to the owner's account until
  they share it. It hasn't been updated for US only: the code wins where they differ.
- **No account wall.** People can look around, play examples and fill in a whole song without
  an account. Sign-in comes once, when they tap "Create song" on Review.
- **Motion feels like iOS.** Springs and shared pieces live in `wishly-ios/src/lib/motion.ts`
  and `wishly-ios/src/components/motion.tsx`. Every effect respects Reduce Motion. The web
  preview gets simpler entrances on purpose; the README's Motion section explains why. Read it
  before adding animation.
- **Recipients never need the app.** Gifts open on the web.

## Next steps, roughly in order

1. **Connect Base44.** Follow "Connect Base44" in `wishly-ios/README.md`, and point the web
   app at the same app ID.
2. **Finish the backend.** Build what's under "Still to build on Base44" in that README:
   - a backend function for the gift page
   - the real song pipeline (vocals and recording, setting `song.audio_url`)
   - the gift link address
   - payment. Check Apple's rules on selling digital goods before choosing Stripe or in-app
     purchase.
3. **First TestFlight build.** Run `npx testflight` in `wishly-ios/`. It needs a paid Apple
   Developer account and asks for a bundle identifier. Set the `EXPO_PUBLIC_…` values as EAS
   environment variables first; `.env.local` isn't uploaded with cloud builds.
4. **Test on a real iPhone.** Especially the Apple and Google sign-in round trip back to
   `wishly://auth`, haptics, Liquid Glass and notifications.
5. **Replace the photography before launch.** The photos in `wishly-ios/assets/brand/` and
   `wishly/public/brand/` are illustrative, from the brand kit.
6. **Later:** other markets, starting with adding them to `MARKETS`.

## Not in this repository

Ask the owner for these:
- the Wishly Product Brief and the brand kit
- access to the design canvas
- access to the Base44 app
- access to the Expo account
- access to the Apple Developer / App Store Connect team

## Checks before calling anything done

In `wishly-ios/`:

```bash
npx tsc --noEmit && npx eslint src && npx expo-doctor
```

In `wishly/`:

```bash
npm run lint && npm run build
```

`.claude/launch.json` has two preview servers for the Claude desktop app: `wishly-ios-web`
(the iPhone app in a browser, port 8099) and `wishly` (the web app, port 5179).

## Working on the iPhone app

@wishly-ios/AGENTS.md
