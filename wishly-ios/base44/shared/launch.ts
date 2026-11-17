// THE LAUNCH SWITCH. One place to turn Wishly from testing into launch mode.
//
// false (now, while testing): a buyer with nothing left still gets their song
//   (marked "test"), the app falls back to test purchases when Apple's store
//   isn't available, and Profile shows "Send a test notification".
// true (launch day): every new song needs a verified Apple purchase, the app
//   never offers test purchases, and the test-notification button is hidden.
//
// To launch: set LAUNCHED = true, then `base44 functions deploy`. The app reads
// it from getCredits, so no app update is needed. Before that: the Paid Apps
// Agreement is active and a sandbox purchase has been tested end to end.
export const LAUNCHED = true // switched on 17 Nov 2026, before App Store review
