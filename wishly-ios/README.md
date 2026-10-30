# Wishly for iPhone

The native Wishly app: Expo SDK 58 / React Native, iOS first, with Base44 as the backend.
It shares its data (the `Order` entity) with the Wishly web app, and recipients still open
their gift on the web, so they never need the app.

## Try it on your iPhone

1. Install **Expo Go** from the App Store.
2. In this folder:

   ```bash
   npm install
   npx expo start
   ```

3. Scan the QR code with the iPhone camera. If your phone and computer aren't on the same
   Wi-Fi, use `npx expo start --tunnel`.

Without any configuration it runs as an **on-device demo**: orders are saved on the phone, and
"Demo only" buttons stand in for writing the song and making corrections. Sign-in is simulated
too: Apple and Google sign you in straight away, and any six digits confirm a new email.
To see the first launch again, delete the app (or clear site data in the web preview).

## What's in the app

A dark, music-app design (canvas **Wishly App Screens**, iOS page) on a warm near-black: every
song has cover art, one player follows you around the app, and creating a song is one screen.

**First time and sign-in.** Nobody needs an account to look around, play examples or fill in a
song. The first launch shows one welcome screen; Home then asks "Who's it for?" and explains
how it works. Sign-in is asked once, when "Create song" is tapped on Review ("Save Grace's
song"): Apple, Google or email. Email is one form for new and returning people; a new address
confirms with a 6-digit code that iOS offers from Mail. The song is placed as soon as sign-in
succeeds, and only then does the app ask once about notifications.

| Screen | What it does |
| --- | --- |
| Welcome | First launch only: one photo, one promise, Start a song · Hear an example · I already have an account |
| Home | First visit: Who's it for? and how it works. Later: your songs in progress. Always: example songs, occasion tiles |
| Create | One scrolling screen: who it's for, occasion, their story (+ add details), the sound |
| My songs | Every song with its cover and status; filter by in progress or ready to give |
| Mini player | Above the tab bar whenever something is playing; tap to open the full player |
| Now playing | Full-screen player: big cover, scrubber, play, lyrics following along |
| Review | Cover from their name, details to check (with pronunciation), delivery, extras, total |
| Song | Being written · ready to listen and check (checklist, lyrics) · ready to give (share targets, link) |
| Sign in · Email · Code | Bottom sheet: Apple, Google, email; one email form for new and returning; 6-digit code |
| Notification ask | Once, after the first song is placed |
| Fix something · Add your message · Account | Native bottom sheets |
| Gift preview | The recipient's gift cover and player |

Also: pronunciation playback (`expo-speech`), music-box previews per mood (`expo-audio`,
loops rendered by `scripts/make-music-box.mjs`), haptics, Keychain storage for the login token,
the song being created saved on the phone.

**US first.** The app launches in the US only: prices in dollars, US English, and US
occasions and examples. Choices and examples for other markets (Hindi and Hinglish, Bollywood,
the Amma and Nani examples, French and Portuguese) are kept in `src/lib/catalog.ts`, marked
with their market, and come back by adding that market to `MARKETS`.

**Motion.** Springs in the spirit of iOS, built with Reanimated (`src/lib/motion.ts`,
`src/components/motion.tsx`):

- Everywhere: buttons, cards, tiles and covers give under the finger; choices pop when picked.
- Player: the cover grows out of what was tapped (mini player or an example cover) and flies back
  on close; pull down to close; the cover sits back while paused; progress glides; play and pause
  morph; the spark glides from line to line and the lyrics follow once you've scrolled to them.
- Create: the voice selector slides; added details open into place and the cards below glide; the
  detail count rolls; "Review your song" springs to life with a light tap when it's ready.
- Review: "Create song" draws in to a spinner, then a tick. Ticks land with a bounce.
- Song: the "Writing" cover's waveform moves and its spark turns; the first time a song is ready,
  sparks burst from the cover (a soft glow instead for gentle occasions); "Looks right" glows once
  all three are ticked; the ribbon draws itself round the cover after sending.
- Gift: the spark opens petal by petal, the name rises in, and the cover lifts away into the song.
- Sign-in: steps slide sideways; the coral ring glides between code boxes, digits pop in, and a
  wrong code or password shakes, like the iPhone passcode screen.
- Welcome photo drifts slowly; the notification bell rings once; tab icons bounce.
- Liquid Glass (iOS 26 and later, `src/components/glass.tsx`) for the tab bar, the mini player and
  the header that appears once a tab's big title scrolls away. Older iOS and the web preview get a
  near-opaque fill.
- With Reduce Motion on, movement becomes short fades and looping effects stop.

The web preview runs the same motion with a few differences: entrances use stock curves instead of
springs, and steps with a field that focuses itself arrive without one.

## Connect Base44

Base44 supports Expo apps directly ([React Native quickstart](https://docs.base44.com/developers/backend/quickstart/frameworks/quickstart-with-react-native)).

1. Install the CLI (Node 20.19+): `npm install -g base44@latest`
2. In this folder run `base44 create` and pick the basic project. It adds Base44's files
   next to `base44/entities/order.jsonc`, which is already here. If it refuses because
   `base44/` exists, move that file out, run it again, then put it back.
3. Push the Order entity: `base44 entities push`
4. Copy `.env.example` to `.env.local` and set `EXPO_PUBLIC_BASE44_APP_ID` to the app ID in
   `base44/.app.jsonc`. Restart `npx expo start`.

Each buyer sees only their own orders, enforced by the entity's row-level rules
(`created_by` = the signed-in user).

### Sign-in (`src/api/session.tsx`, `src/app/sign-in.tsx`)

- **Email** works with just the app ID. "Continue" tries to sign in; if that fails it creates the
  account, and Base44 emails a 6-digit code. If the account exists and the password is wrong, it
  says so and offers "Forgot your password?".
- **Apple and Google** use Base44's web sign-in in the iOS sign-in browser. Turn both providers on
  in your Base44 app's auth settings and set `EXPO_PUBLIC_BASE44_APP_URL`. Base44 sends the login
  token back to `wishly://auth`; if it only accepts https return addresses, host a page on the web
  app that forwards to `wishly://auth` with the same query string and set
  `EXPO_PUBLIC_AUTH_REDIRECT_URL` to it. Test this on a phone before launch.
- The App Store requires Sign in with Apple when Google is offered, and expects Apple's own
  button style; swap in `expo-apple-authentication`'s button for a native build if review asks.
- Set `EXPO_PUBLIC_TERMS_URL` and `EXPO_PUBLIC_PRIVACY_URL`; the sign-in sheet links to them.
- Notifications: the app only asks permission (`expo-notifications`). Sending "your song is
  ready" needs a push token saved on the order and a backend function that sends it; not built.

Point the web app at the same app ID (`wishly/src/api/base44Client.js`) so both share one backend.

### How the SDK is adapted for iOS (`src/api/base44Client.ts`)

- `react-native-get-random-values` is loaded first; the SDK uses `uuid` for request IDs.
- The login token lives in the iOS Keychain (`expo-secure-store`) and is handed to the SDK at
  launch, since the SDK's own storage is browser `localStorage`.
- Sign-out drops the token and creates a fresh client. The SDK's `auth.logout()` redirects a
  browser window, so the app never calls it.

### Names and real songs (`makeSong`, `suggestSpelling`)

The music model (Lyria 3 Pro) sings a name the way an English reader would sound out its
spelling, so Irish and Welsh names come out wrong (Siobhan as "see over"). The fix, tested
29 Oct 2026:

- **Sounds-like box** on Create (`SoundsLike` in `src/app/(tabs)/create.tsx`). Tricky names
  (`base44/shared/names.ts`) fill in a tested spelling (Siobhan as Shivawn) or, for a signed-in
  buyer, one suggested by Gemini (`suggestSpelling`). The buyer can play it and change it. It's
  saved as `recipient.pronunciation`; the lyrics and gift page keep the real name.
- **`makeSong`** sings the lyrics with that spelling, has OpenAI's transcriber listen three
  times, and remakes the song with the next spelling until the name is heard at least twice
  (up to three tries). It saves the MP3 to `song.audio_url` and the result to `name_check`.
  If no try passes, the order stays in production with `name_check.needs_person` set, so
  someone listens before the buyer does.
- A pronunciation guide in brackets next to the name does not work; the sung word has to be
  the sounds-like spelling.
- Lyria refuses some prompts outright (PROHIBITED_CONTENT): wording like "a personal gift
  for Birthday" (so the style line is plain), and famous singers' first names (Taylor,
  Selena, Ariana, Adele, Billie…). A refusal doesn't use up a try; makeSong asks Gemini for
  same-sounding spellings (Tayler, Selina), which get through.
- Lyrics are written by Gemini inside makeSong (Base44 blocks its own AI from the app, and
  each Base44 AI call or upload uses an integration credit; the free plan has 100 a month).

**Testing** (`scripts/song-tests/`): `node scripts/song-tests/run-suite.mjs` runs 25 names
through the deployed backend as a test buyer (`WISHLY_TEST_*` in `.env.local`) and re-checks
each song. `deno run -A --no-check scripts/song-tests/local-suite.ts` runs the same names
through the same code on your Mac, without Base44, using the keys in `~/Downloads/.env`.

To switch it on: deploy the functions (`base44 functions deploy`), set the `GEMINI_API_KEY`
and `OPENAI_API_KEY` secrets (`base44 secrets set`), and set `EXPO_PUBLIC_REAL_SONGS=true`.
Lyrics are still written on the phone when "Finish the song" is tapped; in production an
automation on new orders should run that and `makeSong` instead.

### Still to build on Base44

- **Gift page for recipients.** The web gift page should fetch through a backend function that
  returns only the song and message for a valid `gift_token`, so the Order entity never needs
  public read access.
- **The song itself.** `makeSong` now records the vocals (see above). Still to do: write the
  lyrics server-side too, and run both from an automation when an order is placed, so the
  phone doesn't have to. Keep the demo buttons while testing with `EXPO_PUBLIC_DEMO_TOOLS=true`.
- **Gift links.** Set `EXPO_PUBLIC_GIFT_BASE_URL` to wherever the web app is hosted.
- **Payment.** Checkout takes no payment yet. Before choosing Stripe or in-app purchase, check
  Apple's App Store rules for selling digital goods in an app.

## Ship to the App Store

No local Xcode needed: Expo builds in the cloud.

```bash
npx eas-cli@latest build --platform ios
```

You'll need an Apple Developer account, and EAS will ask for a bundle identifier
(for example `com.yourcompany.wishly`).

## Checks

```bash
npx tsc --noEmit
npx eslint src
npx expo-doctor
```

## Layout

```
src/app/            screens (Expo Router): (tabs)/index, create, songs · welcome · sign-in · notify · review · song/[id] · player · fix/[id] · message/[id] · account · gift/[token]
src/api/            base44Client (SDK + on-device demo store), orders, session (sign-in)
src/components/     brand (spark, logo, rhythm, ribbon), Cover, TabBar (+ mini player), playback, motion, glass, icons, ui
src/lib/            player (one shared player), motion (springs, Reduce Motion), flight (cover into the player), draft, songs, catalog, songwriter, text, once (first-launch flags), notifications
base44/entities/    order.jsonc, the Base44 schema shared with the web app
assets/brand/       illustrative photography from the brand kit (clear before launch)
assets/audio/       music-box preview loops
```
