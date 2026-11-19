# What Wishly collects

Every piece of personal data the app and backend handle: why, where it goes, and
how long it's kept. The public privacy policy (`site/privacy.html`, live at
trywishly.co/privacy) and the App Store privacy answers must match this list.
Change all three together.

| Data | Why | Where it goes | Kept |
| --- | --- | --- | --- |
| Email, name (if given) | Sign-in, support | Base44 (sign-in, database) | Until the account is deleted |
| Song details: names, how they sound, relationship, occasion, story, song line | To write and sing the song | Base44; Google Gemini (lyrics, singing, listening for the name) | Until the song or account is deleted |
| Lyrics and audio | The product | Base44 (database, file storage) | Until the song or account is deleted |
| Gift message, from-name | Shown on the gift page | Base44; anyone with the gift link | Until the song or account is deleted |
| Purchases (product, date, Apple transaction id) | Songs and plans paid for | Apple; Base44 | Kept for accounting after deletion |
| Push address | "Your song is ready" | Base44; Expo push service; Apple | Until the account is deleted |
| App usage: screens, time per screen, button labels, failed steps, crashes, phone model, app version, Base44 user id | Find what's confusing or broken | PostHog (US) | Up to a year |
| Usage counts per function per day | Rate limits on AI calls | Base44 (Usage entity) | Kept; one row per buyer per function per day |

Not collected: location, contacts, photos, camera, microphone, advertising ids,
tracking across other apps. Analytics never includes what's typed, names, stories,
lyrics or messages (see `src/lib/analytics.tsx`).

## App Store privacy answers (App Store Connect → App Privacy)

- Contact info: email address, name. Linked to the user. App functionality.
- User content: other user content (song details, messages), audio (songs). Linked. App functionality.
- Purchases: purchase history. Linked. App functionality.
- Identifiers: user ID. Linked. App functionality, analytics.
- Usage data: product interaction. Linked. Analytics.
- Diagnostics: crash data, other diagnostic data. Linked. App functionality, analytics.
- Used to track the user: no.
